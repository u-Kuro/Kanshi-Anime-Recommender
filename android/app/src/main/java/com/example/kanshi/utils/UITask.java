package com.example.kanshi.utils;

import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.RequiresApi;

import com.example.kanshi.Utils;

import java.util.Deque;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class UITask {
    private final Context context;
    private final ExecutorService UITaskExecutor;
    private final Deque<String> queue;
    private final Map<String, Deque<UITaskRunnable>> taskListMap;
    private final AtomicBoolean isRunning;
    private final long defaultDelay;

    private final Handler handler;
    public UITask(Context context) {
        this.context = context;
        this.UITaskExecutor = Executors.newFixedThreadPool(1);
        this.queue = new ConcurrentLinkedDeque<>();
        this.taskListMap = new ConcurrentHashMap<>();
        this.isRunning = new AtomicBoolean();

        this.handler = new Handler(Looper.getMainLooper());
        this.defaultDelay = 32;
    }

    @RequiresApi(api = Build.VERSION_CODES.P)
    public void post(Runnable task, String taskId) {
        if (UITaskExecutor.isShutdown() || UITaskExecutor.isTerminated()) return;
        UITaskExecutor.submit(() -> {
            UITaskRunnable uiTaskRunnable = new UITaskRunnable(task, defaultDelay);
            Deque<UITaskRunnable> taskList = taskListMap.get(taskId);
            if (taskList == null) {
                taskList = new ConcurrentLinkedDeque<>();
            }
            taskList.addLast(uiTaskRunnable);
            taskListMap.put(taskId, taskList);
            queue.addLast(taskId);
            if (!isRunning.get()) {
                isRunning.set(true);
                executeTasks();
            }
        });
    }
    @RequiresApi(api = Build.VERSION_CODES.P)
    public void cancel(String taskId) {
        if (UITaskExecutor.isShutdown() || UITaskExecutor.isTerminated()) return;
        UITaskExecutor.submit(() -> {
            queue.removeIf(queueId -> Objects.equals(queueId, taskId));
            taskListMap.remove(taskId);
            handler.removeCallbacksAndMessages(taskId);
            isRunning.set(true);
            executeTasks();
        });
    }
    @RequiresApi(api = Build.VERSION_CODES.P)
    private void executeTasks() {
        if (UITaskExecutor.isShutdown() || UITaskExecutor.isTerminated()) return;
        UITaskExecutor.submit(() -> {
            try {
                String taskId = queue.pollFirst();
                if (taskId != null) {
                    Deque<UITaskRunnable> taskList = taskListMap.get(taskId);
                    if (taskList != null) {
                        UITaskRunnable poll = taskList.pollFirst();
                        if (poll != null) {
                            handler.postDelayed(() -> {
                                poll.getTask().run();
                                if (queue.isEmpty()) {
                                    isRunning.set(false);
                                } else {
                                    executeTasks();
                                }
                            }, taskId, poll.getDelay());
                            return;
                        }
                    }
                }
                if (queue.isEmpty()) {
                    isRunning.set(false);
                } else {
                    executeTasks();
                }
            } catch (Exception e) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(this.context.getApplicationContext(), e, "UiTaskExecutor");
                }
                e.printStackTrace();
            }
        });
    }
    public void shutDownNow() {
        UITaskExecutor.shutdownNow();
        handler.removeCallbacksAndMessages(null);
    }
}
