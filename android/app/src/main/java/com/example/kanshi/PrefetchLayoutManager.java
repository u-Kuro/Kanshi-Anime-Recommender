package com.example.kanshi;

import android.content.Context;

import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

class PrefetchLayoutManager extends LinearLayoutManager {
    private static final int ITEMS_TO_PREFETCH = 14;
    private final ExecutorService executor = Executors.newFixedThreadPool(1);
    private Future<?> currentTask;
    public PrefetchLayoutManager(Context context) {
        super(context);
    }
    final AtomicInteger previousFirstVisibleItemPosition = new AtomicInteger(-1);
    final AtomicInteger previousLastVisibleItemPosition = new AtomicInteger(-1);

    @Override
    public void collectAdjacentPrefetchPositions(int dx, int dy, RecyclerView.State state, LayoutPrefetchRegistry layoutPrefetchRegistry) {
        super.collectAdjacentPrefetchPositions(dx, dy, state, layoutPrefetchRegistry);

        if (currentTask != null) {
            currentTask.cancel(true);
        }

        currentTask = executor.submit(() -> {
            int firstVisibleItemPosition = findFirstVisibleItemPosition();
            if (firstVisibleItemPosition == RecyclerView.NO_POSITION) return;
            if (previousFirstVisibleItemPosition.getAndSet(firstVisibleItemPosition) != firstVisibleItemPosition) {
                int startPosition = Math.max(0, firstVisibleItemPosition - 1);
                int endPosition = Math.max(0, firstVisibleItemPosition - ITEMS_TO_PREFETCH);
                for (int i = startPosition; i >= endPosition; i--) {
                    layoutPrefetchRegistry.addPosition(i, 0);
                }
            }

            int lastVisibleItemPosition = findLastVisibleItemPosition();
            if (lastVisibleItemPosition == RecyclerView.NO_POSITION) return;
            if (previousLastVisibleItemPosition.getAndSet(lastVisibleItemPosition) != lastVisibleItemPosition) {
                int lastItemPosition = getItemCount() - 1;
                int startPosition = Math.min(lastItemPosition, lastVisibleItemPosition + 1);
                int endPosition = Math.min(lastItemPosition, lastVisibleItemPosition + ITEMS_TO_PREFETCH);
                for (int i = startPosition; i <= endPosition; i++) {
                    layoutPrefetchRegistry.addPosition(i, 0);
                }
            }
        });
    }

    @Override
    public void onDetachedFromWindow(RecyclerView view, RecyclerView.Recycler recycler) {
        executor.shutdown();
        super.onDetachedFromWindow(view, recycler);
    }
}