// handles "account.nintendo.net" endpoints

const express = require('express');
const subdomain = require('express-subdomain');
const { CemuMiddleware } = require('../../middleware/cemu');
const { RNIDMiddleware } = require('../../middleware/rnid');
const { nintendoClientHeaderCheck } = require('../../middleware/client-header');
const logger = require('../../logger');

const nnas = express.Router();

const admin = require('./routes/admin');
const content = require('./routes/content');
const devices = require('./routes/devices');
const miis = require('./routes/miis');
const oauth20 = require('./routes/oauth20');
const people = require('./routes/people');
const provider = require('./routes/provider');
const support = require('./routes/support');

logger.info('[NNAS] Importing middleware');
nnas.use(nintendoClientHeaderCheck);
nnas.use(CemuMiddleware);
nnas.use(RNIDMiddleware);

logger.info('[NNAS] Applying routes');
nnas.use('/v1/api/admin', admin);
nnas.use('/v1/api/content', content);
nnas.use('/v1/api/devices', devices);
nnas.use('/v1/api/miis', miis);
nnas.use('/v1/api/oauth20', oauth20);
nnas.use('/v1/api/people', people);
nnas.use('/v1/api/provider', provider);
nnas.use('/v1/api/support', support);

const router = express.Router();

logger.info('[NNAS] Creating \'account\' subdomain');
router.use(subdomain('account', nnas));

module.exports = router;