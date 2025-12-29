// Web stub for Chromecast plugin - native only
var capacitorChromecast = (function (exports) {
  'use strict';

  const Chromecast = {
    initialize: () => Promise.reject('Chromecast is only available on native platforms'),
    requestSession: () => Promise.reject('Chromecast is only available on native platforms'),
    launchMedia: () => Promise.reject('Chromecast is only available on native platforms'),
    castPlay: () => Promise.reject('Chromecast is only available on native platforms'),
    castPause: () => Promise.reject('Chromecast is only available on native platforms'),
    castStop: () => Promise.reject('Chromecast is only available on native platforms'),
    endSession: () => Promise.reject('Chromecast is only available on native platforms'),
    addListener: () => Promise.resolve({ remove: () => {} }),
  };

  exports.Chromecast = Chromecast;

  return exports;
})({});
