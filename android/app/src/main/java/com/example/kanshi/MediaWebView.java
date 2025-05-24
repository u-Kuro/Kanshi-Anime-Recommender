package com.example.kanshi;

import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.AttributeSet;
import android.view.View;
import android.webkit.WebView;

import androidx.annotation.NonNull;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.logging.Level;
import java.util.logging.Logger;

public class MediaWebView extends WebView {
    private final Logger logger = Logger.getLogger(MediaWebView.class.getName());
    private final Executor fileReadExecutor = Executors.newFixedThreadPool(1);
    private final ConcurrentHashMap<String, String> fileCache = new ConcurrentHashMap<>();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean isPaused = false;
    public MediaWebView(Context context) {
        super(context);
        // Log Errors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Thread.setDefaultUncaughtExceptionHandler((thread, e) -> Utils.handleUncaughtException(context.getApplicationContext(), e, "MediaWebView 1"));
        }
    }
    public MediaWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
        // Log Errors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Thread.setDefaultUncaughtExceptionHandler((thread, e) -> Utils.handleUncaughtException(context.getApplicationContext(), e, "MediaWebView 2"));
        }
    }
    public MediaWebView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        // Log Errors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Thread.setDefaultUncaughtExceptionHandler((thread, e) -> Utils.handleUncaughtException(context.getApplicationContext(), e, "MediaWebView 3"));
        }
    }
    public void pause() {
        isPaused = true;
        onPause();
        pauseTimers();
    }
    public void resume() {
        isPaused = false;
        resumeTimers();
        onResume();
    }
    public void evaluateJS(@NonNull String script) {
        loadUrl("javascript:" + script);
    }
    public void loadJSFileAsset(@NonNull String fileName) {
        if (isPaused) return;
        String cachedScript = fileCache.get(fileName);
        if (cachedScript != null) {
            evaluateJS(cachedScript);
            return;
        }
        fileReadExecutor.execute(() -> {
            try {
                String script = readAssetFile(fileName);
                fileCache.put(fileName, script);
                loadJavaScriptOnMainThread(script);
            } catch (Exception e) {
                logger.log(Level.SEVERE, e.getMessage(), e);
            }
        });
    }
    private String readAssetFile(@NonNull String fileName) throws Exception {
        try (
            InputStream inputStream = getContext().getAssets().open("scripts/" + fileName);
            BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))
        ) {
            StringBuilder scriptBuilder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                scriptBuilder.append(line).append("\n");
            }
            return scriptBuilder.toString();
        }
    }
    private void loadJavaScriptOnMainThread(@NonNull String script) {
        mainHandler.post(() -> evaluateJS(script));
    }
    @Override
    protected void onWindowVisibilityChanged(int visibility) {
        if(visibility != View.GONE) {
            super.onWindowVisibilityChanged(View.VISIBLE);
        }
    }
}
