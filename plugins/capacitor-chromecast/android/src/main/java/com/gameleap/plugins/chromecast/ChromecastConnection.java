package com.gameleap.plugins.chromecast;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;

import androidx.arch.core.util.Function;
import androidx.mediarouter.app.MediaRouteChooserDialog;
import androidx.mediarouter.media.MediaRouteSelector;
import androidx.mediarouter.media.MediaRouter;
import androidx.mediarouter.media.MediaRouter.RouteInfo;

import com.gameleap.plugins.chromecast.lib.CastOptionsProvider;
import com.getcapacitor.PluginCall;
import com.google.android.gms.cast.CastDevice;
import com.google.android.gms.cast.CastMediaControlIntent;
import com.google.android.gms.cast.framework.CastContext;
import com.google.android.gms.cast.framework.CastSession;
import com.google.android.gms.cast.framework.CastState;
import com.google.android.gms.cast.framework.CastStateListener;
import com.google.android.gms.cast.framework.SessionManager;
import com.google.android.gms.cast.framework.SessionManagerListener;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;

import org.apache.cordova.CallbackContext;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class ChromecastConnection {

    /** Lifetime variable. */
    private Activity activity;
    /** settings object. */
    private SharedPreferences settings;
    /** Controls the media. */
    private ChromecastSession media;

    /** Lifetime variable. */
    private SessionListener newConnectionListener;
    /** The Listener callback. */
    private Listener listener;

    /** Initialize lifetime variable. */
    private String appId;

    /** Flag to track if Cast/GMS is available. */
    private boolean castAvailable = false;
    /** Cached CastContext to avoid repeated initialization attempts. */
    private CastContext cachedCastContext = null;

    /**
     * Constructor.
     * @param act the current context
     * @param connectionListener client callbacks for specific events
     */
    ChromecastConnection(final Activity act, final Listener connectionListener) {
        this.activity = act;

        act.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                settings = activity.getSharedPreferences("CORDOVA-PLUGIN-CHROMECAST_ChromecastConnection", 0);
                appId = settings.getString("appId", CastMediaControlIntent.DEFAULT_MEDIA_RECEIVER_APPLICATION_ID);
                listener = connectionListener;
                media = new ChromecastSession(activity, listener);

                // Check if Google Play Services is available before initializing Cast
                if (!isGooglePlayServicesAvailable()) {
                    android.util.Log.i("ChromecastConnection", "Google Play Services not available, Cast disabled");
                    castAvailable = false;
                    return;
                }

                // Set the initial appId
                CastOptionsProvider.setAppId(appId);

                // This is the first call to getContext which will start up the
                // CastContext and prep it for searching for a session to rejoin
                // Also adds the receiver update callback
                try {
                    CastContext ctx = getContext();
                    if (ctx != null) {
                        ctx.addCastStateListener(listener);
                        castAvailable = true;
                    }
                } catch (Exception e) {
                    android.util.Log.e("ChromecastConnection", "Failed to initialize Cast: " + e.getMessage());
                    castAvailable = false;
                } catch (Throwable t) {
                    android.util.Log.e("ChromecastConnection", "Cast framework error: " + t.getMessage());
                    castAvailable = false;
                }
            }
        });
    }

    /**
     * Check if Google Play Services is available on this device.
     * @return true if GMS is available, false otherwise
     */
    private boolean isGooglePlayServicesAvailable() {
        try {
            GoogleApiAvailability apiAvailability = GoogleApiAvailability.getInstance();
            int resultCode = apiAvailability.isGooglePlayServicesAvailable(activity);
            return resultCode == ConnectionResult.SUCCESS;
        } catch (Exception e) {
            return false;
        } catch (Throwable t) {
            return false;
        }
    }

    /**
     * Get the ChromecastSession object for controlling media and receiver functions.
     * @return the ChromecastSession object
     */
    ChromecastSession getChromecastSession() {
        return this.media;
    }

    /**
     * Must be called each time the appId changes and at least once before any other method is called.
     * @param applicationId the app id to use
     * @param pluginCall called when initialization is complete
     */
    public void initialize(final String applicationId, final PluginCall pluginCall) {
        activity.runOnUiThread(new Runnable() {
            public void run() {
                // Try to initialize Cast if not already done
                if (!castAvailable && cachedCastContext == null) {
                    // Check if Google Play Services is available
                    if (!isGooglePlayServicesAvailable()) {
                        android.util.Log.i("ChromecastConnection", "Google Play Services not available - Cast disabled");
                        pluginCall.reject("Google Play Services not available - Cast disabled");
                        return;
                    }

                    // Try to get CastContext
                    try {
                        CastContext ctx = getContext();
                        if (ctx != null) {
                            if (listener != null) {
                                ctx.addCastStateListener(listener);
                            }
                            castAvailable = true;
                            android.util.Log.i("ChromecastConnection", "Cast initialized successfully in initialize()");
                        } else {
                            android.util.Log.w("ChromecastConnection", "CastContext is null");
                            pluginCall.reject("Cast framework not available");
                            return;
                        }
                    } catch (Exception e) {
                        android.util.Log.e("ChromecastConnection", "Failed to initialize Cast in initialize(): " + e.getMessage());
                        pluginCall.reject("Cast framework error: " + e.getMessage());
                        return;
                    } catch (Throwable t) {
                        android.util.Log.e("ChromecastConnection", "Cast framework error in initialize(): " + t.getMessage());
                        pluginCall.reject("Cast framework error: " + t.getMessage());
                        return;
                    }
                }

                // If the app Id changed
                if (applicationId == null || !applicationId.equals(appId)) {
                    // If app Id is valid
                    if (isValidAppId(applicationId)) {
                        // Set the new app Id
                        setAppId(applicationId);
                    } else {
                        // Else, just return
                        pluginCall.resolve();
                        return;
                    }
                }

                // Tell the client that initialization was a success
                pluginCall.resolve();

                // Check if there is any available receivers for 5 seconds
                startRouteScan(5000L, new ScanCallback() {
                    @Override
                    void onRouteUpdate(List<RouteInfo> routes) {
                        // if the routes have changed, we may have an available device
                        // If there is at least one device available
                        if (getContext().getCastState() != CastState.NO_DEVICES_AVAILABLE) {
                            // Stop the scan
                            stopRouteScan(this, null);
                            // Let the client know a receiver is available
                            listener.onReceiverAvailableUpdate(true);
                            // Since we have a receiver we may also have an active session
                            CastSession session = getSessionManager().getCurrentCastSession();
                            // If we do have a session
                            if (session != null) {
                                // Let the client know
                                media.setSession(session);
                                listener.onSessionRejoin(ChromecastUtilities.createSessionObject(session));
                            }
                        }
                    }
                }, null);
            }
        });
    }

    private MediaRouter getMediaRouter() {
        return MediaRouter.getInstance(activity);
    }

    private CastContext getContext() {
        if (!castAvailable && cachedCastContext == null) {
            // If we know Cast isn't available, don't try again
            if (!isGooglePlayServicesAvailable()) {
                return null;
            }
        }
        if (cachedCastContext != null) {
            return cachedCastContext;
        }
        try {
            cachedCastContext = CastContext.getSharedInstance(activity);
            castAvailable = true;
            return cachedCastContext;
        } catch (Exception e) {
            android.util.Log.e("ChromecastConnection", "getContext failed: " + e.getMessage());
            castAvailable = false;
            return null;
        } catch (Throwable t) {
            android.util.Log.e("ChromecastConnection", "getContext error: " + t.getMessage());
            castAvailable = false;
            return null;
        }
    }

    private SessionManager getSessionManager() {
        CastContext ctx = getContext();
        return ctx != null ? ctx.getSessionManager() : null;
    }

    /**
     * Check if Cast is available on this device.
     * @return true if Cast is available
     */
    public boolean isCastAvailable() {
        return castAvailable;
    }

    private CastSession getSession() {
        SessionManager sm = getSessionManager();
        return sm != null ? sm.getCurrentCastSession() : null;
    }

    /**
     * Polls for a Cast session to connect.
     * @param callback the callback to call when connected
     * @param attempt current attempt number
     */
    private void pollForSession(final RequestSessionCallback callback, final int attempt) {
        android.util.Log.d("Chromecast", "pollForSession: attempt " + attempt + ", CastState=" + getContext().getCastState());

        CastSession session = getSessionManager().getCurrentCastSession();
        if (session != null && session.isConnected()) {
            android.util.Log.d("Chromecast", "pollForSession: session connected!");
            media.setSession(session);
            callback.onJoin(ChromecastUtilities.createSessionObject(session));
            return;
        }

        if (attempt >= 20) { // Max 10 seconds (20 * 500ms)
            android.util.Log.e("Chromecast", "pollForSession: timeout after " + attempt + " attempts");
            callback.onError(7); // Timeout error
            return;
        }

        // Poll again after 500ms
        new android.os.Handler().postDelayed(new Runnable() {
            @Override
            public void run() {
                pollForSession(callback, attempt + 1);
            }
        }, 500);
    }

    private void setAppId(String applicationId) {
        this.appId = applicationId;
        this.settings.edit().putString("appId", appId).apply();
        getContext().setReceiverApplicationId(appId);
    }

    /**
     * Tests if an application receiver id is valid.
     * @param applicationId - application receiver id
     * @return true if valid
     */
    private boolean isValidAppId(String applicationId) {
        try {
            ScanCallback cb = new ScanCallback() {
                @Override
                void onRouteUpdate(List<RouteInfo> routes) { }
            };
            // This will throw if the applicationId is invalid
            getMediaRouter().addCallback(new MediaRouteSelector.Builder()
                            .addControlCategory(CastMediaControlIntent.categoryForCast(applicationId))
                            .build(),
                    cb,
                    MediaRouter.CALLBACK_FLAG_PERFORM_ACTIVE_SCAN);
            // If no exception we passed, so remove the callback
            getMediaRouter().removeCallback(cb);
            return true;
        } catch (IllegalArgumentException e) {
            // Don't set the appId if it is not a valid receiverApplicationID
            return false;
        }
    }

    /**
     * This will create a new session or seamlessly selectRoute an existing one if we created it.
     * @param routeId the id of the route to selectRoute
     * @param callback calls callback.onJoin when we have joined a session,
     *                 or callback.onError if an error occurred
     */
    public void selectRoute(final String routeId, final SelectRouteCallback callback) {
        activity.runOnUiThread(new Runnable() {
            public void run() {
                if (getSession() != null && getSession().isConnected()) {
                    callback.onError(ChromecastUtilities.createError("session_error",
                            "Leave or stop current session before attempting to join new session."));
                    return;
                }

                // We need this hack so that we can access these values in callbacks without having
                // to store it as a global variable, just always access first element
                final boolean[] foundRoute = {false};
                final boolean[] sentResult = {false};
                final int[] retries = {0};

                // We need to start an active scan because getMediaRouter().getRoutes() may be out
                // of date.  Also, maintaining a list of known routes doesn't work.  It is possible
                // to have a route in your "known" routes list, but is not in
                // getMediaRouter().getRoutes() which will result in "Ignoring attempt to select
                // removed route: ", even if that route *should* be available.  This state could
                // happen because routes are periodically "removed" and "added", and if the last
                // time media router was scanning ended when the route was temporarily removed the
                // getRoutes() fn will have no record of the route.  We need the active scan to
                // avoid this situation as well.  PS. Just running the scan non-stop is a poor idea
                // since it will drain battery power quickly.
                final ScanCallback scan = new ScanCallback() {
                    @Override
                    void onRouteUpdate(List<RouteInfo> routes) {
                        // Look for the matching route
                        for (RouteInfo route : routes) {
                            if (!foundRoute[0] && route.getId().equals(routeId)) {
                                // Found the route!
                                foundRoute[0] = true;
                                // try-catch for issue:
                                // https://github.com/jellyfin/cordova-plugin-chromecast/issues/48
                                try {
                                    // Try selecting the route!
                                    getMediaRouter().selectRoute(route);
                                } catch (NullPointerException e) {
                                    // Let it try to find the route again
                                    foundRoute[0] = false;
                                }
                            }
                        }
                    }
                };

                final Runnable retry = new Runnable() {
                    @Override
                    public void run() {
                        // Reset foundRoute
                        foundRoute[0] = false;
                        // Feed current routes into scan so that it can retry.
                        // If route is there, it will try to join,
                        // if not, it should wait for the scan to find the route
                        scan.onRouteUpdate(getMediaRouter().getRoutes());
                    }
                };

                final Function<JSONObject, Void> sendErrorResult = new Function<JSONObject, Void>() {
                    @Override
                    public Void apply(JSONObject message) {
                        if (!sentResult[0]) {
                            sentResult[0] = true;
                            stopRouteScan(scan, null);
                            callback.onError(message);
                        }
                        return null;
                    }
                };

                listenForConnection(new ConnectionCallback() {
                    @Override
                    public void onJoin(JSONObject jsonSession) {
                        sentResult[0] = true;
                        stopRouteScan(scan, null);
                        callback.onJoin(jsonSession);
                    }
                    @Override
                    public boolean onSessionStartFailed(int errorCode) {
                        if (errorCode == 7 || errorCode == 15) {
                            // It network or timeout error retry
                            retry.run();
                            return false;
                        } else {
                            sendErrorResult.apply(ChromecastUtilities.createError("session_error",
                                    "Failed to start session with error code: " + errorCode));
                            return true;
                        }
                    }
                    @Override
                    public boolean onSessionEndedBeforeStart(int errorCode) {
                        if (retries[0] < 10) {
                            retries[0]++;
                            retry.run();
                            return false;
                        } else {
                            sendErrorResult.apply(ChromecastUtilities.createError("session_error",
                                    "Failed to to join existing route (" + routeId + ") " + retries[0] + 1 + " times before giving up."));
                            return true;
                        }
                    }
                });

                startRouteScan(15000L, scan, new Runnable() {
                    @Override
                    public void run() {
                        sendErrorResult.apply(ChromecastUtilities.createError("timeout",
                                "Failed to join route (" + routeId + ") after 15s and " + (retries[0] + 1) + " tries."));
                    }
                });
            }
        });
    }

    /**
     * Will do one of two things:
     *
     * If no current connection will:
     * 1)
     * Displays the built in native prompt to the user.
     * It will actively scan for routes and display them to the user.
     * Upon selection it will immediately attempt to selectRoute the route.
     * Will call onJoin, onError or onCancel, of callback.
     *
     * Else we have a connection, so:
     * 2)
     * Displays the active connection dialog which includes the option
     * to disconnect.
     * Will only call onCancel of callback if the user cancels the dialog.
     *
     * @param callback calls callback.success when we have joined a session,
     *                 or callback.error if an error occurred or if the dialog was dismissed
     */
    public void requestSession(final RequestSessionCallback callback) {
        android.util.Log.d("Chromecast", "requestSession: called");
        activity.runOnUiThread(new Runnable() {
            public void run() {
                android.util.Log.d("Chromecast", "requestSession: on UI thread");
                CastSession session = getSession();
                if (session == null) {
                    android.util.Log.d("Chromecast", "requestSession: no existing session, showing dialog");
                    // show the "choose a connection" dialog

                    // Add the connection listener callback
                    listenForConnection(callback);

                    // Create the dialog
                    // TODO accept theme as a config.xml option
                    MediaRouteChooserDialog builder = new MediaRouteChooserDialog(activity, androidx.appcompat.R.style.Theme_AppCompat_NoActionBar);
                    builder.setRouteSelector(new MediaRouteSelector.Builder()
                            .addControlCategory(CastMediaControlIntent.categoryForCast(appId))
                            .build());
                    builder.setCanceledOnTouchOutside(true);
                    builder.setOnCancelListener(new DialogInterface.OnCancelListener() {
                        @Override
                        public void onCancel(DialogInterface dialog) {
                            android.util.Log.d("Chromecast", "requestSession: dialog cancelled");
                            getSessionManager().removeSessionManagerListener(newConnectionListener, CastSession.class);
                            callback.onCancel();
                        }
                    });
                    builder.setOnDismissListener(new DialogInterface.OnDismissListener() {
                        @Override
                        public void onDismiss(DialogInterface dialog) {
                            android.util.Log.d("Chromecast", "requestSession: dialog dismissed");
                            // The session should already be starting - the listenForConnection callback
                            // we set up before showing the dialog will handle the session start
                            final RouteInfo selectedRoute = getMediaRouter().getSelectedRoute();
                            android.util.Log.d("Chromecast", "requestSession: selected route = " + selectedRoute.getName() + ", isDefault=" + selectedRoute.isDefault());
                            android.util.Log.d("Chromecast", "requestSession: session should be starting, waiting for callback...");
                        }
                    });
                    builder.show();
                    android.util.Log.d("Chromecast", "requestSession: dialog shown");
                } else {
                    // We are are already connected, so show the "connection options" Dialog
                    AlertDialog.Builder builder = new AlertDialog.Builder(activity);
                    if (session.getCastDevice() != null) {
                        builder.setTitle(session.getCastDevice().getFriendlyName());
                    }
                    builder.setOnDismissListener(new DialogInterface.OnDismissListener() {
                        @Override
                        public void onDismiss(DialogInterface dialog) {
                            callback.onCancel();
                        }
                    });
                    builder.setPositiveButton("Stop Casting", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            endSession(true, null);
                        }
                    });
                    builder.show();
                }
            }
        });
    }

    /**
     * Must be called from the main thread.
     * @param callback calls callback.success when we have joined, or callback.error if an error occurred
     */
    private void listenForConnection(final ConnectionCallback callback) {
        android.util.Log.d("Chromecast", "listenForConnection: setting up listener");
        // We should only ever have one of these listeners active at a time, so remove previous
        getSessionManager().removeSessionManagerListener(newConnectionListener, CastSession.class);
        newConnectionListener = new SessionListener() {
            @Override
            public void onSessionStarting(CastSession castSession) {
                android.util.Log.d("Chromecast", "SessionListener: onSessionStarting");
            }
            @Override
            public void onSessionStarted(CastSession castSession, String sessionId) {
                android.util.Log.d("Chromecast", "SessionListener: onSessionStarted, sessionId=" + sessionId);
                getSessionManager().removeSessionManagerListener(this, CastSession.class);
                media.setSession(castSession);
                callback.onJoin(ChromecastUtilities.createSessionObject(castSession));
            }
            @Override
            public void onSessionStartFailed(CastSession castSession, int errCode) {
                android.util.Log.e("Chromecast", "SessionListener: onSessionStartFailed, errCode=" + errCode);
                if (callback.onSessionStartFailed(errCode)) {
                    getSessionManager().removeSessionManagerListener(this, CastSession.class);
                }
            }
            @Override
            public void onSessionEnded(CastSession castSession, int errCode) {
                android.util.Log.d("Chromecast", "SessionListener: onSessionEnded, errCode=" + errCode);
                if (callback.onSessionEndedBeforeStart(errCode)) {
                    getSessionManager().removeSessionManagerListener(this, CastSession.class);
                }
            }
        };
        getSessionManager().addSessionManagerListener(newConnectionListener, CastSession.class);
        android.util.Log.d("Chromecast", "listenForConnection: listener added");
    }

    /**
     * Starts listening for receiver updates.
     * Must call stopRouteScan(callback) or the battery will drain with non-stop active scanning.
     * @param timeout ms until the scan automatically stops,
     *                if 0 only calls callback.onRouteUpdate once with the currently known routes
     *                if null, will scan until stopRouteScan is called
     * @param callback the callback to receive route updates on
     * @param onTimeout called when the timeout hits
     */
    public void startRouteScan(final Long timeout, final ScanCallback callback, final Runnable onTimeout) {
        // Add the callback in active scan mode
        activity.runOnUiThread(new Runnable() {
            public void run() {
                callback.setMediaRouter(getMediaRouter());

                if (timeout != null && timeout == 0) {
                    // Send out the one time routes
                    callback.onFilteredRouteUpdate();
                    return;
                }

                // Add the callback in active scan mode
                getMediaRouter().addCallback(new MediaRouteSelector.Builder()
                        .addControlCategory(CastMediaControlIntent.categoryForCast(appId))
                        .build(),
                        callback,
                        MediaRouter.CALLBACK_FLAG_PERFORM_ACTIVE_SCAN);

                // Send out the initial routes after the callback has been added.
                // This is important because if the callback calls stopRouteScan only once, and it
                // happens during this call of "onFilterRouteUpdate", there must actually be an
                // added callback to remove to stop the scan.
                callback.onFilteredRouteUpdate();

                if (timeout != null) {
                    // remove the callback after timeout ms, and notify caller
                    new Handler().postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            // And stop the scan for routes
                            getMediaRouter().removeCallback(callback);
                            // Notify
                            if (onTimeout != null) {
                                onTimeout.run();
                            }
                        }
                    }, timeout);
                }
            }
        });
    }

    /**
     * Call to stop the active scan if any exist.
     * @param callback the callback to stop and remove
     * @param completionCallback called on completion
     */
    public void stopRouteScan(final ScanCallback callback, final Runnable completionCallback) {
        if (callback == null) {
            completionCallback.run();
            return;
        }
        activity.runOnUiThread(new Runnable() {
            public void run() {
                callback.stop();
                getMediaRouter().removeCallback(callback);
                if (completionCallback != null) {
                    completionCallback.run();
                }
            }
        });
    }

    /**
     * Exits the current session.
     * @param stopCasting should the receiver application  be stopped as well?
     * @param pluginCall called with .success or .error depending on the initial result
     */
    void endSession(final boolean stopCasting, final PluginCall pluginCall) {
        activity.runOnUiThread(new Runnable() {
            public void run() {
                getSessionManager().addSessionManagerListener(new SessionListener() {
                    @Override
                    public void onSessionEnded(CastSession castSession, int error) {
                        getSessionManager().removeSessionManagerListener(this, CastSession.class);
                        media.setSession(null);
                        if (pluginCall != null) {
                            pluginCall.resolve();
                        }
                        listener.onSessionEnd(ChromecastUtilities.createSessionObject(castSession, stopCasting ? "stopped" : "disconnected"));
                    }
                }, CastSession.class);

                getSessionManager().endCurrentSession(stopCasting);
            }
        });
    }

    /**
     * Create this empty class so that we don't have to override every function
     * each time we need a SessionManagerListener.
     */
    private class SessionListener implements SessionManagerListener<CastSession> {
        @Override
        public void onSessionStarting(CastSession castSession) { }
        @Override
        public void onSessionStarted(CastSession castSession, String sessionId) { }
        @Override
        public void onSessionStartFailed(CastSession castSession, int error) { }
        @Override
        public void onSessionEnding(CastSession castSession) { }
        @Override
        public void onSessionEnded(CastSession castSession, int error) { }
        @Override
        public void onSessionResuming(CastSession castSession, String sessionId) { }
        @Override
        public void onSessionResumed(CastSession castSession, boolean wasSuspended) { }
        @Override
        public void onSessionResumeFailed(CastSession castSession, int error) { }
        @Override
        public void onSessionSuspended(CastSession castSession, int reason) { }
    }

    interface SelectRouteCallback {
        void onJoin(JSONObject jsonSession);
        void onError(JSONObject message);
    }

    abstract static class RequestSessionCallback implements ConnectionCallback {
        abstract void onError(int errorCode);
        abstract void onCancel();
        @Override
        public final boolean onSessionEndedBeforeStart(int errorCode) {
            onSessionStartFailed(errorCode);
            return true;
        }
        @Override
        public final boolean onSessionStartFailed(int errorCode) {
            onError(errorCode);
            return true;
        }
    }

    interface ConnectionCallback {
        /**
         * Successfully joined a session on a route.
         * @param jsonSession the session we joined
         */
        void onJoin(JSONObject jsonSession);

        /**
         * Called if we received an error.
         * @param errorCode You can find the error meaning here:
         *                 https://developers.google.com/android/reference/com/google/android/gms/cast/CastStatusCodes
         * @return true if we are done listening for join, false, if we to keep listening
         */
        boolean onSessionStartFailed(int errorCode);

        /**
         * Called when we detect a session ended event before session started.
         * See issues:
         *     https://github.com/jellyfin/cordova-plugin-chromecast/issues/49
         *     https://github.com/jellyfin/cordova-plugin-chromecast/issues/48
         * @param errorCode error to output
         * @return true if we are done listening for join, false, if we to keep listening
         */
        boolean onSessionEndedBeforeStart(int errorCode);
    }

    public abstract static class ScanCallback extends MediaRouter.Callback {
        /**
         * Called whenever a route is updated.
         * @param routes the currently available routes
         */
        abstract void onRouteUpdate(List<RouteInfo> routes);

        /** records whether we have been stopped or not. */
        private boolean stopped = false;
        /** Global mediaRouter object. */
        private MediaRouter mediaRouter;

        /**
         * Sets the mediaRouter object.
         * @param router mediaRouter object
         */
        void setMediaRouter(MediaRouter router) {
            this.mediaRouter = router;
        }

        /**
         * Call this method when you wish to stop scanning.
         * It is important that it is called, otherwise battery
         * life will drain more quickly.
         */
        void stop() {
            stopped = true;
        }
        private void onFilteredRouteUpdate() {
            if (stopped || mediaRouter == null) {
                return;
            }
            List<RouteInfo> outRoutes = new ArrayList<>();
            // Filter the routes
            for (RouteInfo route : mediaRouter.getRoutes()) {
                // We don't want default routes, or duplicate active routes
                // or multizone duplicates https://github.com/jellyfin/cordova-plugin-chromecast/issues/32
                Bundle extras = route.getExtras();
                if (extras != null) {
                    CastDevice.getFromBundle(extras);
                    if (extras.getString("com.google.android.gms.cast.EXTRA_SESSION_ID") != null) {
                        continue;
                    }
                }
                if (!route.isDefault()
                        && !route.getDescription().equals("Google Cast Multizone Member")
                        && route.getPlaybackType() == RouteInfo.PLAYBACK_TYPE_REMOTE
                ) {
                    outRoutes.add(route);
                }
            }
            onRouteUpdate(outRoutes);
        }
        @Override
        public final void onRouteAdded(MediaRouter router, RouteInfo route) {
            onFilteredRouteUpdate();
        }
        @Override
        public final void onRouteChanged(MediaRouter router, RouteInfo route) {
            onFilteredRouteUpdate();
        }
        @Override
        public final void onRouteRemoved(MediaRouter router, RouteInfo route) {
            onFilteredRouteUpdate();
        }
    }

    abstract static class Listener implements CastStateListener, ChromecastSession.Listener {
        abstract void onReceiverAvailableUpdate(boolean available);
        abstract void onSessionRejoin(JSONObject jsonSession);

        /** CastStateListener functions. */
        @Override
        public void onCastStateChanged(int state) {
            onReceiverAvailableUpdate(state != CastState.NO_DEVICES_AVAILABLE);
        }
    }

}
