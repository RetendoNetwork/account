const fs = require('fs-extra');
const redis = require('redis');
const config = require('../config.json');

const disabledFeatures = {
	redis: false,
	email: false,
	captcha: false,
	s3: false,
	datastore: false
};

let client;

const memoryCache = {};

const LOCAL_CDN_BASE = `${__dirname}/../cdn`;

async function connect() {
	if (!disabledFeatures.redis) {
		client = redis.createClient(config.redis.client);
		client.on('error', (err) => console.log('Redis Client Error', err));

		await client.connect();
	}
}

async function setCachedFile(fileName, value) {
	if (config.disabledFeatures.redis) {
		memoryCache[fileName] = value;
	} else {
		await client.set(fileName, value);
	}
}

async function getCachedFile(fileName, encoding) {
	let cachedFile = Buffer.alloc(0);

	if (config.disabledFeatures.redis) {
		cachedFile = memoryCache[fileName] || null;
	} else {
		const redisValue = await client.get(fileName);
		if (redisValue) {
			cachedFile = Buffer.from(redisValue, encoding);
		}
	}

	return cachedFile;
}

async function getLocalCDNFile(name, encoding) {
	let file = await getCachedFile(`local_cdn:${name}`, encoding);

	if (file === null) {
		if (await fs.pathExists(`${LOCAL_CDN_BASE}/${name}`)) {
			const fileBuffer = await fs.readFile(`${LOCAL_CDN_BASE}/${name}`, { encoding });
			file = Buffer.from(fileBuffer);
			await setLocalCDNFile(name, file);
		}
	}

	return file;
}

async function setLocalCDNFile(name, value) {
	await setCachedFile(`local_cdn:${name}`, value);
}

module.exports = {
	connect,
	setCachedFile,
	getCachedFile,
	getLocalCDNFile
}