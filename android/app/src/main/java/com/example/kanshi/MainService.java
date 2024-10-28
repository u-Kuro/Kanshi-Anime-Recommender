package com.example.kanshi;

import static android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC;
import static com.example.kanshi.BuildConfig.DEBUG;
import static com.example.kanshi.Configs.DATA_EVICTION_CHANNEL;
import static com.example.kanshi.Configs.NOTIFICATION_DATA_EVICTION;
import static com.example.kanshi.Configs.IS_BACKGROUND_UPDATE_KEY;
import static com.example.kanshi.Configs.VISITED_KEY;
import static com.example.kanshi.Configs.getAssetLoader;
import static com.example.kanshi.Utils.fetchWebConnection;
import static com.example.kanshi.LocalPersistence.getLockForFile;
import static com.example.kanshi.LocalPersistence.getLockForFileName;

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
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
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

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.lang.ref.WeakReference;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

@SuppressLint("SetJavaScriptEnabled")
public class MainService extends Service {
    public static WeakReference<MainService> weakActivity;
    WebView webView;
    private String exportPath;
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
    public BufferedOutputStream bufferedOutputStream;

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
                updateNotificationTitle("");
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
        exportPath = prefs.getString("savedExportPath", "");

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
                boolean visited = prefs.getBoolean("visited", false);
                if (visited) {
                    view.loadUrl("javascript:(()=>{window['"+ VISITED_KEY +"']=true})();");
                } else {
                    view.loadUrl("javascript:(()=>{window['"+ VISITED_KEY +"']=false})();");
                }
                view.loadUrl("javascript:(()=>{window['"+ IS_BACKGROUND_UPDATE_KEY +"']=true})();");
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
        try {
            if (bufferedOutputStream != null) {
                bufferedOutputStream.flush();
                bufferedOutputStream.close();
                bufferedOutputStream = null;
            }
        } catch (Exception ignored) {}
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
    public void updateNotificationTitle(String title) {
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
        public void setShouldManageMedia(boolean shouldLoad) {
            shouldManageMedia = shouldLoad;
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
            updateNotificationTitle(text);
        }
        private ExecutorService exportUserDataExecutor = Executors.newFixedThreadPool(1);
        File tempExportFile;
        String exportDirectoryPath;
        @RequiresApi(api = Build.VERSION_CODES.R)
        @JavascriptInterface
        public void exportUserData(byte[] chunk, long chunkLength, int status, String fileName) {
            ReentrantLock fileLock = null;
            if (tempExportFile != null) {
                fileLock = getLockForFile(tempExportFile);
                fileLock.lock(); // Lock before critical section
            }
            try {
                if (status == 0) {
                    try {
                        if (exportUserDataExecutor != null) {
                            exportUserDataExecutor.shutdownNow();
                        }
                        exportUserDataExecutor = Executors.newFixedThreadPool(1);
                        if (bufferedOutputStream != null) {
                            bufferedOutputStream.flush();
                            bufferedOutputStream.close();
                            bufferedOutputStream = null;
                        }
                    } catch (Exception ignored) {}
                    exportUserDataExecutor.submit(() -> {
                        if (Environment.isExternalStorageManager()) {
                            File exportDirectory = new File(exportPath);
                            if (exportDirectory.isDirectory()) {
                                exportDirectoryPath = exportPath + File.separator;
                                File directory = new File(exportDirectoryPath);
                                boolean dirIsCreated;
                                if (!directory.exists()) {
                                    dirIsCreated = directory.mkdirs();
                                } else {
                                    dirIsCreated = true;
                                }
                                if (directory.isDirectory() && dirIsCreated) {
                                    try {
                                        tempExportFile = new File(exportDirectoryPath + "pb.tmp");
                                        boolean tempFileIsDeleted;
                                        if (tempExportFile.exists()) {
                                            tempFileIsDeleted = tempExportFile.delete();
                                            //noinspection ResultOfMethodCallIgnored
                                            tempExportFile.createNewFile();
                                        } else {
                                            tempFileIsDeleted = true;
                                            //noinspection ResultOfMethodCallIgnored
                                            tempExportFile.createNewFile();
                                        }
                                        if (tempFileIsDeleted) {
                                            bufferedOutputStream = new BufferedOutputStream(new FileOutputStream(tempExportFile, true));
                                        } else {
                                            try {
                                                if (bufferedOutputStream != null) {
                                                    bufferedOutputStream.flush();
                                                    bufferedOutputStream.close();
                                                    bufferedOutputStream = null;
                                                }
                                            } catch (Exception ignored) {}
                                            isExported(false);
                                        }
                                    } catch (Exception e) {
                                        isExported(false);
                                        try {
                                            if (bufferedOutputStream != null) {
                                                bufferedOutputStream.flush();
                                                bufferedOutputStream.close();
                                                bufferedOutputStream = null;
                                            }
                                        } catch (Exception ignored) {}
                                        Utils.handleUncaughtException(MainService.this.getApplicationContext(), e, "MainService exportUserData Status 0");
                                        e.printStackTrace();
                                    }
                                }
                            }
                        }
                    });
                } else if (
                    status == 1
                    && bufferedOutputStream != null
                    && exportUserDataExecutor != null
                    && !exportUserDataExecutor.isShutdown()
                    && !exportUserDataExecutor.isTerminated()
                ) {
                    exportUserDataExecutor.submit(()-> {
                        try {
                            bufferedOutputStream.write(chunk);
                        } catch (Exception e) {
                            isExported(false);
                            try {
                                if (bufferedOutputStream != null) {
                                    bufferedOutputStream.flush();
                                    bufferedOutputStream.close();
                                    bufferedOutputStream = null;
                                }
                            } catch (Exception ignored) {}
                            Utils.handleUncaughtException(MainService.this.getApplicationContext(), e, "MainService exportUserData Status 1");
                            e.printStackTrace();
                        }
                    });
                } else if (
                    status == 2
                    && bufferedOutputStream != null
                    && exportUserDataExecutor != null
                    && !exportUserDataExecutor.isShutdown()
                    && !exportUserDataExecutor.isTerminated()
                ) {
                    exportUserDataExecutor.submit(() -> {
                        try {
                            bufferedOutputStream.flush();
                            bufferedOutputStream.close();
                            bufferedOutputStream = null;
                            File finalFile = new File(exportDirectoryPath + fileName);
                            if (tempExportFile != null && tempExportFile.exists() && tempExportFile.isFile() && tempExportFile.length() > 0) {
                                ReentrantLock finalFileNameLock = getLockForFileName(finalFile.getName());
                                finalFileNameLock.lock();
                                try {
                                    //noinspection ResultOfMethodCallIgnored
                                    finalFile.createNewFile();
                                    Path tempPath = tempExportFile.toPath();
                                    Path backupPath = finalFile.toPath();
                                    Files.copy(tempPath, backupPath, StandardCopyOption.REPLACE_EXISTING);
                                    isExported(true);
                                    //noinspection ResultOfMethodCallIgnored
                                    tempExportFile.delete();
                                } catch (Exception e) {
                                    isExported(false);
                                    Utils.handleUncaughtException(getApplicationContext(), e, "MainService exportUserData Status 2 0");
                                    e.printStackTrace();
                                } finally {
                                    finalFileNameLock.unlock();
                                }
                            } else {
                                isExported(false);
                            }
                        } catch (Exception e) {
                            isExported(false);
                            try {
                                if (bufferedOutputStream != null) {
                                    bufferedOutputStream.flush();
                                    bufferedOutputStream.close();
                                    bufferedOutputStream = null;
                                }
                            } catch (Exception ignored) {}
                            Utils.handleUncaughtException(MainService.this.getApplicationContext(), e, "MainService exportUserData Status 2 1");
                            e.printStackTrace();
                        }
                    });
                }
            } catch (Exception e) {
                Utils.handleUncaughtException(MainService.this.getApplicationContext(), e, "MainService exportUserData Outer-Lock");
                e.printStackTrace();
            } finally {
                if (fileLock != null) {
                    fileLock.unlock();
                }
            }
        }
        @RequiresApi(api = Build.VERSION_CODES.O)
        @JavascriptInterface
        public void addMediaReleaseNotification(long mediaId, String title, long releaseEpisode, long maxEpisode, long releaseDateMillis, String imageUrl, String mediaUrl, String userStatus, long episodeProgress) {
            isAddingMediaReleaseNotification = true;
            MediaNotificationManager.scheduleMediaNotification(MainService.this, mediaId, title, releaseEpisode, maxEpisode, releaseDateMillis, imageUrl, mediaUrl, userStatus, episodeProgress);
        }
        @RequiresApi(api = Build.VERSION_CODES.O)
        @JavascriptInterface
        public void callUpdateNotifications() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                updateCurrentNotifications();
            }
        }
        private final ExecutorService updateNotificationsExecutorService = Executors.newFixedThreadPool(1);
        private final Map<String, Future<?>> updateNotificationsFutures = new ConcurrentHashMap<>();
        @RequiresApi(api = Build.VERSION_CODES.O)
        @JavascriptInterface
        public void updateNotifications(long mediaId, String title, long maxEpisode, String mediaUrl, String userStatus, long episodeProgress) {
            if (updateNotificationsFutures.containsKey(String.valueOf(mediaId))) {
                Future<?> future = updateNotificationsFutures.get(String.valueOf(mediaId));
                if (future != null && !future.isDone()) {
                    future.cancel(true);
                }
            }
            Future<?> future = updateNotificationsExecutorService.submit(() -> {
                try {
                    if (MediaNotificationManager.allMediaNotification.isEmpty()) {
                        @SuppressWarnings("unchecked") ConcurrentHashMap<String, MediaNotification> $allMediaNotification = (ConcurrentHashMap<String, MediaNotification>) LocalPersistence.readObjectFromFile(MainService.this, "allMediaNotification");
                        if ($allMediaNotification != null && !$allMediaNotification.isEmpty()) {
                            MediaNotificationManager.allMediaNotification.putAll($allMediaNotification);
                        }
                        if (MediaNotificationManager.allMediaNotification.isEmpty()) {
                            return;
                        }
                    }
                    ConcurrentHashMap<String, MediaNotification> updatedMediaNotifications = new ConcurrentHashMap<>();
                    List<MediaNotification> allMediaNotificationValues = new ArrayList<>(MediaNotificationManager.allMediaNotification.values());
                    for (MediaNotification media : allMediaNotificationValues) {
                        if (media.mediaId ==mediaId) {
                            MediaNotification newMedia = new MediaNotification(media.mediaId, title, media.releaseEpisode, maxEpisode, media.releaseDateMillis, media.imageByte, mediaUrl, userStatus, episodeProgress);
                            updatedMediaNotifications.put(media.mediaId +"-"+media.releaseEpisode, newMedia);
                        }
                    }
                    MediaNotificationManager.allMediaNotification.putAll(updatedMediaNotifications);
                    MediaNotificationManager.writeMediaNotificationInFile(MainService.this, true);
                    updateNotificationsFutures.remove(String.valueOf(mediaId));
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        if (updateNotificationsFutures.isEmpty()) {
                            SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
                            if (schedulesTabFragment!=null) {
                                new Handler(Looper.getMainLooper()).post(()->schedulesTabFragment.updateScheduledMedia(false, false));
                            }
                            ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();
                            if (releasedTabFragment!=null) {
                                new Handler(Looper.getMainLooper()).post(()->releasedTabFragment.updateReleasedMedia(false, false));
                            }
                        }
                    }
                } catch (Exception e) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        Utils.handleUncaughtException(MainService.this.getApplicationContext(), e, "updateNotificationsExecutorService");
                    }
                    e.printStackTrace();
                }
            });
            updateNotificationsFutures.put(String.valueOf(mediaId), future);
        }
        @JavascriptInterface
        public void showNewUpdatedMediaNotification(long addedMediaCount, long updatedMediaCount) {
            MainService.this.addedMediaCount = addedMediaCount;
            MainService.this.updatedMediaCount = updatedMediaCount;
        }
    }

    private final ExecutorService updateCurrentNotificationsExecutorService = Executors.newFixedThreadPool(1);
    private Future<?> updateCurrentNotificationsFuture;
    @RequiresApi(api = Build.VERSION_CODES.O)
    public void updateCurrentNotifications() {
        if (updateCurrentNotificationsFuture != null && !updateCurrentNotificationsFuture.isCancelled()) {
            updateCurrentNotificationsFuture.cancel(true);
        }
        updateCurrentNotificationsFuture = updateCurrentNotificationsExecutorService.submit(() -> {
            try {
                if (MediaNotificationManager.allMediaNotification.isEmpty()) {
                    @SuppressWarnings("unchecked") ConcurrentHashMap<String, MediaNotification> $allMediaNotification = (ConcurrentHashMap<String, MediaNotification>) LocalPersistence.readObjectFromFile(MainService.this, "allMediaNotification");
                    if ($allMediaNotification != null && !$allMediaNotification.isEmpty()) {
                        MediaNotificationManager.allMediaNotification.putAll($allMediaNotification);
                    } else {
                        return;
                    }
                }
                Set<String> mediaIdsToBeUpdated = new HashSet<>();
                List<MediaNotification> allMediaNotificationValues = new ArrayList<>(MediaNotificationManager.allMediaNotification.values());
                for (MediaNotification media : allMediaNotificationValues) {
                    mediaIdsToBeUpdated.add(String.valueOf(media.mediaId));
                }
                String joinedMediaIds = String.join(",", mediaIdsToBeUpdated);
                Handler handler = new Handler(Looper.getMainLooper());
                handler.post(() -> webView.loadUrl("javascript:window?.updateNotifications?.([" + joinedMediaIds + "])"));
            } catch (Exception e) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(MainService.this.getApplicationContext(), e, "MainService updateCurrentNotificationsExecutorService");
                }
                e.printStackTrace();
            }
        });
    }
    public void isExported(boolean success) {
        try {
            Handler handler = new Handler(Looper.getMainLooper());
            handler.post(() -> {
                if (success) {
                    webView.loadUrl("javascript:window?.isExported?.(true)");
                } else {
                    webView.loadUrl("javascript:window?.isExported?.(false)");
                }
            });
        } catch (Exception e) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Utils.handleUncaughtException(MainService.this.getApplicationContext(), e, "MainService isExported");
            }
            e.printStackTrace();
            MainService.this.stopForeground(true);
            MainService.this.stopSelf();
        }
    }
}
