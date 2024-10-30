const express = require('express');
const morgan = require('morgan');
const xmlparser = require('./middleware/xml-parser');
const xmlbuilder = require('xmlbuilder');
const database = require('./database');
const util = require('./util');
const logger = require('./logger');
const cache = require('./cache');
const config = require('../config.json');

const { config: { port } } = config;
const app = express();

const api = require('./services/api');
const conntest = require('./services/conntest');
const nasc = require('./services/nasc');
const nnas = require('./services/nnas');

app.set('etag', false);
app.disable('x-powered-by');

logger.info('Setting up Middleware');
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({
	extended: true
}));
app.use(xmlparser);

app.use(api);
app.use(conntest);
app.use(nasc);
app.use(nnas);

logger.info('Creating 404 status handler');
app.use((request, response) => {
	const fullUrl = util.fullUrl(request);
	const deviceId = request.headers['X-Nintendo-Device-ID'] || 'Unknown';

	logger.warn(`HTTP 404 at ${fullUrl} from ${deviceId}`);

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
app.use((error, request, response) => {
	const status = error.status || 500;
	const fullUrl = util.fullUrl(request);
	const deviceId = request.headers['X-Nintendo-Device-ID'] || 'Unknown';

	logger.warn(`HTTP ${status} at ${fullUrl} from ${deviceId}: ${error.message}`);

	response.status(status).json({
		app: 'api',
		status,
		error: error.message
	});
});

async function main() {
	logger.info('Starting server');

	await database.connect();

	app.listen(port, () => {
		logger.log(`Server started on port ${port}`);
	});
}

main().catch(console.error);
