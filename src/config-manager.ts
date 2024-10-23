import fs from 'fs-extra';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '@/logger';
import { Config } from '@/types/common/config';

dotenv.config();

export const disabledFeatures = {
	redis: false,
	email: false,
	captcha: false,
	s3: false
};

const hexadecimalStringRegex = /^[0-9a-f]+$/i;

logger.info('Loading config');

let mongooseConnectOptions: mongoose.ConnectOptions = {};

if (process.env.RN_ACT_CONFIG_MONGOOSE_CONNECT_OPTIONS_PATH) {
	mongooseConnectOptions = fs.readJSONSync(process.env.RN_ACT_CONFIG_MONGOOSE_CONNECT_OPTIONS_PATH);
}

if (process.env.RN_ACT_CONFIG_EMAIL_SECURE) {
	if (process.env.RN_ACT_CONFIG_EMAIL_SECURE !== 'true' && process.env.RN_ACT_CONFIG_EMAIL_SECURE !== 'false') {
		logger.error(`RN_ACT_CONFIG_EMAIL_SECURE must be either true or false, got ${process.env.RN_ACT_CONFIG_EMAIL_SECURE}`);
		process.exit(0);
	}
}

export const config: Config = {
	http: {
		port: Number(process.env.RN_ACT_CONFIG_HTTP_PORT || '')
	},
	mongoose: {
		connection_string: process.env.RN_ACT_CONFIG_MONGO_CONNECTION_STRING || '',
		options: mongooseConnectOptions
	},
	redis: {
		client: {
			url: process.env.RN_ACT_CONFIG_REDIS_URL || ''
		}
	},
	email: {
		ses: {
			region: process.env.RN_ACT_CONFIG_EMAIL_SES_REGION || '',
			key: process.env.RN_ACT_CONFIG_EMAIL_SES_ACCESS_KEY || '',
			secret: process.env.RN_ACT_CONFIG_EMAIL_SES_SECRET_KEY || ''
		},
		from: process.env.RN_ACT_CONFIG_EMAIL_FROM || ''
	},
	s3: {
		endpoint: process.env.RN_ACT_CONFIG_S3_ENDPOINT || '',
		key: process.env.RN_ACT_CONFIG_S3_ACCESS_KEY || '',
		secret: process.env.RN_ACT_CONFIG_S3_ACCESS_SECRET || ''
	},
	hcaptcha: {
		secret: process.env.RN_ACT_CONFIG_HCAPTCHA_SECRET || ''
	},
	cdn: {
		subdomain: process.env.RN_ACT_CONFIG_CDN_SUBDOMAIN || '',
		disk_path: process.env.RN_ACT_CONFIG_CDN_DISK_PATH || '',
		base_url: process.env.RN_ACT_CONFIG_CDN_BASE_URL || ''
	},
	website_base: process.env.RN_ACT_CONFIG_WEBSITE_BASE || '',
	aes_key: process.env.RN_ACT_CONFIG_AES_KEY || '',
	grpc: {
		master_api_keys: {
			account: process.env.RN_ACT_CONFIG_GRPC_MASTER_API_KEY_ACCOUNT || '',
			api: process.env.RN_ACT_CONFIG_GRPC_MASTER_API_KEY_API || '',
		},
		port: Number(process.env.RN_ACT_CONFIG_GRPC_PORT || ''),
	},
	server_environment: process.env.RN_ACT_CONFIG_SERVER_ENVIRONMENT || '',
	datastore: {
		signature_secret: process.env.RN_ACT_CONFIG_DATASTORE_SIGNATURE_SECRET || ''
	}
};

if (process.env.RN_ACT_CONFIG_STRIPE_SECRET_KEY) {
	config.stripe = {
		secret_key: process.env.RN_ACT_CONFIG_STRIPE_SECRET_KEY
	};
}

logger.info('Config loaded, checking integrity');

if (!config.http.port) {
	logger.error('Failed to find HTTP port. Set the RN_ACT_CONFIG_HTTP_PORT environment variable');
	process.exit(0);
}

if (!config.mongoose.connection_string) {
	logger.error('Failed to find MongoDB connection string. Set the RN_ACT_CONFIG_MONGO_CONNECTION_STRING environment variable');
	process.exit(0);
}

if (!config.cdn.base_url) {
	logger.error('Failed to find asset CDN base URL. Set the RN_ACT_CONFIG_CDN_BASE_URL environment variable');
	process.exit(0);
}

if (!config.redis.client.url) {
	logger.warn('Failed to find Redis connection url. Disabling feature and using in-memory cache. To enable feature set the PN_ACT_CONFIG_REDIS_URL environment variable');
	disabledFeatures.redis = true;
}

if (!config.email.ses.region) {
	logger.warn('Failed to find AWS SES region. Disabling feature. To enable feature set the RN_ACT_CONFIG_EMAIL_SES_REGION environment variable');
	disabledFeatures.email = true;
}

