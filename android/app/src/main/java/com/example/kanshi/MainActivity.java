package com.example.kanshi;

import static android.Manifest.permission.POST_NOTIFICATIONS;
import static android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION;
import static android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM;
import static com.example.kanshi.BuildConfig.DEBUG;
import static com.example.kanshi.BuildConfig.VERSION_CODE;
import static com.example.kanshi.Configs.DATA_EVICTION_CHANNEL;
import static com.example.kanshi.Configs.NOTIFICATION_DATA_EVICTION;
import static com.example.kanshi.Configs.TOKEN;
import static com.example.kanshi.Configs.UNIQUE_KEY;
import static com.example.kanshi.Configs.UPDATE_DATA_PENDING_INTENT;
import static com.example.kanshi.Configs.getAssetLoader;
import static com.example.kanshi.Configs.OWNER;
import static com.example.kanshi.Configs.getTOKEN;
import static com.example.kanshi.LocalPersistence.getLockForFileName;
import static com.example.kanshi.Utils.fetchWebVersion;
import static com.example.kanshi.Utils.fetchWebConnection;
import static com.example.kanshi.Utils.getPath;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;

import android.animation.ObjectAnimator;
import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.app.AlertDialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.res.ColorStateList;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.DocumentsContract;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import java.io.File;
import java.lang.ref.WeakReference;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Pattern;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.FileProvider;
import androidx.core.splashscreen.SplashScreen;
import androidx.webkit.WebViewAssetLoader;

import com.example.kanshi.localHTTPServer.LocalServer;
import com.example.kanshi.localHTTPServer.LocalServerListener;

public class MainActivity extends AppCompatActivity {
    public boolean keepAppRunningInBackground = false;
    public boolean permissionIsAsked = false;
    public SharedPreferences prefs;
    private SharedPreferences.Editor prefsEdit;
    private ValueCallback<Uri[]> mUploadMessage;
    public MediaWebView webView;
    private ProgressBar progressbar;
    private boolean pageLoaded = false;
    private boolean webViewIsLoaded = false;
    private final CustomTabsHelper customTabsIntent = CustomTabsHelper.getInstance();
    private PowerManager.WakeLock wakeLock;
    public boolean shouldGoBack;
    public Toast persistentToast;
    public Toast currentToast;
    public AlertDialog currentDialog;
    public boolean isInApp = true;
    public static WeakReference<MainActivity> weakActivity;
    public boolean shouldRefreshList = false;
    public boolean shouldProcessRecommendedEntries = false;
    public boolean shouldManageMedia = false;

