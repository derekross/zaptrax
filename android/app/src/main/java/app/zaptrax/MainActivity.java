package app.zaptrax;

import android.os.Bundle;
import android.view.KeyEvent;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.cast.framework.CastContext;
import com.google.android.gms.cast.framework.CastSession;
import com.google.android.gms.cast.framework.SessionManager;

public class MainActivity extends BridgeActivity {

    private CastContext castContext;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Initialize CastContext for volume control
        try {
            castContext = CastContext.getSharedInstance(this);
        } catch (Exception e) {
            // Cast not available
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        // Only handle key down events to avoid double-handling
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            int keyCode = event.getKeyCode();

            if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
                // Check if we have an active Cast session
                if (castContext != null) {
                    SessionManager sessionManager = castContext.getSessionManager();
                    CastSession castSession = sessionManager.getCurrentCastSession();

                    if (castSession != null && castSession.isConnected()) {
                        try {
                            double currentVolume = castSession.getVolume();
                            double volumeStep = 0.05; // 5% per step
                            double newVolume;

                            if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
                                newVolume = Math.min(1.0, currentVolume + volumeStep);
                            } else {
                                newVolume = Math.max(0.0, currentVolume - volumeStep);
                            }

                            castSession.setVolume(newVolume);
                            return true; // Consume the event
                        } catch (Exception e) {
                            // Fall through to default handling
                        }
                    }
                }
            }
        }

        return super.dispatchKeyEvent(event);
    }
}
