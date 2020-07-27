/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const winston = require('winston');
const util = require('util');

const logMetadata = {
    transform(info) {
        const args = info[Symbol.for('splat')];
        const formattedMsg = { ...info };
        formattedMsg[Symbol.for('message')] += args
            ? ` ${util.format(args)}`
            : '';
        return formattedMsg || '';
    }
};

const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
        info =>
            `${info.timestamp} ${info.service}: ${info.level}: ${info.message}`
    ),
    logMetadata
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
        info => `${info.timestamp} ${info.service}: ${info.level}: ${info.message}`
    ),
    logMetadata
);

const loggerFunc = serviceName => {
    let s = serviceName || 'default';

    let logger = winston.createLogger({
        level: 'info',
        defaultMeta: { service: s },
        transports: [
            new winston.transports.File({
                level: 'error',
                filename: './logs/error.log',
                format: fileFormat,
                maxsize: 10 * 1024 * 1024,
                maxFiles: 3
            }),
            new winston.transports.File({
                level: 'info',
                filename: './logs/info.log',
                format: fileFormat,
                maxsize: 15 * 1024 * 1024,
                maxFiles: 3
            }),
            new winston.transports.File({
                level: 'debug',
                filename: './logs/debug.log',
                format: fileFormat,
                maxsize: 15 * 1024 * 1024,
                maxFiles: 3
            }),
            new winston.transports.Console({
                level: 'info',
                colorize: 'true',
                format: consoleFormat
            })
        ]
    });

    logger.stream = {
        write: message => {
            logger.info(message);
        }
    };

    return logger;
};

module.exports = loggerFunc;
