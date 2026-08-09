import { Router } from 'express';
import { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  adjustStock 
} from '../controllers/product.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Protect all product routes
router.use(authenticateJWT as any);

// Read-only access allowed for everyone (Admin, Sales, Warehouse, Accounts)
router.get('/', getProducts as any);
router.get('/:id', getProductById as any);

// Write/management access for Admin and Warehouse/Sales as applicable
router.post('/', requireRole([Role.ADMIN, Role.WAREHOUSE]) as any, createProduct as any);
router.put('/:id', requireRole([Role.ADMIN, Role.WAREHOUSE]) as any, updateProduct as any);
router.post('/:id/stock', requireRole([Role.ADMIN, Role.WAREHOUSE]) as any, adjustStock as any);

export default router;
