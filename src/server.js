process.title = 'Retendo - Account';

const express = require('express');
const morgan = require('morgan');
const xmlparser = require('./middleware/xml-parser');
const cache = require('./cache');
const database = require('./database');
const util = require('./util');
const logger = require('./logger');

const config = require('../account-config.json');
const { http: { port } } = config;
const app = express();

const conntest = require('./services/conntest');
const nnas = require('./services/nnas');
const nasc = require('./services/nasc');
const api = require('./services/api');
const cdn = require('./services/cdn');
const assets = require('./services/assets');

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({
	extended: true
}));
app.use(xmlparser);

app.use(conntest);
app.use(nnas);
app.use(nasc);
app.use(api);
app.use(cdn);
app.use(assets);

app.use((request, response) => {
	const fullUrl = util.fullUrl(request);
	const deviceId = request.headers['X-Nintendo-Device-ID'] || 'Unknown';

	logger.warn(`HTTP 404 at ${fullUrl} from ${deviceId}`);

	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime());

	response.status(404);
	response.send('<errors><error><cause/><code>0008</code><message>Not Found</message></error></errors>');
});

app.use((error, request, response) => {
	const status = error.status || 500;
	const fullUrl = util.fullUrl(request);
	const deviceId = request.headers['X-Nintendo-Device-ID'] || 'Unknown';

	logger.warn(`HTTP ${status} at ${fullUrl} from ${deviceId}: ${error.message}`);

	response.status(status);
	response.json({
		app: 'api',
		status,
		error: error.message
	});
});

async function main() {
	await database.connect();
	await cache.connect();

	app.listen(port, () => {
		logger.success(`Server started on port ${port}`);
	});
}

main().catch(console.error);
