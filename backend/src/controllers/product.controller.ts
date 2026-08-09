import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { MovementType } from '@prisma/client';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU code is required'),
  category: z.string().min(1, 'Category is required'),
  unitPrice: z.number().positive('Unit price must be positive'),
  currentStock: z.number().int().nonnegative('Initial stock cannot be negative').default(0),
  minStockAlertQty: z.number().int().nonnegative('Min stock alert cannot be negative').default(0),
  locationWarehouse: z.string().min(1, 'Location/warehouse code is required'),
  imageUrl: z.string().optional().nullable(),
});

const stockAdjustSchema = z.object({
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  movementType: z.nativeEnum(MovementType),
  reason: z.string().min(1, 'Reason is required'),
});

export const getProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, category, lowStock } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category as string;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Client-side or Prisma-side low stock filter
    let filteredProducts = products;
    if (lowStock === 'true') {
      filteredProducts = products.filter(
        (product) => product.currentStock <= product.minStockAlertQty
      );
    }

    return res.status(200).json(filteredProducts);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const getProductById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          include: {
            createdBy: {
              select: { name: true, role: true }
            }
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsedData = productSchema.parse(req.body);

    const existingSku = await prisma.product.findUnique({
      where: { sku: parsedData.sku }
    });

    if (existingSku) {
      return res.status(400).json({ error: 'Product SKU already exists' });
    }

    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: parsedData.name,
          sku: parsedData.sku,
          category: parsedData.category,
          unitPrice: parsedData.unitPrice,
          currentStock: parsedData.currentStock,
          minStockAlertQty: parsedData.minStockAlertQty,
          locationWarehouse: parsedData.locationWarehouse,
          imageUrl: parsedData.imageUrl || null,
        },
      });

      // Log stock movement if initial stock is > 0
      if (parsedData.currentStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity: parsedData.currentStock,
            movementType: MovementType.IN,
            reason: 'Initial stock setup during product creation',
            createdById: req.user!.id,
          },
        });
      }

      return product;
    });

    return res.status(201).json(newProduct);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parsedData = productSchema.omit({ currentStock: true }).parse(req.body);

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: parsedData.name,
        sku: parsedData.sku,
        category: parsedData.category,
        unitPrice: parsedData.unitPrice,
        minStockAlertQty: parsedData.minStockAlertQty,
        locationWarehouse: parsedData.locationWarehouse,
        imageUrl: parsedData.imageUrl || null,
      },
    });

    return res.status(200).json(updatedProduct);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

export const adjustStock = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, movementType, reason } = stockAdjustSchema.parse(req.body);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let nextStock = product.currentStock;
    if (movementType === MovementType.IN) {
      nextStock += quantity;
    } else {
      nextStock -= quantity;
      if (nextStock < 0) {
        return res.status(400).json({ error: 'Insufficient stock. Transaction aborted.' });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Create movement log
      await tx.stockMovement.create({
        data: {
          productId: id,
          quantity,
          movementType,
          reason,
          createdById: req.user!.id,
        },
      });

      // Update product stock
      return tx.product.update({
        where: { id },
        data: { currentStock: nextStock },
      });
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
