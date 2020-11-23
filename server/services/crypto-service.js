/** *******************************************************************************
Warning only generate the keys one time on the server. Or maintain the OLD keys

 Augment this functionality to copy and zip up old keys in the event a key gen is
 accidentally triggered.

**********************************************************************************/
const { generateKeyPairSync, publicEncrypt, privateDecrypt } = require('crypto');
const fs  = require('fs');
const publicKeyFile = fs.readFileSync(__dirname + '/../keys/public.pem', 'utf8');
const privateKeyFile = fs.readFileSync(__dirname + '/../keys/private.pem', 'utf8');
const logger = require('../utils/logger')('crypto-service');

/** *********************************************************************
 * This function will take in a string and return an encrypted variable
 * @param encryptMe
 * @returns {String}
 */

function encrypt(encryptMe) {
    let encryptBuffer = Buffer.from(encryptMe);
    let encrypted = publicEncrypt(publicKeyFile, encryptBuffer);
    return encrypted.toString('base64');
}

/** **********************************************************************
 * This function takes in a string and returns a decrypted variable
 * @param decryptMe
 * @returns {String}
 */
function decrypt(decryptMe) {
    let decryptBuffer = Buffer.from(decryptMe, 'base64');
    let decrypted = privateDecrypt(privateKeyFile, decryptBuffer);
    return decrypted.toString();
}

/** ***************************************************************
 * This function creates the keys - should only be called once.
 * I would not recommend adding this code to production. Or I would
 * wrap this code so it backs up old keys before creating new keys
 *****************************************************************/

function generateKeyPairs() {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',

        }
    });

    /** **********************************************************************
     * This function will write the public key to the file system
     */

    fs.writeFile('../keys/public.pem', publicKey, function(err) {
        if (err) return logger.error('Error creating public key: ' + err);
        else {
            logger.debug('public key created');
        }
    });

    /** **********************************************************************
     * This function will write the private key to the file system
     */
    fs.writeFile('../keys/private.pem', privateKey, function(err) {
        if (err) return logger.error('Error creating private key: ' + err);
        else {
            logger.debug('private key created');
        }
    });
}
module.exports = {
    encrypt,
    decrypt,
    generateKeyPairs
};

/** ***********************************************************************
 This is an example of how this functionality can be called. Make sure
 to only generate the keys once on the server.
 generateKeyPairs();
 let hw = encrypt('Hello World');
 console.log('Cipher text: ' + hw);
 console.log('Plain text: ' + decrypt(hw));
*************************************************************************/
