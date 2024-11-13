// handles "nasc.nintendowifi.net" endpoints

const express = require('express');
const subdomain = require('express-subdomain');
const NASCMiddleware = require('../../middleware/nasc');
const logger = require('../../logger');

const nasc = express.Router();

const ac = require('./routes/ac');

logger.info('[NASC] Importing middleware');
nasc.use(NASCMiddleware);

logger.info('[NASC] Applying imported routes');
nasc.use('/ac', ac);

const router = express.Router();

logger.info('[NASC] Creating \'nasc\' subdomain');
router.use(subdomain('nasc', nasc));

module.exports = router;