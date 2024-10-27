const colors = require('colors');
const moment = require('moment');

const logger = {
    log: function log(msg) {
        console.log(`[INFO] (${moment().format("HH:mm:ss")}) ${msg}`.green);
    },
    
    info: function info(msg) {
        console.log(`[INFO] (${moment().format("HH:mm:ss")}) ${msg}`.blue);
    },

    warn: function warn(msg) {
        console.log(`[WARN] (${moment().format("HH:mm:ss")}) ${msg}`.yellow);
    },

    error: function error(msg) {
        console.log(`[ERROR] (${moment().format("HH:mm:ss")}) ${msg}`.red);
    },

    database: function database(msg) {
        console.log(`[MONGODB] (${moment().format("HH:mm:ss")}) ${msg}`.cyan);
    },

    http_log: function http_log(req, res, next) {
        switch (req.method) {
            case "GET":
                console.log(`[GET] (${moment().format("HH:mm:ss")}) ${req.url}`.green);
                break;
            case "POST":
                console.log(`[POST] (${moment().format("HH:mm:ss")}) ${req.url}`.yellow);
                break;
            case "PUT":
                console.log(`[PUT] (${moment().format("HH:mm:ss")}) ${req.url}`.magenta);
                break;
            case "DELETE":
                console.log(`[DELETE] (${moment().format("HH:mm:ss")}) ${req.url}`.red);
                break;
            case "PATCH":
                console.log(`[PATCH] (${moment().format("HH:mm:ss")}) ${req.url}`.cyan);
                break;
            case "OPTIONS":
                console.log(`[OPTIONS] (${moment().format("HH:mm:ss")}) ${req.url}`.blue);
                break;
            default:
                console.log(`[${req.method}] (${moment().format("HH:mm:ss")}) ${req.url}`.cyan);
                break;
        }

        next();
    }
}

module.exports = logger;