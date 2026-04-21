package com.example.kanshi;

import static com.example.kanshi.Utils.handleUncaughtException;

import android.app.Application;
import android.os.Build;

import androidx.annotation.RequiresApi;

import java.util.logging.Level;
import java.util.logging.Logger;

public class MyApplication extends Application {
    private final static Logger logger = Logger.getLogger(MyApplication.class.getName());
    @RequiresApi(api = Build.VERSION_CODES.R)
    @Override
    public void onCreate() {
        super.onCreate();

        Thread.UncaughtExceptionHandler systemHandler = Thread.getDefaultUncaughtExceptionHandler();

        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            logger.log(Level.SEVERE, throwable.getMessage(), throwable);
            handleUncaughtException(MyApplication.this.getApplicationContext(), throwable, "Uncaught Exception");
            // IMPORTANT: Android apps usually need to be killed after a Throwable/Error,
            // - otherwise they stay in a "zombie" broken state.
            if (systemHandler != null) {
                systemHandler.uncaughtException(thread, throwable);
            } else {
                android.os.Process.killProcess(android.os.Process.myPid());
                System.exit(10);
            }
        });
    }
}
