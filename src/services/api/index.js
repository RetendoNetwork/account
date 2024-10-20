// handles "api.nintendo.cc" endpoints

const express = require('express');
const subdomain = require('express-subdomain');
const cors = require('cors');
const APIMiddleware = require('../../middleware/api');
const logger = require('../../logger');
const routes = require('./routes');

const api = express.Router();

logger.info('[API] Importing middleware');
api.use(APIMiddleware);
api.use(cors());
api.options('*', cors());

logger.info('[API] Applying imported routes');
api.use('/v1/connections', routes.V1.CONNECTIONS);
api.use('/v1/email', routes.V1.EMAIL);
api.use('/v1/forgot-password', routes.V1.FORGOT_PASSWORD);
api.use('/v1/login', routes.V1.LOGIN);
api.use('/v1/register', routes.V1.REGISTER);
api.use('/v1/reset-password', routes.V1.RESET_PASSWORD);
api.use('/v1/user', routes.V1.USER);


const router = express.Router();

logger.info('[API] Creating \'api\' subdomain');
router.use(subdomain('api', api));

module.exports = router;