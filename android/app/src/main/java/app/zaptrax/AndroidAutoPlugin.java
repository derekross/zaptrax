package app.zaptrax;

import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "AndroidAuto")
public class AndroidAutoPlugin extends Plugin {
    private static final String TAG = "AndroidAutoPlugin";

    @PluginMethod
    public void updateMetadata(PluginCall call) {
        String title = call.getString("title", "");
        String artist = call.getString("artist", "");
        String album = call.getString("album", "");
        String artworkUrl = call.getString("artworkUrl", "");
        long duration = call.getInt("duration", 0) * 1000L; // Convert seconds to ms

        Log.d(TAG, "updateMetadata: " + title + " by " + artist);

        ZaptraxMediaBrowserService service = ZaptraxMediaBrowserService.getInstance();
        if (service != null) {
            service.updateMetadata(title, artist, album, artworkUrl, duration);
            call.resolve();
        } else {
            Log.w(TAG, "MediaBrowserService not available");
            call.resolve(); // Don't fail if service isn't running
        }
    }

    @PluginMethod
    public void updatePlaybackState(PluginCall call) {
        boolean playing = call.getBoolean("playing", false);
        double position = call.getDouble("position", 0.0);
        double speed = call.getDouble("speed", 1.0);

        Log.d(TAG, "updatePlaybackState: playing=" + playing + ", position=" + position);

        ZaptraxMediaBrowserService service = ZaptraxMediaBrowserService.getInstance();
        if (service != null) {
            service.updatePlaybackState(playing, (long)(position * 1000), (float)speed);
            call.resolve();
        } else {
            Log.w(TAG, "MediaBrowserService not available");
            call.resolve();
        }
    }

    @PluginMethod
    public void updateQueue(PluginCall call) {
        JSArray tracksArray = call.getArray("tracks");
        int currentIndex = call.getInt("currentIndex", -1);

        if (tracksArray == null) {
            call.resolve();
            return;
        }

        List<ZaptraxMediaBrowserService.TrackInfo> tracks = new ArrayList<>();

        try {
            for (int i = 0; i < tracksArray.length(); i++) {
                JSONObject trackObj = tracksArray.getJSONObject(i);
                ZaptraxMediaBrowserService.TrackInfo track = new ZaptraxMediaBrowserService.TrackInfo(
                    trackObj.optString("id", ""),
                    trackObj.optString("title", ""),
                    trackObj.optString("artist", ""),
                    trackObj.optString("album", ""),
                    trackObj.optString("artworkUrl", ""),
                    trackObj.optLong("duration", 0) * 1000L
                );
                tracks.add(track);
            }
        } catch (JSONException e) {
            Log.e(TAG, "Failed to parse queue: " + e.getMessage());
            call.reject("Failed to parse queue");
            return;
        }

        Log.d(TAG, "updateQueue: " + tracks.size() + " tracks, index=" + currentIndex);

        ZaptraxMediaBrowserService service = ZaptraxMediaBrowserService.getInstance();
        if (service != null) {
            service.updateQueue(tracks, currentIndex);
            call.resolve();
        } else {
            Log.w(TAG, "MediaBrowserService not available");
            call.resolve();
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", ZaptraxMediaBrowserService.getInstance() != null);
        call.resolve(result);
    }
}
