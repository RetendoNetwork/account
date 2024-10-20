const express = require('express');
const subdomain = require('express-subdomain');
const logger = require('../../logger');
const config = require('../../../account-config.json');

const disabledFeatures = {
	redis: false,
	email: false,
	captcha: false,
	s3: false
};

if (!disabledFeatures.s3) {
	module.exports = express.Router();

	return;
}

const routes = require('./routes');

const cdn = express.Router();

logger.info('[CDN] Applying imported routes');
cdn.use(routes.GET);

const router = express.Router();

logger.info(`[CDN] Creating \'cdn\' subdomain`);
router.use(subdomain('cdn', cdn));

module.exports = router;
