package com.example.kanshi;

import static com.example.kanshi.LocalPersistence.getLockForFileName;

import android.animation.ObjectAnimator;
import android.annotation.SuppressLint;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import java.io.File;
import java.util.concurrent.locks.ReentrantLock;

public class YoutubeViewActivity extends AppCompatActivity {
    private MediaWebView mediaWebView;
    private TextView siteName;
    private boolean webViewIsLoaded = false;
    private ValueCallback<Uri[]> mUploadMessage;
    private final CustomTabsHelper customTabsIntent = CustomTabsHelper.getInstance();
    private boolean isFinished = false;
    private boolean isInitialYTVActivity = false;
    private boolean isActivityPaused = false;
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
    String passedUrl;
    @SuppressLint({"SetJavaScriptEnabled", "RestrictedApi", "ClickableViewAccessibility"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Log Errors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Thread.setDefaultUncaughtExceptionHandler((thread, e) -> Utils.handleUncaughtException(YoutubeViewActivity.this.getApplicationContext(), e, "YoutubeViewActivity"));
        }

        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_web);
        // Init Global Variables
        mediaWebView = findViewById(R.id.mediaWebView);
        siteName = findViewById(R.id.site);
        isInitialYTVActivity = getIntent().getBooleanExtra("fromMainActivity", false);

        passedUrl = getIntent().getStringExtra("url");

        ImageView launchUrl = findViewById(R.id.launchURL);
        ImageView close = findViewById(R.id.close_youtube);
        ProgressBar progressbar = findViewById(R.id.progressbar);

        // Show status bar
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            final WindowInsetsController insetsController = getWindow().getInsetsController();
            if (insetsController != null) {
                insetsController.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        }
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().getDecorView().setBackgroundColor(Color.BLACK);

