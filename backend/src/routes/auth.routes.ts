import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);
router.get('/me', authenticateJWT as any, getMe as any);

export default router;
