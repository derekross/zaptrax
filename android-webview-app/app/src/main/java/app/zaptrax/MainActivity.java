package app.zaptrax;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends Activity {

    private static final String TAG = "MainActivity";
    private static final int NOTIFICATION_PERMISSION_CODE = 100;

    public static MainActivity instance;
    public MediaSessionManager mediaSessionManager;

    private WebView webView;
    private ProgressBar progressBar;
    private MediaBridge mediaBridge;
    private MediaPlaybackService mediaPlaybackService;
    private boolean serviceBound = false;
    private boolean hasRequestedNotificationPermission = false;
    private static final String WEBSITE_URL = "https://zaptrax.app";

    private ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            MediaPlaybackService.LocalBinder binder = (MediaPlaybackService.LocalBinder) service;
            mediaPlaybackService = binder.getService();
            serviceBound = true;
            Log.d(TAG, "MediaPlaybackService connected");
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            mediaPlaybackService = null;
            serviceBound = false;
            Log.d(TAG, "MediaPlaybackService disconnected");
        }
    };

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        instance = this;

        webView = findViewById(R.id.webview);
        progressBar = findViewById(R.id.progressBar);

        Log.d(TAG, "Initializing media controls...");

        // Initialize media session manager
        mediaSessionManager = new MediaSessionManager(this, webView);
        mediaBridge = new MediaBridge(mediaSessionManager);

        Log.d(TAG, "Media session manager and bridge created");

        // Bind to media playback service
        Intent serviceIntent = new Intent(this, MediaPlaybackService.class);
        bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE);
        Log.d(TAG, "Binding to MediaPlaybackService");

        // Set up playback state listener for foreground service
        mediaSessionManager.setPlaybackStateListener((playing, notification) -> {
            if (serviceBound && mediaPlaybackService != null) {
                if (playing) {
                    // Start foreground service when playing
                    Log.d(TAG, "Starting foreground service for background playback");
                    mediaPlaybackService.startForeground(notification);
                } else {
                    // Stop foreground when paused but keep service alive
                    Log.d(TAG, "Stopping foreground service (paused)");
                    mediaPlaybackService.stopForegroundService();
                }
            }
        });

        // Request notification permission for Android 13+
        requestNotificationPermission();

        // Check internet connection
        if (!isNetworkAvailable()) {
            Toast.makeText(this, "No internet connection. Please check your network settings.", Toast.LENGTH_LONG).show();
        }

        // Enable WebView debugging
        WebView.setWebContentsDebuggingEnabled(true);

        // Configure WebView settings
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setAllowFileAccess(false);
        webSettings.setAllowContentAccess(true);
        webSettings.setSupportZoom(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setSupportMultipleWindows(false);
        webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);

        // Enable mixed content mode for HTTPS
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        // Add JavaScript interface for media controls
        webView.addJavascriptInterface(mediaBridge, "AndroidMediaBridge");
        Log.d(TAG, "AndroidMediaBridge JavaScript interface added");

        // Set WebViewClient to handle navigation
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                // Open external links (non-zaptrax.app domains) in browser
                if (!url.startsWith(WEBSITE_URL)) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                }

                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);

                Log.d(TAG, "Page finished loading: " + url);
                // Inject JavaScript to connect HTML5 audio to Android media controls
                injectMediaControlsScript();
                Log.d(TAG, "Media controls script injected");
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);

                if (request.isForMainFrame()) {
                    progressBar.setVisibility(View.GONE);
                    Toast.makeText(MainActivity.this,
                        "Error loading page. Please check your internet connection.",
                        Toast.LENGTH_LONG).show();
                }
            }
        });

        // Set WebChromeClient to handle progress updates and console messages
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);

                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                String tag = "WebView";
                String message = consoleMessage.message() + " -- From line " +
                        consoleMessage.lineNumber() + " of " +
                        consoleMessage.sourceId();

                switch (consoleMessage.messageLevel()) {
                    case ERROR:
                        Log.e(tag, message);
                        break;
                    case WARNING:
                        Log.w(tag, message);
                        break;
                    case LOG:
                    case DEBUG:
                    case TIP:
                    default:
                        Log.d(tag, message);
                        break;
                }
                return true;
            }
        });

        // Load the website
        webView.loadUrl(WEBSITE_URL);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Handle back button to navigate within WebView
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }

    @Override
    protected void onDestroy() {
        if (mediaSessionManager != null) {
            mediaSessionManager.release();
        }
        if (serviceBound) {
            unbindService(serviceConnection);
            serviceBound = false;
        }
        if (webView != null) {
            webView.destroy();
        }
        instance = null;
        super.onDestroy();
    }

    /**
     * Check if network connection is available
     */
    private boolean isNetworkAvailable() {
        ConnectivityManager connectivityManager =
            (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
        return activeNetworkInfo != null && activeNetworkInfo.isConnected();
    }

    /**
     * Injects JavaScript to connect HTML5 audio element to Android media controls
     */
    private void injectMediaControlsScript() {
        try {
            // Load script from assets
            InputStream is = getAssets().open("media-controls.js");
            BufferedReader reader = new BufferedReader(new InputStreamReader(is));
            StringBuilder script = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                script.append(line).append('\n');
            }
            reader.close();

            Log.d(TAG, "Loaded media controls script (" + script.length() + " bytes)");
            webView.evaluateJavascript(script.toString(), null);
        } catch (Exception e) {
            Log.e(TAG, "Error loading media controls script", e);
        }
    }

    /**
     * Request notification permission for Android 13+
     */
    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {

                // Only ask once per app lifecycle
                if (!hasRequestedNotificationPermission) {
                    hasRequestedNotificationPermission = true;

                    // Check if we should show rationale (user previously denied)
                    if (ActivityCompat.shouldShowRequestPermissionRationale(this,
                            Manifest.permission.POST_NOTIFICATIONS)) {
                        Log.d(TAG, "User previously denied notification permission");
                        // Don't repeatedly ask - user can enable in settings if they want
                    } else {
                        Log.d(TAG, "Requesting notification permission");
                        ActivityCompat.requestPermissions(this,
                                new String[]{Manifest.permission.POST_NOTIFICATIONS},
                                NOTIFICATION_PERMISSION_CODE);
                    }
                }
            } else {
                Log.d(TAG, "Notification permission already granted");
            }
        } else {
            Log.d(TAG, "Notification permission not required for this Android version");
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NOTIFICATION_PERMISSION_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "Notification permission granted");
            } else {
                Log.d(TAG, "Notification permission denied - media controls won't appear in notification");
            }
        }
    }
}
