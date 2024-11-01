// handles "assets.nintendo.net" endpoints

const path = require('node:path');
const express = require('express');
const logger = require('../../logger');
const subdomain = require('express-subdomain');

const assets = express.Router();

LOG_INFO('[ASSETS] Applying assets folder');
assets.use(express.static(path.join(__dirname, '../../assets')));

const router = express.Router();

logger.info('[ASSETS] Creating \'conntest\' subdomain');
router.use(subdomain('assets', assets));

module.exports = router;
