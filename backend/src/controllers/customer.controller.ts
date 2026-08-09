import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CustomerType, CustomerStatus } from '@prisma/client';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobileNumber: z.string().min(10, 'Mobile must be at least 10 digits'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(1, 'Business name is required'),
  gstNumber: z.string().optional().nullable(),
  customerType: z.nativeEnum(CustomerType),
  address: z.string().min(1, 'Address is required'),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.LEAD),
  followUpDate: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const getCustomers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, type, status, page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { businessName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { mobileNumber: { contains: search as string } },
      ];
    }

    if (type) {
      where.customerType = type as CustomerType;
    }

    if (status) {
      where.status = status as CustomerStatus;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return res.status(200).json({
      customers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const getCustomerById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        followUpHistory: {
          orderBy: { createdAt: 'desc' },
        },
        challans: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.status(200).json(customer);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const createCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsedData = customerSchema.parse(req.body);

    const newCustomer = await prisma.customer.create({
      data: {
        ...parsedData,
        followUpDate: parsedData.followUpDate || null,
        gstNumber: parsedData.gstNumber || null,
        notes: parsedData.notes || null,
      },
    });

    // If notes are provided on creation, also create an initial follow-up note log entry
    if (parsedData.notes) {
      await prisma.followUpNote.create({
        data: {
          customerId: newCustomer.id,
          note: `Customer created. Initial note: ${parsedData.notes}`,
          createdBy: req.user?.name || 'System',
        },
      });
    }

    return res.status(201).json(newCustomer);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parsedData = customerSchema.parse(req.body);

    const existingCustomer = await prisma.customer.findUnique({ where: { id } });
    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        ...parsedData,
        followUpDate: parsedData.followUpDate || null,
        gstNumber: parsedData.gstNumber || null,
        notes: parsedData.notes || null,
      },
    });

    return res.status(200).json(updatedCustomer);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const addFollowUpNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { note, followUpDate } = z.object({
      note: z.string().min(1, 'Note content cannot be empty'),
      followUpDate: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
    }).parse(req.body);

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [createdNote, updatedCustomer] = await prisma.$transaction([
      prisma.followUpNote.create({
        data: {
          customerId: id,
          note,
          createdBy: req.user?.name || 'System',
        },
      }),
      prisma.customer.update({
        where: { id },
        data: {
          notes: note, // update current active note
          ...(followUpDate ? { followUpDate } : {}),
        },
      }),
    ]);

    return res.status(201).json({ note: createdNote, customer: updatedCustomer });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
