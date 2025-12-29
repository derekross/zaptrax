package com.gameleap.plugins.chromecast.lib;

import java.util.List;

import com.google.android.gms.cast.framework.CastOptions;
import com.google.android.gms.cast.framework.OptionsProvider;
import com.google.android.gms.cast.framework.SessionProvider;

import android.content.Context;

public final class CastOptionsProvider implements OptionsProvider {

    /** The app id. */
    private static String appId;

    /**
     * Sets the app ID.
     * @param applicationId appId
     */
    public static void setAppId(String applicationId) {
        appId = applicationId;
    }

    @Override
    public CastOptions getCastOptions(Context context) {
        android.util.Log.d("Chromecast", "CastOptionsProvider.getCastOptions called, appId=" + appId);
        String receiverAppId = appId;
        if (receiverAppId == null || receiverAppId.isEmpty()) {
            receiverAppId = com.google.android.gms.cast.CastMediaControlIntent.DEFAULT_MEDIA_RECEIVER_APPLICATION_ID;
            android.util.Log.d("Chromecast", "Using default receiver app ID: " + receiverAppId);
        }
        return new CastOptions.Builder()
                .setReceiverApplicationId(receiverAppId)
                .build();
    }
    @Override
    public List<SessionProvider> getAdditionalSessionProviders(Context context) {
        return null;
    }
}
