const express = require('express');
const path = require('path');
const xmlbuilder = require('xmlbuilder');
const subdomain = require('express-subdomain');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();

const config = require('./config.json');
const { config: { port } } = config;
const logger = require('./utils/logger');
const utils = require('./utils/utils');
const database = require('./utils/database');

const cdn = require('./services/cdn');
const conntest = require('./services/conntest');
const nnas = require('./services/nnas');

app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('etag', false);
app.disable('x-powered-by');

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
	const userAgent = req.headers['user-agent'] || '';
  
	const isDesktop = /Windows|Macintosh|Linux|X11/.test(userAgent);
	const isMobile = /iPhone|Android|Mobile/.test(userAgent);
  
	if (isDesktop || isMobile) {
	  res.status(403).send(`
		<link rel="stylesheet" href="/scss/main.scss">
		<pre>Only Wii U & 3DS Consoles can access it.</pre>
	  `);
	} else {
		next();
	}
});

app.use(cdn);
app.use(conntest);
app.use(nnas);

logger.info(`[404] Applying imported routes.`);
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/xml');
    res.status(404).send(xmlbuilder.create({
		errors: {
			error: {
				message: "Not Found"
			}
		}
	}).end());
});

async function main() {
    await database.connectToDB();

    app.listen(port, () => {
        logger.log(`Server started on port ${port}`);
    });
}

main().catch(console.error);