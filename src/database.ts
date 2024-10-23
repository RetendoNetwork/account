import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { nintendoPasswordHash, decryptToken, unpackToken } from '@/util';
import { RNID } from '@/models/rnid';
import { Server } from '@/models/server';
import logger from '@/logger';
import { config } from '@/config-manager';
import { HydratedRNIDDocument } from '@/types/mongoose/rnid';
import { IDeviceAttribute } from '@/types/mongoose/device-attribute';
import { HydratedServerDocument } from '@/types/mongoose/server';
import { RNIDProfile } from '@/types/services/nnas/rnid-profile';

const connection_string = config.mongoose.connection_string;
const options = config.mongoose.options;

let _connection: mongoose.Connection;

export async function connect(): Promise<void> {
	await mongoose.connect(connection_string, options);

	_connection = mongoose.connection;
	_connection.on('error', console.error.bind(console, 'connection error:'));
}

export function connection(): mongoose.Connection {
	return _connection;
}

export function verifyConnected(): void {
	if (!connection()) {
		throw new Error('Cannot make database requets without being connected');
	}
}

export async function getRNIDByUsername(username: string): Promise<HydratedRNIDDocument | null> {
	verifyConnected();

	return await RNID.findOne<HydratedRNIDDocument>({
		usernameLower: username.toLowerCase()
	});
}

export async function getRNIDByPID(pid: number): Promise<HydratedRNIDDocument | null> {
	verifyConnected();

	return await RNID.findOne<HydratedRNIDDocument>({
		pid
	});
}

export async function getRNIDByEmailAddress(email: string): Promise<HydratedRNIDDocument | null> {
	verifyConnected();

	// TODO - Update documents to store email normalized
	return await RNID.findOne<HydratedRNIDDocument>({
		'email.address': email
	});
}

export async function doesRNIDExist(username: string): Promise<boolean> {
	verifyConnected();

	return !!await getRNIDByUsername(username);
}

export async function getRNIDByBasicAuth(token: string): Promise<HydratedRNIDDocument | null> {
	verifyConnected();

	// * Wii U sends Basic auth as `username password`, where the password may not have spaces
	// * This is not to spec, but that is the consoles fault not ours
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

export async function getRNIDByTokenAuth(token: string): Promise<HydratedRNIDDocument | null> {
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
	} catch (error: any) {
		// TODO - Handle error
		logger.error(error);
		return null;
	}
}

export async function getRNIDProfileJSONByPID(pid: number): Promise<RNIDProfile | null> {
	verifyConnected();

	const rnid = await getRNIDByPID(pid);

	if (!rnid) {
		return null;
	}

	const device = rnid.devices[0]; // * Just grab the first device
	let device_attributes: {
		device_attribute: {
			name: string;
			value: string;
			created_date: string;
		};
	}[] = [];

	if (device) {
		device_attributes = device.device_attributes.map((attribute: IDeviceAttribute) => {
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
		// *accounts: {}, // * We need to figure this out, no idea what these values mean or what they do
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
			updated_by: 'USER', // * Can also be INTERNAL WS, don't know the difference
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
					// * Images MUST be loaded over HTTPS or console ignores them
					// * Bunny CDN is the only CDN which seems to support TLS 1.0/1.1 (required)
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

export async function getServerByGameServerID(gameServerID: string, accessMode: string): Promise<HydratedServerDocument | null> {
	return await Server.findOne({
		game_server_id: gameServerID,
		access_mode: accessMode
	});
}

export async function getServerByTitleID(titleID: string, accessMode: string): Promise<HydratedServerDocument | null> {
	return await Server.findOne({
		title_ids: titleID,
		access_mode: accessMode
	});
}

export async function getServerByClientID(clientID: string, accessMode: string): Promise<HydratedServerDocument | null> {
	return await Server.findOne({
		client_id: clientID,
		access_mode: accessMode
	});
}