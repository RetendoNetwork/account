// handle "account.nintendo.net/v1/api/content" endpoints

const express = require('express');
const xmlbuilder = require('xmlbuilder');
const timezones = require('../timezones.json');

const router = express.Router();

router.get('/agreements/:type/:region/:version', (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime().toString());

	response.send(xmlbuilder.create({
		agreements: {
			agreement: [
				{
					country: 'US',
					language: 'en',
					language_name: 'English',
					publish_date: '2014-09-29T20:07:35',
					texts: {
						'@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
						'@xsi:type': 'chunkedStoredAgreementText',

						main_title: {
							'#cdata': 'Retendo Network Services Agreement'
						},
						agree_text: {
							'#cdata': 'Accept'
						},
						non_agree_text: {
							'#cdata': 'Decline'
						},
						main_text: {
							'@index': '1',
							'#cdata': 'Welcome to Retendo\'s public beta!'
						},
						sub_title: {
							'#cdata': 'Privacy Policy'
						},
						sub_text: {
							'@index': '1',
							'#cdata': 'Welcome to Retendo\'s public beta!'
						},
					},
					type: 'NINTENDO-NETWORK-EULA',
					version: '0300',
				},
				{
					country: 'US',
					language: 'en',
					language_name: 'Español',
					publish_date: '2014-09-29T20:07:35',
					texts: {
						'@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
						'@xsi:type': 'chunkedStoredAgreementText',

						main_title: {
							'#cdata': 'Retendo Network Services Agreement'
						},
						agree_text: {
							'#cdata': 'Accept'
						},
						non_agree_text: {
							'#cdata': 'Decline'
						},
						main_text: {
							'@index': '1',
							'#cdata': 'Welcome to Retendo\'s public beta!'
						},
						sub_title: {
							'#cdata': 'Privacy Policy'
						},
						sub_text: {
							'@index': '1',
							'#cdata': 'Welcome to Retendo\'s public beta!'
						},
					},
					type: 'NINTENDO-NETWORK-EULA',
					version: '0300',
				},
				{
					country: 'US',
					language: 'en',
					language_name: 'Français',
					publish_date: '2014-09-29T20:07:35',
					texts: {
						'@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
						'@xsi:type': 'chunkedStoredAgreementText',

						main_title: {
							'#cdata': 'Retendo Network Services Agreement'
						},
						agree_text: {
							'#cdata': 'Accept'
						},
						non_agree_text: {
							'#cdata': 'Decline'
						},
						main_text: {
							'@index': '1',
							'#cdata': 'Welcome to Retendo\'s public beta!'
						},
						sub_title: {
							'#cdata': 'Privacy Policy'
						},
						sub_text: {
							'@index': '1',
							'#cdata': 'Welcome to Retendo\'s public beta!'
						},
					},
					type: 'NINTENDO-NETWORK-EULA',
					version: '0300',
				}
			]
		}
	}).end());
});

router.get('/time_zones/:countryCode/:language', (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime().toString());

	/*
	// * Old method. Crashes WiiU when sending a list with over 32 entries, but otherwise works
	// * countryTimezones is "countries-and-timezones" module

	const country = countryTimezones.getCountry(countryCode);
	const timezones = country.timezones.map((timezone, index) => {
		const data = countryTimezones.getTimezone(timezone);

		return {
			area: data.name,
			language,
			name: data.name,
			utc_offset: data.utcOffset * 6 * 10,
			order: index+1
		};
	});
	*/

	const countryCode = request.params.countryCode;
	const language = request.params.language;

	const regionLanguages = timezones[countryCode];
	const regionTimezones = regionLanguages[language] ? regionLanguages[language] : Object.values(regionLanguages)[0];

	response.send(xmlbuilder.create({
		timezones: {
			timezone: regionTimezones
		}
	}).end());
});

module.exports = router;