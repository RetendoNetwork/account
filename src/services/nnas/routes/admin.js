// handles "account.nintendo.net/v1/api/admin" endpoints

const express = require('express');
const xmlbuilder = require('xmlbuilder');
const { getValueFromQueryString } = require('../../../utils');
const { RNID } = require('../../../models/rnid');

const router = express.Router();

router.get('/mapped_ids', async (req, res) => {
	const inputType = getValueFromQueryString(req.query, 'input_type');
	const outputType = getValueFromQueryString(req.query, 'output_type');
	const input = getValueFromQueryString(req.query, 'input');

	if (!inputType || !outputType || !input) {
		res.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'Bad req',
					code: '1600',
					message: 'Unable to process req'
				}
			}
		}).end());

		return;
	}

	let inputList = input.split(',');
	let queryInput;
	let queryOutput;

	inputList = inputList.filter(input => input);

	if (inputType === 'user_id') {
		queryInput = 'usernameLower';
		inputList = inputList.map(name => name.toLowerCase());
	} else {
		queryInput = 'pid';
	}

	if (outputType === 'user_id') {
		queryOutput = 'username';
	} else {
		queryOutput = 'pid';
	}

	const results = [];
	const allowedTypes = ['pid', 'user_id'];

	for (const input of inputList) {
		const result = {
            in_id: input,
            out_id: ''
        };

		if (allowedTypes.includes(inputType) && allowedTypes.includes(outputType)) {
			const query = {};

			if (queryInput === 'usernameLower') {
				query.usernameLower = input;
			}

			if (queryInput === 'pid') {
				query.pid = Number(input);

				if (isNaN(query.pid)) {
					results.push(result);
					continue;
				}
			}

			const searchResult = await RNID.findOne(query);

			if (searchResult) {
				result.out_id = searchResult.get(queryOutput);
			}
		}

		results.push(result);
	}

	res.send(xmlbuilder.create({
		mapped_ids: {
			mapped_id: results
		}
	}).end());
});

router.get('/time', async (req, res) => {
	res.set('X-Nintendo-Date', Date.now().toString());
	res.set('Server', 'Nintendo 3DS (http)');
	res.set('Date', new Date().toUTCString());

	res.send('');
});

module.exports = router;