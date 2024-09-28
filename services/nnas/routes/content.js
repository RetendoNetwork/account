// handles "account.nintendo.net/v1/api/content" endpoints

const express = require('express');
const database = require('../../../utils/database');
const xmlbuilder = require('xmlbuilder');
const timezones = require('../timezones.json');
const router = express.Router();

router.get('/agreements/:type/:region/:version', (req, res) => {
	res.set('Content-Type', 'text/xml');
	res.set('Server', 'Nintendo 3DS (http)');
	res.set('X-Nintendo-Date', new Date().getTime());

	res.send(xmlbuilder.create({
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
							'#cdata': 'Retendo Network Account Services Agreement'
						},
						agree_text: {
							'#cdata': 'I Accept'
						},
						non_agree_text: {
							'#cdata': 'I Decline'
						},
						main_text: {
							'@index': '1',
							'#cdata': "Welcome to the Retendo Network beta! If you're creating a Retendo Network account on your console, it's probably to use our online services!\nPress (I agree) to accept the agreement and read the rules for using our services !"
						},
						sub_title: {
							'#cdata': 'Privacy Policy'
						},
						sub_text: {
							'@index': '1',
							'#cdata': "Welcome to the Retendo Network rules. Before using our gaming services, please keep these rules in mind:\nDo not submit NSFW, homophobic or racist content.\nDo not say offensive words."
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
							'#cdata': 'Acuerdo de servicios de cuenta Retendo Network'
						},
						agree_text: {
							'#cdata': 'Acepto'
						},
						non_agree_text: {
							'#cdata': 'No Acepto'
						},
						main_text: {
							'@index': '1',
							'#cdata': "¡Bienvenido a la versión beta de Retendo Network! Si estás creando una cuenta de Retendo Network en tu consola, ¡probablemente sea para usar nuestros servicios en línea!\n¡Presiona (Acepto) para aceptar el contrato y leer las reglas para usar nuestros servicios !"
						},
						sub_title: {
							'#cdata': 'política de privacidad'
						},
						sub_text: {
							'@index': '1',
							'#cdata': "Bienvenido a las reglas de la Red Retendo. Antes de utilizar nuestros servicios de juego, tenga en cuenta estas reglas:\nNo envíe contenido NSFW, homofóbico o racista.\nNo diga palabras ofensivas."
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
							'#cdata': 'Contrat de services de compte Retendo Network'
						},
						agree_text: {
							'#cdata': "J'accepte"
						},
						non_agree_text: {
							'#cdata': 'Je décline'
						},
						main_text: {
							'@index': '1',
							'#cdata': "Bienvenue dans la version bêta de Retendo Network ! Si vous créez un compte Retendo Network sur votre console, c'est probablement pour utiliser nos services en ligne !\n Appuyez sur (J'accepte) pour accepter le contrat et lire les règles d'utilisation de nos services !"
						},
						sub_title: {
							'#cdata': 'Politique de confidentialité'
						},
						sub_text: {
							'@index': '1',
							'#cdata': "Bienvenue dans les règles de Retendo Network. Avant d'utiliser nos services de jeux, veuillez garder ces règles à l'esprit :\nNe soumettez pas de contenu NSFW, homophobe ou raciste.\nNe prononcez pas de mots offensants."
						},
					},
					type: 'NINTENDO-NETWORK-EULA',
					version: '0300',
				}
			]
		}
	}).end());
});

router.get('/time_zones/:countryCode/:language', (req, res) => {
	res.set('Content-Type', 'text/xml');
	res.set('Server', 'Nintendo 3DS (http)');
	res.set('X-Nintendo-Date', new Date().getTime());

	const { countryCode, language } = req.params;

	const regionLanguages = timezones[countryCode];
	const regionTimezones = regionLanguages[language] ? regionLanguages[language] : Object.values(regionLanguages)[0];

	res.send(xmlbuilder.create({
		timezones: {
			timezone: regionTimezones
		}
	}).end());
});

module.exports = router;