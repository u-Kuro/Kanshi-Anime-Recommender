package com.example.kanshi.utils;

import androidx.annotation.NonNull;

public record BackgroundTaskRunnable(String taskId, Runnable task) {
    public BackgroundTaskRunnable(String taskId, @NonNull Runnable task) {
        this.taskId = taskId;
        this.task = task;
    }
}