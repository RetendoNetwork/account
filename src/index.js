const express = require('express');
const morgan = require('morgan');
const xmlbuilder = require('xmlbuilder');
const xmlparser = require('./middleware/xml-parser');
const cache = require('./cache');
const database = require('./database');
const utils = require('./utils');
const logger = require('./logger');

// import conntest from '@/services/conntest';
// import cbvc from '@/services/cbvc';
// import nnas from '@/services/nnas';
// import nasc from '@/services/nasc';
// import datastore from '@/services/datastore';
// import api from '@/services/api';
// import localcdn from '@/services/local-cdn';
// import assets from '@/services/assets';

const app = express();

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

logger.info('Setting up Middleware');
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({
	extended: true
}));
app.use(xmlparser);

// app.use(conntest);
// app.use(cbvc);
// app.use(nnas);
// app.use(nasc);
// app.use(api);
// app.use(localcdn);
// app.use(assets);

const disabledFeatures = {
	redis: false,
	email: false,
	captcha: false,
	s3: false,
	datastore: false
};

if (!disabledFeatures.datastore) {
	//app.use(datastore);
}

logger.info('Creating 404 status handler');
app.use((request, response) => {
	const url = utils.fullUrl(request);
	let deviceID = utils.getValueFromHeaders(request.headers, 'X-Nintendo-Device-ID');

	if (!deviceID) {
		deviceID = 'Unknown';
	}

	logger.warn(`HTTP 404 at ${url} from ${deviceID}`);

	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime().toString());

	response.status(404).send(xmlbuilder.create({
		errors: {
			error: {
				cause: '',
				code: '0008',
				message: 'Not Found'
			}
		}
	}).end());
});

logger.info('Creating non-404 status handler');
app.use((error, request, response, _next) => {
	const status = error.status || 500;
	const url = utils.fullUrl(request);
	let deviceID = utils.getValueFromHeaders(request.headers, 'X-Nintendo-Device-ID');

	if (!deviceID) {
		deviceID = 'Unknown';
	}

	logger.warn(`HTTP ${status} at ${url} from ${deviceID}: ${error.message}`);

	response.status(status).json({
		app: 'api',
		status,
		error: error.message
	});
});

async function main() {
	await database.connect();
	logger.success('Database connected');
	await cache.connect();
	logger.success('Cache enabled');

	app.listen(config.config.port, () => {
		logger.success(`The server was listening on the port ${config.config.port}`);
	});
}

main().catch(console.error);