package com.example.kanshi;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.ImageView;
import android.widget.Spinner;
import android.widget.TextView;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.viewpager2.adapter.FragmentStateAdapter;
import androidx.viewpager2.widget.ViewPager2;

import com.google.android.material.tabs.TabLayout;

import java.lang.ref.WeakReference;

@RequiresApi(api = Build.VERSION_CODES.N)
public class AnimeReleaseActivity extends AppCompatActivity {
    public static WeakReference<AnimeReleaseActivity> weakActivity;
    Spinner animeReleaseSpinner;
    SharedPreferences prefs;
    SharedPreferences.Editor prefsEdit;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        weakActivity = new WeakReference<>(AnimeReleaseActivity.this);

        prefs = this.getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
        prefsEdit = prefs.edit();

        super.onCreate(savedInstanceState);
        setContentView(R.layout.anime_releases_activity);

        animeReleaseSpinner = findViewById(R.id.anime_release_spinner);
        animeReleaseSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @RequiresApi(api = Build.VERSION_CODES.O)
            @Override
            public void onItemSelected(AdapterView<?> adapterView, View view, int i, long l) {
                TextView textView = ((TextView) view);
                textView.setTextSize(22);
                textView.setPadding(0,0,0,0);
                SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
                String selectedAnimeReleaseOption = adapterView.getItemAtPosition(i).toString();
                prefsEdit.putString("animeReleaseOption", selectedAnimeReleaseOption).apply();

                if (schedulesTabFragment!=null) {
                    schedulesTabFragment.updateScheduledAnime();
                }
                ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();
                if (releasedTabFragment!=null) {
                    releasedTabFragment.updateReleasedAnime();
                }
            }
            @Override
            public void onNothingSelected(AdapterView<?> adapterView) {}
        });

        String[] animeReleaseOption = {"Updates", "My List", "Others"};
        ArrayAdapter<String> animeReleaseOptionsAdapter = new ArrayAdapter<>(this, R.layout.spinner_item, animeReleaseOption);
        animeReleaseSpinner.setAdapter(animeReleaseOptionsAdapter);

        String selectedAnimeReleaseOption = prefs.getString("animeReleaseOption", "Updates");

        if (selectedAnimeReleaseOption.equals("My List")) {
            animeReleaseSpinner.setSelection(1);
        } else if (selectedAnimeReleaseOption.equals("Others")) {
            animeReleaseSpinner.setSelection(2);
        } else {
            animeReleaseSpinner.setSelection(0);
        }

        TabLayout tabLayout = findViewById(R.id.tab_layout);
        ViewPager2 viewPager = findViewById(R.id.view_pager);
        FragmentStateAdapter adminViewAdapter = new AnimeReleaseViewAdapter(this);

        viewPager.setAdapter(adminViewAdapter);
        tabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                viewPager.setCurrentItem(tab.getPosition());
            }
            @Override
            public void onTabUnselected(TabLayout.Tab tab) {}
            @Override
            public void onTabReselected(TabLayout.Tab tab) {}
        });

        viewPager.registerOnPageChangeCallback(new ViewPager2.OnPageChangeCallback() {
            @Override
            public void onPageSelected(int position) {
                super.onPageSelected(position);
                prefsEdit.putInt("selectedAnimeReleasePageIndex", position).apply();
                TabLayout.Tab tab = tabLayout.getTabAt(position);
                if (tab!=null) {
                    tab.select();
                }
            }
        });

        int selectedAnimeReleasePageIndex = prefs.getInt("selectedAnimeReleasePageIndex", 0);
        viewPager.setCurrentItem(selectedAnimeReleasePageIndex, false);


        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                finish();
                overridePendingTransition(R.anim.none, R.anim.fade_out);
            }
        });

        ImageView close = findViewById(R.id.close_anime_release);
        close.setOnClickListener(view -> {
            Intent i = new Intent(this, MainActivity.class);
            i.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(i);
            overridePendingTransition(R.anim.none, R.anim.fade_out);
        });
    }

    @Override
    protected void onResume() {
        overridePendingTransition(R.anim.fade_in, R.anim.remove);
        super.onResume();
    }

    public static AnimeReleaseActivity getInstanceActivity() {
        if (weakActivity != null) {
            return weakActivity.get();
        } else {
            return null;
        }
    }
}
