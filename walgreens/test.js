const test = require('ava');
const api = require('./api.js');
const fs = require('fs');


test.cb("config.js can't be found", t => {
    fs.readFile('config.js', t.end);
});
