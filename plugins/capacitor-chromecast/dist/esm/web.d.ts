import { WebPlugin } from '@capacitor/core';
import type { ChromecastPlugin } from './definitions';
declare global {
    interface Window {
        __onGCastApiAvailable: any;
        chrome: any;
    }
}
export declare class ChromecastWeb extends WebPlugin implements ChromecastPlugin {
    private cast;
    private session;
    constructor();
    private onInitSuccess;
    private onError;
    initialize(appId?: string): Promise<void>;
    requestSession(): Promise<void>;
    launchMedia(media: string): Promise<boolean>;
}
