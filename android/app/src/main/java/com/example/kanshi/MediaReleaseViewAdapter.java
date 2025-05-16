package com.example.kanshi;

import android.os.Build;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentActivity;
import androidx.viewpager2.adapter.FragmentStateAdapter;

public class MediaReleaseViewAdapter extends FragmentStateAdapter {

    public MediaReleaseViewAdapter(@NonNull FragmentActivity fragmentActivity) {
        super(fragmentActivity);
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    @NonNull
    @Override
    public Fragment createFragment(int position) {
        Fragment fragment;
        if (position == 1) {
            fragment = new SchedulesTabFragment();
        } else {
            fragment = new ReleasedTabFragment();
        }
        return fragment;
    }

    /** @noinspection SameReturnValue*/
    @Override
    public int getItemCount() {
        return 2;
    }
}
