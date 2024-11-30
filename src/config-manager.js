const logger = require('./logger');
const dotenv = require('dotenv');

dotenv.config();

const disabledFeatures = {
	redis: false,
	email: false,
	captcha: false,
	s3: false,
	datastore: false
};

const hexadecimalStringRegex = /^[0-9a-f]+$/i;

let mongooseConnectOptions = {};

if (process.env.ACT_CONFIG_MONGOOSE_CONNECT_OPTIONS_PATH) {
	mongooseConnectOptions = fs.readJSONSync(process.env.ACT_CONFIG_MONGOOSE_CONNECT_OPTIONS_PATH);
}

if (process.env.ACT_CONFIG_EMAIL_SECURE) {
	if (process.env.ACT_CONFIG_EMAIL_SECURE !== 'true' && process.env.ACT_CONFIG_EMAIL_SECURE !== 'false') {
		logger.error(`ACT_CONFIG_EMAIL_SECURE must be either true or false, got ${process.env.ACT_CONFIG_EMAIL_SECURE}`);
		process.exit(0);
	}
}

const config = {
	config: {
		port: process.env.ACT_CONFIG_HTTP_PORT || ''
	},
	mongoose: {
		connection_string: process.env.ACT_CONFIG_MONGO_CONNECTION_STRING || '',
		options: mongooseConnectOptions
	},
	redis: {
		client: {
			url: process.env.ACT_CONFIG_REDIS_URL || ''
		}
	},
	email: {
		ses: {
			region: process.env.ACT_CONFIG_EMAIL_SES_REGION || '',
			key: process.env.ACT_CONFIG_EMAIL_SES_ACCESS_KEY || '',
			secret: process.env.ACT_CONFIG_EMAIL_SES_SECRET_KEY || ''
		},
		from: process.env.ACT_CONFIG_EMAIL_FROM || ''
	},
	s3: {
		endpoint: process.env.ACT_CONFIG_S3_ENDPOINT || '',
		key: process.env.ACT_CONFIG_S3_ACCESS_KEY || '',
		secret: process.env.ACT_CONFIG_S3_ACCESS_SECRET || '',
		region: process.env.ACT_CONFIG_S3_REGION || '',
		forcePathStyle: process.env.ACT_CONFIG_S3_FORCE_PATH_STYLE === 'true'
	},
	hcaptcha: {
		secret: process.env.ACT_CONFIG_HCAPTCHA_SECRET || ''
	},
	cdn: {
		subdomain: process.env.ACT_CONFIG_CDN_SUBDOMAIN,
		disk_path: process.env.ACT_CONFIG_CDN_DISK_PATH || '',
		base_url: process.env.ACT_CONFIG_CDN_BASE_URL || ''
	},
	website_base: process.env.ACT_CONFIG_WEBSITE_BASE || '',
	aes_key: process.env.ACT_CONFIG_AES_KEY || ''
};

if (process.env.ACT_CONFIG_STRIPE_SECRET_KEY) {
	config.stripe = {
		secret_key: process.env.ACT_CONFIG_STRIPE_SECRET_KEY
	};
}

let configValid = true;

if (!config.config.port) {
	logger.error('Failed to find HTTP port. Set the ACT_CONFIG_HTTP_PORT environment variable');
	configValid = false;
}

if (!config.mongoose.connection_string) {
	logger.error('Failed to find MongoDB connection string. Set the ACT_CONFIG_MONGO_CONNECTION_STRING environment variable');
	configValid = false;
}

if (!config.cdn.base_url) {
	logger.error('Failed to find asset CDN base URL. Set the ACT_CONFIG_CDN_BASE_URL environment variable');
	configValid = false;
}

if (!config.redis.client.url) {
	logger.warn('Failed to find Redis connection url. Disabling feature and using in-memory cache. To enable feature set the ACT_CONFIG_REDIS_URL environment variable');
	disabledFeatures.redis = true;
}

if (!config.email.ses.region) {
	logger.warn('Failed to find AWS SES region. Disabling feature. To enable feature set the ACT_CONFIG_EMAIL_SES_REGION environment variable');
	disabledFeatures.email = true;
}

if (!config.email.ses.key) {
	logger.warn('Failed to find AWS SES access key. Disabling feature. To enable feature set the ACT_CONFIG_EMAIL_SES_ACCESS_KEY environment variable');
	disabledFeatures.email = true;
}

if (!config.email.ses.secret) {
	logger.warn('Failed to find AWS SES secret key. Disabling feature. To enable feature set the ACT_CONFIG_EMAIL_SES_SECRET_KEY environment variable');
	disabledFeatures.email = true;
}

if (!config.email.from) {
	logger.warn('Failed to find email from config. Disabling feature. To enable feature set the ACT_CONFIG_EMAIL_FROM environment variable');
	disabledFeatures.email = true;
}

if (!disabledFeatures.email) {
	if (!config.website_base) {
		logger.error('Email sending is enabled and no website base was configured. Set the ACT_CONFIG_WEBSITE_BASE environment variable');
		configValid = false;
	}
}

if (!config.hcaptcha.secret) {
	logger.warn('Failed to find captcha secret config. Disabling feature. To enable feature set the ACT_CONFIG_HCAPTCHA_SECRET environment variable');
	disabledFeatures.captcha = true;
}

if (!config.s3.endpoint) {
	logger.warn('Failed to find S3 endpoint config. Disabling feature. To enable feature set the ACT_CONFIG_S3_ENDPOINT environment variable');
	disabledFeatures.s3 = true;
}

if (!config.s3.key) {
	logger.warn('Failed to find S3 access key config. Disabling feature. To enable feature set the ACT_CONFIG_S3_ACCESS_KEY environment variable');
	disabledFeatures.s3 = true;
}

if (!config.s3.secret) {
	logger.warn('Failed to find S3 secret key config. Disabling feature. To enable feature set the ACT_CONFIG_S3_ACCESS_SECRET environment variable');
	disabledFeatures.s3 = true;
}

if (!config.s3.region) {
	logger.warn('Failed to find S3 region config. Disabling feature. To enable feature set the ACT_CONFIG_S3_REGION environment variable');
	disabledFeatures.s3 = true;
}

if (disabledFeatures.s3) {
	if (!config.cdn.disk_path) {
		logger.error('S3 file storage is disabled and no CDN disk path was set. Set the ACT_CONFIG_CDN_DISK_PATH environment variable');
		configValid = false;
	}

	if (configValid) {
		logger.warn(`S3 file storage disabled. Using disk-based file storage. Please ensure cdn.base_url config or ACT_CONFIG_CDN_BASE env variable is set to point to this server with the domain being one of cdn.retendo.online`);

		if (disabledFeatures.redis) {
			logger.warn('Both S3 and Redis are disabled. Large CDN files will use the in-memory cache, which may result in high memory use. Please enable S3 if you\'re running a production server.');
		}
	}	
}

if (!config.aes_key) {
	logger.error('Token AES key is not set. Set the ACT_CONFIG_AES_KEY environment variable to your AES-256-CBC key');
	configValid = false;
}

if (!config.stripe?.secret_key) {
	logger.warn('Failed to find Stripe api key! If a RNID is deleted with an active subscription, the subscription will *NOT* be canceled! Set the ACT_CONFIG_STRIPE_SECRET_KEY environment variable to enable');
}

if (!configValid) {
	logger.error('Config is invalid. Exiting');
	process.exit(0);
}

module.exports = {
	disabledFeatures,
	config
}