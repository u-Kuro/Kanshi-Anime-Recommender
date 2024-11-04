package com.example.kanshi.utils;

import android.content.Context;
import android.os.Build;

import com.example.kanshi.Utils;

import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.logging.Level;
import java.util.logging.Logger;

public class BackgroundTask {
    private final Logger logger = Logger.getLogger(BackgroundTask.class.getName());
    private final Context context;
    private final ExecutorService backgroundTaskExecutor;
    private final Deque<BackgroundTaskRunnable> queue;
    private final Map<String, BackgroundTaskRunnable> taskMap;
    private final AtomicBoolean isRunning;

    private final ExecutorService executor;
    private final Map<String, Future<?>> futureMap;
    public BackgroundTask(Context context) {
        this.context = context;
        this.backgroundTaskExecutor = Executors.newFixedThreadPool(1);
        this.queue = new ConcurrentLinkedDeque<>();
        this.taskMap = new ConcurrentHashMap<>();
        this.isRunning = new AtomicBoolean();

        this.executor = Executors.newFixedThreadPool(1);
        this.futureMap = new ConcurrentHashMap<>();
    }

    public void execute(String taskId, Runnable task) {
        if (backgroundTaskExecutor.isShutdown() || backgroundTaskExecutor.isTerminated()) return;
        backgroundTaskExecutor.submit(() -> {
            BackgroundTaskRunnable backgroundTaskRunnable = new BackgroundTaskRunnable(taskId, task);
            queue.addLast(backgroundTaskRunnable);
            taskMap.put(taskId, backgroundTaskRunnable);
            if (!isRunning.get()) {
                isRunning.set(true);
                executeTasks();
            }
        });
    }
    public void cancel(String taskId) {
        if (backgroundTaskExecutor.isShutdown() || backgroundTaskExecutor.isTerminated()) return;
        backgroundTaskExecutor.submit(() -> {
            Future<?> future = futureMap.remove(taskId);
            if (future != null) {
                future.cancel(true);
            }
            BackgroundTaskRunnable backgroundTaskRunnable = taskMap.remove(taskId);
            if (backgroundTaskRunnable != null) {
                queue.remove(backgroundTaskRunnable);
            }
            isRunning.set(true);
            executeTasks();
        });
    }
    private void executeTasks() {
        if (backgroundTaskExecutor.isShutdown() || backgroundTaskExecutor.isTerminated()) return;
        backgroundTaskExecutor.submit(() -> {
            try {
                BackgroundTaskRunnable poll = queue.pollFirst();
                if (poll != null) {
                    String taskId = poll.getTaskId();
                    if (executor.isShutdown() || executor.isTerminated()) return;
                    Future<?> future = executor.submit(()->{
                        try {
                            poll.getTask().run();
                        } catch (Exception e) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                Utils.handleUncaughtException(this.context.getApplicationContext(), e, "BackgroundTask "+taskId);
                            }
                            logger.log(Level.SEVERE, e.getMessage(), e);
                            throw e;
                        }
                    });
                    try {
                        futureMap.put(taskId, future);
                        future.get();
                    } catch (Exception ignored) {
                    } finally {
                        if (queue.isEmpty()) {
                            isRunning.set(false);
                        } else {
                            executeTasks();
                        }
                    }
                } else if (queue.isEmpty()) {
                    isRunning.set(false);
                } else {
                    executeTasks();
                }
            } catch (Exception e) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(this.context.getApplicationContext(), e, "backgroundTaskExecutor");
                }
                logger.log(Level.SEVERE, e.getMessage(), e);
            }
        });
    }
    public void shutDownNow() {
        backgroundTaskExecutor.shutdownNow();
        executor.shutdownNow();
    }
}
