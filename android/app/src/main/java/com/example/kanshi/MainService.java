package com.example.kanshi;

import static android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC;
import static com.example.kanshi.BuildConfig.DEBUG;
import static com.example.kanshi.Configs.DATA_EVICTION_CHANNEL;
import static com.example.kanshi.Configs.NOTIFICATION_DATA_EVICTION;
import static com.example.kanshi.Configs.UNIQUE_KEY;
import static com.example.kanshi.Configs.getAssetLoader;
import static com.example.kanshi.Utils.fetchWebConnection;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.IBinder;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.webkit.WebViewAssetLoader;

import com.example.kanshi.localHTTPServer.LocalServer;
import com.example.kanshi.localHTTPServer.LocalServerListener;

import java.io.File;
import java.lang.ref.WeakReference;
import java.util.concurrent.TimeUnit;

@SuppressLint("SetJavaScriptEnabled")
public class MainService extends Service {
    public static WeakReference<MainService> weakActivity;
    WebView webView;
    public SharedPreferences prefs;
    private SharedPreferences.Editor prefsEdit;
    private boolean keepAppRunningInBackground = false;
    public boolean isReloaded = true;
    private final String APP_IN_BACKGROUND_CHANNEL = "app_in_background_channel";
    private final int SERVICE_NOTIFICATION_ID = 995;
    private final String STOP_SERVICE_ACTION = "STOP_MAIN_SERVICE";
    private final String SET_MAIN_SERVICE = "SET_MAIN_SERVICE";
    public boolean lastBackgroundUpdateIsFinished = false;
    public boolean isAddingMediaReleaseNotification = false;
    public boolean shouldCallStopService = false;
    public boolean shouldRefreshList = false;
    public boolean shouldProcessRecommendedEntries = false;
    public boolean shouldManageMedia = false;
    public long addedMediaCount = 0;
    public long updatedMediaCount = 0;

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @RequiresApi(api = Build.VERSION_CODES.TIRAMISU)
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && STOP_SERVICE_ACTION.equals(intent.getAction())) {
            stopForeground(true);
            stopSelf();
        } else if (intent != null && SET_MAIN_SERVICE.equals(intent.getAction())) {
            if (ActivityCompat.checkSelfPermission(this.getApplicationContext(), android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                MainActivity mainActivity = MainActivity.getInstanceActivity();
                if (mainActivity != null) {
                    keepAppRunningInBackground = !keepAppRunningInBackground;
                    mainActivity.changeKeepAppRunningInBackground(keepAppRunningInBackground);
                } else if (prefsEdit != null) {
                    keepAppRunningInBackground = !keepAppRunningInBackground;
                    prefsEdit.putBoolean("keepAppRunningInBackground", keepAppRunningInBackground).apply();
                }
                updateMediaNotificationTitle("");
            }
        }
        return START_STICKY;
    }

    @RequiresApi(api = Build.VERSION_CODES.TIRAMISU)
    @Override
    public void onCreate() {
        // Log Errors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Thread.setDefaultUncaughtExceptionHandler((thread, e) -> Utils.handleUncaughtException(MainService.this.getApplicationContext(), e, "MainService"));
        }

        super.onCreate();
        // Init Global Variables
        webView = new WebView(this);
        prefs = this.getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
        prefsEdit = prefs.edit();
        // Saved Data
        keepAppRunningInBackground = prefs.getBoolean("keepAppRunningInBackground",true);

        // Create a notification channel
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Background Application";
            String description = "Allow application in the background for updates, uses ram and power usage when update is running.";
            int importance = NotificationManager.IMPORTANCE_MIN;
            NotificationChannel channel = new NotificationChannel(APP_IN_BACKGROUND_CHANNEL, name, importance);
            channel.setDescription(description);
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_SECRET);
            channel.setSound(null, null);
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }

        // If is still in app
        MainActivity mainActivity = MainActivity.getInstanceActivity();
        if (mainActivity!=null) {
            if (mainActivity.isInApp) {
                stopForeground(true);
                stopSelf();
                return;
            }
        }

        // Set WebView Settings
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setSaveFormData(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setLoadsImagesAutomatically(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setBlockNetworkLoads(false);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setAllowUniversalAccessFromFileURLs(true);

        webView.addJavascriptInterface(new JSBridge(), "JSBridge");

        WebViewAssetLoader assetLoader = getAssetLoader(this);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String url = uri.toString();
                if (url.startsWith("https://appassets.androidplatform.net/assets/check-connection")) {
                    return fetchWebConnection();
                } else if (
                    url.startsWith("https://appassets.androidplatform.net/assets/build/bundle.css")
                    || url.startsWith("https://appassets.androidplatform.net/assets/version.json")
                ) {
                    return null;
                } else {
                    return assetLoader.shouldInterceptRequest(uri);
                }
            }
            @Override
            @SuppressWarnings("deprecation")
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                if (url.startsWith("https://appassets.androidplatform.net/assets/check-connection")) {
                    return fetchWebConnection();
                } else if (
                    url.startsWith("https://appassets.androidplatform.net/assets/build/bundle.css")
                    || url.startsWith("https://appassets.androidplatform.net/assets/version.json")
                ) {
                    return null;
                } else {
                    return assetLoader.shouldInterceptRequest(Uri.parse(url));
                }
            }
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                if (isReloaded) {
                    isReloaded = false;
                    view.loadUrl("javascript:(()=>{window.shouldUpdateNotifications=true})();");
                }
                super.onPageStarted(view, url, favicon);
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
            String message = consoleMessage.message();
            Log.d("WebConsole", message);
            return true;
            }
        });

        WebView.setWebContentsDebuggingEnabled(DEBUG);

        // Start the service in the foreground
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Context context = this.getApplicationContext();
            // Stop Service
            Intent stopIntent = new Intent(context, MainService.class);
            stopIntent.setAction(STOP_SERVICE_ACTION);
            PendingIntent stopPendingIntent = PendingIntent.getService(context, 0, stopIntent, PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_MUTABLE);
            // Set Keep App In Background
            Intent setIntent = new Intent(context, MainService.class);
            setIntent.setAction(SET_MAIN_SERVICE);
            PendingIntent setPendingIntent = PendingIntent.getService(context, 0, setIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            // Open App
            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);
            Notification notification = new NotificationCompat.Builder(context, APP_IN_BACKGROUND_CHANNEL)
                    .setContentTitle("Kanshi.")
                    .setSmallIcon(R.drawable.ic_stat_name)
                    .setContentIntent(pendingIntent)
                    .addInvisibleAction(R.drawable.ic_stat_name, "OPEN", pendingIntent)
                    .addAction(keepAppRunningInBackground ? R.drawable.check_white : R.drawable.disabled_white, keepAppRunningInBackground ? "ENABLED" : "DISABLED", setPendingIntent)
                    .addAction(R.drawable.stop_white, "EXIT", stopPendingIntent)
                    .setOnlyAlertOnce(true)
                    .setSilent(true)
                    .setShowWhen(false)
                    .setNumber(0)
                    .build();

            try {
                startForeground(SERVICE_NOTIFICATION_ID, notification, FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            } catch (Exception e) {
                Utils.handleUncaughtException(MainService.this.getApplicationContext(), e, "MainService");
                e.printStackTrace();
                try {
                    startForeground(SERVICE_NOTIFICATION_ID, notification);
                } catch (Exception ex) {
                    Utils.handleUncaughtException(MainService.this.getApplicationContext(), ex, "MainService");
                    ex.printStackTrace();
                    stopForeground(true);
                    stopSelf();
                    return;
                }
            }
        }

        // Load Page
        isReloaded = true;
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");

        weakActivity = new WeakReference<>(MainService.this);
    }

    @Override
    public void onDestroy() {
        if (webView!=null) {
            webView.destroy();
        }
        MediaNotificationManager.recentlyUpdatedMediaNotification(MainService.this, addedMediaCount, updatedMediaCount);
        MainActivity mainActivity = MainActivity.getInstanceActivity();
        if (mainActivity != null) {
            mainActivity.refreshMediaList();
        }
        super.onDestroy();
    }

    public static MainService getInstanceActivity() {
        if (weakActivity!=null) {
            return weakActivity.get();
        } else {
            return null;
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.TIRAMISU)
    public void updateMediaNotificationTitle(String title) {
        Context context = this.getApplicationContext();
        if (ActivityCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        // Stop Service
        Intent stopIntent = new Intent(context, MainService.class);
        stopIntent.setAction(STOP_SERVICE_ACTION);
        PendingIntent stopPendingIntent = PendingIntent.getService(context, 0, stopIntent, PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_MUTABLE);
        // Set Keep App In Background
        Intent setIntent = new Intent(context, MainService.class);
        setIntent.setAction(SET_MAIN_SERVICE);
        PendingIntent setPendingIntent = PendingIntent.getService(context, 0, setIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
        // Open App
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new NotificationCompat.Builder(context, APP_IN_BACKGROUND_CHANNEL)
                .setContentTitle(title==null || title.isEmpty() ? "Kanshi." : title)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setContentIntent(pendingIntent)
                .addAction(keepAppRunningInBackground? R.drawable.check_white : R.drawable.disabled_white, keepAppRunningInBackground ? "ENABLED" : "DISABLED", setPendingIntent)
                .addAction(R.drawable.stop_white, "EXIT", stopPendingIntent)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setShowWhen(false)
                .setNumber(0)
                .build();
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        notificationManager.notify(SERVICE_NOTIFICATION_ID, notification);
    }

    public void stopService() {
        if (
            shouldCallStopService
            && !isAddingMediaReleaseNotification
            && MediaNotificationManager.ongoingImageDownloads.isEmpty()
        ) {
            updateLastBackgroundUpdateTime();
            stopForeground(true);
            stopSelf();
        }
    }

    public void updateLastBackgroundUpdateTime() {
        if (lastBackgroundUpdateIsFinished) {
            final long oneHourFromNowInMillis = System.currentTimeMillis() + TimeUnit.HOURS.toMillis(1);
            prefsEdit.putLong("lastBackgroundUpdateTime", oneHourFromNowInMillis).commit();
            MainActivity mainActivity = MainActivity.getInstanceActivity();
            if (mainActivity != null) {
                mainActivity.shouldRefreshList = shouldRefreshList;
                mainActivity.shouldProcessRecommendedEntries = shouldProcessRecommendedEntries;
                mainActivity.shouldManageMedia = shouldManageMedia;
            }
        }
    }

    public void finishedAddingMediaReleaseNotification() {
        isAddingMediaReleaseNotification = false;
        stopService();
    }

    @SuppressWarnings("unused")
    class JSBridge {
        private final LocalServer localServer = new LocalServer(
            new LocalServerListener() {
                @Override
                public void onStart(String url) {
                    webView.loadUrl("javascript:window?.['" + UNIQUE_KEY + localServer.LOCAL_SERVER_URL_PROMISE + "']?.resolve?.('" + url + "')");
                }

                @Override
                public void onError(String promise) {
                    webView.loadUrl("javascript:window?.['" + UNIQUE_KEY + promise + "']?.reject?.()");
                }
            },
            false
        );
        /** @noinspection SameReturnValue*/
        @JavascriptInterface
        public boolean isAndroid() { return true; }
        /** @noinspection SameReturnValue*/
        @JavascriptInterface
        public boolean isAndroidBackground() { return true; }
        @JavascriptInterface
        public boolean isVisited() { return prefs.getBoolean("visited", false); }
        @JavascriptInterface
        public void notifyDataEviction() {
            if (ActivityCompat.checkSelfPermission(MainService.this.getApplicationContext(), android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    CharSequence name = "Data Eviction";
                    String description = "Notifications for data loss from chrome eviction.";
                    int importance = NotificationManager.IMPORTANCE_DEFAULT;
                    NotificationChannel channel = new NotificationChannel(DATA_EVICTION_CHANNEL, name, importance);
                    channel.setDescription(description);
                    channel.enableVibration(true);

                    NotificationManager notificationManager = MainService.this.getApplicationContext().getSystemService(NotificationManager.class);
                    notificationManager.createNotificationChannel(channel);
                }

                Intent intent = new Intent(MainService.this, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                PendingIntent pendingIntent = PendingIntent.getActivity(MainService.this.getApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);
                pendingIntent.cancel();
                pendingIntent = PendingIntent.getActivity(MainService.this.getApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);
                NotificationCompat.Builder builder = new NotificationCompat.Builder(MainService.this.getApplicationContext(), DATA_EVICTION_CHANNEL)
                        .setSmallIcon(R.drawable.ic_stat_name)
                        .setContentTitle("Possible Data Loss!")
                        .setContentText("Some of your data may be cleared by chrome, please import your saved data.")
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                        .setContentIntent(pendingIntent);
                NotificationManagerCompat notificationManager = NotificationManagerCompat.from(MainService.this.getApplicationContext());
                notificationManager.cancel(NOTIFICATION_DATA_EVICTION);
                notificationManager.notify(NOTIFICATION_DATA_EVICTION, builder.build());
            }
            MainActivity mainActivity = MainActivity.getInstanceActivity();
            if (mainActivity != null) {
                mainActivity.reloadWeb();
                mainActivity.showDataEvictionDialog();
            }
        }
        @JavascriptInterface
        public void setShouldProcessRecommendedEntries(boolean shouldProcess) {
            if (shouldProcess && !shouldRefreshList) {
                shouldManageMedia = shouldProcessRecommendedEntries = shouldRefreshList = true;
                MainActivity mainActivity = MainActivity.getInstanceActivity();
                if (mainActivity != null) {
                    mainActivity.shouldRefreshList = shouldRefreshList;
                    mainActivity.shouldProcessRecommendedEntries = shouldProcessRecommendedEntries;
                    mainActivity.shouldManageMedia = shouldManageMedia;
                }
            } else {
                shouldProcessRecommendedEntries = shouldProcess;
                MainActivity mainActivity = MainActivity.getInstanceActivity();
                if (mainActivity != null) {
                    mainActivity.shouldProcessRecommendedEntries = shouldProcessRecommendedEntries;
                }
            }
        }
        @JavascriptInterface
        public void setShouldManageMedia(boolean shouldManage) {
            shouldManageMedia = shouldManage;
            MainActivity mainActivity = MainActivity.getInstanceActivity();
            if (mainActivity != null) {
                mainActivity.shouldManageMedia = shouldManageMedia;
            }
        }
        @JavascriptInterface
        public void backgroundUpdateIsFinished(boolean finished) {
            if (finished) {
                lastBackgroundUpdateIsFinished = true;
            }
            shouldCallStopService = true;
            stopService();
        }
        @RequiresApi(api = Build.VERSION_CODES.TIRAMISU)
        @JavascriptInterface
        public void sendBackgroundStatus(String text) {
            updateMediaNotificationTitle(text);
        }
        @JavascriptInterface
        public void getLocalServerURL() { localServer.getLocalServerURL(); }
        @RequiresApi(api = Build.VERSION_CODES.R)
        @JavascriptInterface
        public boolean backUpIsAvailable() {
            if (Environment.isExternalStorageManager()) {
                final String exportPath = prefs.getString("savedExportPath", "");
                if (!exportPath.isEmpty()) {
                    File backupDirectory = new File(exportPath);
                    //noinspection ResultOfMethodCallIgnored
                    backupDirectory.mkdirs();
                    if (backupDirectory.isDirectory()) {
                        localServer.setBackupDirectory(backupDirectory);
                        return true;
                    }
                }
            }
            return false;
        }
        @JavascriptInterface
        public void showNewUpdatedMediaNotification(long addedMediaCount, long updatedMediaCount) {
            MainService.this.addedMediaCount = addedMediaCount;
            MainService.this.updatedMediaCount = updatedMediaCount;
        }
    }
}
