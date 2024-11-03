// handles "account.nintendo.net/v1/api/admin" endpoints

const express = require('express');
const xmlbuilder = require('xmlbuilder');
const { getValueFromQueryString } = require('../../../utils');
const { RNID } = require('../../../models/rnid');

const router = express.Router();

router.get('/mapped_ids', async (request, response) => {
	const inputType = getValueFromQueryString(request.query, 'input_type');
	const outputType = getValueFromQueryString(request.query, 'output_type');
	const input = getValueFromQueryString(request.query, 'input');

	if (!inputType || !outputType || !input) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'Bad Request',
					code: '1600',
					message: 'Unable to process request'
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

	response.send(xmlbuilder.create({
		mapped_ids: {
			mapped_id: results
		}
	}).end());
});

router.get('/time', async (request, response) => {
	response.set('X-Nintendo-Date', Date.now().toString());
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('Date', new Date().toUTCString());

	response.send('');
});

module.exports = router;