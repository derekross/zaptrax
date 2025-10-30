package app.zaptrax;

import android.util.Log;
import android.webkit.JavascriptInterface;

/**
 * JavaScript bridge for communicating media playback state between WebView and Android
 */
public class MediaBridge {
    private static final String TAG = "MediaBridge";
    private MediaSessionManager mediaSessionManager;

    public MediaBridge(MediaSessionManager mediaSessionManager) {
        this.mediaSessionManager = mediaSessionManager;
    }

    /**
     * Called from JavaScript when playback state changes
     * @param isPlaying true if playing, false if paused
     */
    @JavascriptInterface
    public void onPlaybackStateChanged(boolean isPlaying) {
        Log.d(TAG, "✓ Playback state changed: " + (isPlaying ? "playing" : "paused"));
        if (mediaSessionManager != null) {
            mediaSessionManager.updatePlaybackState(isPlaying);
        } else {
            Log.e(TAG, "MediaSessionManager is null!");
        }
    }

    /**
     * Called from JavaScript when track changes
     * @param title Track title
     * @param artist Artist name
     * @param album Album name
     * @param artworkUrl URL to album artwork
     * @param durationMs Duration in milliseconds
     */
    @JavascriptInterface
    public void onTrackChanged(String title, String artist, String album, String artworkUrl, long durationMs) {
        Log.d(TAG, "✓ Track changed: " + title + " by " + artist + " (" + durationMs + "ms)");
        if (mediaSessionManager != null) {
            mediaSessionManager.updateMetadata(title, artist, album, artworkUrl, durationMs);
        } else {
            Log.e(TAG, "MediaSessionManager is null!");
        }
    }

    /**
     * Called from JavaScript when playback position updates
     * @param positionMs Current position in milliseconds
     */
    @JavascriptInterface
    public void onPositionChanged(long positionMs) {
        if (mediaSessionManager != null) {
            mediaSessionManager.updatePosition(positionMs);
        }
    }

    /**
     * Called from JavaScript when playback ends
     */
    @JavascriptInterface
    public void onPlaybackEnded() {
        Log.d(TAG, "Playback ended");
        if (mediaSessionManager != null) {
            mediaSessionManager.stop();
        }
    }
}
