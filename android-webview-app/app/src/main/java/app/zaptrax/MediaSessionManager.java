package app.zaptrax;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebView;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Manages Android MediaSession and media-style notifications
 */
public class MediaSessionManager {
    private static final String TAG = "MediaSessionManager";
    private static final String CHANNEL_ID = "zaptrax_playback";
    private static final int NOTIFICATION_ID = 1;

    private final Context context;
    private final WebView webView;
    private MediaSessionCompat mediaSession;
    private PlaybackStateCompat.Builder playbackStateBuilder;
    private MediaMetadataCompat.Builder metadataBuilder;

    private String currentTitle = "";
    private String currentArtist = "";
    private String currentAlbum = "";
    private String currentArtworkUrl = "";
    private long currentDuration = 0;
    private long currentPosition = 0;
    private boolean isPlaying = false;
    private Notification currentNotification = null;
    private PlaybackStateListener playbackStateListener = null;

    public interface PlaybackStateListener {
        void onPlaybackStateChanged(boolean playing, Notification notification);
    }

    public MediaSessionManager(Context context, WebView webView) {
        this.context = context;
        this.webView = webView;
        initialize();
    }

    public void setPlaybackStateListener(PlaybackStateListener listener) {
        this.playbackStateListener = listener;
    }

    private void initialize() {
        // Create notification channel (required for Android O and above)
        createNotificationChannel();

        // Create MediaSession
        mediaSession = new MediaSessionCompat(context, "ZaptraxMediaSession");

        // Set callback for media button events
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                Log.d(TAG, "★ MediaSession callback: Play button clicked");
                executeJavaScript("window.zaptraxMediaControls?.play()");
            }

            @Override
            public void onPause() {
                Log.d(TAG, "★ MediaSession callback: Pause button clicked");
                executeJavaScript("window.zaptraxMediaControls?.pause()");
            }

            @Override
            public void onSkipToNext() {
                Log.d(TAG, "★ MediaSession callback: Next button clicked");
                executeJavaScript("window.zaptraxMediaControls?.next()");
            }

            @Override
            public void onSkipToPrevious() {
                Log.d(TAG, "★ MediaSession callback: Previous button clicked");
                executeJavaScript("window.zaptraxMediaControls?.previous()");
            }

            @Override
            public void onSeekTo(long pos) {
                Log.d(TAG, "★ MediaSession callback: Seek to " + pos);
                executeJavaScript("window.zaptraxMediaControls?.seekTo(" + pos + ")");
            }

