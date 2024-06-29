package com.example.kanshi;

import android.content.Context;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.View;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

public class RecyclerItemTouchListener implements RecyclerView.OnItemTouchListener {
    private final OnItemClickListener mListener;
    private final GestureDetector mGestureDetector;

    public interface OnItemClickListener {
        boolean onItemClick(int position);
        void onItemLongPress(int position);
    }

    public RecyclerItemTouchListener(Context context, final RecyclerView recyclerView, OnItemClickListener listener) {
        mListener = listener;
        mGestureDetector = new GestureDetector(context, new GestureDetector.SimpleOnGestureListener() {
            @Override
            public boolean onSingleTapUp(@NonNull MotionEvent e) {
                if (e.getAction() != MotionEvent.ACTION_UP) return false;
                if (mListener == null) return false;

                View childView = recyclerView.findChildViewUnder(e.getX(), e.getY());
                if (childView == null) return false;


                RecyclerView.ViewHolder viewHolder = recyclerView.getChildViewHolder(childView);
                if (viewHolder == null) return false;


                int itemViewType = viewHolder.getItemViewType();
                if (itemViewType != GroupedListItem.ITEM) return false;


                int position = recyclerView.getChildAdapterPosition(childView);
                if (position < 0) return false;

                return mListener.onItemClick(position);
            }

            @Override
            public void onLongPress(@NonNull MotionEvent e) {
                if (mListener == null) return;

                View childView = recyclerView.findChildViewUnder(e.getX(), e.getY());
                if (childView == null) return;

                RecyclerView.ViewHolder viewHolder = recyclerView.getChildViewHolder(childView);
                if (viewHolder == null) return;

                int itemViewType = viewHolder.getItemViewType();
                if (itemViewType < 0) return;

                int position = recyclerView.getChildAdapterPosition(childView);
                if (position < 0) return;

                mListener.onItemLongPress(position);
            }
        });
    }

    @Override
    public boolean onInterceptTouchEvent(@NonNull RecyclerView recyclerView, @NonNull MotionEvent e) {
        return mGestureDetector.onTouchEvent(e);
    }

    @Override
    public void onTouchEvent(@NonNull RecyclerView recyclerView, @NonNull MotionEvent e) { }

    @Override
    public void onRequestDisallowInterceptTouchEvent(boolean disallowIntercept) { }
}
