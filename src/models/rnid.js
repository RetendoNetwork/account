const crypto = require('node:crypto');
const { Schema, model } = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const imagePixels = require('image-pixels');
const TGA = require('tga');
const got = require('got');
const Mii = require('mii-js');
const Stripe = require('stripe');
const { DeviceSchema } = require('./device');
const { uploadCDNAsset } = require('../utils');
const logger = require('../logger');
const { config, disabledFeatures } = require('../config-manager');

let stripe;

if (config.stripe?.secret_key) {
	stripe = new Stripe(config.stripe.secret_key, {
		apiVersion: '2022-11-15',
		typescript: true,
	});
}

const RNIDSchema = new Schema({
	deleted: {
		type: Boolean,
		default: false
	},
	permissions: {
		type: BigInt,
		default: 0n
	},
	access_level: {
		type: Number,
		default: 0 
	},
	server_access_level: {
		type: String,
		default: 'prod'
	},
	pid: {
		type: Number,
		unique: true
	},
	creation_date: String,
	updated: String,
	username: {
		type: String,
		unique: true,
		minlength: 6,
		maxlength: 16
	},
	usernameLower: {
		type: String,
		unique: true
	},
	password: String,
	birthdate: String,
	gender: String,
	country: String,
	language: String,
	email: {
		address: String,
		primary: Boolean,
		parent: Boolean,
		reachable: Boolean,
		validated: Boolean,
		validated_date: String,
		id: Number
	},
	region: Number,
	timezone: {
		name: String,
		offset: Number
	},
	mii: {
		name: String,
		primary: Boolean,
		data: String,
		id: Number,
		hash: String,
		image_url: String,
		image_id: Number,
	},
	flags: {
		active: Boolean,
		marketing: Boolean,
		off_device: Boolean
	},
	devices: [DeviceSchema],
	identification: {
		email_code: {
			type: String,
			unique: true
		},
		email_token: {
			type: String,
			unique: true
		},
		access_token: {
			value: String,
			ttl: Number
		},
		refresh_token: {
			value: String,
			ttl: Number
		}
	},
	connections: {
		discord: {
			id: String
		},
		stripe: {
			customer_id: String,
			subscription_id: String,
			price_id: String,
			tier_level: Number,
			tier_name: String,
			latest_webhook_timestamp: Number
		}
	}
}, { id: false });

RNIDSchema.plugin(uniqueValidator, {message: '{PATH} already in use.'});

/*
	According to http://pf2m.com/tools/rank.php Nintendo PID's start at 1,800,000,000 and count down with each account
	This means the max PID is 1799999999 and hard-limits the number of potential accounts to 1,800,000,000
	The author of that site does not give any information on how they found this out, but it does seem to hold true
	https://account.nintendo.net/v1/api/admin/mapped_ids?input_type=pid&output_type=user_id&input=1800000000 returns nothing
	https://account.nintendo.net/v1/api/admin/mapped_ids?input_type=pid&output_type=user_id&input=1799999999 returns `prodtest1`
	and the next few accounts counting down seem to be admin, service and internal test accounts
*/
RNIDSchema.method('generatePID', async function generatePID() {
	const min = 1000000000; // * The console (WiiU) seems to not accept PIDs smaller than this
	const max = 1799999999;

	const pid =  Math.floor(Math.random() * (max - min + 1) + min);

	const inuse = await RNID.findOne({
		pid
	});

	if (inuse) {
		await this.generatePID();
	} else {
		this.pid = pid;
	}
});

RNIDSchema.method('generateEmailValidationCode', async function generateEmailValidationCode() {
	// * WiiU passes the PID along with the email code
	// * Does not actually need to be unique to all users
	const code = Math.random().toFixed(6).split('.')[1]; // * Dirty one-liner to generate numbers of 6 length and padded 0

	this.identification.email_code = code;
});

RNIDSchema.method('generateEmailValidationToken', async function generateEmailValidationToken() {
	const token = crypto.randomBytes(32).toString('hex');

	const inuse = await RNID.findOne({
		'identification.email_token': token
	});

	if (inuse) {
		await this.generateEmailValidationToken();
	} else {
		this.identification.email_token = token;
	}
});

RNIDSchema.method('updateMii', async function updateMii({ name, primary, data }) {
	this.mii.name = name;
	this.mii.primary = primary === 'Y';
	this.mii.data = data;
	this.mii.hash = crypto.randomBytes(7).toString('hex');
	this.mii.id = crypto.randomBytes(4).readUInt32LE();
	this.mii.image_id = crypto.randomBytes(4).readUInt32LE();

	await this.generateMiiImages();

	await this.save();
});

