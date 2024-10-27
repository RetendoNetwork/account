// handles "account.nintendo.net" endpoints

const express = require('express');
const subdomain = require('express-subdomain');
const clientHeaderCheck = require('../../middleware/client-header');
const rnidMiddleware = require('../../middleware/rnid');
const logger = require('../../logger');
const routes = require('./routes');

const nnas = express.Router();

logger.info('[NNAS] Importing middleware');
nnas.use(clientHeaderCheck);
nnas.use(rnidMiddleware);

logger.info('[NNAS] Applying imported routes');
nnas.use('/v1/api/admin', routes.ADMIN);
nnas.use('/v1/api/content', routes.CONTENT);
nnas.use('/v1/api/devices', routes.DEVICES);
nnas.use('/v1/api/oauth20', routes.OAUTH);
nnas.use('/v1/api/people', routes.PEOPLE);
nnas.use('/v1/api/provider', routes.PROVIDER);
nnas.use('/v1/api/support', routes.SUPPORT);

const router = express.Router();

logger.info('[NNAS] Creating \'account\' subdomain');
router.use(subdomain('account', nnas));

module.exports = router;