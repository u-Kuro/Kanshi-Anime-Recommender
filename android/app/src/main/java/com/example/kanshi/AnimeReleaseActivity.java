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
    boolean showCompleteAnime = false;
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
                                                if ($importedAllAnimeNotification != null && $importedAllAnimeNotification.size() > 0) {
                                                    if (AnimeNotificationManager.allAnimeNotification.size() == 0) {
                                                        try {
                                                            @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(this, "allAnimeNotification");
                                                            if ($allAnimeNotification != null && $allAnimeNotification.size() > 0) {
                                                                AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
                                                            }
                                                        } catch (Exception ignored) {}
                                                    }
                                                    ArrayList<Map.Entry<String, AnimeNotification>> allAnimeNotificationEntries = new ArrayList<>(AnimeNotificationManager.allAnimeNotification.entrySet());
                                                    for (int j = 0; j < allAnimeNotificationEntries.size(); j++) {
                                                        Map.Entry<String, AnimeNotification> currentEntry = allAnimeNotificationEntries.get(j);
                                                        AnimeNotificationManager.allAnimeNotification.putIfAbsent(currentEntry.getKey(), currentEntry.getValue());
                                                    }
                                                    if (AnimeNotificationManager.allAnimeNotification.size() > 0) {
                                                        LocalPersistence.writeObjectToFile(this, AnimeNotificationManager.allAnimeNotification, "allAnimeNotification");
                                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                            Utils.exportReleasedAnime(this.getApplicationContext());
                                                        }
                                                    }
                                                    if (bottomSheetDialog != null && bottomSheetDialog.isShowing()) {
                                                        SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
                                                        if (schedulesTabFragment != null) {
                                                            schedulesTabFragment.updateScheduledAnime();
                                                        }
                                                        ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();
                                                        if (releasedTabFragment != null) {
                                                            releasedTabFragment.updateReleasedAnime();
                                                        }
                                                        bottomSheetDialog.dismiss();
                                                        showToast(Toast.makeText(this, "Anime Releases has been Imported", Toast.LENGTH_SHORT));
                                                    }
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
        weakActivity = new WeakReference<>(AnimeReleaseActivity.this);

        prefs = this.getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
        prefsEdit = prefs.edit();

        super.onCreate(savedInstanceState);
        setContentView(R.layout.anime_releases_activity);

        if (getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE) {
            getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        }

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

        String exportPath = prefs.getString("savedExportPath", "");
        ImageView backupAnimeReleases = findViewById(R.id.backup_anime_releases);
        if (exportPath.equals("")) {
            backupAnimeReleases.setVisibility(View.GONE);
        } else {
            backupAnimeReleases.setVisibility(View.VISIBLE);
            backupAnimeReleases.setOnClickListener(view -> backupBottomDialog());
        }

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
        viewPager = findViewById(R.id.view_pager);

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

    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (newConfig.orientation == Configuration.ORIENTATION_LANDSCAPE) {
            getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        } else {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        }
        viewPager.beginFakeDrag();
        viewPager.fakeDragBy(1);
        viewPager.endFakeDrag();
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

        if (AnimeNotificationManager.allAnimeNotification.size() == 0) {
            try {
                @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(this, "allAnimeNotification");
                if ($allAnimeNotification != null && $allAnimeNotification.size() > 0) {
                    AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
                }
            } catch (Exception ignored) {}
        }


        if (AnimeNotificationManager.allAnimeNotification.size() == 0) return;

        LinearLayout autoExportAnimeReleases = bottomSheetDialog.findViewById(R.id.auto_export_anime_releases);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (autoExportAnimeReleases == null) {
                showToast(Toast.makeText(this, "Something went wrong", Toast.LENGTH_SHORT));
                return;
            }

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
        } else if (autoExportAnimeReleases!=null) {
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
