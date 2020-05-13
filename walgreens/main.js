// Walgreens API via Nodejs

var https = require('https');
var config = require('../../../config.js');
var walgreens = require('./api.js');

// ------
// global helpers
// ------
var secrets = null;
var imageType = require('image-type');

// ------
// NOTE: first run bits 'n pieces
//------
// we need some images to send
var images = ["1.jpg"];
var localPathOfImages = "/tmp/"


// ------
// helper functions
// ------
// TODO: there's got to be a better way
var getAndCheckImageForPNG = function (element, callback) {
    var isPNG = false;
    https.get(element.payload.url, function (res) {
        res.once('data', function (chunk) {
            res.destroy();
            var type = imageType(chunk);
            console.log(type);
            console.log(type.ext);
            console.log(type.mime);
            //=> {ext: 'gif', mime: 'image/gif'}
            // if (type.ext == 'png'
            // || type.mime == 'image/png'
            // || type.ext == 'gif'
            // || type.mime == 'image/gif') {
            if (type.ext != 'jpg'
                && type.mime != 'image/jpg'
                || type.ext != 'jpg'
                && type.mime != 'image/jpeg'
                || type.ext != 'jpeg'
                && type.mime != 'image/jpeg') {
                console.log(" true: " + type.mime)
                isPNG = true;
            }

            callback(isPNG);
        });
    });
}

// basic bool
var isJPEG = function (bot, message, callback) {
    this.cb = function (bool) {
        // if bool is false then photo isJPEG (true)
        console.log(bool);
        callback(bool);
    }

    message.image.some(function (element) { // some stops when return is true
        getAndCheckImageForPNG(element, this.cb);
    }, this);
}

// ------
// logic
// ------
// we grab all the images by path & file name, and send it on it's merry way to walgreens.
var walgreensPrintToWalgreens = function () {

    // we need secrets so we can send our files to AWS (which is used by walgreens)
    if (!secrets) {
        walgreensRequestSecrets();
    }

    walgreensUploadPhotos(function (photos) {
        walgreens.landingPage(photos, function (err, checkOutResponse) {
            if (err) console.log(err)

            // TODO: we need to be able to check out!
            return;
            // console.log(checkOutResponse);
            var walgreensResponse = JSON.parse(checkOutResponse);
            var checkout = walgreensResponse.landingUrl + "&token=" + walgreensResponse.token + "\n\n";
            // console.log(checkout);

            // TODO: find a better way to interact with the service from a users perspective.
            console.log('Ok, it looks like your photos are ready at the Walgreens checkout\r\n\r\nNow here\'s the thing, once you leave you\'ll have to find your own way back');
            console.log('Checkout url:  ' + checkout);
        });
    });
};

var walgreensUploadPhotos = function (cb) {
    images.forEach(function (photo) {
        // we have to go through this same process for every image
        walgreens.requestSasKeyToken(function (status, body) {
            console.log("walgreens.requestSasKeyToken(function (status, body): ", body);

            // TODO: yuck. also we need some error checking in here
            var sasToken = JSON.parse(body).cloud[0].sasKeyToken;
            var uuid = walgreens.generateUUID();

            // Before an image can be uploaded, the value for the "sasKeyToken" must be converted correctly into the "Upload_URL"
            var blobContainer = sasToken.split("?").shift();
            var signature = sasToken.split("?").pop();
            var imageName = "Image-" + config.api.walgreens.test.affiliateId + "-" + uuid + ".jpg";
            var uploadUrl = blobContainer + "/" + imageName + "?" + signature;
            console.log("blockContainer: " + blobContainer);
            console.log("uploadUrl: " + uploadUrl);

            var putRequirements = [uuid, localPathOfImages + photo, uploadUrl]
            walgreens.uploadPhotoToWalgreens(putRequirements, function (status, body) {
                console.log("walgreens.uploadPhotoToWalgreens: " + status+ " | " +body);
            });
        });
    });
};

var walgreensRequestSecrets = function (cb) {
    walgreens.requestSecrets(function (status, body) {
        // we have the secrets, so process
        console.log('\nwalgreensRequestSecrets ==> ' + body);
        secrets = body;

        if (cb) {
            cb(secrets);
        }
    });
};

// ------
// entry ~ fingerscrossed
// ------
walgreensPrintToWalgreens();