package com.example.kanshi;

import android.content.Context;
import android.os.Build;
import android.util.AttributeSet;
import android.view.View;
import android.webkit.WebView;

public class MediaWebView extends WebView {
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
    @Override
    public void onWindowSystemUiVisibilityChanged(int visibility) {
        if(visibility != View.GONE) {
            super.resumeTimers();
            super.setVisibility(View.VISIBLE);
            super.setKeepScreenOn(true);
            super.onWindowSystemUiVisibilityChanged(View.VISIBLE);
            super.onWindowVisibilityChanged(View.VISIBLE);
        }
    }
    @Override
    protected void onWindowVisibilityChanged(int visibility) {
        if(visibility != View.GONE) {
            super.resumeTimers();
            super.setVisibility(View.VISIBLE);
            super.setKeepScreenOn(true);
            super.onWindowSystemUiVisibilityChanged(View.VISIBLE);
            super.onWindowVisibilityChanged(View.VISIBLE);
        }
    }
}
