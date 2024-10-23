import express from 'express';
import validator from 'validator';
import hcaptcha from 'hcaptcha';
import { getRNIDByEmailAddress, getRNIDByUsername } from '@/database';
import { sendForgotPasswordEmail } from '@/util';
import { config, disabledFeatures } from '@/config-manager';
import { HydratedRNIDDocument } from '@/types/mongoose/rnid';

const router = express.Router();

router.post('/', async (request: express.Request, response: express.Response): Promise<void> => {
	const input = request.body?.input;
	const hCaptchaResponse = request.body.hCaptchaResponse?.trim();

	if (!disabledFeatures.captcha) {
		if (!hCaptchaResponse || hCaptchaResponse === '') {
			response.status(400).json({
				app: 'api',
				status: 400,
				error: 'Must fill in captcha',
			});

			return;
		}

		const captchaVerify = await hcaptcha.verify(
			config.hcaptcha.secret,
			hCaptchaResponse
		);

		if (!captchaVerify.success) {
			response.status(400).json({
				app: 'api',
				status: 400,
				error: 'Captcha verification failed',
			});

			return;
		}
	}

	if (!input || input.trim() === '') {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing input'
		});

		return;
	}

	let rnid: HydratedRNIDDocument | null;

	if (validator.isEmail(input)) {
		rnid = await getRNIDByEmailAddress(input);
	} else {
		rnid = await getRNIDByUsername(input);
	}

	if (rnid) {
		await sendForgotPasswordEmail(rnid);
	}

	response.json({
		app: 'api',
		status: 200
	});
});

export default router;