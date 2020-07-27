const expect = require('chai').expect;

function removeDuplicatePredefinedAnswers(participantResponse) {
    if (participantResponse.recognisedPredefinedAnswer.length) {
        const answers = participantResponse.recognisedPredefinedAnswer;
        participantResponse.recognisedPredefinedAnswer = [...new Set(answers)];
    }
}

describe('Testsuite - removeDuplicatePredefinedAnswers Tests', () => {

    describe('Testsuite - conversation-service', () => {
        it('Testcase - Test removeDuplicatePredefinedAnswers', () => {

            let participantResponse = {
                recognisedPredefinedAnswer: ['Satisfied', 'Satisfied', 'Satisfied']
            };

            removeDuplicatePredefinedAnswers(participantResponse);

            expect(participantResponse).to.deep.equal({
                recognisedPredefinedAnswer: ['Satisfied']
            });
        });
    });
});
