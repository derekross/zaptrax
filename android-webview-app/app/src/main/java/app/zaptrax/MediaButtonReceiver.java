package app.zaptrax;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Receives media button clicks from notification
 */
public class MediaButtonReceiver extends BroadcastReceiver {
    private static final String TAG = "MediaButtonReceiver";

    public static final String ACTION_PLAY = "app.zaptrax.action.PLAY";
    public static final String ACTION_PAUSE = "app.zaptrax.action.PAUSE";
    public static final String ACTION_NEXT = "app.zaptrax.action.NEXT";
    public static final String ACTION_PREVIOUS = "app.zaptrax.action.PREVIOUS";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) {
            Log.w(TAG, "Received null action");
            return;
        }

        Log.d(TAG, "◆ MediaButtonReceiver: Received action: " + action);

        // Get MainActivity instance to access MediaSessionManager
        if (MainActivity.instance == null) {
            Log.e(TAG, "MainActivity instance is null!");
            return;
        }

        if (MainActivity.instance.mediaSessionManager == null) {
            Log.e(TAG, "MediaSessionManager is null!");
            return;
        }

        MediaSessionManager manager = MainActivity.instance.mediaSessionManager;
        Log.d(TAG, "MediaSessionManager found, dispatching action: " + action);

        switch (action) {
            case ACTION_PLAY:
                Log.d(TAG, "Calling play()");
                manager.getMediaSession().getController().getTransportControls().play();
                break;
            case ACTION_PAUSE:
                Log.d(TAG, "Calling pause()");
                manager.getMediaSession().getController().getTransportControls().pause();
                break;
            case ACTION_NEXT:
                Log.d(TAG, "Calling skipToNext()");
                manager.getMediaSession().getController().getTransportControls().skipToNext();
                break;
            case ACTION_PREVIOUS:
                Log.d(TAG, "Calling skipToPrevious()");
                manager.getMediaSession().getController().getTransportControls().skipToPrevious();
                break;
            default:
                Log.w(TAG, "Unknown action: " + action);
                break;
        }
    }
}
