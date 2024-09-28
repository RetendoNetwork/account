// handles "account.nintendo.net/v1/api/oauth20" endpoints

const express = require('express');
const database = require('../../../utils/database');
const utils = require('../../../utils/utils');
const xmlbuilder = require('xmlbuilder');
const { config: { jwtSecret, refreshTokenSecret } } = require('../../../config.json');
const { sign } = require('jsonwebtoken');
const router = express.Router();

router.get('/:pid/:password/generate', (req, res) => {
    const params = req.params;
    const password = params.password;
    const pid = params.pid;
    res.send(utils.nintendoPasswordHash(password, pid));
});

router.post('/access_token/generate', async (req, res) => {
    console.log(req);
    const body = req.body;
    const client_id = req.header('X-Nintendo-Client-ID');
    const password = body.password;
    const rnid = body.user_id;

    const pass = database.query('SELECT * FROM accounts WHERE rnid = ?', [rnid]);
    const accessed = database.query('SELECT * FROM accounts WHERE pid = ?', [client_id]);

    accessed.then(async function (result) {
        if (result.length === 0) {
            await database.query('INSERT INTO accounts(rnid, pid) VALUES(?, ?)', [rnid, client_id]);
        } else {
            await database.query('UPDATE accounts SET rnid = ?, pid = ? WHERE pid = ?', [rnid, client_id, client_id]);
        }
    });

    pass.then(function (result) {
        if (result.length === 0) {
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
        }

        const user = result[0];
        if (user.password === password) {
            const token = sign({ rnid }, refreshTokenSecret, { expiresIn: 3600 });
            const refresh_token = sign({ rnid, time: Date.now() }, jwtSecret);
            const expires_in = 3600;
            return res.send(
                xmlbuilder.create({
                    OAuth20: {
                        access_token: {
                            token: token,
                            refresh_token: refresh_token,
                            expires_in: expires_in
                        }
                    }
                }).end({ pretty: true, allowEmpty: true })
            );
        } else {
            return res.status(400).send(
                xmlbuilder.create({
                    errors: {
                        error: {
                            code: "0106",
                            message: "Invalid account ID or password"
                        }
                    }
                }).end({ pretty: true, allowEmpty: true })
            );
        }
    });
});

module.exports = router;