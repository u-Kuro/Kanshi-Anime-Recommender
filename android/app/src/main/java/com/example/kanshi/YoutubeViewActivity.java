package com.example.kanshi;

import android.animation.ObjectAnimator;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsIntent;

public class YoutubeViewActivity extends AppCompatActivity {
    private MediaWebView webView;
    private TextView siteName;
    LinearLayout webViewCover;
    private boolean webViewIsLoaded = false;
    private boolean webViewFailedToLoad = false;
    private ValueCallback<Uri[]> mUploadMessage;
    private boolean isFinished = false;
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

    @SuppressLint({"SetJavaScriptEnabled", "RestrictedApi", "ClickableViewAccessibility"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        String passedUrl = getIntent().getStringExtra("url");
        // Show status bar
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().getDecorView().setBackgroundColor(Color.BLACK);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_web);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        // Set click listeners for the custom ActionBar buttons
        View btnClose = findViewById(R.id.btnClose);
        btnClose.setClickable(true);
        btnClose.setOnClickListener(v -> {
            Intent i = new Intent(this, MainActivity.class);
            i.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(i);
        });

        ImageView launchUrl = findViewById(R.id.launchURL);

        launchUrl.setOnClickListener(v -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(webView.getUrl()));
                startActivity(intent);
            } catch (Exception ignored) {
                Toast.makeText(getApplicationContext(), "Can't open the link.", Toast.LENGTH_LONG).show();
            }
        });

        // Add WebView on Layout
        webViewCover = findViewById(R.id.webViewCover);
        webView = findViewById(R.id.webView);
        siteName = findViewById(R.id.site);
        ProgressBar progressbar = findViewById(R.id.progressbar);
        progressbar.setMax((int) Math.pow(10,6));
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
                            .addCategory(Intent.CATEGORY_OPENABLE);// set MIME type to filter
                    chooseImportFile.launch(i);
                    return true;
                } catch (Exception e){
                    e.printStackTrace();
                    return true;
                }
            }
            public void onProgressChanged(WebView view, int progress) {
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
            @Override
            public Bitmap getDefaultVideoPoster(){
                if (mCustomView == null) {
                    return null;
                }
                return BitmapFactory.decodeResource(getApplicationContext().getResources(), 2130837573);
            }
            @Override
            public void onHideCustomView() {
                ((FrameLayout)getWindow().getDecorView()).removeView(this.mCustomView);
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
                ((FrameLayout)getWindow().getDecorView()).addView(this.mCustomView, new FrameLayout.LayoutParams(-1, -1));
                getWindow().getDecorView().setSystemUiVisibility(3846 | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
            }
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                String message = consoleMessage.message();
                Log.d("WebConsole",message);
                return true;
            }
        });
        webView.setBackgroundColor(Color.BLACK);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
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
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webSettings.setMediaPlaybackRequiresUserGesture(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            webSettings.setOffscreenPreRaster(true);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            webSettings.setAlgorithmicDarkeningAllowed(true);
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
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setWebViewClient(new WebViewClient(){
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                webViewIsLoaded = false;
                super.onPageStarted(view, url, favicon);
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                unMuteVideo(view);
                initAnchor(view);
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView,true);
                CookieManager.getInstance().acceptCookie();
                CookieManager.getInstance().flush();
                if ("Web page not available".equals(view.getTitle())) {
                    siteName.setText(view.getTitle());
                    webViewFailedToLoad = true;
                    webViewCover.setVisibility(View.VISIBLE);
                } else {
                    siteName.setText(R.string.youtube);
                    webViewFailedToLoad = false;
                    webViewCover.setVisibility(View.GONE);
                }
                if (!webViewIsLoaded && !isFinished) {
                    webViewIsLoaded = true;
                }
                super.onPageFinished(view, url);
            }
            @Nullable
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                initAnchor(view);
                return super.shouldInterceptRequest(view, request);
            }
            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                initAnchor(view);
                super.doUpdateVisitedHistory(view, url, isReload);
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
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
                                Toast.makeText(getApplicationContext(), "Can't open the link.", Toast.LENGTH_LONG).show();
                            }
                        }
                    } catch (Exception ignored) {
                        Toast.makeText(getApplicationContext(), "Can't open the link.", Toast.LENGTH_LONG).show();
                    }
                } else if (url.startsWith("https://www.youtube.com")
                        || url.startsWith("https://m.youtube.com")
                        || url.startsWith("https://youtu.be")
                        || url.startsWith("https://accounts.google.com")
                        || url.startsWith("https://accounts.youtube.com")
                ) {
                    if (webViewIsLoaded) {
                        Intent intent = new Intent(YoutubeViewActivity.this, YoutubeViewActivity.class);
                        intent.putExtra("url", url);
                        startActivity(intent);
                        overridePendingTransition(R.anim.right_to_center, R.anim.center_to_left);
                    } else {
                        return false;
                    }
                } else {
                    try {
                        CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                                .setDefaultColorSchemeParams(new CustomTabColorSchemeParams.Builder().setToolbarColor(Color.BLACK).build())
                                .setColorSchemeParams(CustomTabsIntent.COLOR_SCHEME_DARK, new CustomTabColorSchemeParams.Builder().setToolbarColor(Color.BLACK).build())
                                .setUrlBarHidingEnabled(true)
                                .setShowTitle(true)
                                .setCloseButtonPosition(CustomTabsIntent.CLOSE_BUTTON_POSITION_START)
                                .setCloseButtonIcon(BitmapFactory.decodeResource(YoutubeViewActivity.this.getResources(), R.drawable.xclose_white))
                                .setStartAnimations(YoutubeViewActivity.this, R.anim.right_to_center, R.anim.center_to_left)
                                .setExitAnimations(YoutubeViewActivity.this, R.anim.left_to_center, R.anim.center_to_right)
                                .build();
                        customTabsIntent.launchUrl(YoutubeViewActivity.this, Uri.parse(url));
                    } catch (Exception ex) {
                        Toast.makeText(getApplicationContext(), "Can't open the link.", Toast.LENGTH_LONG).show();
                    }
                    if (view.getUrl()==null || view.getUrl().startsWith("https://www.youtube.com/redirect")) {
                        onBackPressed();
                    }
                }
                return true;
            }
        });

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView,true);
        CookieManager.getInstance().acceptCookie();
        CookieManager.getInstance().flush();

        if (passedUrl != null) {
            webView.loadUrl(passedUrl);
        }
    }

    @Override
    protected void onResume() {
        if (MainActivity.getInstanceActivity()!=null) {
            MainActivity.getInstanceActivity().isInApp = true;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            webView.getSettings().setOffscreenPreRaster(true);
        }
        if (webViewIsLoaded) {
            overridePendingTransition(R.anim.left_to_center, R.anim.center_to_right);
        }
        webView.onResume();
        webView.resumeTimers();
        super.onResume();
    }

    @Override
    protected void onPause() {
        if (MainActivity.getInstanceActivity()!=null) {
            MainActivity.getInstanceActivity().isInApp = false;
        }
        autoPlayVideo(webView);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            webView.getSettings().setOffscreenPreRaster(false);
        }
        webView.onPause();
        webView.pauseTimers();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (MainActivity.getInstanceActivity()!=null) {
            MainActivity.getInstanceActivity().isInApp = false;
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
            isFinished = true;
            webView.onPause();
            webView.pauseTimers();
            if (!webViewFailedToLoad) {
                webView.loadUrl("");
            }
            webView.onPause();
            webView.pauseTimers();
            finish();
        }
    }

    public void initAnchor(WebView view) {
        String javascript = "javascript:(()=>{for(var e=document.querySelectorAll('a'),n=0;n<e.length;n++)e[n].setAttribute('rel','noopener noreferrer'),e[n].setAttribute('target','_blank');window.KanshiAnimeRecommendationObserver instanceof MutationObserver||(window.KanshiAnimeRecommendationObserver=new MutationObserver(e=>{e.forEach(function(e){if(e.addedNodes)for(var n=0;n<e.addedNodes.length;n++){var o=e.addedNodes[n];'A'===o.nodeName&&(o.setAttribute('rel','noopener noreferrer'),o.setAttribute('target','_blank'))}})})),!window.KanshiAnimeRecommendationObserverObserved&&window.KanshiAnimeRecommendationObserver instanceof MutationObserver&&document.body instanceof Node&&(window.KanshiAnimeRecommendationObserver.observe(document.body,{childList:!0,subtree:!0}),window.KanshiAnimeRecommendationObserverObserved=!0)})()";
        view.post(() -> view.loadUrl(javascript));
    }
    public void autoPlayVideo(WebView view) {
        String javascript = "javascript:(()=>{const e=document?.querySelector?.('video.html5-main-video');e instanceof Element&&!0!==e.autoplay&&(e.autoplay=!0)})()";
        view.post(() -> view.loadUrl(javascript));
    }
    public void unMuteVideo(WebView view) {
        String javascript = "javascript:(()=>{const e=document?.querySelector?.('video.html5-main-video'),t=e instanceof Element&&!1===e.paused;document?.querySelector?.('button.ytp-unmute')?.click?.();t&&e.paused&&e.play?.()})()";
        view.post(() -> view.loadUrl(javascript));
    }
}