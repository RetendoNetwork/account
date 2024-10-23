import { Model, Types, HydratedDocument } from 'mongoose';
import { IDevice } from '@/types/mongoose/device';
import { RNIDPermissionFlag } from '@/types/common/permission-flags';

export interface IRNID {
	deleted: boolean;
	permissions: bigint;
	access_level: number;
	server_access_level: string;
	pid: number;
	creation_date: string;
	updated: string;
	username: string;
	usernameLower: string;
	password: string;
	birthdate: string;
	gender: string;
	country: string;
	language: string;
	email: {
		address: string;
		primary: boolean;
		parent: boolean;
		reachable: boolean;
		validated: boolean;
		validated_date: string;
		id: number;
	};
	region: number;
	timezone: {
		name: string;
		offset: number;
		marketing: boolean;
		off_device: boolean;
	};
	mii: {
		name: string;
		primary: boolean;
		data: string;
		id: number;
		hash: string;
		image_url: string;
		image_id: number;
	};
	flags: {
		active: boolean;
		marketing: boolean;
		off_device: boolean;
	};
	devices: Types.DocumentArray<IDevice>;
	identification: { // * user identification tokens
		email_code: string;
		email_token: string;
		access_token: {
			value: string;
			ttl: number;
		};
		refresh_token: {
			value: string;
			ttl: number;
		}
	};
	connections: {
		stripe: {
			customer_id: string;
			subscription_id: string;
			price_id: string;
			tier_level: number;
			tier_name: string;
			latest_webhook_timestamp: number;
		};
	};
}

export interface IRNIDMethods {
	generatePID(): Promise<void>;
	generateEmailValidationCode(): Promise<void>;
	generateEmailValidationToken(): Promise<void>;
	updateMii(mii: { name: string, primary: string, data: string}): Promise<void>;
	generateMiiImages(): Promise<void>;
	scrub(): Promise<void>;
	hasPermission(flag: RNIDPermissionFlag): boolean;
	addPermission(flag: RNIDPermissionFlag): void;
	clearPermission(flag: RNIDPermissionFlag): void;
}

interface IRNIDQueryHelpers {}

export type RNIDModel = Model<IRNID, IRNIDQueryHelpers, IRNIDMethods>

export type HydratedRNIDDocument = HydratedDocument<IRNID, IRNIDMethods>