        launchUrl.setOnClickListener(v -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(mediaWebView.getUrl()));
                startActivity(intent);
            } catch (Exception ignored) {
                Toast.makeText(getApplicationContext(), "Can't open the link", Toast.LENGTH_LONG).show();
            }
        });

        // Set click listeners for the custom ActionBar buttons
        close.setOnClickListener(v -> {
            destroyWebView();
            Intent i = new Intent(this, MainActivity.class);
            i.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            finish();
            overridePendingTransition(R.anim.none, R.anim.fade_out);
            startActivity(i);
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (mediaWebView.canGoBack()) {
                    mediaWebView.goBack();
                } else {
                    isFinished = true;
                    destroyWebView();
                    if (isInitialYTVActivity) {
                        Intent i = new Intent(YoutubeViewActivity.this, MainActivity.class);
                        i.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                        finish();
                        overridePendingTransition(R.anim.none, R.anim.fade_out);
                        startActivity(i);
                    } else {
                        finish();
                        overridePendingTransition(R.anim.none, R.anim.fade_out);
                    }
                }
            }
        });

        siteName.setOnLongClickListener(view -> {
            String text = mediaWebView.getUrl();
            if (text != null && !text.isEmpty()) {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                ClipData clip = ClipData.newPlainText("Copied Text", text);
                clipboard.setPrimaryClip(clip);
                return true;
            }
            return false;
        });

        progressbar.setMax((int) Math.pow(10,6));
        // Orientation
        recheckStatusBar();

        mediaWebView.setWebChromeClient(new WebChromeClient() {
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
                } catch (Exception ignored) {
                    i = new Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("*/*");
                    chooseImportFile.launch(i);
                }
                return true;
            }
            public void onProgressChanged(WebView view, int progress) {
                super.onProgressChanged(view, progress);
                int newProgress = (int) Math.pow(10,4) * progress;
                ObjectAnimator.ofInt(progressbar, "progress", newProgress)
                        .setDuration(300)
                        .start();
                if (progress==100) {
                    initAnchor(view);
                    ObjectAnimator animator = ObjectAnimator.ofInt(progressbar, "progress", 0);
                    animator.setDuration(0);
                    animator.setStartDelay(300);
                    animator.start();
                }
            }
            // Fullscreen
            View fullscreen = null;
            @Override
            public void onHideCustomView() {
                if (fullscreen != null) {
                    fullscreen.setVisibility(View.GONE);
                }
                recheckStatusBar();
                if (mediaWebView != null) {
                    mediaWebView.setVisibility(View.VISIBLE);
                }
            }
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (mediaWebView == null) return;
                FrameLayout decorView = (FrameLayout) getWindow().getDecorView();
                if (fullscreen != null) {
                    decorView.removeView(fullscreen);
                }
                fullscreen = view;
                decorView.addView(fullscreen, new FrameLayout.LayoutParams(-1, -1));
                mediaWebView.setVisibility(View.GONE);
                hideStatusBar();
                fullscreen.setVisibility(View.VISIBLE);
            }
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                String message = consoleMessage.message();
                Log.d("WebConsole",message);
                return true;
            }
        });

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            mediaWebView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
        }
        // Set WebView Settings
        WebSettings webSettings = mediaWebView.getSettings();
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
        webSettings.setMediaPlaybackRequiresUserGesture(true);
        webSettings.setDefaultFontSize(16);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            webSettings.setAlgorithmicDarkeningAllowed(true);
        }
        // Set WebView Configs
        mediaWebView.setVerticalScrollBarEnabled(false);
        mediaWebView.setHorizontalScrollBarEnabled(false);
        mediaWebView.setScrollBarStyle(View.SCROLLBARS_OUTSIDE_OVERLAY);
        mediaWebView.setLongClickable(true);
        mediaWebView.setKeepScreenOn(true);
        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
        mediaWebView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        mediaWebView.setWebViewClient(new WebViewClient(){
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                webViewIsLoaded = false;
                super.onPageStarted(view, url, favicon);
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(view,true);
                CookieManager.getInstance().acceptCookie();
                CookieManager.getInstance().flush();
                if ("Web page not available".equals(view.getTitle())) {
                    siteName.setText(view.getTitle());
                    if (view.canGoBack()) {
                        view.goBack();
                    } else {
                        isFinished = true;
                        view.destroy();
                        finish();
                        Toast.makeText(getApplicationContext(), "Failed to load", Toast.LENGTH_LONG).show();
                    }
                } else {
                    siteName.setText(R.string.youtube);
                }
                if (!webViewIsLoaded && !isFinished) {
                    webViewIsLoaded = true;
                }
                super.onPageFinished(view, url);
                initAnchor(view);
                unMuteVideo(view);
            }
            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                super.doUpdateVisitedHistory(view, url, isReload);
                initAnchor(view);
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (isActivityPaused) return true;
                String url = request.getUrl().toString();
                boolean isRedirect = Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && request.isRedirect();
                if (
                    // Should Load In Another App
                    !url.startsWith("http")
                    || url.startsWith("https://www.twitter.com")
                    || url.startsWith("https://m.twitter.com")
                    || url.startsWith("https://twitter.com")
                    || url.startsWith("http://www.twitter.com")
                    || url.startsWith("http://m.twitter.com")
                    || url.startsWith("http://twitter.com")
                    || url.startsWith("https://www.reddit.com")
                    || url.startsWith("https://m.reddit.com")
                    || url.startsWith("https://reddit.com")
                    || url.startsWith("http://www.reddit.com")
                    || url.startsWith("http://m.reddit.com")
                    || url.startsWith("http://reddit.com")
                    || url.startsWith("https://www.facebook.com")
                    || url.startsWith("https://m.facebook.com")
                    || url.startsWith("https://facebook.com")
                    || url.startsWith("http://www.facebook.com")
                    || url.startsWith("http://m.facebook.com")
                    || url.startsWith("http://facebook.com")
                    || url.startsWith("https://wa.me")
                ) {
                    try {
                        if (url.startsWith("intent://")) {
                            try {
                                customTabsIntent.launchUrl(
                                    YoutubeViewActivity.this,
                                    Uri.parse("https://" + url.substring(9)),
                                    Color.BLACK,
                                    true
                                );
                            } catch (Exception ignored) {
                                customTabsIntent.launchUrl(
                                    YoutubeViewActivity.this,
                                    request.getUrl(),
                                    Color.BLACK,
                                    true
                                );
                            }
                        } else {
                            customTabsIntent.launchUrl(
                                YoutubeViewActivity.this,
                                request.getUrl(),
                                Color.BLACK,
                                true
                            );
                        }
                        overridePendingTransition(R.anim.fade_in, R.anim.remove);
                    } catch (Exception ignored) {
                        Toast.makeText(getApplicationContext(), "Can't open the link", Toast.LENGTH_LONG).show();
                    }
                } else if (
                    // Should Load In Current WebView
                    !webViewIsLoaded // Initial URL
                    // Youtube Settings
                    || url.startsWith("https://www.youtube.com/select_site")
                    || url.startsWith("https://m.youtube.com/select_site")
                    || url.startsWith("https://youtube.com/select_site")
                    || url.startsWith("https://www.youtu.be/select_site")
                    || url.startsWith("https://m.youtu.be/select_site")
                    || url.startsWith("https://youtu.be/select_site")
                    || url.startsWith("http://www.youtube.com/select_site")
                    || url.startsWith("http://m.youtube.com/select_site")
                    || url.startsWith("http://youtube.com/select_site")
                    || url.startsWith("http://www.youtu.be/select_site")
                    || url.startsWith("http://m.youtu.be/select_site")
                    || url.startsWith("http://youtu.be/select_site")
                ) {
                    return false;
                } else if (
                    // Is YouTube Redirect
                    url.startsWith("https://www.youtube.com/redirect")
                    || url.startsWith("https://m.youtube.com/redirect")
                    || url.startsWith("https://youtube.com/redirect")
                    || url.startsWith("https://www.youtu.be/redirect")
                    || url.startsWith("https://m.youtu.be/redirect")
                    || url.startsWith("https://youtu.be/redirect")
                    || url.startsWith("http://www.youtube.com/redirect")
                    || url.startsWith("http://m.youtube.com/redirect")
                    || url.startsWith("http://youtube.com/redirect")
                    || url.startsWith("http://www.youtu.be/redirect")
                    || url.startsWith("http://m.youtu.be/redirect")
                    || url.startsWith("http://youtu.be/redirect")
                ) {
                    String urlToRedirect = request.getUrl().getQueryParameter("q");
                    if (urlToRedirect != null && !urlToRedirect.isEmpty()) {
                        try {
                            customTabsIntent.launchUrl(
                                YoutubeViewActivity.this,
                                Uri.parse(urlToRedirect),
                                Color.BLACK,
                                false
                            );
                            overridePendingTransition(R.anim.fade_in, R.anim.remove);
                        } catch (Exception ignored) {
                            Toast.makeText(getApplicationContext(), "Can't open the link", Toast.LENGTH_LONG).show();
                        }
                    } else {
                        Toast.makeText(getApplicationContext(), "Can't open the link", Toast.LENGTH_LONG).show();
                    }
                } else if (
                    // Is Another YouTube Link
                    url.startsWith("https://www.youtube.com")
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
                    Intent intent = new Intent(YoutubeViewActivity.this, YoutubeViewActivity.class);
                    intent.putExtra("url", url);
                    startActivity(intent);
                    overridePendingTransition(R.anim.fade_in, R.anim.none);
                    return true;
                } else {
                    return false;
                }
                // Unknown redirect
                return !isRedirect;
            }
        });

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(mediaWebView,true);
        CookieManager.getInstance().acceptCookie();
        CookieManager.getInstance().flush();

        if (passedUrl != null) {
            mediaWebView.loadUrl(passedUrl);
        }
    }

    @Override
    protected void onResume() {
        isActivityPaused = false;
        if (webViewIsLoaded) {
            overridePendingTransition(R.anim.none, R.anim.fade_out);
        }
        super.onResume();
        resumeWebView();
    }

    @Override
    protected void onPause() {
        isActivityPaused = true;
        pauseWebView();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        destroyWebView();
        super.onDestroy();
    }

    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        recheckStatusBar();
    }
    public void destroyWebView() {
        if (mediaWebView != null) {
            mediaWebView.pause();
            mediaWebView.destroy();
        }
    }
    public void pauseWebView() {
        if (mediaWebView != null) {
            autoPlayVideo(mediaWebView);
            mediaWebView.pause();
        }
    }
    public void resumeWebView() {
        if (mediaWebView !=null) {
            mediaWebView.resume();
        }
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
    public void initAnchor(WebView view) {
        ((MediaWebView) view).loadJSFileAsset("initAnchor.js");
    }
    public void autoPlayVideo(WebView view) {
        ((MediaWebView) view).loadJSFileAsset("autoPlayVideo.js");
    }
    public void unMuteVideo(WebView view) {
        ((MediaWebView) view).loadJSFileAsset("unMuteVideo.js");
    }
}