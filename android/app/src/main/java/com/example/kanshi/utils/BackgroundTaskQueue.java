package com.example.kanshi.utils;

import androidx.annotation.NonNull;

import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;

public class BackgroundTaskQueue {
    private final ExecutorService taskExecutor = Executors.newFixedThreadPool(1);
    private final ExecutorService executor;
    private final Deque<BackgroundTask> queue;
    private final Map<String, BackgroundTask> taskMap;
    private final Map<String, Future<?>> futureMap;
    private final AtomicBoolean isRunning;

    public BackgroundTaskQueue() {
        this.executor = Executors.newFixedThreadPool(1);
        this.queue = new ConcurrentLinkedDeque<>();
        this.taskMap = new ConcurrentHashMap<>();
        this.futureMap = new ConcurrentHashMap<>();
        this.isRunning = new AtomicBoolean();
    }

    public void addTask(String taskId, Runnable task) {
        BackgroundTask backgroundTask = new BackgroundTask(taskId, task);
        queue.addLast(backgroundTask);
        taskMap.put(taskId, backgroundTask);
        if (!isRunning.get()) {
            isRunning.set(true);
            executeTasks();
        }
    }
    public void removeTask(String taskId) {
        Future<?> future = futureMap.remove(taskId);
        if (future != null && !future.isDone()) {
            future.cancel(true);
        }
        BackgroundTask task = taskMap.remove(taskId);
        if (task != null) {
            queue.remove(task);
        }
    }

    public void replaceTask(String taskId, Runnable newTask) {
        removeTask(taskId);
        addTask(taskId, newTask);
    }

    private void executeTasks() {
        taskExecutor.submit(() -> {
            BackgroundTask task = queue.pollFirst();
            if (task != null) {
                String taskId = task.getTaskId();
                Future<?> future = executor.submit(task.getTask());
                try {
                    futureMap.put(taskId, future);
                    future.get();
                } catch (Exception ignored) {
                } finally {
                    if (taskId != null) {
                        taskMap.remove(taskId);
                    }
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
        });
    }

    private static class BackgroundTask {
        private final String taskId;
        private final Runnable task;

        public BackgroundTask(String taskId, @NonNull Runnable task) {
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
}
