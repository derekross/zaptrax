import { registerPlugin } from '@capacitor/core';
const Chromecast = registerPlugin('Chromecast', {
    web: () => import('./web').then(m => new m.ChromecastWeb()),
});
export { Chromecast };
