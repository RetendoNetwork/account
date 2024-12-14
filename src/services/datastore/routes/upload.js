const crypto = require('node:crypto');
const express = require('express');
const Dicer = require('dicer');
const { uploadCDNAsset } = require('../../../utils');
const { config } = require('../../../config-manager');

const router = express.Router();

function multipartParser(req, res, next) {
	const RE_BOUNDARY = /^multipart\/.+?(?:; boundary=(?:(?:"(.+)")|(?:([^\s]+))))$/i;
	const RE_FILE_NAME = /name="(.*)"/;

	const contentType = req.header('content-type');

	if (!contentType) {
		return next();
	}

	const boundary = RE_BOUNDARY.exec(contentType);

	if (!boundary) {
		return next();
	}

	const dicer = new Dicer({ boundary: boundary[1] || boundary[2] });
	const files = {};

	dicer.on('part', (part) => {
		let fileBuffer = Buffer.alloc(0);
		let fileName = '';

		part.on('header', header => {
			const contentDisposition = header['content-disposition'];
			const regexResult = RE_FILE_NAME.exec(contentDisposition);

			if (regexResult) {
				fileName = regexResult[0];
			}
		});

		part.on('data', (data) => {
			if (data) {
				data = Buffer.from(data);
			}

			fileBuffer = Buffer.concat([fileBuffer, data]);
		});

		part.on('end', () => {
			files[fileName] = fileBuffer;
		});
	});

	dicer.on('finish', function () {
		req.files = files;
		return next();
	});

	req.pipe(dicer);
}

router.post('/upload', multipartParser, async (req, res) => {
	if (!req.files) {
		res.sendStatus(500);
		return;
	}

	const bucket = req.files.bucket.toString();
	const key = req.files.key.toString();
	const file = req.files.file;
	const acl = req.files.acl.toString();
	const pid = req.files.pid.toString();
	const date = req.files.date.toString();
	const signature = req.files.signature.toString();

	const minute = 1000 * 60;
	const minuteAgo = Date.now() - minute;

	if (Number(date) < Math.floor(minuteAgo / 1000)) {
		res.sendStatus(400);
		return;
	}

	const data = `${pid}${bucket}${key}${date}`;

	const hmac = crypto.createHmac('sha256', config.datastore.signature_secret).update(data).digest('hex');

	console.log(hmac, signature);

	if (hmac !== signature) {
		res.sendStatus(400);
		return;
	}

	await uploadCDNAsset(bucket, key, file, acl);
	res.sendStatus(200);
});

module.exports = router;
