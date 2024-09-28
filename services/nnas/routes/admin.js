// handles "account.nintendo.net/v1/api/admin" endpoints

const express = require('express');
const database = require('../../../utils/database');
const xmlbuilder = require('xmlbuilder');
const router = express.Router();

router.get('/time', async (req, res) => {
	res.set('X-Nintendo-Date', Date.now().toString());
	res.set('Server', 'Nintendo 3DS (http)');
	res.set('Date', new Date().toUTCString());

	res.send('');
});

router.get('/mapped_ids', (req, res) => {
    const rnid = req.query.input;
    let target;
    target = rnid.split(',');
    const pid = database.query(`SELECT * FROM accounts WHERE "nnid"='${target[0]}'`);
    res.status = 200;
    if (pid.rows[0] == undefined) {
        return res.send(xmlbuilder.create({
            mapped_ids: {
                mapped_id: {
                    in_id: rnid,
                    out_id
                }
            }
        }).end());
    }
    return res.send(xmlbuilder.create({
        mapped_ids: {
			mapped_id: {
                in_id: rnid,
                out_id: pid.rows[0].pid
            }
		}
	}).end());
});

module.exports = router;