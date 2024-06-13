package com.example.kanshi;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.view.LayoutInflater;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.viewpager2.adapter.FragmentStateAdapter;
import androidx.viewpager2.widget.ViewPager2;

import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.tabs.TabLayout;

import java.io.File;
import java.io.FileInputStream;
import java.io.ObjectInputStream;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RequiresApi(api = Build.VERSION_CODES.N)
public class AnimeReleaseActivity extends AppCompatActivity {
    public static WeakReference<AnimeReleaseActivity> weakActivity;
    public static boolean showUnwatchedAnime = false;
    Spinner animeReleaseSpinner;
    SharedPreferences prefs;
    SharedPreferences.Editor prefsEdit;
    ViewPager2 viewPager;
    Toast currentToast;
    BottomSheetDialog bottomSheetDialog;

    final ActivityResultLauncher<String> chooseImportFile =
            registerForActivityResult(
                    new ActivityResultContracts.GetContent(),
                    uri -> {
                        if (bottomSheetDialog != null && bottomSheetDialog.isShowing()) {
                            bottomSheetDialog.dismiss();
                        }
                        if (uri==null) {
                            return;
                        }
                        String filepath = uri.getPath();
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O && filepath != null) {
                            try {
                                String filename = new File(filepath).getName();
                                AlertDialog.Builder alertDialog = new AlertDialog.Builder(AnimeReleaseActivity.this)
                                    .setTitle("Confirmation")
                                    .setMessage("Do you want to import \""+filename+"\"?")
                                    .setPositiveButton("OK", ((dialogInterface, i) -> {
                                        ObjectInputStream objectIn = null;
                                        Object object;

                                        try {
                                            ParcelFileDescriptor pfd = this.getContentResolver().openFileDescriptor(uri, "r");

                                            if (pfd != null) {

                                                FileInputStream fileIn = new FileInputStream(pfd.getFileDescriptor());
                                                objectIn = new ObjectInputStream(fileIn);

                                                object = objectIn.readObject();

                                                @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $importedAllAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) object;

                                                if ($importedAllAnimeNotification != null && !$importedAllAnimeNotification.isEmpty()) {
                                                    if (AnimeNotificationManager.allAnimeNotification.isEmpty()) {
                                                        try {

                                                            @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(this, "allAnimeNotification");

                                                            if ($allAnimeNotification != null && !$allAnimeNotification.isEmpty()) {
                                                                AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
                                                            }
                                                        } catch (Exception ignored) {}
                                                    }
                                                    ArrayList<Map.Entry<String, AnimeNotification>> allAnimeNotificationEntries = new ArrayList<>($importedAllAnimeNotification.entrySet());

                                                    for (int j = 0; j < allAnimeNotificationEntries.size(); j++) {
                                                        Map.Entry<String, AnimeNotification> currentEntry = allAnimeNotificationEntries.get(j);
                                                        AnimeNotificationManager.allAnimeNotification.putIfAbsent(currentEntry.getKey(), currentEntry.getValue());
                                                    }

                                                    if (!AnimeNotificationManager.allAnimeNotification.isEmpty()) {
                                                        LocalPersistence.writeObjectToFile(this, AnimeNotificationManager.allAnimeNotification, "allAnimeNotification");

                                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                            Utils.exportReleasedAnime(this.getApplicationContext());
                                                        }
                                                    }
                                                    SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
                                                    if (schedulesTabFragment != null) {
                                                        schedulesTabFragment.updateScheduledAnime();
                                                    }
                                                    ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();

                                                    if (releasedTabFragment != null) {
                                                        releasedTabFragment.updateReleasedAnime();
                                                    }

                                                    showToast(Toast.makeText(this, "Anime Releases has been Imported", Toast.LENGTH_SHORT));

                                                } else {

                                                    showToast(Toast.makeText(this, "Something went wrong", Toast.LENGTH_SHORT));
                                                }
                                                objectIn.close();
                                            } else {
                                                showToast(Toast.makeText(this, "Something went wrong", Toast.LENGTH_SHORT));
                                            }
                                        } catch (Exception ignored) {
                                            showToast(Toast.makeText(this, "Something went wrong", Toast.LENGTH_SHORT));
                                        } finally {
                                            try {
                                                if (objectIn != null) {
                                                    objectIn.close();
                                                }
                                            } catch (Exception ignored) {}
                                        }
                                    }))
                                    .setNegativeButton("CANCEL", null);

                                AlertDialog dialog = alertDialog.create();
                                Window dialogWindow = dialog.getWindow();

                                if (dialogWindow!=null) {
                                    dialogWindow.setBackgroundDrawableResource(R.drawable.dialog);
                                }

                                dialog.show();

                            } catch (Exception ignored) {
                                showToast(Toast.makeText(this, "Something went wrong", Toast.LENGTH_SHORT));
                            }
                        } else {
                            showToast(Toast.makeText(this, "Something went wrong", Toast.LENGTH_SHORT));
                        }
                    }
            );

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        // Log Errors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Thread.setDefaultUncaughtExceptionHandler((thread, e) -> Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), e, "AnimeReleaseActivity"));
        }

        super.onCreate(savedInstanceState);
        setContentView(R.layout.anime_releases_activity);
        // Init Global Variables
        animeReleaseSpinner = findViewById(R.id.anime_release_spinner);
        viewPager = findViewById(R.id.view_pager);
        prefs = this.getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
        prefsEdit = prefs.edit();
        showUnwatchedAnime = prefs.getBoolean("showUnwatchedAnime", false);

        if (getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE) {
            getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        }

        ImageView completed_anime_switch = findViewById(R.id.completed_anime_switch);
        if (showUnwatchedAnime) {
            completed_anime_switch.setImageResource(R.drawable.not_done_white);
        } else {
            completed_anime_switch.setImageResource(R.drawable.done_white);
        }

        ImageView backupAnimeReleases = findViewById(R.id.backup_anime_releases);
        backupAnimeReleases.setVisibility(View.VISIBLE);

        String[] animeReleaseOption = {"Updates", "My List", "Watching", "Finished", "Others"};
        ArrayAdapter<String> animeReleaseOptionsAdapter = new ArrayAdapter<>(this, R.layout.spinner_item, animeReleaseOption);
        animeReleaseOptionsAdapter.setDropDownViewResource(R.layout.spinner_dropdown);
        animeReleaseSpinner.setAdapter(animeReleaseOptionsAdapter);

        TabLayout tabLayout = findViewById(R.id.tab_layout);

        FragmentStateAdapter adminViewAdapter = new AnimeReleaseViewAdapter(this);

        viewPager.setAdapter(adminViewAdapter);
        viewPager.setOffscreenPageLimit(adminViewAdapter.getItemCount());

        ImageView close = findViewById(R.id.close_anime_release);
        close.setOnClickListener(view -> {
            Intent i = new Intent(this, MainActivity.class);
            i.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(i);
            overridePendingTransition(R.anim.none, R.anim.fade_out);
        });

        viewPager.registerOnPageChangeCallback(new ViewPager2.OnPageChangeCallback() {
            @Override
            public void onPageSelected(int position) {
                super.onPageSelected(position);
                TabLayout.Tab tab = tabLayout.getTabAt(position);
                if (tab!=null) {
                    tab.select();
                }
                prefsEdit.putInt("selectedAnimeReleasePageIndex", position).apply();
            }
        });

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

        String selectedAnimeReleaseOption = prefs.getString("animeReleaseOption", "Updates");
        switch (selectedAnimeReleaseOption) {
            case "My List":
                animeReleaseSpinner.setSelection(1);
                break;
            case "Watching":
                animeReleaseSpinner.setSelection(2);
                break;
            case "Finished":
                animeReleaseSpinner.setSelection(3);
                break;
            case "Others":
                animeReleaseSpinner.setSelection(4);
                break;
            default:
                animeReleaseSpinner.setSelection(0);
                break;
        }

        animeReleaseSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @RequiresApi(api = Build.VERSION_CODES.O)
            @Override
            public void onItemSelected(AdapterView<?> adapterView, View view, int i, long l) {
                if (adapterView == null) return;
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

        backupAnimeReleases.setOnClickListener(view -> backupBottomDialog());

        completed_anime_switch.setOnClickListener(view -> {
            showUnwatchedAnime = !showUnwatchedAnime;
            if (showUnwatchedAnime) {
                completed_anime_switch.setImageResource(R.drawable.not_done_white);
            } else {
                completed_anime_switch.setImageResource(R.drawable.done_white);
            }
            prefsEdit.putBoolean("showUnwatchedAnime", showUnwatchedAnime).apply();

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

        weakActivity = new WeakReference<>(AnimeReleaseActivity.this);
    }

    boolean wasOpened;
    @Override
    protected void onResume() {
        if (!wasOpened) {
            wasOpened = true;
            overridePendingTransition(R.anim.fade_in, R.anim.remove);
        } else {
            MainActivity mainActivity = MainActivity.getInstanceActivity();
            if (mainActivity!=null) {
                mainActivity.checkEntries();
            }
            overridePendingTransition(R.anim.none, R.anim.fade_out);
        }
        super.onResume();
    }

    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (newConfig.orientation == Configuration.ORIENTATION_LANDSCAPE) {
            getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        } else {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        }
        if (viewPager!=null) {
            viewPager.beginFakeDrag();
            viewPager.fakeDragBy(1);
            viewPager.endFakeDrag();
        }
    }

    public void backupBottomDialog() {
        if (bottomSheetDialog != null && bottomSheetDialog.isShowing()) {
            bottomSheetDialog.dismiss();
        }

        bottomSheetDialog = new BottomSheetDialog(this);
        LayoutInflater inflater = getLayoutInflater();
        @SuppressLint("InflateParams") View bottomSheet = inflater.inflate(R.layout.backup_drawer, null);
        bottomSheetDialog.setContentView(bottomSheet);

        LinearLayout importAnimeReleases = bottomSheetDialog.findViewById(R.id.import_anime_releases);

        if (importAnimeReleases==null) {
            showToast(Toast.makeText(this,"Something went wrong", Toast.LENGTH_SHORT));
            return;
        }

        importAnimeReleases.setOnClickListener(view -> {
            chooseImportFile.launch("application/octet-stream");
            showToast(Toast.makeText(getApplicationContext(), "Please select your backup file.", Toast.LENGTH_LONG));
        });

        if (AnimeNotificationManager.allAnimeNotification.isEmpty()) {
            try {
                @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(this, "allAnimeNotification");
                if ($allAnimeNotification != null && !$allAnimeNotification.isEmpty()) {
                    AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
                }
            } catch (Exception ignored) {}
        }

        LinearLayout autoExportAnimeReleases = bottomSheetDialog.findViewById(R.id.auto_export_anime_releases);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (autoExportAnimeReleases != null) {
                autoExportAnimeReleases.setVisibility(View.VISIBLE);
                TextView autoExportAnimeReleasesText = autoExportAnimeReleases.findViewById(R.id.auto_export_anime_releases_textview);
                ImageView autoExportAnimeReleasesImage = autoExportAnimeReleases.findViewById(R.id.auto_export_anime_releases_imageview);

                if (autoExportAnimeReleasesText == null || autoExportAnimeReleasesImage == null) {
                    showToast(Toast.makeText(this, "Something went wrong", Toast.LENGTH_SHORT));
                    return;
                }

                boolean autoExportReleasedAnime = prefs.getBoolean("autoExportReleasedAnime", false);

                if (autoExportReleasedAnime) {
                    autoExportAnimeReleasesText.setText(R.string.enabled_automatic_back_up);
                    autoExportAnimeReleasesImage.setImageResource(R.drawable.sync_white);
                } else {
                    autoExportAnimeReleasesText.setText(R.string.disabled_automatic_back_up);
                    autoExportAnimeReleasesImage.setImageResource(R.drawable.sync_disabled_white);
                }

                autoExportAnimeReleases.setOnClickListener(view -> {
                    final boolean newAutoExportReleasedAnime = !autoExportReleasedAnime;
                    prefsEdit.putBoolean("autoExportReleasedAnime", newAutoExportReleasedAnime).apply();
                    if (newAutoExportReleasedAnime) {
                        Utils.exportReleasedAnime(AnimeReleaseActivity.this);
                    }
                    bottomSheetDialog.dismiss();
                });
            } else {
                showToast(Toast.makeText(this, "Something went wrong", Toast.LENGTH_SHORT));
            }
        } else if (autoExportAnimeReleases != null) {
            autoExportAnimeReleases.setVisibility(View.GONE);
        }

        bottomSheetDialog.show();
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
