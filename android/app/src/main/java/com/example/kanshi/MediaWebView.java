package com.example.kanshi;

import android.content.Context;
import android.util.AttributeSet;
import android.view.View;
import android.webkit.WebView;

import java.util.HashMap;

public class MediaWebView extends WebView {

    public final HashMap<String, Integer> scrollPositionsX = new HashMap<>();
    public final HashMap<String, Integer> scrollPositionsY = new HashMap<>();

    public MediaWebView(Context context) {
        super(context);
    }
    public MediaWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }
    public MediaWebView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
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

    @Override
    protected void onScrollChanged(int l, int t, int oldl, int oldt) {
        if (l>0 || t>0) {
            scrollPositionsX.put(this.getUrl(), l);
            scrollPositionsY.put(this.getUrl(), t);
        }
        super.onScrollChanged(l, t, oldl, oldt);
    }
}
