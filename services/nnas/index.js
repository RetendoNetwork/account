// handles "account.nintendo.net" endpoints

const express = require('express');
const subdomain = require('express-subdomain');
const cors = require('cors');

const logger = require('../../utils/logger');

const admin = require('./routes/admin');
const content = require('./routes/content');
const devices = require('./routes/devices');
const miis = require('./routes/miis');
const oauth = require('./routes/oauth');
const people = require('./routes/people');
const provider = require('./routes/provider');
const support = require('./routes/support');

const nnas = express.Router();

nnas.use(cors());
nnas.options('*', cors());

logger.info('[NNAS] Create all account routes.');
nnas.use('/v1/api/admin', admin);
nnas.use('/v1/api/content', content);
nnas.use('/v1/api/devices', devices);
nnas.use('/v1/api/miis', miis);
nnas.use('/v1/api/oauth20', oauth);
nnas.use('/v1/api/people', people);
nnas.use('/v1/api/provider', provider);
nnas.use('/v1/api/support', support);

const router = express.Router();

logger.info('[NNAS] Creating \'account\' subdomain');
router.use(subdomain('account', nnas));

logger.info('[NNAS] Creating \'c.account\' subdomain');
router.use(subdomain('c.account', nnas));

module.exports = router;