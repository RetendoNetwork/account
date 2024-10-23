process.title = 'Retendo - Account';
process.on('uncaughtException', (err, origin) => {
	console.log(err);
	console.log(origin);
});
process.on('SIGTERM', () => {
	process.exit(0);
});

import express from 'express';
import morgan from 'morgan';
import xmlbuilder from 'xmlbuilder';
import xmlparser from '@/middleware/xml-parser';
//import { connect as connectCache } from '@/cache';
//import { connect as connectDatabase } from '@/database';
//import { startGRPCServer } from '@/services/grpc/server';
import { fullUrl, getValueFromHeaders } from '@/util';
import logger from '@/logger';

import api from '@/services/api';
import conntest from '@/services/conntest';
//import nnas from '@/services/nnas';

import { config } from '@/config-manager';

const app = express();

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({
	extended: true
}));
app.use(xmlparser);

app.use(api);
app.use(conntest);
//app.use(nnas);

logger.info('Creating 404 status handler');
app.use((request: express.Request, response: express.Response): void => {
	const url = fullUrl(request);
	let deviceID = getValueFromHeaders(request.headers, 'X-Nintendo-Device-ID');

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
app.use((error: any, request: express.Request, response: express.Response, _next: express.NextFunction): void => {
	const status = error.status || 500;
	const url = fullUrl(request);
	let deviceID = getValueFromHeaders(request.headers, 'X-Nintendo-Device-ID');

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

async function main(): Promise<void> {
	//await connectDatabase();
	logger.log('Database connected');
	//await connectCache();
	logger.log('Cache enabled');
	//await startGRPCServer();
	logger.log(`gRPC server started on port ${config.grpc.port}`);

	app.listen(config.http.port, () => {
		logger.log(`HTTP server started on port ${config.http.port}`);
	});
}

main().catch(console.error);