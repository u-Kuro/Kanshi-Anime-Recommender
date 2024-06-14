package com.example.kanshi.utils;

import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;

import com.example.kanshi.Utils;

import java.util.Collection;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class UITaskQueue {
    private final Context context;
    private final ExecutorService taskExecutor = Executors.newFixedThreadPool(1);
    private final Map<String, UIHandler> handlerMap;
    private final Deque<UITask> queue;
    private final AtomicBoolean isRunning;

    public UITaskQueue(Context context) {
        this.handlerMap = new ConcurrentHashMap<>();
        this.queue = new ConcurrentLinkedDeque<>();
        this.isRunning = new AtomicBoolean();
        this.context = context;
    }

    public void addTask(String handlerId, Runnable task) {
        UIHandler uiHandler = handlerMap.get(handlerId);
        if (uiHandler==null) {
            uiHandler = new UIHandler();
            handlerMap.put(handlerId, uiHandler);
        }
        UITask uiTask = new UITask(handlerId, task);
        queue.addLast(uiTask);
        if (!isRunning.get()) {
            isRunning.set(true);
            executeTasks();
        }
    }

    public void cancelTasks(String handlerId) {
        UIHandler uiHandler = handlerMap.get(handlerId);
        if (uiHandler != null) {
            uiHandler.removeCallbacksAndMessages();
            Collection<UITask> tasks = uiHandler.clearAndGetTasksCollection();
            for (UITask task : tasks) {
                queue.remove(task);
            }
            executeTasks();
        }
    }

    public void replaceTask(String handlerId, String taskId, Runnable newTask) {
        UIHandler uiHandler = handlerMap.get(handlerId);
        if (uiHandler==null) {
            uiHandler = new UIHandler();
            handlerMap.put(handlerId, uiHandler);
        }
        UITask uiTask = uiHandler.removeTask(taskId);
        if (uiTask != null) {
            queue.remove(uiTask);
        }
        addTask(handlerId, newTask);
    }

    private void executeTasks() {
        taskExecutor.submit(() -> {
            try {
                UITask task = queue.pollFirst();
                if (task != null) {
                    String handlerId = task.handlerId;
                    UIHandler uiHandler = handlerMap.get(handlerId);
                    if (uiHandler != null) {
                        boolean isPosted = uiHandler.mainHandler.post(() -> {
                            task.run();
                            if (queue.isEmpty()) {
                                isRunning.set(false);
                            } else {
                                executeTasks();
                            }
                        });
                        if (isPosted) {
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
                    Utils.handleUncaughtException(this.context.getApplicationContext(), e, "UI taskExecutor");
                }
                e.printStackTrace();
            }
        });
    }

    private static class UITask {
        public final String handlerId;
        public final Runnable task;

        public UITask(@NonNull String handlerId, @NonNull Runnable task) {
            this.handlerId = handlerId;
            this.task = task;
        }
        public void run() {
            task.run();
        }
    }
    private static class UIHandler {
        @NonNull public final Handler mainHandler;
        @NonNull public final Map<String, UITask> taskMap;

        public UIHandler() {
            this.mainHandler = new Handler(Looper.getMainLooper());
            this.taskMap = new ConcurrentHashMap<>();
        }
        public UITask removeTask(String taskId) {
            return taskMap.remove(taskId);
        }
        public Collection<UITask> clearAndGetTasksCollection() {
            Collection<UITask> tasks = taskMap.values();
            taskMap.clear();
            return tasks;
        }
        public void removeCallbacksAndMessages() {
            mainHandler.removeCallbacksAndMessages(null);
        }
    }
}
