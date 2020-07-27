const crypto = require('../../../server/services/crypto-service.js');
const expect = require('chai').expect;

describe('Testsuite - Encrypt Service Tests', () => {

    describe('Testsuite - encrypt service', () => {
        it('Testcase - Test Encrypt Service', () => {
            const TEST_STRING = 'This is my test';
            const encrypted = crypto.encrypt(TEST_STRING);
            const decrypted = crypto.decrypt(encrypted);

            expect(TEST_STRING).to.equal(decrypted);
        });
    });
});
