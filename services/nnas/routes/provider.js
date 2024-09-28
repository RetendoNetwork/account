// handles "account.nintendo.net/v1/api/provider" endpoints

const express = require('express');
const xmlbuilder = require('xmlbuilder');
const path = require('path');
const fs = require('fs');
const database = require('../../../utils/database');
const router = express.Router();

router.get('/service_token/@me', async (req, res) => {
    const client_id = req.header('X-Nintendo-Client-ID');
    const id = await database.query(`SELECT * FROM accounts WHERE "pid"='${client_id}'`);
    const token = await database.query(`SELECT * FROM accounts WHERE "rnid"='${id.rows[0].rnid}'`);
    res.status = 200;
    result = token.rows[0].servicetoken;

    res.send(xmlbuilder.create({
        service_token : {
            token : result
        }
    }).end({pretty : true, allowEmpty : true}))
});

module.exports = router;