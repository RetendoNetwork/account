// handles "api.nintendo.net" endpoints

const express = require('express');
const subdomain = require('express-subdomain');
const logger = require('../../logger');

const api = express.Router();

const login = require('./v1/login');
const register = require('./v1/register');
const forgot_password = require('./v1/forgot-password');
const reset_password = requrie('./v1/resetpassword');

logger.info('[API] Applying routes');
api.use('/v1/login', login);
api.use('/v1/register', register);
api.use('/v1/forgot-password', forgot_password);
api.use('/v1/reset-password', reset_password);

const router = express.Router();

logger.info('[API] Creating \'api\' subdomain');
router.use(subdomain('api', api));

module.exports = router;