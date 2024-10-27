// handles "nasc.nintendowifi.net" endpoints

const express = require('express');
const subdomain = require('express-subdomain');
const NASCMiddleware = require('../../middleware/nasc');
const logger = require('../../logger');
const AC = require('./routes/ac');

const nasc = express.Router();

logger.info('[NASC] Importing middleware');
nasc.use(NASCMiddleware);

logger.info('[NASC] Applying imported routes');
nasc.use('/ac', AC);

const router = express.Router();

logger.info('[NASC] Creating \'nasc\' subdomain');
router.use(subdomain('nasc', nasc));

module.exports = router;