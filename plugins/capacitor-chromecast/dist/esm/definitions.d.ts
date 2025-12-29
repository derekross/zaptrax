import { ListenerCallback, PluginListenerHandle } from '@capacitor/core';
export interface ChromecastPlugin {
    initialize(): Promise<void>;
    requestSession(): Promise<void>;
    launchMedia(mediaUrl: string): Promise<boolean>;
    addListener(eventName: string, listenerFunc: ListenerCallback): Promise<PluginListenerHandle> & PluginListenerHandle;
}
