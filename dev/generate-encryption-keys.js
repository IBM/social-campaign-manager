/*
 * The crypto service to generateKeyPairSync has been added in Node 10+, use nvm to change the version of node
*  to generate the keys or upgrade your Node.js version to v10
*/
const cryptoService = require('../server/services/crypto-service');
cryptoService.generateKeyPairs();
