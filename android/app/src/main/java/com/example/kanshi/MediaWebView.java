package com.example.kanshi;

import android.content.Context;
import android.util.AttributeSet;
import android.view.View;
import android.view.animation.AccelerateInterpolator;
import android.view.animation.DecelerateInterpolator;
import android.webkit.WebView;

import androidx.appcompat.app.ActionBar;

public class MediaWebView extends WebView {
    private boolean animatingShow = false;
    private boolean animatingHide = false;
    private androidx.appcompat.widget.Toolbar toolbar;
    private long toolbarHeight;
    private ActionBar actionBar;
    private MediaWebView mediaWebView;
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
    protected void onScrollChanged(int scrollX, int scrollY, int oldScrollX, int oldScrollY) {
        if (toolbar!=null) {
            if (toolbarHeight<100) {
                toolbarHeight = toolbar.getHeight();
            }
            if (scrollY <= 0) {
                actionBar.show();
                toolbar.animate().translationY(0).start();
                mediaWebView.animate().translationY(toolbarHeight).start();
            } else if (scrollY - oldScrollY > 0 && !animatingHide) {
                animatingShow = false;
                animatingHide = true;
                toolbar.animate().translationY(-toolbarHeight).
                    setInterpolator(new AccelerateInterpolator()).withEndAction(() -> actionBar.hide()).start();
                mediaWebView.animate().translationY(0).setInterpolator(new DecelerateInterpolator()).start();
            } else if (oldScrollY - scrollY > 50 && !animatingShow) {
                animatingShow = true;
                animatingHide = false;
                actionBar.show();
                toolbar.animate().translationY(0).
                        setInterpolator(new DecelerateInterpolator()).start();
                mediaWebView.animate().translationY(toolbarHeight).setInterpolator(new DecelerateInterpolator()).start();
            }

        }
        super.onScrollChanged(scrollX, scrollY, oldScrollX, oldScrollY);
    }

    public void setToolBar(androidx.appcompat.widget.Toolbar toolbar) {
        this.toolbar = toolbar;
        this.toolbarHeight = toolbar.getBottom();
    }

    public void setActionBar(ActionBar actionBar) {
        this.actionBar = actionBar;
    }

    public void setMediaWebView(MediaWebView mediaWebView) {
        this.mediaWebView = mediaWebView;
    }
}