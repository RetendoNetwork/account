// handles "account.nintendo.net" endpoints

const express = require('express');
const subdomain = require('express-subdomain');
const logger = require('../../logger');

const nnas = express.Router();

async function setCSSHeader(request, response, next) {
	response.set('Content-Type', 'text/css');
	return next();
}

async function setJSHeader(request, response, next) {
	response.set('Content-Type', 'text/javascript');
	return next();
}

async function setIMGHeader(request, response, next) {
	response.set('Content-Type', 'image/png');
	return next();
}

const admin = require('./routes/admin');
const content = require('./routes/content');
const devices = require('./routes/devices');
const oauth20 = require('./routes/oauth20');
const people = require('./routes/people');
const provider = require('./routes/provider');
const support = require('./routes/support');

logger.info('[NNAS] Applying routes');
nnas.use('/v1/api/admin', admin);
nnas.use('/v1/api/content', content);
nnas.use('/v1/api/devices', devices);
nnas.use('/v1/api/oauth20', oauth20);
nnas.use('/v1/api/people', people);
nnas.use('/v1/api/provider', provider);
nnas.use('/v1/api/support', support);

const router = express.Router();

logger.info('[NNAS] Creating \'account\' subdomain');
router.use(subdomain('account', nnas));

module.exports = router;