const colors = require('colors');

colors.enable();

const logger = {
    log: function log(msg) {
        const time = new Date;
        console.log(`[${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}] [INFO] ${msg}`.magenta.bold);
    },

    success: function success(msg) {
        const time = new Date();
        console.log(`[${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}] [SUCCESS] ${msg}`.green.bold);
    },
    
    info: function info(msg) {
        const time = new Date();
        console.log(`[${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}] [INFO] ${msg}`.blue.bold);
    },

    warn: function warn(msg) {
        const time = new Date();
        console.log(`[${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}] [WARN] ${msg}`.yellow.bold);
    },

    error: function error(msg) {
        const time = new Date();
        console.log(`[${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}] [ERROR] ${msg}`.red.bold);
    },

    database: function database(msg) {
        const time = new Date();
        console.log(`[${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}] [MONGODB] ${msg}`.cyan.bold);
    },

    http_log: function http_log(req, res, next) {
        const time = new Date;
        switch (req.method) {
            case "GET":
                console.log(`[${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}] [GET] ${req.url}`.green);
                break;
            case "POST":
                console.log(`[${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}] [POST] ${req.url}`.yellow);
                break;
            case "PUT":
                console.log(`[${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}] [PUT] ${req.url}`.magenta);
                break;
            case "DELETE":
                console.log(`[${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}] [DELETE] ${req.url}`.red);
                break;
            case "PATCH":
                console.log(`[${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}] [PATCH] ${req.url}`.cyan);
                break;
            case "OPTIONS":
                console.log(`[${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}] [OPTIONS] ${req.url}`.blue);
                break;
            default:
                console.log(`[${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}] [${req.method}] ${req.url}`.cyan);
                break;
        }

        next();
    }
}

module.exports = logger;