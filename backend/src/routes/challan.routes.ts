import { Router } from 'express';
import { 
  getChallans, 
  getChallanById, 
  createChallan, 
  confirmChallan, 
  cancelChallan 
} from '../controllers/challan.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Protect all challan routes
router.use(authenticateJWT as any);

// Read-only access allowed for everyone (Admin, Sales, Warehouse, Accounts)
router.get('/', getChallans as any);
router.get('/:id', getChallanById as any);

// Write/management access (Admin and Sales/Warehouse as appropriate)
router.post('/', requireRole([Role.ADMIN, Role.SALES]) as any, createChallan as any);
router.post('/:id/confirm', requireRole([Role.ADMIN, Role.SALES, Role.WAREHOUSE]) as any, confirmChallan as any);
router.post('/:id/cancel', requireRole([Role.ADMIN, Role.SALES, Role.ACCOUNTS]) as any, cancelChallan as any);

export default router;
