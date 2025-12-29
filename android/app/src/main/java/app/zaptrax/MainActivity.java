package app.zaptrax;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.KeyEvent;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "ZaptraxMainActivity";
    private Object castContext; // Use Object to avoid class loading issues
    private boolean castAvailable = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register plugins before calling super.onCreate
        registerPlugin(AndroidAutoPlugin.class);

        super.onCreate(savedInstanceState);

        // Initialize CastContext for volume control (only if Google Play Services available)
        initializeCastIfAvailable();

        // Start the MediaBrowserService for Android Auto
        startMediaBrowserService();
    }

    private void initializeCastIfAvailable() {
        try {
            // Check if Google Play Services is available
            GoogleApiAvailability apiAvailability = GoogleApiAvailability.getInstance();
            int resultCode = apiAvailability.isGooglePlayServicesAvailable(this);

            if (resultCode != ConnectionResult.SUCCESS) {
                Log.i(TAG, "Google Play Services not available, Cast disabled");
                castAvailable = false;
                return;
            }

            // Try to initialize Cast - use reflection to avoid class loading crash
            Class<?> castContextClass = Class.forName("com.google.android.gms.cast.framework.CastContext");
            java.lang.reflect.Method getSharedInstance = castContextClass.getMethod("getSharedInstance", android.content.Context.class);
            castContext = getSharedInstance.invoke(null, this);
            castAvailable = true;
            Log.i(TAG, "Cast initialized successfully");
        } catch (Exception e) {
            Log.i(TAG, "Cast not available: " + e.getMessage());
            castAvailable = false;
        } catch (Throwable t) {
            // Catch any other errors (NoClassDefFoundError, etc.)
            Log.i(TAG, "Cast framework not available: " + t.getMessage());
            castAvailable = false;
        }
    }

    private void startMediaBrowserService() {
        try {
            Intent serviceIntent = new Intent(this, ZaptraxMediaBrowserService.class);
            startService(serviceIntent);

            // Set up command listener to forward Android Auto commands to WebView
            ZaptraxMediaBrowserService.setCommandListener(new ZaptraxMediaBrowserService.MediaCommandListener() {
                @Override
                public void onPlay() {
                    Log.d(TAG, "Android Auto: onPlay");
                    evaluateJavascript("window.dispatchEvent(new CustomEvent('androidAutoCommand', { detail: { action: 'play' } }));");
                }

                @Override
                public void onPause() {
                    Log.d(TAG, "Android Auto: onPause");
                    evaluateJavascript("window.dispatchEvent(new CustomEvent('androidAutoCommand', { detail: { action: 'pause' } }));");
                }

                @Override
                public void onSkipToNext() {
                    Log.d(TAG, "Android Auto: onSkipToNext");
                    evaluateJavascript("window.dispatchEvent(new CustomEvent('androidAutoCommand', { detail: { action: 'nexttrack' } }));");
                }

                @Override
                public void onSkipToPrevious() {
                    Log.d(TAG, "Android Auto: onSkipToPrevious");
                    evaluateJavascript("window.dispatchEvent(new CustomEvent('androidAutoCommand', { detail: { action: 'previoustrack' } }));");
                }

                @Override
                public void onSeekTo(long position) {
                    Log.d(TAG, "Android Auto: onSeekTo " + position);
                    evaluateJavascript("window.dispatchEvent(new CustomEvent('androidAutoCommand', { detail: { action: 'seekto', seekTime: " + (position / 1000.0) + " } }));");
                }

                @Override
                public void onPlayFromMediaId(String mediaId) {
                    Log.d(TAG, "Android Auto: onPlayFromMediaId " + mediaId);
                    evaluateJavascript("window.dispatchEvent(new CustomEvent('androidAutoCommand', { detail: { action: 'playFromMediaId', mediaId: '" + mediaId + "' } }));");
                }

                @Override
                public void onStop() {
                    Log.d(TAG, "Android Auto: onStop");
                    evaluateJavascript("window.dispatchEvent(new CustomEvent('androidAutoCommand', { detail: { action: 'stop' } }));");
                }
            });

            Log.d(TAG, "MediaBrowserService started for Android Auto");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start MediaBrowserService: " + e.getMessage());
        }
    }

    private void evaluateJavascript(final String script) {
        runOnUiThread(() -> {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().evaluateJavascript(script, null);
            }
        });
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        // Only handle key down events to avoid double-handling
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            int keyCode = event.getKeyCode();

            if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
                // Check if Cast is available and we have a context
                if (castAvailable && castContext != null) {
                    if (handleCastVolumeKey(keyCode)) {
                        return true;
                    }
                }
            }
        }

        return super.dispatchKeyEvent(event);
    }

    /**
     * Handle volume keys for Cast using reflection to avoid class loading issues
     * on devices without Google Play Services.
     */
    private boolean handleCastVolumeKey(int keyCode) {
        try {
            // Get SessionManager via reflection
            java.lang.reflect.Method getSessionManager = castContext.getClass().getMethod("getSessionManager");
            Object sessionManager = getSessionManager.invoke(castContext);

            if (sessionManager == null) return false;

            // Get current CastSession via reflection
            java.lang.reflect.Method getCurrentCastSession = sessionManager.getClass().getMethod("getCurrentCastSession");
            Object castSession = getCurrentCastSession.invoke(sessionManager);

            if (castSession == null) return false;

            // Check if connected
            java.lang.reflect.Method isConnected = castSession.getClass().getMethod("isConnected");
            Boolean connected = (Boolean) isConnected.invoke(castSession);

            if (connected == null || !connected) return false;

            // Get current volume
            java.lang.reflect.Method getVolume = castSession.getClass().getMethod("getVolume");
            Double currentVolume = (Double) getVolume.invoke(castSession);

            if (currentVolume == null) return false;

            // Calculate new volume
            double volumeStep = 0.05; // 5% per step
            double newVolume;
            if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
                newVolume = Math.min(1.0, currentVolume + volumeStep);
            } else {
                newVolume = Math.max(0.0, currentVolume - volumeStep);
            }

            // Set new volume
            java.lang.reflect.Method setVolume = castSession.getClass().getMethod("setVolume", double.class);
            setVolume.invoke(castSession, newVolume);

            return true;
        } catch (Exception e) {
            Log.d(TAG, "Cast volume control failed: " + e.getMessage());
            return false;
        }
    }
}
