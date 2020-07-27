import { Injectable } from '@angular/core';

@Injectable()
export class UtilsService {

    getAllIndexes(arr, val) {
        let indexes = [];
        let i: number;
        for (i = 0; i < arr.length; i++) if (arr[i] === val) indexes.push(i);
        return indexes;
    }

    getColourByIndex(index) {
        const colours = [
            '#9ECA6B',
            '#EA5B53',
            '#EDAF64',
            '#7cb5ec',
            '#ec7cb5',
            '#7cecb3',
            '#7c7dec'
        ];
        const numberOfColours = (colours.length);
        if (index > numberOfColours - 1) {
            return colours[(index % numberOfColours)];
        } else {
            return colours[index];
        }
    }
}
