import { Router } from 'express';
import { 
  getCustomers, 
  getCustomerById, 
  createCustomer, 
  updateCustomer, 
  addFollowUpNote 
} from '../controllers/customer.controller';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Protect all customer routes
router.use(authenticateJWT as any);

// Admins & Sales can access/manage customers
const allowedRoles = [Role.ADMIN, Role.SALES];

router.get('/', getCustomers as any);
router.get('/:id', getCustomerById as any);
router.post('/', requireRole(allowedRoles) as any, createCustomer as any);
router.put('/:id', requireRole(allowedRoles) as any, updateCustomer as any);
router.post('/:id/notes', requireRole(allowedRoles) as any, addFollowUpNote as any);

export default router;
