const crypto = require('node:crypto');
const path = require('node:path');
const aws = require('aws-sdk');
const fs = require('fs-extra');
const crc32 = require('buffer-crc32');
const crc = require('crc');
const { sendMail } = require('./mailer');
const { config, disabledFeatures } = require('./config-manager');

let s3;

if (!disabledFeatures.s3) {
	s3 = new aws.S3({
		endpoint: config.s3.endpoint,
		forcePathStyle: config.s3.forcePathStyle,
		region: config.s3.region,

		credentials: {
			accessKeyId: config.s3.key,
			secretAccessKey: config.s3.secret,
		},
	});
}

function nintendoPasswordHash(password, pid) {
	const pidBuffer = Buffer.alloc(4);
	pidBuffer.writeUInt32LE(pid);

	const unpacked = Buffer.concat([
		pidBuffer,
		Buffer.from('\x02\x65\x43\x46'),
		Buffer.from(password)
	]);

	return crypto.createHash('sha256').update(unpacked).digest().toString('hex');
}

function nintendoBase64Decode(encoded) {
	encoded = encoded.replaceAll('.', '+').replaceAll('-', '/').replaceAll('*', '=');
	return Buffer.from(encoded, 'base64');
}

function nintendoBase64Encode(decoded) {
	const encoded = Buffer.from(decoded).toString('base64');
	return encoded.replaceAll('+', '.').replaceAll('/', '-').replaceAll('=', '*');
}

function generateToken(key, options) {
	let dataBuffer = Buffer.alloc(1 + 1 + 4 + 8);

	dataBuffer.writeUInt8(options.system_type, 0x0);
	dataBuffer.writeUInt8(options.token_type, 0x1);
	dataBuffer.writeUInt32LE(options.pid, 0x2);
	dataBuffer.writeBigUInt64LE(options.expire_time, 0x6);

	if ((options.token_type !== 0x1 && options.token_type !== 0x2) || options.system_type === 0x3) {
		if (options.title_id === undefined || options.access_level === undefined) {
			return null;
		}

		dataBuffer = Buffer.concat([
			dataBuffer,
			Buffer.alloc(8 + 1)
		]);

		dataBuffer.writeBigUInt64LE(options.title_id, 0xE);
		dataBuffer.writeInt8(options.access_level, 0x16);
	}

	const iv = Buffer.alloc(16);
	const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);

	const encrypted = Buffer.concat([
		cipher.update(dataBuffer),
		cipher.final()
	]);

	let final = encrypted;

	if ((options.token_type !== 0x1 && options.token_type !== 0x2) || options.system_type === 0x3) {
		const checksum = crc32(dataBuffer);

		final = Buffer.concat([
			checksum,
			final
		]);
	}

	return final;
}

function decryptToken(token, key) {
	let encryptedBody;
	let expectedChecksum = 0;

	if (token.length === 16) {
		encryptedBody = token;
	} else {
		expectedChecksum = token.readUint32BE();
		encryptedBody = token.subarray(4);
	}

	if (!key) {
		key = config.aes_key;
	}

	const iv = Buffer.alloc(16);
	const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);

	const decrypted = Buffer.concat([
		decipher.update(encryptedBody),
		decipher.final()
	]);

	if (expectedChecksum && (expectedChecksum !== crc.crc32(decrypted))) {
		throw new Error('Checksum did not match. Failed decrypt. Are you using the right key?');
	}

	return decrypted;
}

function unpackToken(token) {
	const unpacked = {
		system_type: token.readUInt8(0x0),
		token_type: token.readUInt8(0x1),
		pid: token.readUInt32LE(0x2),
		expire_time: token.readBigUInt64LE(0x6)
	};

	if (unpacked.token_type !== 0x1 && unpacked.token_type !== 0x2) {
		unpacked.title_id = token.readBigUInt64LE(0xE);
		unpacked.access_level = token.readInt8(0x16);
	}

	return unpacked;
}

function fullUrl(req) {
	const protocol = req.protocol;
	const host = req.host;
	const opath = req.originalUrl;

	return `${protocol}://${host}${opath}`;
}

async function uploadCDNAsset(bucket, key, data, acl) {
	if (disabledFeatures.s3) {
		await writeLocalCDNFile(key, data);
	} else {
		await s3.putObject({
			Body: data,
			Key: key,
			Bucket: bucket,
			ACL: acl
		}).promise();
	}
}

async function writeLocalCDNFile(key, data) {
	const filePath = config.cdn.disk_path;
	const folder = path.dirname(filePath);

	await fs.ensureDir(folder);
	await fs.writeFile(filePath, data);
}

