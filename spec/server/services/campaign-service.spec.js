const expect = require('chai').expect,
    sinon = require('sinon'),
    express = require('express');
    // CampaignServices = require('../../server/services/campaigns-service');

/**
 * Test classes
 */

class TestCloudant {
    read() { }
    readFromView() { }
    create() { }
    bulk() { }
}

class TestConversationManager {
    updateWorkspace() {}
    createWorkspace() {}
    getWorkspacePicker() {}
    updateStoredWorkspaces() {}
}

let expressApp = express();


xdescribe('Testsuite - CampaignServices', () => {

    let cloudantCreateStub, cloudantReadStub, cloudantBulkStub, campaignServices;

    before(() => {
        campaignServices = new CampaignServices(expressApp);
        campaignServices.cloudant = new TestCloudant();
        cloudantCreateStub = sinon.stub(campaignServices.cloudant, 'create');
        campaignServices.conversationManager = new TestConversationManager();
    });

    after(() => {
        cloudantCreateStub.restore();
    });

    describe('Testsuite - validateCampaignId', () => {

        it('Testcase - provided a valid id', async () => {
            let err = null;
            try {
                await campaignServices.validateCampaignId('quiteAnOK1d');
            } catch (error) {
                err = error;
            }

            expect(err).not.to.equal('Invalid campaign id supplied');
        });

        it('Testcase - provided invalid id', async () => {
            let err = null;
            try {
                await campaignServices.validateCampaignId('!nv@l!d-id');
            } catch (error) {
                err = error;
            }

            expect(err).to.equal('Invalid campaign id supplied');
        });
    });

    describe('Testsuite - saveCampaignWorkspaceToCloudant', () => {

        it('Testcase - cloudant document created with valid input', () => {
            const workspaceObjWithExtraField = {
                metadata: {
                    campaign_id: 'campaignId',
                    rev: 'revision1'
                },
                dialog_nodes: 'dialog_nodes',
                intents: 'intents',
                entities: 'entities'
            };

            const workspaceObj = {
                metadata: {
                    campaign_id: 'campaignId',
                    rev: 'revision1'
                }
            };

            campaignServices.saveCampaignWorkspaceToCloudant(workspaceObj, workspaceObjWithExtraField);

            expect(campaignServices.cloudant.create.called).to.equal(true);
            expect(workspaceObj.status).to.equal('Not Started');
            expect(workspaceObj.metadata.rev).to.equal(undefined);

            expect(workspaceObj.dialog_nodes).to.equal('dialog_nodes');
            expect(workspaceObj.intents).to.equal('intents');
            expect(workspaceObj.entities).to.equal('entities');
        });
    });

    describe('Testsuite - deleteCampaignResponses', () => {
        beforeEach(() => {
            cloudantReadStub = sinon.stub(campaignServices.cloudant, 'read');
            cloudantBulkStub = sinon.stub(campaignServices.cloudant, 'bulk');
        });

        afterEach(() => {
            cloudantReadStub.restore();
            cloudantBulkStub.restore();
        });

        it('Testcase - no responses to delete', async () => {

            let err = null;

            cloudantReadStub.returns([]);

            try {
                await campaignServices.deleteCampaignResponses('campaignId');
            } catch (error) {
                err = error;
            }

            expect(err).to.equal(null);
            expect(cloudantBulkStub.called).not.to.equal(true);
        });

        it('Testcase - deleteCampaignResponses - ok', async () => {

            let err = null;
            cloudantReadStub.returns([{ _id: 'somresponse' }]);
            cloudantBulkStub.returns([{ ok: true }]);

            try {
                await campaignServices.deleteCampaignResponses('campaignId');
            } catch (error) {
                err = error;
            }

            expect(err).to.equal(null);
        });

        it('Testcase - deleteCampaignResponses - bulk fails', async () => {

            let err = null;
            cloudantReadStub.returns([{ _id: 'somresponse' }]);
            cloudantBulkStub.throws(new Error('bulk failed'));

            try {
                await campaignServices.deleteCampaignResponses('campaignId');
            } catch (error) {
                err = error;
            }

            expect(err.message).to.equal('Error: bulk failed');
        });

        it('Testcase - deleteCampaignResponses - read fails', async () => {

            let err = null;
            cloudantReadStub.throws(new Error('read failed'));

            try {
                await campaignServices.deleteCampaignResponses('campaignId');
            } catch (error) {
                err = error;
            }

            expect(err.message).to.equal('Error: read failed');
        });

    });
});
