// handles assets endpoints

const express = require('express');
const subdomain = require('express-subdomain');
const logger = require('../../logger');
const path = require('path');

const assets = express.Router();

logger.info('[ASSETS] Setting up public folder');
assets.use(express.static(path.join(__dirname, '../../assets')));

const router = express.Router();

logger.info('[ASSETS] Creating \'assets\' subdomain');
router.use(subdomain('assets', assets));

module.exports = router;