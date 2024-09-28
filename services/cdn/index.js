const express = require('express');
const subdomain = require('express-subdomain');
const cors = require('cors');

const logger = require('../../utils/logger');

const cdn = express.Router();

cdn.use(cors());
cdn.options('*', cors());

logger.info('[CDN] Create all cdn routes.');

const router = express.Router();

logger.info('[CDN] Creating \'cdn\' subdomain');
router.use(subdomain('cdn', cdn));

module.exports = router;