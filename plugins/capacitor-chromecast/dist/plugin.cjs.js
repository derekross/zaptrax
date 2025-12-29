'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('@capacitor/core');

const Chromecast = core.registerPlugin('Chromecast', {
    web: () => Promise.resolve().then(function () { return require('./web'); }).then(m => new m.ChromecastWeb()),
});

exports.Chromecast = Chromecast;
