package com.example.kanshi;

import static android.Manifest.permission.POST_NOTIFICATIONS;
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
import android.graphics.BitmapFactory;
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
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.lang.ref.WeakReference;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.FileProvider;
import androidx.core.splashscreen.SplashScreen;

public class MainActivity extends AppCompatActivity {
    public final int appID = 364;
    private final boolean isOwner = true;
    public boolean keepAppRunningInBackground = false;
    public boolean webViewIsLoaded = false;
    public boolean permissionIsAsked = false;
    public SharedPreferences prefs;
    private SharedPreferences.Editor prefsEdit;
    private int currentOrientation;
    private ValueCallback<Uri[]> mUploadMessage;
    private String exportPath;
    public MediaWebView webView;
    private ProgressBar progressbar;
    private boolean pageLoaded = false;
    private final String uniqueKey = "Kanshi.Anime.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70";
    private final String visitedKey = uniqueKey+".visited";
    private final String isOwnerKey = uniqueKey+".isOwner";

    private PowerManager.WakeLock wakeLock;
    public boolean shouldGoBack;
    public Toast persistentToast;
    public Toast currentToast;
    public AlertDialog currentDialog;
    public boolean isInApp = true;
    public boolean appSwitched = false;
    public static WeakReference<MainActivity> weakActivity;
    public boolean shouldRefreshList = false;
    public boolean shouldProcessRecommendationList = false;
    public boolean shouldLoadAnime = false;

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
                            try {
                                Uri[] result = null;
                                if (null == mUploadMessage || resultCode != RESULT_OK) {
                                    result = new Uri[]{Uri.parse("")};
                                } else {
                                    assert intent != null;
                                    String dataString = intent.getDataString();
                                    if (dataString != null) {
                                        result = new Uri[]{Uri.parse(dataString)};
                                    }
                                }
                                mUploadMessage.onReceiveValue(result);
                                mUploadMessage = null;
                            } catch (Exception e) {
                                e.printStackTrace();
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
                            try {
                                if (resultCode != RESULT_OK) {
                                    return;
                                }
                                assert intent != null;
                                Uri uri = intent.getData();
                                Uri docUri = DocumentsContract.buildDocumentUriUsingTree(uri,
                                        DocumentsContract.getTreeDocumentId(uri));
                                exportPath = getThisPath(docUri);
                                showToast(Toast.makeText(getApplicationContext(), "Export folder is selected, you may now use the export feature.", Toast.LENGTH_LONG));
                                prefsEdit.putString("savedExportPath", exportPath).apply();
                                webView.post(()->webView.loadUrl("javascript:window?.setExportPathAvailability?.(true)"));
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                    }
            );
    private final ActivityResultLauncher<String> notificationPermission =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(),
                    isGranted -> prefsEdit.putBoolean("permissionIsAsked", true).apply()
            );

    @RequiresApi(api = Build.VERSION_CODES.TIRAMISU)
    @SuppressLint({"SetJavaScriptEnabled", "WrongViewCast"})
    @Override
    protected void onCreate(final Bundle savedInstanceState) {
        // Shared Preference
        prefs = MainActivity.this.getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
        prefsEdit = prefs.edit();
        // Saved Data
        keepAppRunningInBackground = prefs.getBoolean("keepAppRunningInBackground", true);
        exportPath = prefs.getString("savedExportPath", "");
        permissionIsAsked = prefs.getBoolean("permissionIsAsked", false);
        // Get Activity Reference
        weakActivity = new WeakReference<>(MainActivity.this);
        // Create WebView App Instance
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> !webViewIsLoaded);
        // Show status bar
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().getDecorView().setBackgroundColor(Color.BLACK);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        // Keep Awake on Lock Screen
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "KeepAwake:");
        wakeLock.acquire(10 * 60 * 1000L);
        webView = findViewById(R.id.webView);
        progressbar = findViewById(R.id.progressbar);
        progressbar.setMax((int) Math.pow(10, 6));
        // Add On Press Back Listener
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.getUrl() != null && (webView.getUrl().startsWith("file:///android_asset/www/index.html") || webView.getUrl().startsWith("https://u-kuro.github.io/Kanshi-Anime-Recommender"))) {
                    if (!shouldGoBack) {
                        webView.loadUrl("javascript:window?.backPressed?.();");
                    } else {
                        hideToast();
                        moveTaskToBack(true);
                    }
                } else {
                    if (webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        hideToast();
                        finish();
                    }
                }
            }
        });
        // Orientation
        currentOrientation = getResources().getConfiguration().orientation;
        if (currentOrientation == Configuration.ORIENTATION_LANDSCAPE) {
            progressbar.setProgressBackgroundTintList(ColorStateList.valueOf(Color.BLACK));
            getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
            getWindow().setStatusBarColor(Color.BLACK);
        }

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
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                shouldRefreshList = shouldProcessRecommendationList = shouldLoadAnime = false;
                boolean visited;
                if (url.startsWith("file")) {
                    visited = prefs.getBoolean("clientVisited", false);
                } else {
                    visited = prefs.getBoolean("visited", false);
                }
                if (visited) {
                    view.loadUrl("javascript:(()=>window['" + visitedKey + "']=true)();");
                }
                if (isOwner) {
                    view.loadUrl("javascript:(()=>window['" + isOwnerKey + "']=true)();");
                }
                if (appSwitched) {
                    appSwitched = false;
                    view.loadUrl("javascript:(()=>window.shouldUpdateNotifications=true)();");
                }
                view.loadUrl("javascript:(()=>window.keepAppRunningInBackground=" + (keepAppRunningInBackground ? "true" : "false") + ")();");
                super.onPageStarted(view, url, favicon);
                webViewIsLoaded = false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (pageLoaded) {
                    CookieManager cookieManager = CookieManager.getInstance();
                    cookieManager.setAcceptCookie(true);
                    cookieManager.setAcceptThirdPartyCookies(view, true);
                    CookieManager.getInstance().acceptCookie();
                    CookieManager.getInstance().flush();
                    webViewIsLoaded = true;
                } else if (!url.startsWith("file")) {
                    appSwitched = true;
                    pageLoaded = true;
                    view.loadUrl("file:///android_asset/www/index.html");
                    showDialog(new AlertDialog.Builder(MainActivity.this)
                                    .setTitle("Connection unreachable")
                                    .setMessage("Connection unreachable, do you want to reconnect indefinitely?")
                                    .setPositiveButton("OK", ((dialog, i) -> reconnectLonger()))
                                    .setNegativeButton("CANCEL", null),
                            true
                    );
                }
                view.loadUrl("javascript:window?.setKeepAppRunningInBackground?.(" + (keepAppRunningInBackground ? "true" : "false") + ")");
                super.onPageFinished(view, url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // In App Browsing
                String url = request.getUrl().toString();
                if (url.startsWith("intent://")) {
                    try {
                        Context context = view.getContext();
                        Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                        if (intent != null) {
                            PackageManager packageManager = context.getPackageManager();
                            ResolveInfo info = packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY);
                            if (info != null) {
                                context.startActivity(intent);
                            } else {
                                showToast(Toast.makeText(getApplicationContext(), "Can't open the link.", Toast.LENGTH_LONG));
                            }
                        }
                    } catch (Exception ignored) {
                        showToast(Toast.makeText(getApplicationContext(), "Can't open the link.", Toast.LENGTH_LONG));
                    }
                } else if (url.startsWith("https://www.youtube.com")
                        || url.startsWith("https://m.youtube.com")
                        || url.startsWith("https://youtube.com")
                        || url.startsWith("https://youtu.be")
                ) {
                    Intent intent = new Intent(MainActivity.this, YoutubeViewActivity.class);
                    intent.putExtra("url", url);
                    intent.putExtra("fromMainActivity", true);
                    startActivity(intent);
                    overridePendingTransition(R.anim.fade_in, R.anim.remove);
                } else {
                    try {
                        CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                                .setDefaultColorSchemeParams(new CustomTabColorSchemeParams.Builder().setToolbarColor(getResources().getColor(R.color.dark_blue)).build())
                                .setStartAnimations(MainActivity.this, R.anim.fade_in, R.anim.remove)
                                .setExitAnimations(MainActivity.this, R.anim.fade_out, R.anim.remove)
                                .setShowTitle(true)
                                .build();
                        customTabsIntent.launchUrl(MainActivity.this, Uri.parse(url));
                        overridePendingTransition(R.anim.remove, R.anim.remove);
                    } catch (Exception ignored) {
                        showToast(Toast.makeText(getApplicationContext(), "Can't open the link.", Toast.LENGTH_LONG));
                    }
                }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            private View mCustomView;
            private CustomViewCallback mCustomViewCallback;
            private int mOriginalOrientation;
            private int mOriginalSystemUiVisibility;

            // Import
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                try {
                    if (mUploadMessage != null) {
                        mUploadMessage.onReceiveValue(null);
                    }
                    mUploadMessage = filePathCallback;
                    Intent i = new Intent(Intent.ACTION_GET_CONTENT)
                            .addCategory(Intent.CATEGORY_OPENABLE)
                            .setType("application/json");// set MIME type to filter
                    chooseImportFile.launch(i);
                    showToast(Toast.makeText(getApplicationContext(), "Please select your backup file.", Toast.LENGTH_LONG));
                    return true;
                } catch (Exception e) {
                    e.printStackTrace();
                    return true;
                }
            }

            // Fullscreen
            @Override
            public Bitmap getDefaultVideoPoster() {
                if (mCustomView == null) {
                    return null;
                }
                return BitmapFactory.decodeResource(getApplicationContext().getResources(), 2130837573);
            }

            @Override
            public void onHideCustomView() {
                ((FrameLayout) getWindow().getDecorView()).removeView(this.mCustomView);
                this.mCustomView = null;
                getWindow().getDecorView().setSystemUiVisibility(this.mOriginalSystemUiVisibility);
                setRequestedOrientation(this.mOriginalOrientation);
                this.mCustomViewCallback.onCustomViewHidden();
                this.mCustomViewCallback = null;
            }

            @Override
            public void onShowCustomView(View paramView, CustomViewCallback paramCustomViewCallback) {
                if (this.mCustomView != null) {
                    onHideCustomView();
                    return;
                }
                this.mCustomView = paramView;
                this.mOriginalSystemUiVisibility = getWindow().getDecorView().getSystemUiVisibility();
                this.mOriginalOrientation = getRequestedOrientation();
                this.mCustomViewCallback = paramCustomViewCallback;
                ((FrameLayout) getWindow().getDecorView()).addView(this.mCustomView, new FrameLayout.LayoutParams(-1, -1));
                getWindow().getDecorView().setSystemUiVisibility(3846 | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
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
                    webViewIsLoaded = true;
                    ObjectAnimator animator = ObjectAnimator.ofInt(progressbar, "progress", 0);
                    animator.setDuration(0);
                    animator.setStartDelay(300);
                    animator.start();
                }
            }

            // Console Logs for Debugging
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                String message = consoleMessage.message();
                Log.d("WebConsole", message);
                return true;
            }
        });
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        isAppConnectionAvailable(isConnected -> webView.post(() -> {
            appSwitched = true;
            if (isConnected) {
                pageLoaded = false;
                webView.loadUrl("https://u-kuro.github.io/Kanshi-Anime-Recommender/");
            } else {
                pageLoaded = true;
                webView.loadUrl("file:///android_asset/www/index.html");
                showDialog(new AlertDialog.Builder(MainActivity.this)
                                .setTitle("Connection unreachable")
                                .setMessage("Connection unreachable, do you want to reconnect indefinitely?")
                                .setPositiveButton("OK", ((dialog, i) -> reconnectLonger()))
                                .setNegativeButton("CANCEL", null),
                        true
                );
            }
            if (!permissionIsAsked) {
                if (ActivityCompat.checkSelfPermission(this, POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        notificationPermission.launch(POST_NOTIFICATIONS);
                    }
                }
            }
            // Only works after first page load
            webSettings.setBuiltInZoomControls(false);
            webSettings.setDisplayZoomControls(false);
            webSettings.setSupportZoom(false);
        }), 3000);
        Utils.cleanIndexedDBFiles(this.getApplicationContext());
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
        webView.setKeepScreenOn(true);
        webView.resumeTimers();
        webView.setVisibility(View.VISIBLE);
        webView.onWindowSystemUiVisibilityChanged(View.VISIBLE);
        webView.onWindowVisibilityChanged(View.VISIBLE);
        MainActivity.this.setVisible(true);
        MainActivity.this.requestVisibleBehind(true);
    }

    @Override
    protected void onPause() {
        isInApp = false;
        setBackgroundUpdates();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            webView.getSettings().setOffscreenPreRaster(false);
        }
        super.onPause();
        webView.loadUrl("javascript:window?.returnedAppIsVisible?.(false)");
    }

    @Override
    protected void onStop() {
        setBackgroundUpdates();
        super.onStop();
    }

    @Override
    protected void onResume() {
        isInApp = true;
        Intent intent = new Intent(this, MainService.class);
        stopService(intent);
        overridePendingTransition(R.anim.none, R.anim.fade_out);
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
        super.onResume();
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

    @Override
    protected void onDestroy() {
        isInApp = false;
        webView.post(() -> webView.loadUrl("javascript:window?.notifyUpdatedAnimeNotification?.()"));
        setBackgroundUpdates();
        super.onDestroy();
        wakeLock.release();
    }

    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        currentOrientation = newConfig.orientation;
        if (currentOrientation == Configuration.ORIENTATION_LANDSCAPE) {
            getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        } else {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        }
        getWindow().setStatusBarColor(Color.BLACK);
        progressbar.setProgressBackgroundTintList(ColorStateList.valueOf(Color.BLACK));
    }

    // Native and Webview Connection
    @SuppressWarnings("unused")
    class JSBridge {
        BufferedWriter writer;
        File tempFile;
        String directoryPath;

        @JavascriptInterface
        public void pageIsFinished() {
            pageLoaded = true;
        }
        @JavascriptInterface
        public void visited(boolean isWebApp) {
            if (isWebApp) {
                prefsEdit.putBoolean("visited", true).apply();
            } else {
                prefsEdit.putBoolean("clientVisited", true).apply();
            }
        }
        boolean dataEvictionChannelIsAdded = false;
        @JavascriptInterface
        public void notifyDataEviction() {
            if (ActivityCompat.checkSelfPermission(MainActivity.this.getApplicationContext(), android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                final String DATA_EVICTION_CHANNEL = "data_eviction_channel";
                final int NOTIFICATION_DATA_EVICTION = 993;
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
        @RequiresApi(api = Build.VERSION_CODES.R)
        @JavascriptInterface
        public void exportJSON(String chunk, int status, String fileName){
            if(status==0) {
                if (writer!=null) {
                    try {
                        writer.close();
                        writer = null;
                    } catch (Exception ignored) {}
                }
                if (!Environment.isExternalStorageManager()) {
                    showDialog(new AlertDialog.Builder(MainActivity.this)
                            .setTitle("Permission for external storage")
                            .setMessage("Allow permission for Kanshi. to use the export feature.")
                            .setPositiveButton("OK", (dialogInterface, i) -> {
                                Uri uri = Uri.parse("package:${BuildConfig.APPLICATION_ID}");
                                showToast(Toast.makeText(getApplicationContext(), "Allow permission for Kanshi. in here to use the export feature.", Toast.LENGTH_LONG));
                                startActivity(new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, uri));
                            })
                            .setNegativeButton("CANCEL", null),true);
                } else {
                    if (new File(exportPath).isDirectory()) {
                        directoryPath = exportPath + File.separator;
                        File directory = new File(directoryPath);
                        boolean dirIsCreated;
                        if (!directory.exists()) {
                            dirIsCreated = directory.mkdirs();
                        } else {
                            dirIsCreated = true;
                        }
                        if (directory.isDirectory() && dirIsCreated) {
                            try {
                                tempFile = new File(directoryPath + "tmp.json");
                                boolean tempFileIsDeleted;
                                if (tempFile.exists()) {
                                    tempFileIsDeleted = tempFile.delete();
                                    //noinspection ResultOfMethodCallIgnored
                                    tempFile.createNewFile();
                                } else {
                                    tempFileIsDeleted = true;
                                    //noinspection ResultOfMethodCallIgnored
                                    tempFile.createNewFile();
                                }
                                if (tempFileIsDeleted) {
                                    writer = new BufferedWriter(new FileWriter(tempFile, true));
                                } else {
                                    if (writer!=null) {
                                        try {
                                            writer.close();
                                            writer = null;
                                        } catch (Exception ignored) {}
                                    }
                                    isExported(false);
                                    showToast(Toast.makeText(getApplicationContext(), "Error: Temporary data can't be re-written, please delete tmp.json first in the selected directory.", Toast.LENGTH_LONG));
                                }
                            } catch (Exception e) {
                                if(writer!=null){
                                    try {
                                        writer.close();
                                        writer = null;
                                    } catch (Exception e2) {
                                        e.printStackTrace();
                                    }
                                }
                                isExported(false);
                                showToast(Toast.makeText(getApplicationContext(), "Error: An exception occurred initializing the tmp.json file.", Toast.LENGTH_LONG));
                                e.printStackTrace();
                            }
                        } else if (!dirIsCreated) {
                            showToast(Toast.makeText(getApplicationContext(), "Error: Folder directory can't be found, please create it first.", Toast.LENGTH_LONG));
                        }
                    } else if (!Objects.equals(exportPath, "") && !new File(exportPath).isDirectory()) {
                        String[] tempExportPath = exportPath.split("/");
                        String tempPathName = tempExportPath.length > 1 ?
                                tempExportPath[tempExportPath.length - 2] + "/" +
                                        tempExportPath[tempExportPath.length - 1]
                                : tempExportPath[tempExportPath.length - 1];
                        showDialog(new AlertDialog.Builder(MainActivity.this)
                                .setTitle("Export folder is missing")
                                .setMessage("Folder directory [" + tempPathName
                                        + "] is missing, please choose another folder for exporting.")
                                .setPositiveButton("Choose a Folder", (dialogInterface, x) -> {
                                    Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
                                            .addCategory(Intent.CATEGORY_DEFAULT);
                                    chooseExportFile.launch(i);
                                    showToast(Toast.makeText(getApplicationContext(), "Select or create a directory.", Toast.LENGTH_LONG));
                                })
                                .setNegativeButton("CANCEL", null),true);
                    } else {
                        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
                                .addCategory(Intent.CATEGORY_DEFAULT);
                        chooseExportFile.launch(i);
                        showToast(Toast.makeText(getApplicationContext(), "Select or create a directory.", Toast.LENGTH_LONG));
                    }
                }
            } else if(status==1&&writer!=null) {
                try{
                    writer.write(chunk);
                } catch (Exception e) {
                    try {
                        writer.close();
                        writer = null;
                    } catch (Exception e2) {
                        e.printStackTrace();
                    }
                    isExported(false);
                    showToast(Toast.makeText(getApplicationContext(), "Error: An exception occurred while writing to tmp.json file.", Toast.LENGTH_LONG));
                    e.printStackTrace();
                }
            } else if(status==2&&writer!=null){
                try {
                    writer.write(chunk);
                    writer.close();
                    writer = null;
                    int lastStringLen = Math.min(chunk.length(), 3);
                    String lastNCharacters = new String(new char[lastStringLen]).replace("\0", "}");
                    if (chunk.endsWith(lastNCharacters)) {
                        boolean fileIsDeleted;
                        File file = new File(directoryPath + fileName);
                        if (file.exists()) {
                            fileIsDeleted = file.delete();
                            //noinspection ResultOfMethodCallIgnored
                            file.createNewFile();
                        } else {
                            //noinspection ResultOfMethodCallIgnored
                            file.createNewFile();
                            fileIsDeleted = true;
                        }
                        if (fileIsDeleted) {
                            if (tempFile != null && tempFile.exists()) {
                                if (tempFile.renameTo(file)) {
                                    isExported(true);
                                    File $tempFile = new File(directoryPath + "pb.tmp.json");
                                    //noinspection ResultOfMethodCallIgnored
                                    $tempFile.delete();
                                } else {
                                    isExported(false);
                                    showToast(Toast.makeText(getApplicationContext(), "An exception occurred in finalizing the exported file, your back-up was saved in tmp.json but is not guaranteed to work.", Toast.LENGTH_LONG));
                                    //noinspection ResultOfMethodCallIgnored
                                    file.delete();
                                    //noinspection ResultOfMethodCallIgnored
                                    tempFile.delete();
                                }
                            } else {
                                isExported(false);
                                showToast(Toast.makeText(getApplicationContext(), "An exception occurred in finalizing the exported file, your back-up was saved in tmp.json but is not guaranteed to work.", Toast.LENGTH_LONG));
                                //noinspection ResultOfMethodCallIgnored
                                file.delete();
                            }
                        } else {
                            isExported(false);
                            showToast(Toast.makeText(getApplicationContext(), "An exception occurred in finalizing the exported file, your back-up was saved in tmp.json but is not guaranteed to work.", Toast.LENGTH_LONG));
                        }
                    } else {
                        isExported(false);
                        showToast(Toast.makeText(getApplicationContext(), "An exception occurred in finalizing the exported file, your back-up was saved in tmp.json but is not guaranteed to work.", Toast.LENGTH_LONG));
                    }
                } catch (Exception e) {
                    try {
                        if (writer!=null) {
                            writer.close();
                            writer = null;
                        }
                    } catch (Exception e2) {
                        e.printStackTrace();
                    }
                    isExported(false);
                    showToast(Toast.makeText(getApplicationContext(), "An exception occurred in finalizing the exported file, your back-up was saved in tmp.json but is not guaranteed to work.", Toast.LENGTH_LONG));
                    e.printStackTrace();
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
                            .setTitle("Permission for external storage")
                            .setMessage("Allow permission for Kanshi. to use the export feature.")
                            .setPositiveButton("OK", (dialogInterface, i) -> {
                                Uri uri = Uri.fromParts("package", getPackageName(), null);
                                showToast(Toast.makeText(getApplicationContext(), "Allow permission for Kanshi. in here to use the export feature.", Toast.LENGTH_LONG));
                                startActivity(new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, uri));
                            })
                            .setNegativeButton("CANCEL", null),true);
                } else {
                    Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
                            .addCategory(Intent.CATEGORY_DEFAULT);
                    chooseExportFile.launch(i);
                    showToast(Toast.makeText(getApplicationContext(), "Select or create a directory.", Toast.LENGTH_LONG));
                }
            }
        }
        public boolean connectionChecking = false;
        @RequiresApi(api = Build.VERSION_CODES.N)
        @JavascriptInterface
        public void switchApp() {
            try {
                webView.post(() -> {
                    if (webView.getUrl()==null) return;
                    if (webView.getUrl().startsWith("https://u-kuro.github.io/Kanshi-Anime-Recommender")) {
                        showDialog(new AlertDialog.Builder(MainActivity.this)
                                .setTitle("Switch app mode")
                                .setMessage("Do you want to switch to the client app?")
                                .setPositiveButton("OK", (dialogInterface, i) -> {
                                    appSwitched = true;
                                    pageLoaded = true;
                                    webView.loadUrl("file:///android_asset/www/index.html");
                                })
                                .setNegativeButton("CANCEL", null),true);
                    } else {
                        showToast(Toast.makeText(getApplicationContext(), "Connecting...", Toast.LENGTH_LONG));
                        if (connectionChecking) return;
                        connectionChecking = true;
                        isAppConnectionAvailable(isConnected -> webView.post(() -> {
                            hideToast();
                            connectionChecking = false;
                            if (isConnected) {
                                showDialog(new AlertDialog.Builder(MainActivity.this)
                                        .setTitle("Switch app mode")
                                        .setMessage("Do you want to switch to the web app?")
                                        .setPositiveButton("OK", (dialogInterface, i) -> {
                                            appSwitched = true;
                                            pageLoaded = false;
                                            webView.loadUrl("https://u-kuro.github.io/Kanshi-Anime-Recommender/");
                                        })
                                        .setNegativeButton("CANCEL", null),true);
                            } else {
                                showDialog(new AlertDialog.Builder(MainActivity.this)
                                        .setTitle("Switch app mode")
                                        .setMessage("Connection unreachable, can't switch at this moment.")
                                        .setPositiveButton("OK", null),true);
                            }
                        }), 3000);
                    }
                });
            } catch (Exception exception) {
                connectionChecking = false;
                showDialog(new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Switch app mode")
                        .setMessage("Something went wrong, app switch is currently not working.")
                        .setPositiveButton("OK", null),true);
            }
        }

        @RequiresApi(api = Build.VERSION_CODES.N)
        @JavascriptInterface
        public void isOnline(boolean isOnline) {
            try {
                if (isOnline) {
                    isAppConnectionAvailable(isConnected -> webView.post(() -> {
                        if (webView.getUrl() == null) return;
                        if (isConnected && webView.getUrl().startsWith("file:///android_asset/www/index.html")) {
                            showDialog(new AlertDialog.Builder(MainActivity.this)
                                    .setTitle("Reconnected successfully")
                                    .setMessage("Do you want to switch to the web app?")
                                    .setPositiveButton("OK", (dialogInterface, i) -> {
                                        appSwitched = true;
                                        pageLoaded = false;
                                        webView.loadUrl("https://u-kuro.github.io/Kanshi-Anime-Recommender/");
                                    })
                                    .setNegativeButton("CANCEL", null),true);
                        } else if (isConnected) {
                            showToast(Toast.makeText(getApplicationContext(), "Your internet has been restored.", Toast.LENGTH_LONG));
                        }
                    }), 999999999);
                } else {
                    showToast(Toast.makeText(getApplicationContext(), "You are currently offline.", Toast.LENGTH_LONG));
                }
            } catch (Exception ignored) {}
        }
        @RequiresApi(api = Build.VERSION_CODES.O)
        @JavascriptInterface
        public void checkAppID(int _appID, boolean manualCheck) {
            if (_appID > appID) {
                showUpdateNotice();
            } else if (manualCheck) {
                showToast(Toast.makeText(getApplicationContext(), "No recent application updates.", Toast.LENGTH_LONG));
            }
        }
        @JavascriptInterface
        public void refreshWeb(){
            Intent intent = new Intent(getApplicationContext(), MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(intent);
            finish();
        }
        @JavascriptInterface
        public void clearCache(){
            prefsEdit.putBoolean("permissionIsAsked", false).apply();
            webView.post(() -> webView.clearCache(true));
            Intent intent = new Intent(getApplicationContext(), MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(intent);
            finish();
        }
        @RequiresApi(api = Build.VERSION_CODES.O)
        @JavascriptInterface
        public void downloadUpdate() { checkUpdate(); }
        final long DAY_IN_MILLIS = TimeUnit.DAYS.toMillis(1);
        @JavascriptInterface
        public void addAnimeReleaseNotification(long animeId, String title, long releaseEpisode, long maxEpisode, long releaseDateMillis, String imageUrl, String animeUrl, String userStatus, long episodeProgress) {
            if (releaseDateMillis >= (System.currentTimeMillis() - DAY_IN_MILLIS)) {
                AnimeNotificationManager.scheduleAnimeNotification(MainActivity.this, animeId, title, releaseEpisode, maxEpisode, releaseDateMillis, imageUrl, animeUrl, userStatus, episodeProgress);
            }
        }
        @JavascriptInterface
        public void callUpdateNotifications() {
            updateCurrentNotifications();
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
                if (AnimeNotificationManager.allAnimeNotification.size()==0) {
                    try {
                        @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(MainActivity.this, "allAnimeNotification");
                        if ($allAnimeNotification != null && $allAnimeNotification.size() > 0) {
                            AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
                        }
                    } catch (Exception ignored) {}
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
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                    if (updateNotificationsFutures.isEmpty()) {
                        SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
                        if (schedulesTabFragment!=null) {
                            new Handler(Looper.getMainLooper()).post(schedulesTabFragment::updateScheduledAnime);
                        }
                        ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();
                        if (releasedTabFragment!=null) {
                            new Handler(Looper.getMainLooper()).post(releasedTabFragment::updateReleasedAnime);
                        }
                    }
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
            webView.post(() -> {
                String url = webView.getUrl();
                if (url != null && url.startsWith("https://u-kuro.github.io/Kanshi-Anime-Recommender")) {
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
            });
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
                    if (url.startsWith("file")) {
                        prefsEdit.putBoolean("clientVisited", false).apply();
                    } else {
                        prefsEdit.putBoolean("visited", false).apply();
                    }
                }
            }))
            .setNegativeButton("CANCEL", ((dialogInterface, i) -> webView.post(() -> {
                String url = webView.getUrl();
                if (url != null) {
                    if (url.startsWith("file")) {
                        prefsEdit.putBoolean("clientVisited", false).apply();
                    } else {
                        prefsEdit.putBoolean("visited", false).apply();
                    }
                }
            })))
        ,false));
    }
    public void reloadWeb() {
        webView.post(()->webView.reload());
    }
    public void setBackgroundUpdates() {
        final int UPDATE_DATA_PENDING_INTENT = 994;
        Intent newIntent = new Intent(this.getApplicationContext(), MyReceiver.class);
        newIntent.setAction("UPDATE_DATA_MANUAL");

        PendingIntent newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), UPDATE_DATA_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarmManager = (AlarmManager) this.getApplicationContext().getSystemService(Context.ALARM_SERVICE);
        // Cancel Old
        newPendingIntent.cancel();
        alarmManager.cancel(newPendingIntent);
        // Create New
        long currentTime = System.currentTimeMillis();
        long backgroundUpdateTime = prefs.getLong("lastBackgroundUpdateTime",currentTime+1);
        newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), UPDATE_DATA_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (backgroundUpdateTime <= currentTime) {
            long ONE_HOUR_IN_MILLIS = TimeUnit.HOURS.toMillis(1);
            backgroundUpdateTime = backgroundUpdateTime + ONE_HOUR_IN_MILLIS;
        }
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
    public void changeKeepAppRunningInBackground(boolean enable) {
        keepAppRunningInBackground = enable;
        prefsEdit.putBoolean("keepAppRunningInBackground", keepAppRunningInBackground).commit();
        webView.post(()->webView.loadUrl("javascript:window?.setKeepAppRunningInBackground?.("+(keepAppRunningInBackground?"true":"false")+")"));
    }
    private final ExecutorService updateCurrentNotificationsExecutorService = Executors.newFixedThreadPool(1);
    private Future<?> updateCurrentNotificationsFuture;
    public void updateCurrentNotifications() {
        if (updateCurrentNotificationsFuture != null && !updateCurrentNotificationsFuture.isCancelled()) {
            updateCurrentNotificationsFuture.cancel(true);
        }
        updateCurrentNotificationsFuture = updateCurrentNotificationsExecutorService.submit(() -> {
            if (AnimeNotificationManager.allAnimeNotification.size()==0) {
                try {
                    @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(MainActivity.this, "allAnimeNotification");
                    if ($allAnimeNotification != null && $allAnimeNotification.size() > 0) {
                        AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
                    }
                } catch (Exception ignored) {}
            }
            Set<String> animeIdsToBeUpdated = new HashSet<>();
            List<AnimeNotification> allAnimeNotificationValues = new ArrayList<>(AnimeNotificationManager.allAnimeNotification.values());
            for (AnimeNotification anime : allAnimeNotificationValues) {
                animeIdsToBeUpdated.add(String.valueOf(anime.animeId));
            }
            String joinedAnimeIds = String.join(",", animeIdsToBeUpdated);
            webView.post(() -> webView.loadUrl("javascript:window?.updateNotifications?.(["+joinedAnimeIds+"])"));
        });
    }

    @RequiresApi(api = Build.VERSION_CODES.O)
    public void showUpdateNotice() {
        showDialog(new AlertDialog.Builder(MainActivity.this)
            .setTitle("New updates are available")
            .setMessage("You may want to download the new version.")
            .setPositiveButton("DOWNLOAD", (dialogInterface, i) -> checkUpdate())
            .setNegativeButton("LATER", null),true);
    }
    @RequiresApi(api = Build.VERSION_CODES.O)
    public void checkUpdate() {
        boolean hasPermission = getPackageManager().canRequestPackageInstalls();
        if (hasPermission) {
            _downloadUpdate();
        } else {
            showDialog(new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Permission for in-app installation")
                    .setMessage("Allow permission for Kanshi. to update within the app.")
                    .setPositiveButton("OK", (dialogInterface, i) -> {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.fromParts("package", getPackageName(), null));
                        showToast(Toast.makeText(getApplicationContext(), "Allow permission for Kanshi. in here to update within the app.", Toast.LENGTH_LONG));
                        allowApplicationUpdate.launch(intent);
                    })
                    .setNegativeButton("CANCEL", null),true);
        }
    }
    public void _downloadUpdate() {
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
                        .setTitle("Update ready to install")
                        .setMessage("Do you want to continue the installation?")
                        .setPositiveButton("OK", (dialogInterface, i) -> {
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
                                    showToast(Toast.makeText(MainActivity.this, "No application available to open the APK file", Toast.LENGTH_LONG));
                                }
                            } else {
                                showToast(Toast.makeText(MainActivity.this, "File is not found", Toast.LENGTH_LONG));
                            }
                        })
                        .setNegativeButton("CANCEL", (dialogInterface, i) -> showToast(Toast.makeText(getApplicationContext(), "You may still manually install the update, apk is in your download folder.", Toast.LENGTH_LONG))).setCancelable(false),true);
                }
            }
            @Override
            public void onDownloadFailed() {
                showDialog(new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Download failed")
                    .setMessage("Do you want to re-download?")
                    .setPositiveButton("OK", (dialogInterface, i) -> _downloadUpdate())
                    .setNegativeButton("CANCEL", null),true);
            }
        });
    }

    public void isExported(boolean success) {
        if (success) {
            webView.post(() -> webView.loadUrl("javascript:window?.isExported?.(true)"));
        } else {
            webView.post(() -> webView.loadUrl("javascript:window?.isExported?.(false)"));
            showDialog(new AlertDialog.Builder(MainActivity.this)
                .setTitle("Export failed")
                .setMessage("Data was not exported, please try again.")
                .setPositiveButton("OK", (dialogInterface, i) -> webView.post(() -> webView.loadUrl("javascript:window?.runExport?.()")))
                .setNegativeButton("CANCEL", null),true);
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    public void reconnectLonger() {
        showToast(Toast.makeText(getApplicationContext(), "Connecting...", Toast.LENGTH_LONG));
        isAppConnectionAvailable(isConnected -> webView.post(() -> {
            hideToast();
            if (isConnected) {
                showDialog(new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Connected successfully")
                        .setMessage("Connection established, do you want to switch to the web app?")
                        .setPositiveButton("OK", (dialogInterface, i) ->  {
                            String previousUrl = webView.getUrl();
                            if (previousUrl == null || previousUrl.startsWith("file:///android_asset/www/index.html")) {
                                appSwitched = true;
                            }
                            pageLoaded = false;
                            webView.loadUrl("https://u-kuro.github.io/Kanshi-Anime-Recommender/");
                        })
                        .setNegativeButton("CANCEL", null), true);
            } else {
                showDialog(new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Connection unreachable")
                        .setMessage("Connection unreachable, do you want to connect indefinitely?")
                        .setPositiveButton("OK", ((dialog, i) -> reconnectLonger()))
                        .setNegativeButton("CANCEL", null), true
                );
            }
        }),999999999);
    }

    public void checkEntries() {
        try {
            webView.post(() -> webView.loadUrl("javascript:window?.checkEntries?.();"));
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

    @RequiresApi(api = Build.VERSION_CODES.N)
    private void isAppConnectionAvailable(ConnectivityCallback callback, int timeout) {
        ConnectivityManager connectivityManager =
                (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        Network network = connectivityManager.getActiveNetwork();
        if (network == null) {
            callback.onConnectionResult(false);
            return;
        }
        CompletableFuture.supplyAsync(() -> checkAppConnection(timeout))
                .thenAccept(callback::onConnectionResult);
    }

    final ExecutorService executor = Executors.newFixedThreadPool(1);
    private boolean checkAppConnection(int timeout) {
        Future<Boolean> future = executor.submit(() -> {
            try {
                URL url = new URL("https://u-kuro.github.io/Kanshi-Anime-Recommender/");
                HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
                urlConnection.setRequestMethod("HEAD");
                urlConnection.setConnectTimeout(timeout);
                urlConnection.setReadTimeout(timeout);
                int responseCode = urlConnection.getResponseCode();
                urlConnection.disconnect();
                return responseCode == HttpURLConnection.HTTP_OK;
            } catch (IOException e) {
                e.printStackTrace();
                return false;
            }
        });
        try {
            return future.get(timeout, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    interface ConnectivityCallback {
        void onConnectionResult(boolean isConnected);
    }
}

