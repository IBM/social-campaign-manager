/*
 * Copyright 2020 IBM, Inc All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

class Tweet {
    constructor(tweetObj, campaign) {
        let tweetResponse = {
            socialMediaObjectType: 'tweet',
            campaignId: campaign._id,
            timestamp: new Date().toISOString(),
            nlu: null,
            language: campaign.language,
            rawMessage: tweetObj['text'],
            twitterThreadId: tweetObj['in_reply_to_status_id_str']
        };

        // remove the username from raw text
        if (tweetObj.display_text_range && tweetObj.display_text_range.length) {
            tweetResponse.rawMessage = tweetResponse.rawMessage.substr(tweetObj.display_text_range[0]);
        }
        return tweetResponse;
    }
}

module.exports = Tweet;
