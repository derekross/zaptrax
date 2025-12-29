package app.zaptrax;

import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.support.v4.media.MediaBrowserCompat;
import android.support.v4.media.MediaDescriptionCompat;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.media.MediaBrowserServiceCompat;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ZaptraxMediaBrowserService extends MediaBrowserServiceCompat {
    private static final String TAG = "ZaptraxMediaBrowser";

    private static final String MEDIA_ROOT_ID = "zaptrax_root";
    private static final String MEDIA_NOW_PLAYING_ID = "now_playing";
    private static final String MEDIA_QUEUE_ID = "queue";

    private MediaSessionCompat mediaSession;
    private PlaybackStateCompat.Builder playbackStateBuilder;
    private MediaMetadataCompat.Builder metadataBuilder;
    private ExecutorService executor;

    // Static instance for communication with Capacitor
    private static ZaptraxMediaBrowserService instance;
    private static MediaCommandListener commandListener;

    // Current state
    private static String currentTitle = "";
    private static String currentArtist = "";
    private static String currentAlbum = "";
    private static String currentArtworkUrl = "";
    private static long currentDuration = 0;
    private static long currentPosition = 0;
    private static boolean isPlaying = false;
    private static List<TrackInfo> queue = new ArrayList<>();
    private static int currentQueueIndex = -1;

    public interface MediaCommandListener {
        void onPlay();
        void onPause();
        void onSkipToNext();
        void onSkipToPrevious();
        void onSeekTo(long position);
        void onPlayFromMediaId(String mediaId);
        void onStop();
    }

    public static class TrackInfo {
        public String id;
        public String title;
        public String artist;
        public String album;
        public String artworkUrl;
        public long duration;

        public TrackInfo(String id, String title, String artist, String album, String artworkUrl, long duration) {
            this.id = id;
            this.title = title;
            this.artist = artist;
            this.album = album;
            this.artworkUrl = artworkUrl;
            this.duration = duration;
        }
    }

    public static void setCommandListener(MediaCommandListener listener) {
        commandListener = listener;
    }

    public static ZaptraxMediaBrowserService getInstance() {
        return instance;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        executor = Executors.newSingleThreadExecutor();

        Log.d(TAG, "ZaptraxMediaBrowserService onCreate");

        // Create MediaSession
        mediaSession = new MediaSessionCompat(this, "ZaptraxMediaSession");

        // Set up the session callbacks
        mediaSession.setCallback(new MediaSessionCallback());

        // Set the session token so Android Auto can connect
        setSessionToken(mediaSession.getSessionToken());

        // Set up the playback state builder
        playbackStateBuilder = new PlaybackStateCompat.Builder()
            .setActions(
                PlaybackStateCompat.ACTION_PLAY |
                PlaybackStateCompat.ACTION_PAUSE |
                PlaybackStateCompat.ACTION_PLAY_PAUSE |
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                PlaybackStateCompat.ACTION_SEEK_TO |
                PlaybackStateCompat.ACTION_STOP
            )
            .setState(PlaybackStateCompat.STATE_PAUSED, 0, 1.0f);
        mediaSession.setPlaybackState(playbackStateBuilder.build());

        // Set up empty metadata initially
        metadataBuilder = new MediaMetadataCompat.Builder();
        mediaSession.setMetadata(metadataBuilder.build());

        // Set session activity to launch main activity
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        mediaSession.setSessionActivity(pendingIntent);

        // Activate the session
        mediaSession.setActive(true);
    }

    @Override
    public void onDestroy() {
        instance = null;
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        if (executor != null) {
            executor.shutdown();
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public BrowserRoot onGetRoot(@NonNull String clientPackageName, int clientUid, @Nullable Bundle rootHints) {
        Log.d(TAG, "onGetRoot called by: " + clientPackageName);

        // Allow all clients to browse (Android Auto, etc.)
        // In production, you might want to verify the client package
        return new BrowserRoot(MEDIA_ROOT_ID, null);
    }

    @Override
    public void onLoadChildren(@NonNull String parentId, @NonNull Result<List<MediaBrowserCompat.MediaItem>> result) {
        Log.d(TAG, "onLoadChildren called for parentId: " + parentId);

        List<MediaBrowserCompat.MediaItem> mediaItems = new ArrayList<>();

        if (MEDIA_ROOT_ID.equals(parentId)) {
            // Return root menu items
            MediaDescriptionCompat.Builder nowPlayingDesc = new MediaDescriptionCompat.Builder()
                .setMediaId(MEDIA_NOW_PLAYING_ID)
                .setTitle("Now Playing")
                .setSubtitle(currentTitle.isEmpty() ? "Nothing playing" : currentTitle);
            mediaItems.add(new MediaBrowserCompat.MediaItem(
                nowPlayingDesc.build(),
                MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
            ));

            MediaDescriptionCompat.Builder queueDesc = new MediaDescriptionCompat.Builder()
                .setMediaId(MEDIA_QUEUE_ID)
                .setTitle("Queue")
                .setSubtitle(queue.size() + " tracks");
            mediaItems.add(new MediaBrowserCompat.MediaItem(
                queueDesc.build(),
                MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
            ));

        } else if (MEDIA_NOW_PLAYING_ID.equals(parentId)) {
            // Return current track info
            if (!currentTitle.isEmpty()) {
                MediaDescriptionCompat.Builder desc = new MediaDescriptionCompat.Builder()
                    .setMediaId("current_track")
                    .setTitle(currentTitle)
                    .setSubtitle(currentArtist)
                    .setDescription(currentAlbum);

                if (!currentArtworkUrl.isEmpty()) {
                    desc.setIconUri(Uri.parse(currentArtworkUrl));
                }

                mediaItems.add(new MediaBrowserCompat.MediaItem(
                    desc.build(),
                    MediaBrowserCompat.MediaItem.FLAG_PLAYABLE
                ));
            }

        } else if (MEDIA_QUEUE_ID.equals(parentId)) {
            // Return queue items
            for (int i = 0; i < queue.size(); i++) {
                TrackInfo track = queue.get(i);
                MediaDescriptionCompat.Builder desc = new MediaDescriptionCompat.Builder()
                    .setMediaId("queue_" + i + "_" + track.id)
                    .setTitle(track.title)
                    .setSubtitle(track.artist)
                    .setDescription(track.album);

                if (track.artworkUrl != null && !track.artworkUrl.isEmpty()) {
                    desc.setIconUri(Uri.parse(track.artworkUrl));
                }

                mediaItems.add(new MediaBrowserCompat.MediaItem(
                    desc.build(),
                    MediaBrowserCompat.MediaItem.FLAG_PLAYABLE
                ));
            }
        }

        result.sendResult(mediaItems);
    }

    // Public methods to update state from Capacitor plugin
    public void updateMetadata(String title, String artist, String album, String artworkUrl, long duration) {
        currentTitle = title != null ? title : "";
        currentArtist = artist != null ? artist : "";
        currentAlbum = album != null ? album : "";
        currentArtworkUrl = artworkUrl != null ? artworkUrl : "";
        currentDuration = duration;

        Log.d(TAG, "updateMetadata: " + title + " by " + artist);

        metadataBuilder = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, currentAlbum)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, currentDuration);

        if (!currentArtworkUrl.isEmpty()) {
            metadataBuilder.putString(MediaMetadataCompat.METADATA_KEY_ALBUM_ART_URI, currentArtworkUrl);
            // Load artwork in background
            loadArtwork(currentArtworkUrl);
        }

        mediaSession.setMetadata(metadataBuilder.build());

        // Notify that children have changed (for browse updates)
        notifyChildrenChanged(MEDIA_ROOT_ID);
        notifyChildrenChanged(MEDIA_NOW_PLAYING_ID);
    }

    public void updatePlaybackState(boolean playing, long position, float speed) {
        isPlaying = playing;
        currentPosition = position;

        int state = playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;

        playbackStateBuilder.setState(state, position, speed);
        mediaSession.setPlaybackState(playbackStateBuilder.build());
    }

    public void updateQueue(List<TrackInfo> newQueue, int currentIndex) {
        queue = newQueue != null ? newQueue : new ArrayList<>();
        currentQueueIndex = currentIndex;

        Log.d(TAG, "updateQueue: " + queue.size() + " tracks, current index: " + currentIndex);

        // Notify that queue children have changed
        notifyChildrenChanged(MEDIA_QUEUE_ID);
    }

    private void loadArtwork(String artworkUrl) {
        executor.execute(() -> {
            try {
                URL url = new URL(artworkUrl);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setDoInput(true);
                connection.connect();
                InputStream input = connection.getInputStream();
                Bitmap bitmap = BitmapFactory.decodeStream(input);

                if (bitmap != null) {
                    metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, bitmap);
                    mediaSession.setMetadata(metadataBuilder.build());
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to load artwork: " + e.getMessage());
            }
        });
    }

    private class MediaSessionCallback extends MediaSessionCompat.Callback {
        @Override
        public void onPlay() {
            Log.d(TAG, "MediaSession onPlay");
            if (commandListener != null) {
                commandListener.onPlay();
            }
        }

        @Override
        public void onPause() {
            Log.d(TAG, "MediaSession onPause");
            if (commandListener != null) {
                commandListener.onPause();
            }
        }

        @Override
        public void onSkipToNext() {
            Log.d(TAG, "MediaSession onSkipToNext");
            if (commandListener != null) {
                commandListener.onSkipToNext();
            }
        }

        @Override
        public void onSkipToPrevious() {
            Log.d(TAG, "MediaSession onSkipToPrevious");
            if (commandListener != null) {
                commandListener.onSkipToPrevious();
            }
        }

        @Override
        public void onSeekTo(long pos) {
            Log.d(TAG, "MediaSession onSeekTo: " + pos);
            if (commandListener != null) {
                commandListener.onSeekTo(pos);
            }
        }

        @Override
        public void onPlayFromMediaId(String mediaId, Bundle extras) {
            Log.d(TAG, "MediaSession onPlayFromMediaId: " + mediaId);
            if (commandListener != null) {
                commandListener.onPlayFromMediaId(mediaId);
            }
        }

        @Override
        public void onStop() {
            Log.d(TAG, "MediaSession onStop");
            if (commandListener != null) {
                commandListener.onStop();
            }
        }
    }
}
