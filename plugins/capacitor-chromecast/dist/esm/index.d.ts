export interface ChromecastPlugin {
  initialize(options?: { appId?: string }): Promise<void>;
  requestSession(): Promise<void>;
  launchMedia(options: { mediaUrl: string }): Promise<void>;
  castPlay(): Promise<void>;
  castPause(): Promise<void>;
  castStop(): Promise<void>;
  endSession(): Promise<void>;
  addListener(event: string, callback: (data: unknown) => void): Promise<{ remove: () => void }>;
}

export declare const Chromecast: ChromecastPlugin;
