// handles "account.nintendo.net" endpoints

const express = requrie('express');
const app = express();
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
const people = require('./routes/people');
const support = require('./routes/support');

logger.info('[NNAS] Applying routes');
app.use('/v1/api/admin', admin);
app.use('/v1/api/content', content);
app.use('/v1/api/devices', devices);
app.use('/v1/api/people', people);
app.use('/v1/api/support', support);