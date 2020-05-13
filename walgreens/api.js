// https://developer.walgreens.com/sites/default/files/v1_PhotoPrintsHTMLCheckout.html#

/*
Handles all the Walgreen lifting
*/
var Curl = require('node-libcurl').Curl;
var infoTypes = Curl.info.debug;
var EOL = (process.platform === 'win32' ? '\r\n' : '\n');
var gmdate = require('phpdate-js').gmdate;
var config = require('../../../config.js')
var crypto = require('crypto');
var fs = require('fs');

var WGHeaders = [
    'Access-Token: Access-Token',
    'Content-Type: application/json',
    'User-Agent: Not Mozilla (tumunu)'
];

// switch
var CURRENT = "test";

function getFilesizeInBytes(filename) {
    const stats = fs.statSync(filename);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes;
}

module.exports = {
    isImageOrImages: function (arr) {
        if (arr.length > 0) {
            arr.forEach(function (element) {
                if (element.type != 'image') {
                    return false;
                }
            }, this);
        }
        return true;
    },

    generateUUID: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    landingPage: function (photos, cb) {

        var curl = new Curl();
        // TODO: provide an easier way to switch between test and production
        var checkOutData = {
            "transaction": "photoCheckoutv2",
            "apiKey": config.api.walgreens.test.token,
            //"apiKey": config.api.walgreens.live.token,
            "devinf": "IE,11",
            "appver": "1.0.0",
            "act": "mweb5UrlV2",
            "view": "mweb5UrlV2JSON",
            "affId": config.api.walgreens.test.affiliateId,
            //"affId": config.api.walgreens.live.affiliateId,
            "expiryTime": "",
            "images": photos,
            "lat": "",
            "lng": "",
            "customer": {
                "firstName": "",
                "lastName": "",
                "email": "",
                "phone": ""
            },
            "channelInfo": "web",
            "callBackLink": "http://xxxx/home.html",
            "publisherId": config.api.walgreens.publisherId,
            "affNotes": ""
        };

        // TODO: what am I even doing here?
        // curl.setOpt(Curl.option.URL, config.api.walgreens.test.endPoint);
        curl.setOpt(Curl.option.URL, config.api.walgreens.live.endPoint);

        curl.setOpt(Curl.option.POSTFIELDS, JSON.stringify(checkOutData));
        // curl.setOpt(Curl.option.POSTFIELDS, "'" + querystring.stringify(checkOutData) + "'");
        curl.setOpt(Curl.option.HTTPHEADER, WGHeaders);
        curl.setOpt(Curl.option.VERBOSE, true);
        // curl.setOpt(Curl.option.DEBUGFUNCTION, module.exports.debugCallback);
        // console.log(querystring.stringify(checkOutData));

        curl.on('end', function (statusCode, body) {
            console.log(body);

            if (cb) {
                cb(statusCode, body);
            }

            this.close();
        });
        curl.on('error', curl.close.bind(curl));
        curl.perform();
    },

    requestSecrets: function (cb) {
        var curl = new Curl();
        var secretsData = {
            "serviceType": "wagS3",
            "apiKey": config.api.walgreens.test.token,
            "affId": config.api.walgreens.test.affiliateId,
            // "apiKey": config.api.walgreens.live.token,
            // "affId": config.api.walgreens.live.affiliateId,
            "act": "genCredV2",
            "view": "genCredV2JSON",
            "devinf": "IE,11",
            "appver": "1.01"
        };

        // TODO: clean. curl killing my soul :(
        curl.setOpt(Curl.option.URL, config.api.walgreens.test.endPoint);
        // curl.setOpt(Curl.option.URL, config.api.walgreens.live.endPoint);
        curl.setOpt(Curl.option.POSTFIELDS, JSON.stringify(secretsData));
        // curl.setOpt(Curl.option.POSTFIELDS, "'" + JSON.stringify(secretsData) + "'");
        curl.setOpt(Curl.option.HTTPHEADER, WGHeaders);
        curl.setOpt(Curl.option.VERBOSE, true);
        curl.setOpt(Curl.option.DEBUGFUNCTION, module.exports.debugCallback);

        curl.on('end', function (statusCode, body) {
            // console.log(body);

            if (cb) {
                cb(statusCode, body);
            }

            this.close();
        });
        curl.on('error', curl.close.bind(curl));
        curl.perform();
    },

    // TODO: stupid end point is returning a 403, so for now I'll by-pass this step,
    requestSasKeyToken: function (cb) {
        var curl = new Curl();
        var secretsData = {
            "apiKey": config.api.walgreens.test.token,
            "affId": config.api.walgreens.test.affiliateId,
            // "apiKey": config.api.walgreens.live.token,
            // "affId": config.api.walgreens.live.affiliateId,
            "platform": "ios",
            "transaction": "photocheckoutv2",
            "devinf": "IE,11",
            "appver": "1.01"
        };

        console.log("secretsData: " + JSON.stringify(secretsData));
        console.log("secretsData: " + config.api.walgreens.test.sasPoint);

        curl.setOpt(Curl.option.URL, config.api.walgreens.test.sasPoint);
        curl.setOpt(Curl.option.POSTFIELDS, JSON.stringify(secretsData));
        curl.setOpt(Curl.option.HTTPHEADER, WGHeaders);
        curl.setOpt(Curl.option.VERBOSE, true);
        curl.setOpt(Curl.option.DEBUGFUNCTION, module.exports.debugCallback);

        curl.on('end', function (statusCode, body) {
            console.log(body);

            if (cb) {
                cb(statusCode, body);
            }

            this.close();
        });
        // curl.on('error', curl.close.bind(curl));
        curl.on('error', function (statusCode, body) {
            console.log(statusCode);
            console.log(body);

            if (cb) {
                cb(statusCode, body);
            }

            this.close();
        });
        curl.perform();
    },

    uploadPhotoToWalgreens: function (photo, cb) {
        // TODO: map would be better
        // putRequirements = [uuid, localPathOfImages + photo, uploadUrl]
        var curl = new Curl();

        fs.open(photo[1], 'r+', function (err, fd) {

            curl.setOpt(Curl.option.VERBOSE, 1);
            curl.setOpt(Curl.option.READDATA, fd);
            curl.setOpt(Curl.option.URL, photo[2]);
            curl.setOpt(Curl.option.UPLOAD, 1);

            // https://curl.haxx.se/libcurl/c/libcurl-tutorial.html
            // stops Azure's "HTTP error before end of send, stop sending"
            curl.setOpt(Curl.option.INFILESIZE, getFilesizeInBytes(photo[1]));

            // NOTE: Content-Length here may not be necessary. See above.
            var header = ["Content-Length: " + getFilesizeInBytes(photo[1]), "Content-Type: image/jpeg", "x-ms-blob-type: BlockBlob", "x-ms-client-request-id: " + photo[0]];

            curl.setOpt(Curl.option.HTTPHEADER, header);
            curl.on('end', function (statusCode, body) {

                console.log(body);

                //remember to always close the file descriptor!
                fs.closeSync(fd);
                fs.unlinkSync(photo[1]);

                if (cb) {
                    cb(statusCode, body);
                }

                this.close();
            });

            curl.on('error', curl.close.bind(curl));
            curl.perform();
        });
    },

    debugCallback: function (infoType, content) {

        var text = '';

        switch (infoType) {

            case infoTypes.TEXT:
                text = content;
                break;
            case infoTypes.DATA_IN:
                text = '-- RECEIVING DATA: ' + EOL + content;
                break;
            case infoTypes.DATA_OUT:
                text = '-- SENDING DATA: ' + EOL + content;
                break;
            case infoTypes.HEADER_IN:
                text = '-- RECEIVING HEADER: ' + EOL + content;
                break;
            case infoTypes.HEADER_OUT:
                text = '-- SENDING HEADER: ' + EOL + content;
                break;
            case infoTypes.SSL_DATA_IN:
                text = '-- RECEIVING SSL DATA: ' + EOL + content;
                break;
            case infoTypes.SSL_DATA_OUT:
                text = '-- SENDING SSL DATA: ' + EOL + content;
                break;
        }

        console.log(text);
        return 0;
    }
};