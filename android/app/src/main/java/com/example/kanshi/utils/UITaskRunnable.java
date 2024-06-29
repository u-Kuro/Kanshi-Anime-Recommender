package com.example.kanshi.utils;

import androidx.annotation.NonNull;

public class UITaskRunnable {
    private final Runnable task;
    private final long delay;
    public UITaskRunnable(@NonNull Runnable task, long delay) {
        this.task = task;
        this.delay = delay;
    }

    public long getDelay() {
        return delay;
    }

    public Runnable getTask() {
        return task;
    }
}