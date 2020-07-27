/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'revisionTrim' })
export class RevisionTrim implements PipeTransform {
    transform(value: string): string {
        let newStr: string = '';
        value = value || '';
        newStr = value.indexOf('-') > -1 ? value.split('-')[0] : '';
        return newStr;
    }
}
