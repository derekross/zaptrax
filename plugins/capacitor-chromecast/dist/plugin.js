var capacitorChromecast = (function (exports, core) {
    'use strict';

    const Chromecast = core.registerPlugin('Chromecast', {
        web: () => Promise.resolve().then(function () { return require('./web'); }).then(m => new m.ChromecastWeb()),
    });

    exports.Chromecast = Chromecast;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({}, capacitorExports);
