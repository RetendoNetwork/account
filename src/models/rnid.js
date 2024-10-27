const { Schema, model } = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const imagePixels = require('image-pixels');
const TGA = require('tga');
const got = require('got');
const util = require('../util');
const { DeviceSchema } = require('./device');

const RNIDSchema = new Schema({
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
		id: {
			type: Number,
			unique: true
		}
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
		id: {
			type: Number,
			unique: true
		},
		hash: {
			type: String,
			unique: true
		},
		image_url: String,
		image_id: {
			type: Number,
			unique: true
		},
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
		}
	}
});

RNIDSchema.plugin(uniqueValidator, {message: '{PATH} already in use.'});

/*
	According to http://pf2m.com/tools/rank.php Nintendo PID's start at 1,800,000,000 and count down with each account
	This means the max PID is 1799999999 and hard-limits the number of potential accounts to 1,800,000,000
	The author of that site does not give any information on how they found this out, but it does seem to hold true
	https://account.nintendo.net/v1/api/admin/mapped_ids?input_type=pid&output_type=user_id&input=1800000000 returns nothing
	https://account.nintendo.net/v1/api/admin/mapped_ids?input_type=pid&output_type=user_id&input=1799999999 returns `prodtest1`
	and the next few accounts counting down seem to be admin, service and internal test accounts
*/
RNIDSchema.methods.generatePID = async function() {
	const min = 1000000000; // The console (WiiU) seems to not accept PIDs smaller than this
	const max = 1799999999;

	let pid =  Math.floor(Math.random() * (max - min + 1) + min);

	const inuse = await RNID.findOne({
		pid
	});

	pid = (inuse ? await RNID.generatePID() : pid);

	this.set('pid', pid);
};

RNIDSchema.methods.generateEmailValidationCode = async function() {
	// WiiU passes the PID along with the email code
	// Does not actually need to be unique to all users
	const code = Math.random().toFixed(6).split('.')[1]; // Dirty one-liner to generate numbers of 6 length and padded 0

	this.set('identification.email_code', code);
};

RNIDSchema.methods.generateEmailValidationToken = async function() {
	let token = crypto.randomBytes(32).toString('hex');

	const inuse = await RNID.findOne({
		'identification.email_token': token
	});

	token = (inuse ? await RNID.generateEmailValidationToken() : token);

	this.set('identification.email_token', token);
};

RNIDSchema.methods.getDevice = async function(document) {
	const devices = this.get('devices');

	return devices.find(device => {
		return (
			(device.device_id === document.device_id) &&
			(device.device_type === document.device_type) &&
			(device.serial === document.serial)
		);
	});
};

RNIDSchema.methods.addDevice = async function(device) {
	this.devices.push(device);

	await this.save();
};

RNIDSchema.methods.removeDevice = async function(device) {
	this.devices = this.devices.filter(({ _id }) =>  _id !== device._id);

	await this.save();
};

RNIDSchema.methods.getServerMode = function () {
	const serverMode = this.get('server_mode') || 'prod';

	return serverMode;
};

const RNID = model('RNID', RNIDSchema);

module.exports = {
	RNIDSchema,
	RNID
};