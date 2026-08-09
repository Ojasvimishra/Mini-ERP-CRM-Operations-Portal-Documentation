import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ChallanStatus, MovementType } from '@prisma/client';

const challanItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
});

const createChallanSchema = z.object({
  customerId: z.string().min(1),
  status: z.nativeEnum(ChallanStatus).default(ChallanStatus.DRAFT),
  items: z.array(challanItemSchema).min(1, 'At least one product is required'),
});

// Helper: generate unique Challan Number
const generateChallanNumber = async (): Promise<string> => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.salesChallan.count({
    where: {
      challanNumber: {
        startsWith: `CH-${dateStr}-`,
      },
    },
  });
  const suffix = String(count + 1).padStart(4, '0');
  return `CH-${dateStr}-${suffix}`;
};

export const getChallans = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, customerId } = req.query;

    const where: any = {};
    if (status) {
      where.status = status as ChallanStatus;
    }
    if (customerId) {
      where.customerId = customerId as string;
    }

    const challans = await prisma.salesChallan.findMany({
      where,
      include: {
        customer: {
          select: { name: true, businessName: true }
        },
        createdBy: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(challans);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const getChallanById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: {
          select: { name: true, role: true }
        }
      },
    });

    if (!challan) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    return res.status(200).json(challan);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const createChallan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId, status, items } = createChallanSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Resolve products and build the snapshot
    const productIds = items.map(item => item.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    if (dbProducts.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more selected products are invalid' });
    }

    const snapshotItems = items.map(item => {
      const dbProduct = dbProducts.find(p => p.id === item.productId)!;
      return {
        productId: dbProduct.id,
        name: dbProduct.name,
        sku: dbProduct.sku,
        unitPrice: Number(dbProduct.unitPrice),
        quantity: item.quantity,
      };
    });

    const totalQty = items.reduce((acc, curr) => acc + curr.quantity, 0);
    const challanNumber = await generateChallanNumber();

    const createdChallan = await prisma.$transaction(async (tx) => {
      // If confirmed, execute stock verification & deduction
      if (status === ChallanStatus.CONFIRMED) {
        for (const item of items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId }
          });

          if (!product) {
            throw new Error(`Product ID ${item.productId} not found`);
          }

          if (product.currentStock < item.quantity) {
            throw new Error(`Insufficient stock for product ${product.name}. Required: ${item.quantity}, Available: ${product.currentStock}`);
          }

          // Deduct stock
          await tx.product.update({
            where: { id: product.id },
            data: {
              currentStock: {
                decrement: item.quantity
              }
            }
          });

          // Log stock movement
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              quantity: item.quantity,
              movementType: MovementType.OUT,
              reason: `Sales Challan Confirmation (${challanNumber})`,
              createdById: req.user!.id,
            }
          });
        }
      }

      // Create Challan record
      return tx.salesChallan.create({
        data: {
          challanNumber,
          customerId,
          totalQuantity: totalQty,
          status,
          createdById: req.user!.id,
          productsSnapshot: snapshotItems,
        },
      });
    });

    return res.status(201).json(createdChallan);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    // Handle standard business errors gracefully
    if (error instanceof Error && error.message.includes('Insufficient stock')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const confirmChallan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const challan = await prisma.salesChallan.findUnique({ where: { id } });
    if (!challan) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    if (challan.status !== ChallanStatus.DRAFT) {
      return res.status(400).json({ error: `Cannot confirm a challan that is in status ${challan.status}` });
    }

    const items = challan.productsSnapshot as any[];

    const confirmedChallan = await prisma.$transaction(async (tx) => {
      // Verify and deduct stock
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new Error(`Product ${item.name} not found`);
        }

        if (product.currentStock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Required: ${item.quantity}, Available: ${product.currentStock}`);
        }

        // Deduct
        await tx.product.update({
          where: { id: product.id },
          data: {
            currentStock: {
              decrement: item.quantity
            }
          }
        });

        // Log Stock Movement
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity: item.quantity,
            movementType: MovementType.OUT,
            reason: `Sales Challan Confirmation (${challan.challanNumber})`,
            createdById: req.user!.id,
          }
        });
      }

      // Update status
      return tx.salesChallan.update({
        where: { id },
        data: { status: ChallanStatus.CONFIRMED },
      });
    });

    return res.status(200).json(confirmedChallan);
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('Insufficient stock')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const cancelChallan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const challan = await prisma.salesChallan.findUnique({ where: { id } });
    if (!challan) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    if (challan.status === ChallanStatus.CANCELLED) {
      return res.status(400).json({ error: 'Challan is already cancelled' });
    }

    const previousStatus = challan.status;
    const items = challan.productsSnapshot as any[];

    const cancelledChallan = await prisma.$transaction(async (tx) => {
      // If it was already confirmed, we need to return the products back to stock
      if (previousStatus === ChallanStatus.CONFIRMED) {
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: {
                increment: item.quantity
              }
            }
          });

          // Log returning stock
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: MovementType.IN,
              reason: `Sales Challan Cancelled - Returned (${challan.challanNumber})`,
              createdById: req.user!.id,
            }
          });
        }
      }

      return tx.salesChallan.update({
        where: { id },
        data: { status: ChallanStatus.CANCELLED },
      });
    });

    return res.status(200).json(cancelledChallan);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
