const express = require('express');
const morgan = require('morgan');
const xmlbuilder = require('xmlbuilder');
const xmlparser = require('./middleware/xml-parser');
const cache = require('./cache');
const database = require('./database');
const utils = require('./utils');
const logger = require('./logger');
const { config, disabledFeatures } = require('./config-manager');

const api = require('./services/api')
const conntest = require('./services/conntest');
const datastore = require('./services/datastore');
const nasc = require('./services/nasc');
const nnas = require('./services/nnas');

const app = express();

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

if (!disabledFeatures.datastore) {
	app.use(datastore);
}

logger.info('Creating 404 status handler');
app.use((req, res) => {
	const url = utils.fullUrl(req);
	let deviceID = utils.getValueFromHeaders(req.headers, 'X-Nintendo-Device-ID');

	if (!deviceID) {
		deviceID = 'Unknown';
	}

	logger.warn(`HTTP 404 at ${url} from ${deviceID}`);

	res.set('Content-Type', 'text/xml');
	res.set('Server', 'Nintendo 3DS (http)');
	res.set('X-Nintendo-Date', new Date().getTime().toString());

	res.status(404).send(xmlbuilder.create({
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
app.use((error, req, res, _next) => {
	const status = error.status || 500;
	const url = utils.fullUrl(req);
	let deviceID = utils.getValueFromHeaders(req.headers, 'X-Nintendo-Device-ID');

	if (!deviceID) {
		deviceID = 'Unknown';
	}

	logger.warn(`HTTP ${status} at ${url} from ${deviceID}: ${error.message}`);

	res.status(status).json({
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
		logger.success(`The account server was listening on the port ${config.config.port}`);
	});
}

main().catch(console.error);