if (!config.email.ses.key) {
	logger.warn('Failed to find AWS SES access key. Disabling feature. To enable feature set the RN_ACT_CONFIG_EMAIL_SES_ACCESS_KEY environment variable');
	disabledFeatures.email = true;
}

if (!config.email.ses.secret) {
	logger.warn('Failed to find AWS SES secret key. Disabling feature. To enable feature set the RN_ACT_CONFIG_EMAIL_SES_SECRET_KEY environment variable');
	disabledFeatures.email = true;
}

if (!config.email.from) {
	logger.warn('Failed to find email from config. Disabling feature. To enable feature set the RN_ACT_CONFIG_EMAIL_FROM environment variable');
	disabledFeatures.email = true;
}

if (!disabledFeatures.email) {
	if (!config.website_base) {
		logger.error('Email sending is enabled and no website base was configured. Set the RN_ACT_CONFIG_WEBSITE_BASE environment variable');
		process.exit(0);
	}
}

if (!config.hcaptcha.secret) {
	logger.warn('Failed to find captcha secret config. Disabling feature. To enable feature set the RN_ACT_CONFIG_HCAPTCHA_SECRET environment variable');
	disabledFeatures.captcha = true;
}

if (!config.s3.endpoint) {
	logger.warn('Failed to find s3 endpoint config. Disabling feature. To enable feature set the RN_ACT_CONFIG_S3_ENDPOINT environment variable');
	disabledFeatures.s3 = true;
}

if (!config.s3.key) {
	logger.warn('Failed to find s3 access key config. Disabling feature. To enable feature set the RN_ACT_CONFIG_S3_ACCESS_KEY environment variable');
	disabledFeatures.s3 = true;
}

if (!config.s3.secret) {
	logger.warn('Failed to find s3 secret key config. Disabling feature. To enable feature set the RN_ACT_CONFIG_S3_ACCESS_SECRET environment variable');
	disabledFeatures.s3 = true;
}

if (!config.server_environment) {
	logger.warn('Failed to find server environment. To change the environment, set the RN_ACT_CONFIG_SERVER_ENVIRONMENT environment variable. Defaulting to prod');
	config.server_environment = 'prod';
}

if (disabledFeatures.s3) {
	if (!config.cdn.subdomain) {
		logger.error('s3 file storage is disabled and no CDN subdomain was set. Set the RN_ACT_CONFIG_CDN_SUBDOMAIN environment variable');
		process.exit(0);
	}

	if (!config.cdn.disk_path) {
		logger.error('s3 file storage is disabled and no CDN disk path was set. Set the RN_ACT_CONFIG_CDN_DISK_PATH environment variable');
		process.exit(0);
	}

	logger.warn(`s3 file storage disabled. Using disk-based file storage. Please ensure cdn.base_url config or RN_ACT_CONFIG_CDN_BASE env variable is set to point to this server with the subdomain being ${config.cdn.subdomain}`);

	if (disabledFeatures.redis) {
		logger.warn('Both s3 and Redis are disabled. Large CDN files will use the in-memory cache, which may result in high memory use. Please enable s3 if you\'re running a production server.');
	}
}

if (!config.aes_key) {
	logger.error('Token AES key is not set. Set the RN_ACT_CONFIG_AES_KEY environment variable to your AES-256-CBC key');
	process.exit(0);
}

if (!config.grpc.master_api_keys.account) {
	logger.error('Master gRPC API key for the account service is not set. Set the RN_ACT_CONFIG_GRPC_MASTER_API_KEY_ACCOUNT environment variable');
	process.exit(0);
}

if (!config.grpc.master_api_keys.api) {
	logger.error('Master gRPC API key for the api service is not set. Set the RN_ACT_CONFIG_GRPC_MASTER_API_KEY_API environment variable');
	process.exit(0);
}

if (!config.grpc.port) {
	logger.error('Failed to find gRPC port. Set the RN_ACT_CONFIG_GRPC_PORT environment variable');
	process.exit(0);
}

if (!config.stripe?.secret_key) {
	logger.warn('Failed to find Stripe api key! If a RNID is deleted with an active subscription, the subscription will *NOT* be canceled! Set the PN_ACT_CONFIG_STRIPE_SECRET_KEY environment variable to enable');
}

if (!config.datastore.signature_secret) {
	logger.error('Datastore signature secret key is not set. Set the RN_ACT_CONFIG_DATASTORE_SIGNATURE_SECRET environment variable');
	process.exit(0);
}
if (config.datastore.signature_secret.length !== 32 || !hexadecimalStringRegex.test(config.datastore.signature_secret)) {
	logger.error('Datastore signature secret key must be a 32-character hexadecimal string.');
	process.exit(0);
}