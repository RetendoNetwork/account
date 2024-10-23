import colors from 'colors';
import moment from 'moment';

colors.enable();

const logger = {
	log: (msg: string): void => {
		console.log(`[INFO] (${moment().format('HH:mm:ss')}) ${msg}`.green);
	},

	info: (msg: string): void => {
		console.log(`[INFO] (${moment().format('HH:mm:ss')}) ${msg}`.blue);
	},

	warn: (msg: string): void => {
		console.log(`[WARN] (${moment().format('HH:mm:ss')}) ${msg}`.yellow);
	},

	error: (msg: string): void => {
		console.log(`[ERROR] (${moment().format('HH:mm:ss')}) ${msg}`.red);
	},

	database: (msg: string): void => {
		console.log(`[DATABASE] (${moment().format('HH:mm:ss')}) ${msg}`.cyan);
	},

	http_log: (req: { method: string; url: string }, res: unknown, next: () => void): void => {
		switch (req.method) {
			case 'GET':
				console.log(`[GET] (${moment().format('HH:mm:ss')}) ${req.url}`.green);
				break;
			case 'POST':
				console.log(`[POST] (${moment().format('HH:mm:ss')}) ${req.url}`.yellow);
				break;
			case 'PUT':
				console.log(`[PUT] (${moment().format('HH:mm:ss')}) ${req.url}`.blue);
				break;
			case 'DELETE':
				console.log(`[DELETE] (${moment().format('HH:mm:ss')}) ${req.url}`.red);
				break;
			default:
				console.log(`[${req.method}] (${moment().format('HH:mm:ss')}) ${req.url}`.cyan);
				break;
		}

		next();
	}
};

export default logger;