package com.example.kanshi;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.ImageView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.viewpager2.adapter.FragmentStateAdapter;
import androidx.viewpager2.widget.ViewPager2;

import com.google.android.material.tabs.TabLayout;

import java.lang.ref.WeakReference;

@RequiresApi(api = Build.VERSION_CODES.N)
public class AnimeReleaseActivity extends AppCompatActivity {
    public static WeakReference<AnimeReleaseActivity> weakActivity;
    boolean showCompleteAnime = false;
    Spinner animeReleaseSpinner;
    SharedPreferences prefs;
    SharedPreferences.Editor prefsEdit;
    Toast currentToast;

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
                String selectedAnimeReleaseOption = adapterView.getItemAtPosition(i).toString();
                prefsEdit.putString("animeReleaseOption", selectedAnimeReleaseOption).apply();

                SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
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

        showCompleteAnime = prefs.getBoolean("showCompleteAnime", false);
        ImageView completed_anime_switch = findViewById(R.id.completed_anime_switch);
        if (showCompleteAnime) {
            completed_anime_switch.setImageResource(R.drawable.done_white);
        } else {
            completed_anime_switch.setImageResource(R.drawable.not_done_white);
        }
        completed_anime_switch.setOnClickListener(view -> {
            showCompleteAnime = !showCompleteAnime;
            if (showCompleteAnime) {
                completed_anime_switch.setImageResource(R.drawable.done_white);
            } else {
                completed_anime_switch.setImageResource(R.drawable.not_done_white);
            }
            prefsEdit.putBoolean("showCompleteAnime", showCompleteAnime).apply();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
                if (schedulesTabFragment != null) {
                    schedulesTabFragment.updateScheduledAnime();
                }
                ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();
                if (releasedTabFragment != null) {
                    releasedTabFragment.updateReleasedAnime();
                }
            }
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
        viewPager.setOffscreenPageLimit(adminViewAdapter.getItemCount());

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
                Intent i = new Intent(AnimeReleaseActivity.this, MainActivity.class);
                i.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                startActivity(i);
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

    boolean wasOpened;
    @Override
    protected void onResume() {
        MainActivity mainActivity = MainActivity.getInstanceActivity();
        if (mainActivity!=null) {
            mainActivity.isInApp = true;
        }
        if (!wasOpened) {
            wasOpened = true;
            overridePendingTransition(R.anim.fade_in, R.anim.remove);
        } else {
            overridePendingTransition(R.anim.none, R.anim.fade_out);
        }
        super.onResume();
    }

    @Override
    protected void onPause() {
        MainActivity mainActivity = MainActivity.getInstanceActivity();
        if (mainActivity!=null) {
            mainActivity.isInApp = false;
            mainActivity.setBackgroundUpdates();
        }
        super.onPause();
    }

    public void openAnimeInAniList(String url) {
        try {
            CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                    .setDefaultColorSchemeParams(new CustomTabColorSchemeParams.Builder().setToolbarColor(getResources().getColor(R.color.dark_blue)).build())
                    .setStartAnimations(AnimeReleaseActivity.this, R.anim.fade_in, R.anim.remove)
                    .setExitAnimations(AnimeReleaseActivity.this, R.anim.fade_out, R.anim.remove)
                    .setShowTitle(true)
                    .build();
            customTabsIntent.launchUrl(AnimeReleaseActivity.this, Uri.parse(url));
            overridePendingTransition(R.anim.remove, R.anim.remove);
        } catch (Exception ignored) {
            showToast(Toast.makeText(getApplicationContext(), "Can't open the link.", Toast.LENGTH_LONG));
        }
    }

    public void showToast(Toast toast) {
        if (currentToast != null) {
            currentToast.cancel();
        }
        MainActivity mainActivity = MainActivity.getInstanceActivity();
        if (mainActivity!=null) {
            boolean isInApp = mainActivity.isInApp;
            if (isInApp) {
                currentToast = toast;
                currentToast.show();
            }
        }
    }
    public static AnimeReleaseActivity getInstanceActivity() {
        if (weakActivity != null) {
            return weakActivity.get();
        } else {
            return null;
        }
    }
}