    // Activity Results
    final ActivityResultLauncher<Intent> allowApplicationUpdate =
            registerForActivityResult(
                    new ActivityResultContracts.StartActivityForResult(),
                    activityResult -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            showUpdateNotice();
                        }
                    }
            );
    final ActivityResultLauncher<Intent> chooseImportFile =
            registerForActivityResult(
                    new ActivityResultContracts.StartActivityForResult(),
                    new ActivityResultCallback<>() {
                        @Override
                        public void onActivityResult(ActivityResult activityResult) {
                            int resultCode = activityResult.getResultCode();
                            Intent intent = activityResult.getData();
                            Uri[] result = null;
                            ReentrantLock importedFileNameLock = null;
                            try {
                                if (null == mUploadMessage || resultCode != RESULT_OK) {
                                    result = new Uri[]{Uri.parse("")};
                                    mUploadMessage.onReceiveValue(result);
                                    mUploadMessage = null;
                                } else if (intent != null) {
                                    String dataString = intent.getDataString();
                                    Uri uri = intent.getData();
                                    if (uri != null) {
                                        String importedFilePath = uri.getPath();
                                        if (importedFilePath != null) {
                                            String importedFileName = new File(importedFilePath).getName();
                                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                                importedFileNameLock = getLockForFileName(importedFileName);
                                                importedFileNameLock.lock();
                                            }
                                        }
                                    }
                                    if (dataString != null) {
                                        result = new Uri[]{Uri.parse(dataString)};
                                    }
                                    mUploadMessage.onReceiveValue(result);
                                    mUploadMessage = null;
                                }
                            } finally {
                                if (importedFileNameLock != null) {
                                    importedFileNameLock.unlock();
                                }
                            }
                        }
                    }
            );
    final ActivityResultLauncher<Intent> chooseExportDirectory =
            registerForActivityResult(
                    new ActivityResultContracts.StartActivityForResult(),
                    new ActivityResultCallback<>() {
                        @Override
                        public void onActivityResult(ActivityResult activityResult) {
                            int resultCode = activityResult.getResultCode();
                            Intent intent = activityResult.getData();
                            if (resultCode != RESULT_OK || intent == null) {
                                return;
                            }
                            Uri uri = intent.getData();
                            Uri docUri = DocumentsContract.buildDocumentUriUsingTree(uri, DocumentsContract.getTreeDocumentId(uri));
                            prefsEdit.putString("savedExportPath", getThisPath(docUri)).apply();
                            showToast(Toast.makeText(getApplicationContext(), "Folder was selected, you can now back up your data", Toast.LENGTH_LONG));
                            webView.post(()->webView.loadUrl("javascript:window?.setExportPathAvailability?.(true)"));
                        }
                    }
            );
    private final ActivityResultLauncher<String> notificationPermission =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(),
                    isGranted -> {
                        prefsEdit.putBoolean("permissionIsAsked", true).apply();
                        if (isGranted) {
                            askForSchedulePermission();
                        }
                    });

    @RequiresApi(api = Build.VERSION_CODES.TIRAMISU)
    @SuppressLint({"SetJavaScriptEnabled", "WrongViewCast"})
    @Override
    protected void onCreate(final Bundle savedInstanceState) {
        // Log Errors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Thread.setDefaultUncaughtExceptionHandler((thread, e) -> Utils.handleUncaughtException(MainActivity.this.getApplicationContext(), e, "MainActivity"));
        }

        // Create WebView App Instance
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> !pageLoaded);

        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        // Init Global Variables
        webView = findViewById(R.id.webView);
        progressbar = findViewById(R.id.progressbar);
        progressbar.setMax((int) Math.pow(10, 6));
        // Shared Preference
        prefs = MainActivity.this.getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
        prefsEdit = prefs.edit();
        // Saved Data
        keepAppRunningInBackground = prefs.getBoolean("keepAppRunningInBackground", true);
        if (OWNER) { TOKEN = getTOKEN(prefs.getString("savedExportPath", "")); }
        permissionIsAsked = prefs.getBoolean("permissionIsAsked", false);
        // Keep Awake on Lock Screen
        wakeLock = ((PowerManager) getSystemService(Context.POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "KeepAwake:");
        wakeLock.acquire(10 * 60 * 1000L);
        // Others
        // Show status bar
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            final WindowInsetsController insetsController = getWindow().getInsetsController();
            if (insetsController != null) {
                insetsController.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        }
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().getDecorView().setBackgroundColor(Color.BLACK);

        // Add On Press Back Listener
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView != null && webView.getUrl() != null && webView.getUrl().startsWith("https://appassets.androidplatform.net")) {
                    if (!shouldGoBack) {
                        webView.loadUrl("javascript:window?.backPressed?.();");
                    } else {
                        hideToast();
                        moveTaskToBack(true);
                    }
                } else {
                    if (webView != null && webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        hideToast();
                        finish();
                    }
                }
            }
        });

        // Orientation
        recheckStatusBar();

        // Add WebView on Layout
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
        }

        // Warmup Custom Tab
        customTabsIntent.warmup(MainActivity.this);

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
        webSettings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setDefaultFontSize(16);

        // Set WebView Configs
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setScrollBarStyle(View.SCROLLBARS_OUTSIDE_OVERLAY);
        webView.setLongClickable(true);
        webView.setKeepScreenOn(true);
        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
        webView.setLayerType(View.LAYER_TYPE_NONE, null);

        // Add Bridge to WebView
        webView.addJavascriptInterface(new JSBridge(), "JSBridge");

        WebViewAssetLoader assetLoader = getAssetLoader(this);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String url = uri.toString();
                if (url.startsWith("https://appassets.androidplatform.net/assets/check-connection")) {
                    return fetchWebConnection();
                } else if (url.startsWith("https://appassets.androidplatform.net/assets/version.json")) {
                    return fetchWebVersion();
                } else {
                    return assetLoader.shouldInterceptRequest(uri);
                }
            }
            @Override
            @SuppressWarnings("deprecation")
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                if (url.startsWith("https://appassets.androidplatform.net/assets/check-connection")) {
                    return fetchWebConnection();
                } else if (url.startsWith("https://appassets.androidplatform.net/assets/version.json")) {
                    return fetchWebVersion();
                } else {
                    return assetLoader.shouldInterceptRequest(Uri.parse(url));
                }
            }
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                shouldRefreshList = shouldProcessRecommendedEntries = shouldManageMedia = false;
                if (!pageLoaded) {
                    pageLoaded = true;
                    view.loadUrl("javascript:(()=>{window.shouldUpdateNotifications=true})();");
                    view.loadUrl("javascript:(()=>{window.keepAppRunningInBackground=" + (keepAppRunningInBackground ? "true" : "false") + "})();");
                }
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                shouldRefreshList = shouldProcessRecommendedEntries = shouldManageMedia = false;
                view.loadUrl("javascript:(()=>{window.shouldUpdateNotifications=true})();");
                view.loadUrl("javascript:(()=>{window.keepAppRunningInBackground=" + (keepAppRunningInBackground ? "true" : "false") + "})();");
                view.loadUrl("javascript:window?.setKeepAppRunningInBackground?.("+(keepAppRunningInBackground?"true":"false")+")");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    ConnectivityManager connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                    Network network = connectivityManager.getActiveNetwork();
                    if (network == null) {
                        showToast(Toast.makeText(getApplicationContext(), "You are currently offline", Toast.LENGTH_LONG));
                    }
                }
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(view, true);
                CookieManager.getInstance().acceptCookie();
                CookieManager.getInstance().flush();
                if (!pageLoaded) {
                    pageLoaded = true;
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // In App Browsing
                String url = request.getUrl().toString();
                if (url.startsWith("https://www.youtube.com")
                    || url.startsWith("https://m.youtube.com")
                    || url.startsWith("https://youtube.com")
                    || url.startsWith("http://www.youtube.com")
                    || url.startsWith("http://m.youtube.com")
                    || url.startsWith("http://youtube.com")
                ) {
                    Intent intent = new Intent(MainActivity.this, YoutubeViewActivity.class);
                    intent.putExtra("url", url);
                    intent.putExtra("fromMainActivity", true);
                    startActivity(intent);
                    overridePendingTransition(R.anim.fade_in, R.anim.remove);
                } else if (
                    url.startsWith("https://www.youtu.be")
                    || url.startsWith("https://m.youtu.be")
                    || url.startsWith("https://youtu.be")
                    || url.startsWith("http://www.youtu.be")
                    || url.startsWith("http://m.youtu.be")
                    || url.startsWith("http://youtu.be")
                ) {
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType("text/plain");
                    i.putExtra(Intent.EXTRA_SUBJECT, "Sharing URL");
                    i.putExtra(Intent.EXTRA_TEXT, url);
                    startActivity(Intent.createChooser(i, "Share URL"));
                } else {
                    try {
                        boolean isAniList = url.startsWith("https://www.anilist.co")
                            || url.startsWith("https://m.anilist.co")
                            || url.startsWith("https://anilist.co")
                            || url.startsWith("http://www.anilist.co")
                            || url.startsWith("http://m.anilist.co")
                            || url.startsWith("http://anilist.co");
                        int customTabColor = isAniList ? R.color.dark_blue : R.color.black;
                        if (url.startsWith("intent://")) {
                            try {
                                customTabsIntent.launchUrl(
                                    MainActivity.this,
                                    Uri.parse("https://" + url.substring(9)),
                                    getResources().getColor(customTabColor),
                                    true
                                );
                            } catch (Exception ignored) {
                                customTabsIntent.launchUrl(
                                    MainActivity.this,
                                    request.getUrl(),
                                    getResources().getColor(customTabColor),
                                    true
                                );
                            }
                        } else {
                            customTabsIntent.launchUrl(
                                MainActivity.this,
                                request.getUrl(),
                                getResources().getColor(customTabColor),
                                true
                            );
                        }
                        overridePendingTransition(R.anim.fade_in, R.anim.remove);
                    } catch (Exception ignored) {
                        showToast(Toast.makeText(getApplicationContext(), "Can't open the link", Toast.LENGTH_LONG));
                    }
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            // Import
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (mUploadMessage != null) {
                    mUploadMessage.onReceiveValue(null);
                }
                mUploadMessage = filePathCallback;
                Intent i;
                try {
                    i = fileChooserParams.createIntent();
                    chooseImportFile.launch(i);
                    showToast(Toast.makeText(getApplicationContext(), "Please select your file", Toast.LENGTH_LONG));
                } catch (Exception ignored) {
                    i = new Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("*/*");
                    chooseImportFile.launch(i);
                    showToast(Toast.makeText(getApplicationContext(), "Please select your file", Toast.LENGTH_LONG));
                }
                return true;
            }
            // Fullscreen
            View fullscreen = null;
            @Override
            public void onHideCustomView() {
                if (fullscreen != null) {
                    fullscreen.setVisibility(View.GONE);
                }
                recheckStatusBar();
                if (webView != null) {
                    webView.setVisibility(View.VISIBLE);
                }
            }
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (webView == null) return;
                FrameLayout decorView = (FrameLayout) getWindow().getDecorView();
                if (fullscreen != null) {
                    decorView.removeView(fullscreen);
                }
                fullscreen = view;
                decorView.addView(fullscreen, new FrameLayout.LayoutParams(-1, -1));
                webView.setVisibility(View.GONE);
                hideStatusBar();
                fullscreen.setVisibility(View.VISIBLE);
            }
            public void onProgressChanged(WebView view, int progress) {
                if (webViewIsLoaded) return;
                int newProgress = (int) Math.pow(10, 4) * progress;
                ObjectAnimator.ofInt(progressbar, "progress", newProgress)
                        .setDuration(300)
                        .start();
                if (progress == 100) {
                    CookieManager cookieManager = CookieManager.getInstance();
                    cookieManager.setAcceptCookie(true);
                    cookieManager.setAcceptThirdPartyCookies(webView, true);
                    CookieManager.getInstance().acceptCookie();
                    CookieManager.getInstance().flush();
                    ObjectAnimator animator = ObjectAnimator.ofInt(progressbar, "progress", 0);
                    animator.setDuration(0);
                    animator.setStartDelay(300);
                    animator.start();
                    if (pageLoaded) {
                        webViewIsLoaded = true;
                    }
                }
            }

            // Console Logs for Debugging
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                if (DEBUG) {
                    String message = consoleMessage.message();
                    Log.d("WebConsole", message);
                    return true;
                }
                return super.onConsoleMessage(consoleMessage);
            }
        });

        if (!permissionIsAsked
            && ActivityCompat.checkSelfPermission(MainActivity.this, POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
        ) {
            notificationPermission.launch(POST_NOTIFICATIONS);
        }

        WebView.setWebContentsDebuggingEnabled(DEBUG);

        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");

        // Only works after first page load
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        webSettings.setSupportZoom(false);

        setReleaseNotification();

        // Get Activity Reference
        weakActivity = new WeakReference<>(MainActivity.this);
    }

    public static MainActivity getInstanceActivity() {
        if (weakActivity != null) {
            return weakActivity.get();
        } else {
            return null;
        }
    }

    // Get Path From MainActivity Context
    public String getThisPath(Uri docUri) {
        return getPath(this, docUri);
    }

    @Override
    protected void onPause() {
        isInApp = false;
        if (webView!=null) {
            webView.loadUrl("javascript:window?.returnedAppIsVisible?.(false)");
        }
        super.onPause();
    }

    @Override
    protected void onStop() {
        setBackgroundUpdates(true);
        super.onStop();
    }

    @Override
    protected void onResume() {
        isInApp = true;
        overridePendingTransition(R.anim.none, R.anim.fade_out);
        Intent intent = new Intent(this, MainService.class);
        stopService(intent);
        super.onResume();
        webView.resumeTimers();
        webView.onResume();
        if (persistentToast != null) {
            if (currentToast != null) {
                currentToast.cancel();
            }
            persistentToast.show();
            persistentToast = null;
        }
        if (webView!=null) {
            webView.loadUrl("javascript:" +
                    "window?.returnedAppIsVisible?.(true);" + // Should Be Runned First
                    (shouldRefreshList ?
                            "window?.shouldRefreshMediaList?.("
                                    + (shouldProcessRecommendedEntries ? "true" : "false") + ","
                                    + (shouldManageMedia ? "true" : "false")
                                    + ");"
                            : "window?.checkEntries?.();")
            );
            shouldRefreshList = shouldProcessRecommendedEntries = shouldManageMedia = false;
        }
    }

    public void refreshMediaList() {
        if (!shouldRefreshList || webView==null) return;
        try {
            new Handler(Looper.getMainLooper()).post(() -> webView.post(() -> {
                webView.loadUrl("javascript:window?.shouldRefreshMediaList?.("
                        + (shouldProcessRecommendedEntries ? "true" : "false") + ","
                        + (shouldManageMedia ? "true" : "false")
                        + ")"
                );
                shouldRefreshList = shouldProcessRecommendedEntries = shouldManageMedia = false;
            }));
        } catch (Exception ignored) {}
    }

    @Override
    protected void onDestroy() {
        isInApp = false;
        if (webView!=null) {
            webView.post(() -> webView.loadUrl("javascript:window?.notifyUpdatedMediaNotification?.()"));
        }
        setBackgroundUpdates(false);
        super.onDestroy();
        if (wakeLock!=null) {
            wakeLock.release();
        }
    }

    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        recheckStatusBar();
        getWindow().setStatusBarColor(Color.BLACK);
        if (progressbar!=null) {
            progressbar.setProgressBackgroundTintList(ColorStateList.valueOf(Color.BLACK));
        }
    }

    // Native and Webview Connection
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
            true
        );
        /** @noinspection SameReturnValue*/
        @JavascriptInterface
        public boolean isAndroid() { return true; }
        @JavascriptInterface
        public boolean isVisited() { return prefs.getBoolean("visited", false); }
        @JavascriptInterface
        public String getOwnerToken() {
            if (OWNER && TOKEN != null && !TOKEN.trim().isEmpty()) {
                return TOKEN;
            } else {
                return "";
            }
        }
        @JavascriptInterface
        public void pageVisited() {
            prefsEdit.putBoolean("visited", true).apply();
        }
        @JavascriptInterface
        public void notifyDataEviction() {
            if (ActivityCompat.checkSelfPermission(MainActivity.this.getApplicationContext(), android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    CharSequence name = "Data Eviction";
                    String description = "Notifications for data loss from chrome eviction.";
                    int importance = NotificationManager.IMPORTANCE_DEFAULT;
                    NotificationChannel channel = new NotificationChannel(DATA_EVICTION_CHANNEL, name, importance);
                    channel.setDescription(description);
                    channel.enableVibration(true);

                    NotificationManager notificationManager = MainActivity.this.getApplicationContext().getSystemService(NotificationManager.class);
                    notificationManager.createNotificationChannel(channel);
                }

                Intent intent = new Intent(MainActivity.this, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                PendingIntent pendingIntent = PendingIntent.getActivity(MainActivity.this.getApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);
                pendingIntent.cancel();
                pendingIntent = PendingIntent.getActivity(MainActivity.this.getApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);
                NotificationCompat.Builder builder = new NotificationCompat.Builder(MainActivity.this.getApplicationContext(), DATA_EVICTION_CHANNEL)
                        .setSmallIcon(R.drawable.ic_stat_name)
                        .setContentTitle("Possible Data Loss!")
                        .setContentText("Some of your data may be cleared by chrome, please import your saved data.")
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                        .setContentIntent(pendingIntent);
                NotificationManagerCompat notificationManager = NotificationManagerCompat.from(MainActivity.this.getApplicationContext());
                notificationManager.cancel(NOTIFICATION_DATA_EVICTION);
                notificationManager.notify(NOTIFICATION_DATA_EVICTION, builder.build());
            }
            showDataEvictionDialog();
        }
        @JavascriptInterface
        public void setKeepAppRunningInBackground(boolean enable) {
            if (enable
                && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ActivityCompat.checkSelfPermission(MainActivity.this, POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermission.launch(POST_NOTIFICATIONS);
            }
            changeKeepAppRunningInBackground(enable);
        }
        @JavascriptInterface
        public void getLocalServerURL() { localServer.getLocalServerURL(); }
        @RequiresApi(api = Build.VERSION_CODES.R)
        @JavascriptInterface
        public boolean backUpIsAvailable() {
            if (!Environment.isExternalStorageManager()) {
                showDialog(new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Folder Access for Back-up")
                    .setMessage("Allow permission to access folders for backup.")
                    .setPositiveButton("OK", (dialogInterface, i) -> {
                        Intent intent = new Intent(ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.fromParts("package", getPackageName(), null));
                        startActivity(intent);
                    })
                    .setNegativeButton("CANCEL", null), true);
            } else {
                final String exportPath = prefs.getString("savedExportPath", "");
                if (exportPath.isEmpty()) {
                    Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addCategory(Intent.CATEGORY_DEFAULT);
                    chooseExportDirectory.launch(i);
                    showToast(Toast.makeText(getApplicationContext(), "Select or create a folder for backup", Toast.LENGTH_LONG));
                } else {
                    File backupDirectory = new File(exportPath);
                    //noinspection ResultOfMethodCallIgnored
                    backupDirectory.mkdirs();
                    if (backupDirectory.isDirectory()) {
                        localServer.setBackupDirectory(backupDirectory);
                        return true;
                    } else {
                        String[] tempExportPath = exportPath.split(Pattern.quote(File.separator));
                        String tempPathName =
                            tempExportPath.length > 1
                            ? tempExportPath[tempExportPath.length - 2] + File.separator + tempExportPath[tempExportPath.length - 1]
                            : tempExportPath[tempExportPath.length - 1];
                        showDialog(new AlertDialog.Builder(MainActivity.this)
                            .setTitle("Back-up Folder is Missing")
                            .setMessage("Folder directory [" + tempPathName + "] is missing, please choose another folder for backup.")
                            .setPositiveButton("OK", (dialogInterface, x) -> {
                                showToast(Toast.makeText(getApplicationContext(), "Select or create a folder for backup", Toast.LENGTH_LONG));
                                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addCategory(Intent.CATEGORY_DEFAULT);
                                chooseExportDirectory.launch(i);
                            })
                            .setNegativeButton("CANCEL", null), true);
                    }
                }
            }
            return false;
        }
        @JavascriptInterface
        public void copyToClipBoard(String text) {
            ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            ClipData clip = ClipData.newPlainText("Copied Text", text);
            clipboard.setPrimaryClip(clip);
        }
        @JavascriptInterface
        public void willExit() { showToast(Toast.makeText(getApplicationContext(), "Press back again to exit", Toast.LENGTH_SHORT)); }
        @JavascriptInterface
        public void setShouldGoBack(boolean shouldGoBack) {
            if (MainActivity.this.shouldGoBack && !shouldGoBack && currentToast != null) {
                hideToast();
            }
            MainActivity.this.shouldGoBack = shouldGoBack;
        }
        @JavascriptInterface
        public void chooseExportDirectory() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                if (!Environment.isExternalStorageManager()) {
                    showDialog(new AlertDialog.Builder(MainActivity.this)
                        .setTitle("File Access for Back-up")
                        .setMessage("Allow permission to access folders for backup.")
                        .setPositiveButton("OK", (dialogInterface, i) -> {
                            Intent intent = new Intent(ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.fromParts("package", getPackageName(), null));
                            startActivity(intent);
                        })
                        .setNegativeButton("CANCEL", null),
                true);
                } else {
                    Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addCategory(Intent.CATEGORY_DEFAULT);
                    chooseExportDirectory.launch(i);
                    showToast(Toast.makeText(getApplicationContext(), "Select or create a folder", Toast.LENGTH_LONG));
                }
            }
        }
        @RequiresApi(api = Build.VERSION_CODES.N)
        @JavascriptInterface
        public void isOnline(boolean isOnline) {
            try {
                if (isOnline) {
                    isAppConnectionAvailable(isConnected -> webView.post(() -> {
                        if (isConnected) {
                            showToast(Toast.makeText(getApplicationContext(), "Your internet has been restored", Toast.LENGTH_LONG));
                        }
                    }));
                } else {
                    showToast(Toast.makeText(getApplicationContext(), "You are currently offline", Toast.LENGTH_LONG));
                }
            } catch (Exception ignored) {}
        }
        @RequiresApi(api = Build.VERSION_CODES.O)
        @JavascriptInterface
        public void checkAppID(int appID, boolean isManual) {
            if (appID > VERSION_CODE) {
                showUpdateNotice();
            } else if (isManual) {
                showToast(Toast.makeText(getApplicationContext(), "No new updates available", Toast.LENGTH_LONG));
            }
        }
        @JavascriptInterface
        public void clearCache() {
            prefsEdit.putBoolean("permissionIsAsked", false).apply();
            webView.post(() -> webView.clearCache(true));
            Intent intent = new Intent(getApplicationContext(), MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(intent);
            finish();
        }
        @RequiresApi(api = Build.VERSION_CODES.P)
        @JavascriptInterface
        public void showRecentReleases() {
            Intent intent = new Intent(MainActivity.this, MediaReleaseActivity.class);
            startActivity(intent);
            overridePendingTransition(R.anim.fade_in, R.anim.remove);
        }
        @JavascriptInterface
        public void showNewUpdatedMediaNotification(long addedMediaCount, long updatedMediaCount) {
            if (updatedMediaCount > 0 || addedMediaCount > 0) {
                if (updatedMediaCount > 0 && addedMediaCount > 0) {
                    persistentToast = Toast.makeText(MainActivity.this, addedMediaCount + " New Anime / " + updatedMediaCount + " Modification", Toast.LENGTH_LONG);
                } else if (updatedMediaCount > 0) {
                    persistentToast = Toast.makeText(MainActivity.this, "+" + updatedMediaCount + " New Modified Anime", Toast.LENGTH_LONG);
                } else {
                    persistentToast = Toast.makeText(MainActivity.this, "+" + addedMediaCount + " New Added Anime", Toast.LENGTH_LONG);
                }
                if (isInApp) {
                    if (currentToast != null) {
                        currentToast.cancel();
                    }
                    persistentToast.show();
                    persistentToast = null;
                }
                MediaNotificationManager.recentlyUpdatedMediaNotification(MainActivity.this, addedMediaCount, updatedMediaCount);
            }
        }
        @JavascriptInterface
        public void openToast(String text, boolean isLongDuration) {
            showToast(Toast.makeText(getApplicationContext(), text, isLongDuration ? Toast.LENGTH_LONG : Toast.LENGTH_SHORT));
        }
    }

    public void showDataEvictionDialog() {
        new Handler(Looper.getMainLooper())
        .post(()-> showDialog(new AlertDialog.Builder(MainActivity.this)
                .setTitle("Possible Data Loss")
                .setMessage("Some of your data may be cleared by chrome, please import your saved data.")
                .setPositiveButton("OK", (dialogInterface, i) -> webView.post(() -> {
                    webView.loadUrl("javascript:window?.importAndroidUserData?.(true)");
                    String url = webView.getUrl();
                    if (url != null) {
                        prefsEdit.putBoolean("visited", false).apply();
                    }
                }))
                .setNegativeButton("CANCEL", ((dialogInterface, i) -> webView.post(() -> {
                    String url = webView.getUrl();
                    if (url != null) {
                        prefsEdit.putBoolean("visited", false).apply();
                    }
                }))),false));
    }
    public void askForSchedulePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) MainActivity.this.getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            if (!alarmManager.canScheduleExactAlarms()) {
                showDialog(new AlertDialog.Builder(MainActivity.this)
                                .setTitle("Permission for Anime Releases")
                                .setMessage("Do you like to allow permission for notifying anime release schedules at the exact time?")
                                .setPositiveButton("YES", (dialogInterface, i) -> webView.post(() -> {
                                    Intent intent = new Intent(ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.fromParts("package", getPackageName(), null));
                                    startActivity(intent);
                                }))
                                .setNegativeButton("NO", null)
                        ,false);
            }
        }
    }
    public void reloadWeb() {
        webView.post(()->webView.reload());
    }
    public void setBackgroundUpdates(boolean isStop) {
        long backgroundUpdateTime = prefs.getLong("lastBackgroundUpdateTime", 0);
        long currentTimeInMillis = System.currentTimeMillis();
        if (isStop) {
            // Set and Apply New Background Update Time if there is none
            backgroundUpdateTime = currentTimeInMillis + TimeUnit.HOURS.toMillis(1);
        } else if (backgroundUpdateTime <= currentTimeInMillis && keepAppRunningInBackground && !isInApp) {
            // Run service if background update is enabled and user is not in app
            Intent intent = new Intent(getApplicationContext(), MainService.class);
            startService(intent);
            return;
        }
        Intent newIntent = new Intent(getApplicationContext(), MyReceiver.class);
        newIntent.setAction("UPDATE_DATA_MANUAL");

        PendingIntent newPendingIntent = PendingIntent.getBroadcast(getApplicationContext(), UPDATE_DATA_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarmManager = (AlarmManager) getApplicationContext().getSystemService(Context.ALARM_SERVICE);
        // Cancel Old
        newPendingIntent.cancel();
        alarmManager.cancel(newPendingIntent);
        // Create New
        newPendingIntent = PendingIntent.getBroadcast(getApplicationContext(), UPDATE_DATA_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, backgroundUpdateTime, newPendingIntent);
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, backgroundUpdateTime, newPendingIntent);
            }
        } else {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, backgroundUpdateTime, newPendingIntent);
            } else {
                try {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, backgroundUpdateTime, newPendingIntent);
                } catch (SecurityException ignored) {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, backgroundUpdateTime, newPendingIntent);
                }
            }
        }
    }
    public void setReleaseNotification() {
        final long lastSentNotificationTime = prefs.getLong("lastSentNotificationTime", 0L);
        if (lastSentNotificationTime != 0L) {
            Intent newIntent = new Intent(this.getApplicationContext(), MyReceiver.class);
            newIntent.setAction("MEDIA_NOTIFICATION");

            PendingIntent newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), MediaNotificationManager.MEDIA_RELEASE_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager alarmManager = (AlarmManager) this.getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            // Cancel Old
            newPendingIntent.cancel();
            alarmManager.cancel(newPendingIntent);
            // Create New
            newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), MediaNotificationManager.MEDIA_RELEASE_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, lastSentNotificationTime, newPendingIntent);
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, lastSentNotificationTime, newPendingIntent);
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, lastSentNotificationTime, newPendingIntent);
                } else {
                    try {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, lastSentNotificationTime, newPendingIntent);
                    } catch (SecurityException ignored) {
                        alarmManager.set(AlarmManager.RTC_WAKEUP, lastSentNotificationTime, newPendingIntent);
                    }
                }
            }
        }
    }
    public void changeKeepAppRunningInBackground(boolean enable) {
        keepAppRunningInBackground = enable;
        prefsEdit.putBoolean("keepAppRunningInBackground", keepAppRunningInBackground).apply();
        webView.post(()->webView.loadUrl("javascript:window?.setKeepAppRunningInBackground?.("+(keepAppRunningInBackground?"true":"false")+")"));
    }
    @RequiresApi(api = Build.VERSION_CODES.O)
    public void updateCurrentNotifications() {
        webView.post(() -> webView.loadUrl("javascript:window?.updateMediaNotifications?.()"));
    }
    @RequiresApi(api = Build.VERSION_CODES.O)
    public void showUpdateNotice() {
        showDialog(new AlertDialog.Builder(MainActivity.this)
            .setTitle("New Version is Available")
            .setMessage("You may want to download the new app version.")
            .setPositiveButton("DOWNLOAD", (dialogInterface, i) -> checkUpdate())
            .setNegativeButton("LATER", null),
                true);
    }
    @RequiresApi(api = Build.VERSION_CODES.O)
    public void checkUpdate() {
        boolean hasPermission = getPackageManager().canRequestPackageInstalls();
        if (hasPermission) {
            downloadUpdate();
        } else {
            showDialog(new AlertDialog.Builder(MainActivity.this)
                            .setTitle("Permission for App Installation")
                            .setMessage("Allow permission to update the application.")
                            .setPositiveButton("OK", (dialogInterface, i) -> {
                                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.fromParts("package", getPackageName(), null));
                                allowApplicationUpdate.launch(intent);
                            })
                            .setNegativeButton("CANCEL", null),
                    true);
        }
    }
    public void downloadUpdate() {
        webView.post(() -> webView.clearCache(true));
        prefsEdit.putBoolean("permissionIsAsked", false).apply();
        String fileUrl = "https://github.com/u-Kuro/Kanshi-Anime-Recommender/raw/main/Kanshi.apk";
        String fileName = "Kanshi.apk";
        DownloadUtils.downloadFile(MainActivity.this, fileUrl, fileName, new DownloadUtils.DownloadCallback() {
            @RequiresApi(api = Build.VERSION_CODES.O)
            @Override
            public void onDownloadCompleted(String apkFilePath) {
                boolean hasPermission = getPackageManager().canRequestPackageInstalls();
                if (hasPermission) {
                    showDialog(new AlertDialog.Builder(MainActivity.this)
                                    .setTitle("Install the New Version")
                                    .setMessage("Do you like to continue the installation?")
                                    .setPositiveButton("YES", (dialogInterface, i) -> {
                                        File apkFile = new File(apkFilePath);
                                        if (apkFile.exists()) {
                                            Uri apkUri = FileProvider.getUriForFile(MainActivity.this, "com.example.kanshi.provider", apkFile);
                                            Intent intent = new Intent(Intent.ACTION_VIEW);
                                            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                            List<ResolveInfo> resolveInfoList = getPackageManager().queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
                                            if (!resolveInfoList.isEmpty()) {
                                                startActivity(intent);
                                            } else {
                                                showToast(Toast.makeText(MainActivity.this, "Failed to open the APK file", Toast.LENGTH_LONG));
                                            }
                                        } else {
                                            showToast(Toast.makeText(MainActivity.this, "File was not found", Toast.LENGTH_LONG));
                                        }
                                    })
                                    .setNegativeButton("NO", (dialogInterface, i) -> showToast(Toast.makeText(getApplicationContext(), "APK is in your download folder, you may still manually install the new version", Toast.LENGTH_LONG))).setCancelable(false),
                            true);
                }
            }
            @Override
            public void onDownloadFailed() {
                showDialog(new AlertDialog.Builder(MainActivity.this)
                                .setTitle("Download Failed")
                                .setMessage("Do you want to re-download the new version?")
                                .setPositiveButton("YES", (dialogInterface, i) -> downloadUpdate())
                                .setNegativeButton("NO", null),
                        true);
            }
        });
    }

    public void checkEntries() {
        try {
            if (webView != null) {
                webView.post(() -> webView.loadUrl("javascript:window?.checkEntries?.();"));
            }
        } catch (Exception ignored) {}
    }

    public void showDialog(AlertDialog.Builder alertDialog, boolean canceledOnOutsideTouch) {
        if (currentDialog != null && currentDialog.isShowing()) {
            currentDialog.dismiss();
        }
        currentDialog = alertDialog.create();
        currentDialog.setCanceledOnTouchOutside(canceledOnOutsideTouch);
        Window dialogWindow = currentDialog.getWindow();
        if (dialogWindow!=null) {
            dialogWindow.setBackgroundDrawableResource(R.drawable.dialog);
        }
        currentDialog.show();
    }
    public void showToast(Toast toast) {
        if (currentToast != null) {
            currentToast.cancel();
        }
        if (isInApp) {
            currentToast = toast;
            currentToast.show();
        }
    }
    public void hideToast() {
        if (currentToast != null) {
            currentToast.cancel();
        }
        currentToast = null;
    }
    public void recheckStatusBar() {
        if (getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE) {
            hideStatusBar();
        } else {
            showStatusBar();
        }
    }
    public void showStatusBar() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            final WindowInsetsController insetsController = getWindow().getInsetsController();
            if (insetsController != null) {
                insetsController.show(WindowInsets.Type.statusBars());
            }
        }
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
    }
    public void hideStatusBar() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            final WindowInsetsController insetsController = getWindow().getInsetsController();
            if (insetsController != null) {
                insetsController.hide(WindowInsets.Type.statusBars());
            }
            getWindow().setFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
        } else {
            getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
            );
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    private void isAppConnectionAvailable(ConnectivityCallback callback) {
        ConnectivityManager connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        Network network = connectivityManager.getActiveNetwork();
        if (network == null) {
            callback.onConnectionResult(false);
            return;
        }
        CompletableFuture.supplyAsync(this::checkAppConnection)
                .thenAccept(callback::onConnectionResult);
    }

    final ExecutorService executor = Executors.newFixedThreadPool(1);
    private boolean checkAppConnection() {
        Future<Boolean> future = executor.submit(() -> {
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL("https://raw.githubusercontent.com/u-Kuro/Kanshi-Anime-Recommender/main/public/version.json").openConnection();
                connection.setRequestMethod("HEAD");
                connection.setConnectTimeout(999999999);
                connection.setReadTimeout(999999999);
                connection.setUseCaches(false);
                int responseCode = connection.getResponseCode();
                connection.disconnect();
                return responseCode == HttpURLConnection.HTTP_OK;
            } catch (Exception ignored) {
                return false;
            }
        });
        try {
            return future.get(999999999, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    interface ConnectivityCallback {
        void onConnectionResult(boolean isConnected);
    }
}

