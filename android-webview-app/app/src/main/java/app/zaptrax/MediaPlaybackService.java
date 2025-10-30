package app.zaptrax;

import android.app.Service;
import android.content.Intent;
import android.os.Binder;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.ServiceCompat;

/**
 * Foreground service to keep the app alive while playing music in the background
 */
public class MediaPlaybackService extends Service {
    private static final String TAG = "MediaPlaybackService";
    private static final int NOTIFICATION_ID = 1;

    private final IBinder binder = new LocalBinder();
    private boolean isForeground = false;

    public class LocalBinder extends Binder {
        MediaPlaybackService getService() {
            return MediaPlaybackService.this;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service started");
        return START_STICKY; // Restart service if killed by system
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    /**
     * Promote service to foreground with the media notification
     */
    public void startForeground(android.app.Notification notification) {
        if (!isForeground) {
            Log.d(TAG, "Starting foreground service");
            startForeground(NOTIFICATION_ID, notification);
            isForeground = true;
        }
    }

    /**
     * Stop foreground service but keep service running
     */
    public void stopForegroundService() {
        if (isForeground) {
            Log.d(TAG, "Stopping foreground service");
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_DETACH);
            isForeground = false;
        }
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "Service destroyed");
        super.onDestroy();
    }
}
