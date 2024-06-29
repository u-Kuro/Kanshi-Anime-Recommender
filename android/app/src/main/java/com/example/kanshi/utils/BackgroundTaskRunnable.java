package com.example.kanshi.utils;

import androidx.annotation.NonNull;

public class BackgroundTaskRunnable {
    private final String taskId;
    private final Runnable task;

    public BackgroundTaskRunnable(String taskId, @NonNull Runnable task) {
        this.taskId = taskId;
        this.task = task;
    }

    public String getTaskId() {
        return taskId;
    }

    public Runnable getTask() {
        return task;
    }
}