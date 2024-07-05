package com.example.kanshi;

import static android.Manifest.permission.POST_NOTIFICATIONS;
import static android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION;
import static android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM;
import static com.example.kanshi.BuildConfig.DEBUG;
import static com.example.kanshi.BuildConfig.VERSION_CODE;
import static com.example.kanshi.Configs.DATA_EVICTION_CHANNEL;
import static com.example.kanshi.Configs.NOTIFICATION_DATA_EVICTION;
import static com.example.kanshi.Configs.TOKEN;
import static com.example.kanshi.Configs.UPDATE_DATA_PENDING_INTENT;
import static com.example.kanshi.Configs.getAssetLoader;
import static com.example.kanshi.Configs.OWNER;
import static com.example.kanshi.Configs.IS_OWNER_KEY;
import static com.example.kanshi.Configs.VISITED_KEY;
import static com.example.kanshi.Configs.getTOKEN;
import static com.example.kanshi.LocalPersistence.getLockForFile;
import static com.example.kanshi.LocalPersistence.getLockForFileName;
import static com.example.kanshi.Utils.*;

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

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.InputStream;
import java.lang.ref.WeakReference;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Pattern;

import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.FileProvider;
import androidx.core.splashscreen.SplashScreen;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends AppCompatActivity {
    public boolean keepAppRunningInBackground = false;
    public boolean permissionIsAsked = false;
    public SharedPreferences prefs;
    private SharedPreferences.Editor prefsEdit;
    private ValueCallback<Uri[]> mUploadMessage;
    private String exportPath;
    public MediaWebView webView;
    private ProgressBar progressbar;
    private boolean pageLoaded = false;
    private boolean webViewIsLoaded = false;
    private PowerManager.WakeLock wakeLock;
    public boolean shouldGoBack;
    public Toast persistentToast;
    public Toast currentToast;
    public AlertDialog currentDialog;
    public boolean isInApp = true;
    public static WeakReference<MainActivity> weakActivity;
    public boolean shouldRefreshList = false;
    public boolean shouldProcessRecommendationList = false;
    public boolean shouldLoadAnime = false;
    public BufferedWriter writer;

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
    final ActivityResultLauncher<Intent> chooseExportFile =
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
                            exportPath = getThisPath(docUri);
                            showToast(Toast.makeText(getApplicationContext(), "Backup folder is selected, you may now use the export feature.", Toast.LENGTH_LONG));
                            prefsEdit.putString("savedExportPath", exportPath).apply();
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
        exportPath = prefs.getString("savedExportPath", "");
        if (OWNER) { TOKEN = getTOKEN(exportPath); }
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
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setDefaultFontSize(16);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            webSettings.setOffscreenPreRaster(true);
        }

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
            private WebResourceResponse fetchWebVersion() {
                try {
                    HttpURLConnection connection = (HttpURLConnection) new URL("https://raw.githubusercontent.com/u-Kuro/Kanshi-Anime-Recommender/main/public/version.json").openConnection();
                    connection.setRequestMethod("GET");
                    connection.setUseCaches(false);
                    connection.setConnectTimeout(3000);
                    connection.setReadTimeout(3000);
                    connection.connect();

                    InputStream inputStream = connection.getInputStream();
                    String contentType = connection.getContentType();
                    String encoding = connection.getContentEncoding() != null ? connection.getContentEncoding() : "UTF-8";

                    return new WebResourceResponse(contentType, encoding, inputStream);
                } catch (Exception ignored) {
                    return null;
                }
            }
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String url = uri.toString();
                if (url.startsWith("https://appassets.androidplatform.net/assets/version.json")) {
                    return fetchWebVersion();
                } else {
                    return assetLoader.shouldInterceptRequest(uri);
                }
            }
            @Override
            @SuppressWarnings("deprecation")
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                if (url.startsWith("https://appassets.androidplatform.net/assets/version.json")) {
                    return fetchWebVersion();
                } else {
                    return assetLoader.shouldInterceptRequest(Uri.parse(url));
                }
            }
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                shouldRefreshList = shouldProcessRecommendationList = shouldLoadAnime = false;
                boolean visited = prefs.getBoolean("visited", false);
                if (visited) {
                    view.loadUrl("javascript:(()=>{window['" + VISITED_KEY + "']=true})();");
                }
                if (OWNER && TOKEN != null && !TOKEN.trim().isEmpty()) {
                    view.loadUrl("javascript:(()=>{window['" + IS_OWNER_KEY + "']='" + TOKEN + "'})();");
                }
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

                shouldRefreshList = shouldProcessRecommendationList = shouldLoadAnime = false;
                boolean visited = prefs.getBoolean("visited", false);
                if (visited) {
                    webView.loadUrl("javascript:(()=>{window['" + VISITED_KEY + "']=true})();");
                }
                if (OWNER && TOKEN != null && !TOKEN.trim().isEmpty()) {
                    view.loadUrl("javascript:(()=>{window['" + IS_OWNER_KEY + "']='" + TOKEN + "'})();");
                }
                webView.loadUrl("javascript:(()=>{window.shouldUpdateNotifications=true})();");
                webView.loadUrl("javascript:(()=>{window.keepAppRunningInBackground=" + (keepAppRunningInBackground ? "true" : "false") + "})();");
                webView.loadUrl("javascript:window?.setKeepAppRunningInBackground?.("+(keepAppRunningInBackground?"true":"false")+")");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    ConnectivityManager connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                    Network network = connectivityManager.getActiveNetwork();
                    if (network == null) {
                        showToast(Toast.makeText(getApplicationContext(), "You are currently offline.", Toast.LENGTH_LONG));
                    }
                }
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView, true);
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
                    || url.startsWith("https://www.youtu.be")
                    || url.startsWith("https://m.youtu.be")
                    || url.startsWith("https://youtu.be")
                    || url.startsWith("http://www.youtube.com")
                    || url.startsWith("http://m.youtube.com")
                    || url.startsWith("http://youtube.com")
                    || url.startsWith("http://www.youtu.be")
                    || url.startsWith("http://m.youtu.be")
                    || url.startsWith("http://youtu.be")
                ) {
                    Intent intent = new Intent(MainActivity.this, YoutubeViewActivity.class);
                    intent.putExtra("url", url);
                    intent.putExtra("fromMainActivity", true);
                    startActivity(intent);
                    overridePendingTransition(R.anim.fade_in, R.anim.remove);
                } else {
                    try {
                        boolean isAniList = url.startsWith("https://www.anilist.co")
                            || url.startsWith("https://m.anilist.co")
                            || url.startsWith("https://anilist.co")
                            || url.startsWith("http://www.anilist.co")
                            || url.startsWith("http://m.anilist.co")
                            || url.startsWith("http://anilist.co");
                        int customTabColor = isAniList ? R.color.dark_blue : R.color.black;
                        CustomTabsIntent customTabsIntent;
                        if (url.startsWith("intent://")) {
                            try {
                                customTabsIntent = new CustomTabsIntent.Builder()
                                        .setDefaultColorSchemeParams(new CustomTabColorSchemeParams.Builder().setToolbarColor(getResources().getColor(customTabColor)).build())
                                        .setStartAnimations(MainActivity.this, R.anim.fade_in, R.anim.remove)
                                        .setExitAnimations(MainActivity.this, R.anim.fade_out, R.anim.remove)
                                        .setShowTitle(true)
                                        .build();
                                customTabsIntent.launchUrl(MainActivity.this, Uri.parse("https://" + url.substring(9)));
                            } catch (Exception ignored) {
                                customTabsIntent = new CustomTabsIntent.Builder()
                                        .setDefaultColorSchemeParams(new CustomTabColorSchemeParams.Builder().setToolbarColor(getResources().getColor(customTabColor)).build())
                                        .setStartAnimations(MainActivity.this, R.anim.fade_in, R.anim.remove)
                                        .setExitAnimations(MainActivity.this, R.anim.fade_out, R.anim.remove)
                                        .setShowTitle(true)
                                        .build();
                                customTabsIntent.launchUrl(MainActivity.this, request.getUrl());
                            }
                        } else {
                            customTabsIntent = new CustomTabsIntent.Builder()
                                    .setDefaultColorSchemeParams(new CustomTabColorSchemeParams.Builder().setToolbarColor(getResources().getColor(customTabColor)).build())
                                    .setStartAnimations(MainActivity.this, R.anim.fade_in, R.anim.remove)
                                    .setExitAnimations(MainActivity.this, R.anim.fade_out, R.anim.remove)
                                    .setShowTitle(true)
                                    .build();
                            customTabsIntent.launchUrl(MainActivity.this, request.getUrl());
                        }
                        overridePendingTransition(R.anim.fade_in, R.anim.remove);
                    } catch (Exception ignored) {
                        showToast(Toast.makeText(getApplicationContext(), "Can't open the link.", Toast.LENGTH_LONG));
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
                    showToast(Toast.makeText(getApplicationContext(), "Please select your file.", Toast.LENGTH_LONG));
                } catch (Exception ignored) {
                    i = new Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("*/*");
                    chooseImportFile.launch(i);
                    showToast(Toast.makeText(getApplicationContext(), "Please select your file.", Toast.LENGTH_LONG));
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
        Utils.cleanIndexedDBFiles(this.getApplicationContext());

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
    public void onWindowFocusChanged(boolean hasFocus) {
        if (webView!=null) {
            webView.setKeepScreenOn(true);
            webView.resumeTimers();
            webView.setVisibility(View.VISIBLE);
            webView.onWindowSystemUiVisibilityChanged(View.VISIBLE);
            webView.onWindowVisibilityChanged(View.VISIBLE);
        }
        MainActivity.this.setVisible(true);
        MainActivity.this.requestVisibleBehind(true);
    }

    @Override
    protected void onPause() {
        isInApp = false;
        if (webView!=null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                webView.getSettings().setOffscreenPreRaster(false);
            }
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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            webView.getSettings().setOffscreenPreRaster(true);
        }
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
                            "window?.shouldRefreshAnimeList?.("
                                    + (shouldProcessRecommendationList ? "true" : "false") + ","
                                    + (shouldLoadAnime ? "true" : "false")
                                    + ");"
                            : "window?.checkEntries?.();")
            );
            shouldRefreshList = shouldProcessRecommendationList = shouldLoadAnime = false;
        }
    }

    public void refreshMediaList() {
        if (!shouldRefreshList) return;
        try {
            new Handler(Looper.getMainLooper())
            .post(() -> webView.post(() -> webView.loadUrl("javascript:window?.shouldRefreshAnimeList?.("
                    + (shouldProcessRecommendationList ? "true" : "false") + ","
                    + (shouldLoadAnime ? "true" : "false")
                    + ")")));
        } catch (Exception ignored) {}
    }

    @Override
    protected void onDestroy() {
        isInApp = false;
        if (webView!=null) {
            webView.post(() -> webView.loadUrl("javascript:window?.notifyUpdatedAnimeNotification?.()"));
        }
        try {
            if (writer != null) {
                writer.close();
                writer = null;
            }
        } catch (Exception ignored) {}
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
        @JavascriptInterface
        public void visited() {
            prefsEdit.putBoolean("visited", true).apply();
        }
        boolean dataEvictionChannelIsAdded = false;
        @JavascriptInterface
        public void notifyDataEviction() {
            if (ActivityCompat.checkSelfPermission(MainActivity.this.getApplicationContext(), android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                if (!dataEvictionChannelIsAdded) {
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
                    dataEvictionChannelIsAdded = true;
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
        private final Handler exportJSONUIhandler = new Handler(Looper.getMainLooper());
        private ExecutorService exportJSONExecutor = Executors.newFixedThreadPool(1);
        File tempExportFile;
        String exportDirectoryPath;
        @RequiresApi(api = Build.VERSION_CODES.R)
        @JavascriptInterface
        public void exportJSON(String chunk, int status, String fileName) {
            ReentrantLock fileLock = null;
            if (tempExportFile != null) {
                fileLock = getLockForFile(tempExportFile);
                fileLock.lock(); // Lock before critical section
            }
            try {
                if (status == 0) {
                    try {
                        if (exportJSONExecutor != null) {
                            exportJSONExecutor.shutdownNow();
                        }
                        exportJSONExecutor = Executors.newFixedThreadPool(1);
                        exportJSONUIhandler.removeCallbacksAndMessages(null);
                        if (writer != null) {
                            writer.close();
                            writer = null;
                        }
                    } catch (Exception ignored) {}
                    exportJSONExecutor.submit(() -> {
                        if (!Environment.isExternalStorageManager()) {
                            exportJSONUIhandler.post(() -> showDialog(new AlertDialog.Builder(MainActivity.this)
                            .setTitle("Folder Access for Backup")
                            .setMessage("Allow permission to access folders for backup feature.")
                            .setPositiveButton("OK", (dialogInterface, i) -> {
                                Intent intent = new Intent(ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.fromParts("package", getPackageName(), null));
                                startActivity(intent);
                            })
                            .setNegativeButton("CANCEL", null), true));
                        } else {
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
                                        tempExportFile = new File(exportDirectoryPath + "tmp.json");
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
                                            writer = new BufferedWriter(new FileWriter(tempExportFile, true));
                                        } else {
                                            try {
                                                if (writer != null) {
                                                    writer.close();
                                                    writer = null;
                                                }
                                            } catch (Exception ignored) {}
                                            exportJSONUIhandler.post(() -> {
                                                isExported(false);
                                                showToast(Toast.makeText(getApplicationContext(), "Temporary backup file can't be re-written, please delete tmp.json in the selected directory.", Toast.LENGTH_LONG));
                                            });
                                        }
                                    } catch (Exception e) {
                                        exportJSONUIhandler.post(() -> {
                                            isExported(false);
                                            showToast(Toast.makeText(getApplicationContext(), "An exception occurred initializing the temporary backup file.", Toast.LENGTH_LONG));
                                        });
                                        try {
                                            if (writer != null) {
                                                writer.close();
                                                writer = null;
                                            }
                                        } catch (Exception ignored) {}
                                        Utils.handleUncaughtException(MainActivity.this.getApplicationContext(), e, "exportJSON Status 0");
                                        e.printStackTrace();
                                    }
                                } else if (!dirIsCreated) {
                                    exportJSONUIhandler.post(() -> showToast(Toast.makeText(getApplicationContext(), "Can't find backup folder, please create it first.", Toast.LENGTH_LONG)));
                                }
                            } else if (exportPath != null && !exportPath.isEmpty() && !exportDirectory.isDirectory()) {
                                String[] tempExportPath = exportPath.split(Pattern.quote(File.separator));
                                String tempPathName = tempExportPath.length > 1 ?
                                        tempExportPath[tempExportPath.length - 2] + File.separator +
                                                tempExportPath[tempExportPath.length - 1]
                                        : tempExportPath[tempExportPath.length - 1];
                                exportJSONUIhandler.post(() -> showDialog(new AlertDialog.Builder(MainActivity.this)
                                .setTitle("Backup Folder is Missing")
                                .setMessage("Folder directory [" + tempPathName + "] is missing, please choose another folder for backup.")
                                .setPositiveButton("OK", (dialogInterface, x) -> {
                                    showToast(Toast.makeText(getApplicationContext(), "Select or create a folder.", Toast.LENGTH_LONG));
                                    Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addCategory(Intent.CATEGORY_DEFAULT);
                                    chooseExportFile.launch(i);
                                })
                                .setNegativeButton("CANCEL", null), true));
                            } else {
                                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addCategory(Intent.CATEGORY_DEFAULT);
                                chooseExportFile.launch(i);
                                exportJSONUIhandler.post(() -> showToast(Toast.makeText(getApplicationContext(), "Select or create a folder.", Toast.LENGTH_LONG)));
                            }
                        }
                    });
                } else if (
                    status == 1
                    && writer != null
                    && exportJSONExecutor != null
                    && !exportJSONExecutor.isShutdown()
                    && !exportJSONExecutor.isTerminated()
                ) {
                    exportJSONExecutor.submit(()-> {
                        try {
                            writer.write(chunk);
                        } catch (Exception e) {
                            exportJSONUIhandler.post(() -> {
                                isExported(false);
                                showToast(Toast.makeText(getApplicationContext(), "An exception occurred while writing to temporary backup file.", Toast.LENGTH_LONG));
                            });
                            try {
                                if (writer != null) {
                                    writer.close();
                                    writer = null;
                                }
                            } catch (Exception ignored) {}
                            Utils.handleUncaughtException(MainActivity.this.getApplicationContext(), e, "exportJSON Status 1");
                            e.printStackTrace();
                        }
                    });
                } else if (
                    status == 2
                    && writer != null
                    && exportJSONExecutor != null
                    && !exportJSONExecutor.isShutdown()
                    && !exportJSONExecutor.isTerminated()
                ) {
                    exportJSONExecutor.submit(() -> {
                        try {
                            writer.write(chunk);
                            writer.close();
                            writer = null;
                            int lastStringLen = Math.min(chunk.length(), 3);
                            String lastNCharacters = new String(new char[lastStringLen]).replace("\0", "}");
                            if (chunk.endsWith(lastNCharacters)) {
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
                                        exportJSONUIhandler.post(() -> isExported(true));
                                        //noinspection ResultOfMethodCallIgnored
                                        tempExportFile.delete();
                                    } catch (Exception e) {
                                        exportJSONUIhandler.post(() -> {
                                            isExported(false);
                                            showToast(Toast.makeText(getApplicationContext(), "Failed to access the backup file.", Toast.LENGTH_LONG));
                                        });
                                        Utils.handleUncaughtException(getApplicationContext(), e, "MainActivity exportJSON Status 2 0");
                                        e.printStackTrace();
                                    } finally {
                                        finalFileNameLock.unlock();
                                    }
                                } else {
                                    exportJSONUIhandler.post(() -> {
                                        isExported(false);
                                        showToast(Toast.makeText(getApplicationContext(), "Failed to backup the file.", Toast.LENGTH_LONG));
                                    });
                                }
                            } else {
                                exportJSONUIhandler.post(() -> {
                                    isExported(false);
                                    showToast(Toast.makeText(getApplicationContext(), "An exception occurred in finalizing the backup file.", Toast.LENGTH_LONG));
                                });
                            }
                        } catch (Exception e) {
                            exportJSONUIhandler.post(() -> {
                                isExported(false);
                                showToast(Toast.makeText(getApplicationContext(), "An exception occurred in finalizing the backup file.", Toast.LENGTH_LONG));
                            });
                            try {
                                if (writer != null) {
                                    writer.close();
                                    writer = null;
                                }
                            } catch (Exception ignored) {}
                            Utils.handleUncaughtException(MainActivity.this.getApplicationContext(), e, "MainActivity exportJSON Status 2 1");
                            e.printStackTrace();
                        }
                    });
                }
            } catch (Exception e) {
                Utils.handleUncaughtException(MainActivity.this.getApplicationContext(), e, "MainActivity exportJSON Outer-Lock");
                e.printStackTrace();
            } finally {
                if (fileLock != null) {
                    fileLock.unlock();
                }
            }
        }
        @JavascriptInterface
        public void copyToClipBoard(String text) {
            ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            ClipData clip = ClipData.newPlainText("Copied Text", text);
            clipboard.setPrimaryClip(clip);
        }
        @JavascriptInterface
        public void willExit() { showToast(Toast.makeText(getApplicationContext(), "Press back again to exit.", Toast.LENGTH_SHORT)); }
        @JavascriptInterface
        public void setShouldGoBack(boolean _shouldGoBack) {
            if (shouldGoBack && !_shouldGoBack && currentToast != null) {
                hideToast();
            }
            shouldGoBack = _shouldGoBack;
        }
        @JavascriptInterface
        public void chooseExportFolder() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                if (!Environment.isExternalStorageManager()) {
                    showDialog(new AlertDialog.Builder(MainActivity.this)
                                    .setTitle("File Access for Backup")
                                    .setMessage("Allow permission to access folders for backup feature.")
                                    .setPositiveButton("OK", (dialogInterface, i) -> {
                                        Intent intent = new Intent(ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.fromParts("package", getPackageName(), null));
                                        startActivity(intent);
                                    })
                                    .setNegativeButton("CANCEL", null),
                            true);
                } else {
                    Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addCategory(Intent.CATEGORY_DEFAULT);
                    chooseExportFile.launch(i);
                    showToast(Toast.makeText(getApplicationContext(), "Select or create a folder.", Toast.LENGTH_LONG));
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
                            showToast(Toast.makeText(getApplicationContext(), "Your internet has been restored.", Toast.LENGTH_LONG));
                        }
                    }));
                } else {
                    showToast(Toast.makeText(getApplicationContext(), "You are currently offline.", Toast.LENGTH_LONG));
                }
            } catch (Exception ignored) {}
        }
        @RequiresApi(api = Build.VERSION_CODES.O)
        @JavascriptInterface
        public void checkAppID(int appID) {
            if (appID > VERSION_CODE) {
                showUpdateNotice();
            }
        }
        @JavascriptInterface
        public void refreshWeb() {
            Intent intent = new Intent(getApplicationContext(), MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(intent);
            finish();
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
        final long DAY_IN_MILLIS = TimeUnit.DAYS.toMillis(1);
        @RequiresApi(api = Build.VERSION_CODES.O)
        @JavascriptInterface
        public void addAnimeReleaseNotification(long animeId, String title, long releaseEpisode, long maxEpisode, long releaseDateMillis, String imageUrl, String animeUrl, String userStatus, long episodeProgress) {
            if (releaseDateMillis >= (System.currentTimeMillis() - DAY_IN_MILLIS)) {
                AnimeNotificationManager.scheduleAnimeNotification(MainActivity.this, animeId, title, releaseEpisode, maxEpisode, releaseDateMillis, imageUrl, animeUrl, userStatus, episodeProgress);
            }
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
        public void updateNotifications(long animeId, String title, long maxEpisode, String animeUrl, String userStatus, long episodeProgress) {
            if (updateNotificationsFutures.containsKey(String.valueOf(animeId))) {
                Future<?> future = updateNotificationsFutures.get(String.valueOf(animeId));
                if (future != null && !future.isDone()) {
                    future.cancel(true);
                }
            }
            Future<?> future = updateNotificationsExecutorService.submit(() -> {
                try {
                    if (AnimeNotificationManager.allAnimeNotification.isEmpty()) {
                        @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(MainActivity.this, "allAnimeNotification");
                        if ($allAnimeNotification != null && !$allAnimeNotification.isEmpty()) {
                            AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
                        }
                        if (AnimeNotificationManager.allAnimeNotification.isEmpty()) {
                            return;
                        }
                    }
                    ConcurrentHashMap<String, AnimeNotification> updatedAnimeNotifications = new ConcurrentHashMap<>();
                    List<AnimeNotification> allAnimeNotificationValues = new ArrayList<>(AnimeNotificationManager.allAnimeNotification.values());
                    for (AnimeNotification anime : allAnimeNotificationValues) {
                        if (anime.animeId==animeId) {
                            AnimeNotification newAnime = new AnimeNotification(anime.animeId, title, anime.releaseEpisode, maxEpisode, anime.releaseDateMillis, anime.imageByte, animeUrl, userStatus, episodeProgress);
                            updatedAnimeNotifications.put(anime.animeId+"-"+anime.releaseEpisode, newAnime);
                        }
                    }
                    AnimeNotificationManager.allAnimeNotification.putAll(updatedAnimeNotifications);
                    AnimeNotificationManager.writeAnimeNotificationInFile(MainActivity.this, true);
                    updateNotificationsFutures.remove(String.valueOf(animeId));
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                        if (updateNotificationsFutures.isEmpty()) {
                            SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
                            if (schedulesTabFragment!=null) {
                                new Handler(Looper.getMainLooper()).post(()->schedulesTabFragment.updateScheduledAnime(false, false));
                            }
                            ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();
                            if (releasedTabFragment!=null) {
                                new Handler(Looper.getMainLooper()).post(()->releasedTabFragment.updateReleasedAnime(false, false));
                            }
                        }
                    }
                } catch (Exception e) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        Utils.handleUncaughtException(MainActivity.this.getApplicationContext(), e, "updateNotificationsExecutorService");
                    }
                    e.printStackTrace();
                }
            });
            updateNotificationsFutures.put(String.valueOf(animeId), future);
        }
        @RequiresApi(api = Build.VERSION_CODES.P)
        @JavascriptInterface
        public void showRecentReleases() {
            Intent intent = new Intent(MainActivity.this, AnimeReleaseActivity.class);
            startActivity(intent);
            overridePendingTransition(R.anim.fade_in, R.anim.remove);
        }
        @JavascriptInterface
        public void showNewUpdatedAnimeNotification(long addedAnimeCount, long updatedAnimeCount) {
            if (updatedAnimeCount > 0 || addedAnimeCount > 0) {
                if (updatedAnimeCount > 0 && addedAnimeCount > 0) {
                    persistentToast = Toast.makeText(MainActivity.this, addedAnimeCount + " New Anime / " + updatedAnimeCount + " Modification", Toast.LENGTH_LONG);
                } else if (updatedAnimeCount > 0) {
                    persistentToast = Toast.makeText(MainActivity.this, "+" + updatedAnimeCount + " New Modified Anime", Toast.LENGTH_LONG);
                } else {
                    persistentToast = Toast.makeText(MainActivity.this, "+" + addedAnimeCount + " New Added Anime", Toast.LENGTH_LONG);
                }
                if (isInApp) {
                    if (currentToast != null) {
                        currentToast.cancel();
                    }
                    persistentToast.show();
                    persistentToast = null;
                }
                AnimeNotificationManager.recentlyUpdatedAnimeNotification(MainActivity.this, addedAnimeCount, updatedAnimeCount);
            }
        }
        @JavascriptInterface
        public void openToast(String text, boolean isLongDuration) {
            showToast(Toast.makeText(getApplicationContext(), text, isLongDuration ? Toast.LENGTH_LONG : Toast.LENGTH_SHORT));
        }
    }

    public void showDataEvictionDialog() {
        new Handler(Looper.getMainLooper()).post(()-> showDialog(new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Possible Data Loss")
                        .setMessage("Some of your data may be cleared by chrome, please import your saved data.")
                        .setPositiveButton("OK", (dialogInterface, i) -> webView.post(() -> {
                            webView.loadUrl("javascript:window?.importAndroidUserData?.()");
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
                        })))
                ,false));
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
            newIntent.setAction("ANIME_NOTIFICATION");

            PendingIntent newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), AnimeNotificationManager.ANIME_RELEASE_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager alarmManager = (AlarmManager) this.getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            // Cancel Old
            newPendingIntent.cancel();
            alarmManager.cancel(newPendingIntent);
            // Create New
            newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), AnimeNotificationManager.ANIME_RELEASE_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
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
    private final ExecutorService updateCurrentNotificationsExecutorService = Executors.newFixedThreadPool(1);
    private Future<?> updateCurrentNotificationsFuture;
    @RequiresApi(api = Build.VERSION_CODES.O)
    public void updateCurrentNotifications() {
        if (updateCurrentNotificationsFuture != null && !updateCurrentNotificationsFuture.isCancelled()) {
            updateCurrentNotificationsFuture.cancel(true);
        }
        updateCurrentNotificationsFuture = updateCurrentNotificationsExecutorService.submit(() -> {
            try {
                if (AnimeNotificationManager.allAnimeNotification.isEmpty()) {
                    @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(MainActivity.this, "allAnimeNotification");
                    if ($allAnimeNotification != null && !$allAnimeNotification.isEmpty()) {
                        AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
                    } else {
                        return;
                    }
                }
                Set<String> animeIdsToBeUpdated = new HashSet<>();
                List<AnimeNotification> allAnimeNotificationValues = new ArrayList<>(AnimeNotificationManager.allAnimeNotification.values());
                for (AnimeNotification anime : allAnimeNotificationValues) {
                    animeIdsToBeUpdated.add(String.valueOf(anime.animeId));
                }
                String joinedAnimeIds = String.join(",", animeIdsToBeUpdated);
                webView.post(() -> webView.loadUrl("javascript:window?.updateNotifications?.([" + joinedAnimeIds + "])"));
            } catch (Exception e) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(MainActivity.this.getApplicationContext(), e, "updateCurrentNotificationsExecutorService");
                }
                e.printStackTrace();
            }
        });
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
                                                showToast(Toast.makeText(MainActivity.this, "No application available to open the APK file.", Toast.LENGTH_LONG));
                                            }
                                        } else {
                                            showToast(Toast.makeText(MainActivity.this, "File is not found.", Toast.LENGTH_LONG));
                                        }
                                    })
                                    .setNegativeButton("NO", (dialogInterface, i) -> showToast(Toast.makeText(getApplicationContext(), "APK is in your download folder, you may still manually install the new version.", Toast.LENGTH_LONG))).setCancelable(false),
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

    public void isExported(boolean success) {
        if (success) {
            webView.post(() -> webView.loadUrl("javascript:window?.isExported?.(true)"));
        } else {
            webView.post(() -> webView.loadUrl("javascript:window?.isExported?.(false)"));
            showDialog(new AlertDialog.Builder(MainActivity.this)
                            .setTitle("Backup Failed")
                            .setMessage("Do you want to try again?")
                            .setPositiveButton("YES", (dialogInterface, i) -> webView.post(() -> webView.loadUrl("javascript:window?.runExport?.()")))
                            .setNegativeButton("NO", null),
                    true);
        }
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
        ConnectivityManager connectivityManager =
                (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
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
                URL url = new URL("https://raw.githubusercontent.com/u-Kuro/Kanshi-Anime-Recommender/main/public/version.json");
                HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
                urlConnection.setRequestMethod("HEAD");
                urlConnection.setConnectTimeout(999999999);
                urlConnection.setReadTimeout(999999999);
                urlConnection.setUseCaches(false);
                int responseCode = urlConnection.getResponseCode();
                urlConnection.disconnect();
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

