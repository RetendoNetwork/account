// handles "api.nintendo.net" endpoints

const express = require('express');
const subdomain = require('express-subdomain');
const logger = require('../../logger');

const api = express.Router();

const login = require('./v1/login');
const register = require('./v1/register');

logger.info('[API] Applying routes');
api.use('/v1/login', login);
api.use('/v1/register', register);

const router = express.Router();

logger.info('[API] Creating \'api\' subdomain');
router.use(subdomain('api', api));

module.exports = router;