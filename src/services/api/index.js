// handles "api.nintendo.net" endpoints

const express = require('express');
const subdomain = require('express-subdomain');
const cors = require('cors');
const APIMiddleware = require('../../middleware/api');
const logger = require('../../logger');

const CONNECTIONS = require('./routes/connections');
const EMAIL = require('./routes/email');
const FORGOT_PASSWORD = require('./routes/forgotPassword');
const LOGIN = require('./routes/login');
const REGISTER = require('./routes/register');
const RESET_PASSWORD = require('./routes/resetPassword');
const USER = require('./routes/user');

const api = express.Router();

logger.info('[API] Importing middleware');
api.use(APIMiddleware);
api.use(cors());
api.options('*', cors());

logger.info('[API] Applying imported routes');
api.use('/v1/connections', CONNECTIONS);
api.use('/v1/email', EMAIL);
api.use('/v1/forgot-password', FORGOT_PASSWORD);
api.use('/v1/login', LOGIN);
api.use('/v1/register', REGISTER);
api.use('/v1/reset-password', RESET_PASSWORD);
api.use('/v1/user', USER);

const router = express.Router();

logger.info('[API] Creating \'api\' subdomain');
router.use(subdomain('api', api));

module.exports = router;
