import express from 'express';
import subdomain from 'express-subdomain';
import cors from 'cors';
import APIMiddleware from '@/middleware/api';
import logger  from '@/logger';

import { V1 } from '@/services/api/routes';

const api = express.Router();

logger.info('[API] Importing middleware');
api.use(APIMiddleware);
api.use(cors());
api.options('*', cors());

logger.info('[API] Applying imported routes');
api.use('/v1/email', V1.EMAIL);
api.use('/v1/forgot-password', V1.FORGOT_PASSWORD);
api.use('/v1/login', V1.LOGIN);
api.use('/v1/register', V1.REGISTER);
api.use('/v1/reset-password', V1.RESET_PASSWORD);
api.use('/v1/user', V1.USER);

const router = express.Router();

logger.info('[API] Creating \'api\' subdomain');
router.use(subdomain('api', api));

export default router;