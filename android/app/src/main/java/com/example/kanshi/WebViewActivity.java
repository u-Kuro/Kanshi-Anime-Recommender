package com.example.kanshi;

import android.annotation.SuppressLint;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.MenuItem;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import java.util.Objects;

public class WebViewActivity extends AppCompatActivity {
    TextView webTitle;
    MediaWebView webView;
    private boolean canStartNewActivity = false;
    private boolean webviewIsLoaded = false;
    private float toolBarTouchStartY;

    @RequiresApi(api = Build.VERSION_CODES.Q)
    @SuppressLint({"SetJavaScriptEnabled", "RestrictedApi", "ClickableViewAccessibility"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Show status bar
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().getDecorView().setBackgroundColor(Color.BLACK);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_web);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        ActionBar actionBar = getSupportActionBar();

        webTitle = findViewById(R.id.site);

        // Set click listeners for the custom ActionBar buttons
        View btnClose = findViewById(R.id.btnClose);
        btnClose.setClickable(true);
        btnClose.setOnClickListener(v -> {
            Intent i = new Intent(this, MainActivity.class);
            i.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(i);
        });

        @SuppressLint("CutPasteId") TextView siteName = findViewById(R.id.site);
        siteName.setOnLongClickListener(v -> {
            String siteUrl = webView.getUrl();
            if (siteUrl!=null && siteUrl.length()>0) {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                ClipData clip = ClipData.newPlainText("Copied Text", siteUrl);
                clipboard.setPrimaryClip(clip);
            }
            return true;
        });

        ImageView dropdownMenu = findViewById(R.id.launchURL);

        dropdownMenu.setOnClickListener(v -> {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(webView.getUrl()));
            startActivity(intent);
        });
        // Add WebView on Layout
        webView = findViewById(R.id.webView);
        toolbar.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    toolBarTouchStartY = event.getRawY();
                    break;
                case MotionEvent.ACTION_UP:
                    float endY = event.getRawY();
                    if (endY - toolBarTouchStartY < 0) {
                        webView.hideActionBar();
                    }
                    break;
            }
            return true;
        });
        webView.setMediaWebView(webView);
        webView.setToolBar(toolbar);
        webView.setActionBar(getSupportActionBar());
        Objects.requireNonNull(actionBar).setShowHideAnimationEnabled(true);
        Objects.requireNonNull(actionBar).setHideOffset(-actionBar.getHeight());
        webView.setWebChromeClient(new WebChromeClient());
        webView.setBackgroundColor(Color.BLACK);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
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
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setForceDark(WebSettings.FORCE_DARK_ON);
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
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setWebViewClient(new WebViewClient(){
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                webviewIsLoaded = false;
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView,true);
                CookieManager.getInstance().acceptCookie();
                CookieManager.getInstance().flush();
                if (!webviewIsLoaded) {
                    webTitle.setText(view.getTitle());
                }
                super.onPageFinished(view, url);
                webviewIsLoaded = true;
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (canStartNewActivity) {
                    Intent intent = new Intent(WebViewActivity.this, WebViewActivity.class);
                    intent.putExtra("url", url);
                    startActivity(intent);
                    overridePendingTransition(R.anim.right_to_center, R.anim.center_to_left);
                    return true;
                } else {
                    return false;
                }
            }
        });
        String url = getIntent().getStringExtra("url");
        if (url != null) {
            webView.loadUrl(url);
        }
        new Handler(Looper.getMainLooper()).postDelayed(() -> canStartNewActivity = true,1000);
    }
    @Override
    protected void onResume() {
        if (webviewIsLoaded) {
            overridePendingTransition(R.anim.left_to_center, R.anim.center_to_right);
        }
        webView.onResume();
        webView.resumeTimers();
        super.onResume();
    }

    @Override
    protected void onPause() {
        webView.onPause();
        webView.pauseTimers();
        super.onPause();
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            super.onBackPressed();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
            finish();
        }
    }
}
