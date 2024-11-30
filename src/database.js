const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const joi = require('joi');
const { nintendoPasswordHash, decryptToken, unpackToken } = require('./utils');
const { RNID } = require('./models/rnid');
const { Server } = require('./models/server');
const logger = require('./logger');
const { config, disabledFeatures } = require('./config-manager');

const connection_string = config.mongoose.connection_string;
const options = {
	useNewUrlParser: true,
	useUnifiedTopology: true
};

const discordConnectionSchema = joi.object({
	id: joi.string()
});

let _connection;

async function connect() {
	await mongoose.connect(connection_string, options);

	_connection = mongoose.connection;
	_connection.on('error', console.error.bind(console, 'connection error:'));
}

function connection() {
	return _connection;
}

function verifyConnected() {
	if (!connection()) {
		throw new Error('Cannot make database requets without being connected');
	}
}

async function getRNIDByUsername(username) {
	verifyConnected();

	return await RNID.findOne({
		usernameLower: username.toLowerCase()
	});
}

async function getRNIDByPID(pid) {
	verifyConnected();

	return await RNID.findOne({
		pid
	});
}

async function getRNIDByEmailAddress(email) {
	verifyConnected();

	return await RNID.findOne({
		'email.address': email
	});
}

async function doesRNIDExist(username) {
	verifyConnected();

	return !!await getRNIDByUsername(username);
}

async function getRNIDByBasicAuth(token) {
	verifyConnected();

	const decoded = Buffer.from(token, 'base64').toString();
	const parts = decoded.split(' ');

	const username = parts[0];
	const password = parts[1];

	const rnid = await getRNIDByUsername(username);

	if (!rnid) {
		return null;
	}

	const hashedPassword = nintendoPasswordHash(password, rnid.pid);

	if (!bcrypt.compareSync(hashedPassword, rnid.password)) {
		return null;
	}

	return rnid;
}

async function getRNIDByTokenAuth(token) {
	verifyConnected();

	try {
		const decryptedToken = decryptToken(Buffer.from(token, 'hex'));
		const unpackedToken = unpackToken(decryptedToken);
		const rnid = await getRNIDByPID(unpackedToken.pid);

		if (rnid) {
			const expireTime = Math.floor((Number(unpackedToken.expire_time) / 1000));

			if (Math.floor(Date.now() / 1000) > expireTime) {
				return null;
			}
		}

		return rnid;
	} catch (error) {
		logger.error(error);
		return null;
	}
}

async function getRNIDProfileJSONByPID(pid) {
	verifyConnected();

	const rnid = await getRNIDByPID(pid);

	if (!rnid) {
		return null;
	}

	const device = rnid.devices[0];
    let device_attributes = [];

	if (device) {
		device_attributes = device.device_attributes.map((attribute) => {
			const name = attribute.name;
			const value = attribute.value;
			const created_date = attribute.created_date;

			return {
				device_attribute: {
					name,
					value,
					created_date: created_date ? created_date : ''
				}
			};
		});
	}

	return {
		active_flag: rnid.flags.active ? 'Y' : 'N',
		birth_date: rnid.birthdate,
		country: rnid.country,
		create_date: rnid.creation_date,
		device_attributes: device_attributes,
		gender: rnid.gender,
		language: rnid.language,
		updated: rnid.updated,
		marketing_flag: rnid.flags.marketing ? 'Y' : 'N',
		off_device_flag: rnid.flags.off_device ? 'Y' : 'N',
		pid: rnid.pid,
		email: {
			address: rnid.email.address,
			id: rnid.email.id,
			parent: rnid.email.parent ? 'Y' : 'N',
			primary: rnid.email.primary ? 'Y' : 'N',
			reachable: rnid.email.reachable ? 'Y' : 'N',
			type: 'DEFAULT',
			updated_by: 'USER',
			validated: rnid.email.validated ? 'Y' : 'N',
			validated_date: rnid.email.validated ? rnid.email.validated_date : ''
		},
		mii: {
			status: 'COMPLETED',
			data: rnid.mii.data.replace(/(\r\n|\n|\r)/gm, ''),
			id: rnid.mii.id,
			mii_hash: rnid.mii.hash,
			mii_images: {
				mii_image: {
					cached_url: `${config.cdn.base_url}/mii/${rnid.pid}/standard.tga`,
					id: rnid.mii.image_id,
					url: `${config.cdn.base_url}/mii/${rnid.pid}/standard.tga`,
					type: 'standard'
				}
			},
			name: rnid.mii.name,
			primary: rnid.mii.primary ? 'Y' : 'N',
		},
		region: rnid.region,
		tz_name: rnid.timezone.name,
		user_id: rnid.username,
		utc_offset: rnid.timezone.offset
	};
}

async function getServerByGameServerID(gameServerID, accessMode) {
	return await Server.findOne({
		game_server_id: gameServerID,
		access_mode: accessMode
	});
}

async function getServerByTitleID(titleID, accessMode) {
	return await Server.findOne({
		title_ids: titleID,
		access_mode: accessMode
	});
}

async function getServerByClientID(clientID, accessMode) {
	return await Server.findOne({
		client_id: clientID,
		access_mode: accessMode
	});
}


async function addRNIDConnection(rnid, data, type) {
	if (type === 'discord') {
		return await addRNIDConnectionDiscord(rnid, data);
	}
}

async function addRNIDConnectionDiscord(rnid, data) {
	const valid = discordConnectionSchema.validate(data);

	if (valid.error) {
		return {
			app: 'api',
			status: 400,
			error: 'Invalid or missing connection data'
		};
	}

	await RNID.updateOne({ pid: rnid.pid }, {
		$set: {
			'connections.discord.id': data.id
		}
	});

	return {
		app: 'api',
		status: 200
	};
}

async function removeRNIDConnection(rnid, type) {
	if (type === 'discord') {
		return await removeRNIDConnectionDiscord(rnid);
	}
}

async function removeRNIDConnectionDiscord(rnid) {
	await RNID.updateOne({ pid: rnid.pid }, {
		$set: {
			'connections.discord.id': ''
		}
	});

	return {
		app: 'api',
		status: 200
	};
}

module.exports = {
	connect,
	connection,
	verifyConnected,
	getRNIDByUsername,
	getRNIDByPID,
	getRNIDByEmailAddress,
	doesRNIDExist,
	getRNIDByBasicAuth,
	getRNIDByTokenAuth,
	getRNIDProfileJSONByPID,
	getServerByGameServerID,
	getServerByTitleID,
	getServerByClientID,
	addRNIDConnection,
	addRNIDConnectionDiscord,
	removeRNIDConnection,
	removeRNIDConnectionDiscord
}