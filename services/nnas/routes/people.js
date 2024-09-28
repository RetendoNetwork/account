// handles "account.nintendo.net/v1/api/people" endpoints

const express = require('express');
const database = require('../../../utils/database');
const xmlbuilder = require('xmlbuilder');
const router = express.Router();

router.use(express.json());

router.get('/:nnid', async (req, res) => {
    const params = req.params;
    const nnid = params.nnid;
    const exists = await database.query(`SELECT * FROM accounts WHERE "nnid"='${nnid}'`); 
    if(exists.rows.length == 0){
        res.status = 200;
        return res.send('');
	}
    return res.status(400).send(
        xmlbuilder.create({
            errors: {
                error: {
                    code: "0100",
                    message: "Invalid account ID or password"
                }
            }
        }).end({ pretty: true, allowEmpty: true })
    );       
});

/* router.post('/', (req, res) => {
    res.set('Content-Type', 'application/xml');
    const body = req.body;
    const person = req.body.person;
	const headers = req.headers;

    res.send(xmlbuilder.create({
        person: {
            active_flag: "Y",
            birth_date: body.birth_date,
            device_attributes: {},
            user_id: body.user_id,
            password: body.password,
            country: body.country,
            language: body.language,
            tz_name: body.tz_name,
            pid: body.id,
            email: {
                address: body.email.address,
                owned: "N",
                parent: "N",
                primary: "Y",
                validated: "N",
                type: "DEFAULT",
            },
            mii: {
                name: body.mii.name,
                primary: "Y",
                data: body.mii.data,
            },
            gender: body.gender,
            region: body.region,
            utc_offset: body.utc_offset,
            marketing_flag: "N",
            off_device_flag: "N"
        }
    }).end({ pretty: false, allowEmpty: true }));
}); */

router.post('/', (req, res) => {
    const person = req.body.person;
	const headers = req.headers;
	res.setHeader("Content-Type", "application/xml");

    const pid = utils.createUser(
        person.birth_date,
		person.user_id,
		person.password,
		person.country,
		person.language,
		person.tz_name,
		person.gender,
		person.region,
        person.email,
		person.mii,
		person.screen_name
    );

    if (pid == false) {
        res.setHeader("Content-Type", "application/xml");
        res.status(500).send(utils.generateServerError());
        return;
    }
    res.status(200).send(xmlbuilder.create({
        person: {
            pid: pid
        }
    }).end({ pretty: true, allowEmpty: true }));
});

router.post('/@me/devices/@current/attributes', async (req, res) => {
	res.send('');
});

router.post('/@me/deletion', (req, res) => {
	res.setHeader("Content-Type", "application/xml");
	res.status(200);
});

module.exports = router;