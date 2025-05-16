package com.example.kanshi.utils;

import androidx.annotation.NonNull;

public record UITaskRunnable(Runnable task, long delay) {
    public UITaskRunnable(@NonNull Runnable task, long delay) {
        this.task = task;
        this.delay = delay;
    }
}