RNIDSchema.method('generateMiiImages', async function generateMiiImages() {
	const miiData = this.mii.data;
	const mii = new Mii(Buffer.from(miiData, 'base64'));
	const miiStudioUrl = mii.studioUrl({
		type: 'face',
		width: 128,
		instanceCount: 1,
	});
	const miiStudioNormalFaceImageData = await got(miiStudioUrl).buffer();
	const pngData = await imagePixels(miiStudioNormalFaceImageData);
	const tga = TGA.createTgaBuffer(pngData.width, pngData.height, Uint8Array.from(pngData.data), false);

	const userMiiKey = `mii/${this.pid}`;

	await uploadCDNAsset('cdn', `${userMiiKey}/standard.tga`, tga, 'public-read');
	await uploadCDNAsset('cdn', `${userMiiKey}/normal_face.png`, miiStudioNormalFaceImageData, 'public-read');

	const expressions = ['frustrated', 'smile_open_mouth', 'wink_left', 'sorrow', 'surprise_open_mouth'];
	for (const expression of expressions) {
		const miiStudioExpressionUrl = mii.studioUrl({
			type: 'face',
			expression: expression,
			width: 128,
			instanceCount: 1,
		});
		const miiStudioExpressionImageData = await got(miiStudioExpressionUrl).buffer();
		await uploadCDNAsset('cdn', `${userMiiKey}/${expression}.png`, miiStudioExpressionImageData, 'public-read');
	}

	const miiStudioBodyUrl = mii.studioUrl({
		type: 'all_body',
		width: 270,
		instanceCount: 1,
	});
	const miiStudioBodyImageData = await got(miiStudioBodyUrl).buffer();
	await uploadCDNAsset('cdn', `${userMiiKey}/body.png`, miiStudioBodyImageData, 'public-read');
});

RNIDSchema.method('scrub', async function scrub() {
	if (this.connections?.stripe?.subscription_id) {
		try {
			if (stripe) {
				await stripe.subscriptions.del(this.connections.stripe.subscription_id);
			} else {
				LOG_WARN(`SCRUBBING USER DATA FOR USER ${this.username}. HAS STRIPE SUBSCRIPTION ${this.connections.stripe.subscription_id}, BUT STRIPE CLIENT NOT ENABLED. SUBSCRIPTION NOT CANCELED`);
			}
		} catch (error) {
			LOG_ERROR(`ERROR REMOVING ${this.username} STRIPE SUBSCRIPTION. ${error}`);
		}
	}

	await this.updateMii({
		name: 'Default',
		primary: 'Y',
		data: 'AwAAQOlVognnx0GC2/uogAOzuI0n2QAAAEBEAGUAZgBhAHUAbAB0AAAAAAAAAEBAAAAhAQJoRBgmNEYUgRIXaA0AACkAUkhQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGm9'
	});

	this.deleted = true;
	this.access_level = 0;
	this.server_access_level = 'prod';
	this.creation_date = '';
	this.birthdate = '';
	this.gender = '';
	this.country = '';
	this.language = '';
	this.email.address = '';
	this.email.primary = false;
	this.email.parent = false;
	this.email.reachable = false;
	this.email.validated = false;
	this.email.validated_date = '';
	this.email.id = 0;
	this.region = 0;
	this.timezone.name = '';
	this.timezone.offset = 0;
	this.mii.id = 0;
	this.mii.hash = '';
	this.mii.image_url = '';
	this.mii.image_id = 0;
	this.flags.active = false;
	this.flags.marketing = false;
	this.flags.off_device = false;
	this.connections.discord.id = '';
	this.connections.stripe.customer_id = '';
	this.connections.stripe.subscription_id = '';
	this.connections.stripe.price_id = '';
	this.connections.stripe.tier_level = 0;
	this.connections.stripe.tier_name = '';
	this.connections.stripe.latest_webhook_timestamp = 0;
});

RNIDSchema.method('hasPermission', function hasPermission(flag) {
	return (this.permissions & flag) === flag;
});

RNIDSchema.method('addPermission', function addPermission(flag) {
	this.permissions |= flag;
});

RNIDSchema.method('clearPermission', function clearPermission(flag) {
	this.permissions &= ~flag;
});

const RNID = model('RNID', RNIDSchema);

module.exports = {
	RNIDSchema,
	RNID
};