            @Override
            public void onStop() {
                Log.d(TAG, "★ MediaSession callback: Stop");
                stop();
            }
        });

        // Set supported actions
        mediaSession.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );

        // Initialize playback state
        playbackStateBuilder = new PlaybackStateCompat.Builder()
            .setActions(
                PlaybackStateCompat.ACTION_PLAY |
                PlaybackStateCompat.ACTION_PAUSE |
                PlaybackStateCompat.ACTION_PLAY_PAUSE |
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                PlaybackStateCompat.ACTION_SEEK_TO |
                PlaybackStateCompat.ACTION_STOP
            );

        metadataBuilder = new MediaMetadataCompat.Builder();

        mediaSession.setActive(true);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Music Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Controls for music playback");
            channel.setShowBadge(false);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    public void updatePlaybackState(boolean playing) {
        Log.d(TAG, "updatePlaybackState called: " + (playing ? "playing" : "paused"));
        this.isPlaying = playing;

        int state = playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;

        PlaybackStateCompat playbackState = playbackStateBuilder
            .setState(state, currentPosition, playing ? 1.0f : 0.0f)
            .build();

        mediaSession.setPlaybackState(playbackState);

        updateNotification();

        // Notify listener about playback state change
        if (playbackStateListener != null && currentNotification != null) {
            playbackStateListener.onPlaybackStateChanged(playing, currentNotification);
        }
    }

    public void updateMetadata(String title, String artist, String album, String artworkUrl, long durationMs) {
        Log.d(TAG, "updateMetadata called: title=" + title + ", artist=" + artist + ", album=" + album + ", duration=" + durationMs);
        this.currentTitle = title != null ? title : "";
        this.currentArtist = artist != null ? artist : "";
        this.currentAlbum = album != null ? album : "";
        this.currentArtworkUrl = artworkUrl != null ? artworkUrl : "";
        this.currentDuration = durationMs;

        metadataBuilder
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, currentAlbum)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, currentDuration);

        // Load album art asynchronously
        if (!currentArtworkUrl.isEmpty()) {
            loadArtwork(currentArtworkUrl);
        } else {
            mediaSession.setMetadata(metadataBuilder.build());
            updateNotification();
        }
    }

    public void updatePosition(long positionMs) {
        this.currentPosition = positionMs;

        int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        PlaybackStateCompat playbackState = playbackStateBuilder
            .setState(state, positionMs, isPlaying ? 1.0f : 0.0f)
            .build();

        mediaSession.setPlaybackState(playbackState);
    }

    private void loadArtwork(String url) {
        new Thread(() -> {
            try {
                URL imageUrl = new URL(url);
                HttpURLConnection connection = (HttpURLConnection) imageUrl.openConnection();
                connection.setDoInput(true);
                connection.connect();
                InputStream input = connection.getInputStream();
                Bitmap artwork = BitmapFactory.decodeStream(input);

                new Handler(Looper.getMainLooper()).post(() -> {
                    metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, artwork);
                    mediaSession.setMetadata(metadataBuilder.build());
                    updateNotification();
                });
            } catch (Exception e) {
                Log.e(TAG, "Failed to load artwork", e);
                new Handler(Looper.getMainLooper()).post(() -> {
                    mediaSession.setMetadata(metadataBuilder.build());
                    updateNotification();
                });
            }
        }).start();
    }

    private void updateNotification() {
        // Use default values if track info isn't available yet
        String title = currentTitle.isEmpty() ? "Zaptrax" : currentTitle;
        String artist = currentArtist.isEmpty() ? "Music Player" : currentArtist;
        String album = currentAlbum;

        Log.d(TAG, "Updating notification: " + title + " - " + artist + " (playing: " + isPlaying + ")");

        // Create intent to return to app when notification is clicked
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Build notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(artist)
            .setSubText(album)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(contentIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setShowWhen(false);

        // Add media style with actions
        androidx.media.app.NotificationCompat.MediaStyle mediaStyle =
            new androidx.media.app.NotificationCompat.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2);

        builder.setStyle(mediaStyle);

        // Add action buttons
        builder.addAction(createAction(R.drawable.ic_skip_previous, "Previous", "previous"));

        if (isPlaying) {
            builder.addAction(createAction(R.drawable.ic_pause, "Pause", "pause"));
        } else {
            builder.addAction(createAction(R.drawable.ic_play, "Play", "play"));
        }

        builder.addAction(createAction(R.drawable.ic_skip_next, "Next", "next"));

        // Show notification with error handling
        try {
            currentNotification = builder.build();
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            notificationManager.notify(NOTIFICATION_ID, currentNotification);
            Log.d(TAG, "Notification posted successfully");

            // Notify listener if playing (for foreground service)
            if (playbackStateListener != null && isPlaying) {
                playbackStateListener.onPlaybackStateChanged(isPlaying, currentNotification);
            }
        } catch (SecurityException e) {
            Log.e(TAG, "SecurityException posting notification - permission not granted", e);
        } catch (Exception e) {
            Log.e(TAG, "Error posting notification", e);
        }
    }

    public Notification getCurrentNotification() {
        return currentNotification;
    }

    private NotificationCompat.Action createAction(int icon, String title, String action) {
        Intent intent = new Intent(context, MediaButtonReceiver.class);
        intent.setAction("app.zaptrax.action." + action.toUpperCase());

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            action.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Action.Builder(icon, title, pendingIntent).build();
    }

    private void executeJavaScript(String script) {
        if (webView != null) {
            webView.post(() -> webView.evaluateJavascript(script, null));
        }
    }

    public void stop() {
        isPlaying = false;
        mediaSession.setActive(false);

        // Cancel notification
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        notificationManager.cancel(NOTIFICATION_ID);
    }

    public void release() {
        stop();
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
    }

    public MediaSessionCompat getMediaSession() {
        return mediaSession;
    }
}