function nascDateTime() {
	const now = new Date();

	const year = now.getFullYear();
	const month = (now.getMonth() + 1).toString().padStart(2, '0'); // * Months are zero-based
	const day = now.getDate().toString().padStart(2, '0');
	const hours = now.getHours().toString().padStart(2, '0');
	const minutes = now.getMinutes().toString().padStart(2, '0');
	const seconds = now.getSeconds().toString().padStart(2, '0');

	return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function nascError(errorCode) {
	return new URLSearchParams({
		retry: nintendoBase64Encode('1'),
		returncd: errorCode == 'null' ? errorCode : nintendoBase64Encode(errorCode),
		datetime: nintendoBase64Encode(nascDateTime()),
	});
}

async function sendConfirmationEmail(rnid) {
	const options = {
		to: rnid.email.address,
		subject: '[Retendo Network] Please confirm your email address',
		username: rnid.username,
		confirmation: {
			href: `https://api.retendo.online/v1/email/verify?token=${rnid.identification.email_token}`,
			code: rnid.identification.email_code
		},
		text: `Hello ${rnid.username}! \r\n\r\nYour Retendo Network ID activation is almost complete. Please click the link to confirm your e-mail address and complete the activation process: \r\nhttps://api.innoverse.club/v1/email/verify?token=${rnid.identification.email_token} \r\n\r\nYou may also enter the following 6-digit code on your console: ${rnid.identification.email_code}`
	};

	await sendMail(options);
}

async function sendEmailConfirmedEmail(rnid)  {
	const options = {
		to: rnid.email.address,
		subject: '[Retendo Network] Email address confirmed',
		username: rnid.username,
		paragraph: 'your email address has been confirmed. We hope you have fun on Retendo Network!',
		text: `Dear ${rnid.username}, \r\n\r\nYour email address has been confirmed. We hope you have fun on Retendo Network!`
	};

	await sendMail(options);
}

async function sendForgotPasswordEmail(rnid) {
	const tokenOptions = {
		system_type: 0xF, // * API
		token_type: 0x5, // * Password reset
		pid: pnid.pid,
		access_level: pnid.access_level,
		title_id: BigInt(0),
		expire_time: BigInt(Date.now() + (24 * 60 * 60 * 1000)) // * Only valid for 24 hours
	};

	const tokenBuffer = await generateToken(config.aes_key, tokenOptions);
	const passwordResetToken = tokenBuffer ? tokenBuffer.toString('hex') : '';

	const mailerOptions = {
		to: rnid.email.address,
		subject: '[Retendo Network] Forgot Password',
		username: rnid.username,
		paragraph: 'a password reset has been requested from this account. If you did not request the password reset, please ignore this email. If you did request this password reset, please click the link below to reset your password.',
		link: {
			text: 'Reset password',
			href: `${config.website_base}/account/reset-password?token=${encodeURIComponent(passwordResetToken)}`
		},
		text: `Dear ${rnid.username}, a password reset has been requested from this account. \r\n\r\nIf you did not request the password reset, please ignore this email. \r\nIf you did request this password reset, please click the link to reset your password: ${config.website_base}/account/reset-password?token=${encodeURIComponent(passwordResetToken)}`
	};

	await sendMail(mailerOptions);
}

async function sendRNIDDeletedEmail(email, username) {
	const options = {
		to: email,
		subject: '[Retendo Network] RNID Deleted',
		username: username,
		link: {
			text: 'Discord Server',
			href: 'https://discord.gg/QB5YFJfsFJ'
		},
		text: `Your RNID ${username} has successfully been deleted. If you had a tier subscription, a separate cancellation email will be sent. If you do not receive this cancellation email, or your subscription is still being charged, please contact @cedke on our Discord server`
	};

	await sendMail(options);
}

function makeSafeQs(query) {
	const entries = Object.entries(query);
	const output = {};

	for (const [key, value] of entries) {
		if (typeof value !== 'string') {
			// * ignore non-strings
			continue;
		}

		output[key] = value;
	}

	return output;
}

function getValueFromQueryString(qs, key) {
	let property = qs[key];
	let value;

	if (property) {
		if (Array.isArray(property)) {
			property = property[0];
		}

		if (typeof property !== 'string') {
			property = makeSafeQs(property);
			value = property[key];
		} else {
			value = property;
		}
	}

	return value;
}

function getValueFromHeaders(headers, key) {
	let header = headers[key];
	let value;

	if (header) {
		if (!Array.isArray(header)) {
			header = header.split(', ');
		}

		value = header[0];
	}

	return value;
}

function mapToObject(map) {
	return Object.fromEntries(Array.from(map.entries(), ([ k, v ]) => v instanceof Map ? [ k, mapToObject(v) ] : [ k, v ]));
}

module.exports = {
	nintendoPasswordHash,
	nintendoBase64Decode,
	nintendoBase64Encode,
	generateToken,
	decryptToken,
	unpackToken,
	fullUrl,
	uploadCDNAsset,
	writeLocalCDNFile,
	nascDateTime,
	nascError,
	sendConfirmationEmail,
	sendEmailConfirmedEmail,
	sendForgotPasswordEmail,
	sendRNIDDeletedEmail,
	makeSafeQs,
	getValueFromQueryString,
	getValueFromHeaders,
	mapToObject
};