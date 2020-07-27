import { UtilsService } from '../../../../../../src/app/modules/campaign/services/utils.service';

let utilsService: UtilsService;

beforeEach(() => {
    utilsService = new UtilsService();
});

describe('getColourByIndex', () => {
    it('#testColourIndex first', () => {
        const testColourIndex = utilsService.getColourByIndex(0);
        expect(testColourIndex).toBe('#9ECA6B');
    });

    it('#testColourIndex last', () => {
        const testColourIndex = utilsService.getColourByIndex(6);
        expect(testColourIndex).toBe('#7c7dec');
    });

    it('#testColourIndex bigger', () => {
        const testColourIndex = utilsService.getColourByIndex(7);
        expect(testColourIndex).toBe('#9ECA6B');
    });

    it('#testColourIndex 3x bigger', () => {
        const testColourIndex = utilsService.getColourByIndex(17);
        expect(testColourIndex).toBe('#7cb5ec');
    });
});

describe('getAllIndexes', () => {
    it('#getAllIndexes single', () => {
        const testArray = [1, 2, 3];
        const indexes = utilsService.getAllIndexes(testArray, 1);
        expect(indexes).toEqual([0]);
    });

    it('#getAllIndexes empty', () => {
        const testArray = [1, 2, 3];
        const indexes = utilsService.getAllIndexes(testArray, 0);
        expect(indexes).toEqual([]);
    });

    it('#getAllIndexes double', () => {
        const testArray = [1, 2, 3, 1];
        const indexes = utilsService.getAllIndexes(testArray, 1);
        expect(indexes).toEqual([0, 3]);
    });
});
