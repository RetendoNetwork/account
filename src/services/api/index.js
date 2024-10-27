// handles "api.nintendo.net" endpoints

const express = require('express');
const subdomain = require('express-subdomain');
const cors = require('cors');
const APIMiddleware = require('../../middleware/api');
const logger = require('../../logger');

const api = express.Router();

logger.info('[API] Importing middleware');
api.use(APIMiddleware);
api.use(cors());
api.options('*', cors());

const V1 = {
	CONNECTIONS: require('./routes/connections'),
	EMAIL: require('./routes/email'),
	FORGOT_PASSWORD: require('./routes/forgotPassword'),
	LOGIN: require('./routes/login'),
	REGISTER: require('./routes/register'),
	RESET_PASSWORD: require('./routes/resetPassword'),
	USER: require('./routes/user'),
};

logger.info('[API] Applying imported routes');
api.use('/v1/connections', V1.CONNECTIONS);
api.use('/v1/email', V1.EMAIL);
api.use('/v1/forgot-password', V1.FORGOT_PASSWORD);
api.use('/v1/login', V1.LOGIN);
api.use('/v1/register', V1.REGISTER);
api.use('/v1/reset-password', V1.RESET_PASSWORD);
api.use('/v1/user', V1.USER);

const router = express.Router();

logger.info('[API] Creating \'api\' subdomain');
router.use(subdomain('api', api));

module.exports = router;