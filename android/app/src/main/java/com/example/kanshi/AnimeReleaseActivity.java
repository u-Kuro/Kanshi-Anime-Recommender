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
    boolean showUnwatchedAnime = false;
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
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 1 uri "+uri), "AnimeReleaseActivity");
                        }
                        if (bottomSheetDialog != null && bottomSheetDialog.isShowing()) {
                            bottomSheetDialog.dismiss();
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 2"), "AnimeReleaseActivity");
                        }
                        if (uri==null) {
                            return;
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 3"), "AnimeReleaseActivity");
                        }
                        String filepath = uri.getPath();
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 4 filepath "+filepath), "AnimeReleaseActivity");
                        }
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O && filepath != null) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 5"), "AnimeReleaseActivity");
                            }
                            try {
                                String filename = new File(filepath).getName();
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 6 filename "+filename), "AnimeReleaseActivity");
                                }
                                AlertDialog.Builder alertDialog = new AlertDialog.Builder(AnimeReleaseActivity.this)
                                    .setTitle("Confirmation")
                                    .setMessage("Do you want to import \""+filename+"\"?")
                                    .setPositiveButton("OK", ((dialogInterface, i) -> {
                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 12"), "AnimeReleaseActivity");
                                        }
                                        ObjectInputStream objectIn = null;
                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 13"), "AnimeReleaseActivity");
                                        }
                                        Object object;
                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 14"), "AnimeReleaseActivity");
                                        }
                                        try {
                                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 15"), "AnimeReleaseActivity");
                                            }
                                            ParcelFileDescriptor pfd = this.getContentResolver().openFileDescriptor(uri, "r");
                                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 16 pfd "+pfd), "AnimeReleaseActivity");
                                            }
                                            if (pfd != null) {
                                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 17"), "AnimeReleaseActivity");
                                                }
                                                FileInputStream fileIn = new FileInputStream(pfd.getFileDescriptor());
                                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 18 fileIn "+fileIn), "AnimeReleaseActivity");
                                                }
                                                objectIn = new ObjectInputStream(fileIn);
                                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 19 objectIn "+objectIn), "AnimeReleaseActivity");
                                                }
                                                object = objectIn.readObject();
                                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 20 object "+object), "AnimeReleaseActivity");
                                                }
                                                @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $importedAllAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) object;
                                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 21 object "+object), "AnimeReleaseActivity");
                                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 22 $importedAllAnimeNotification "+$importedAllAnimeNotification), "AnimeReleaseActivity");
                                                }
                                                if ($importedAllAnimeNotification != null && !$importedAllAnimeNotification.isEmpty()) {
                                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                        Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 23 AnimeNotificationManager.allAnimeNotification.isEmpty() "+AnimeNotificationManager.allAnimeNotification.isEmpty()), "AnimeReleaseActivity");
                                                    }
                                                    if (AnimeNotificationManager.allAnimeNotification.isEmpty()) {
                                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 24"), "AnimeReleaseActivity");
                                                        }
                                                        try {
                                                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                                Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 25"), "AnimeReleaseActivity");
                                                            }
                                                            @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(this, "allAnimeNotification");
                                                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                                Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 26 $allAnimeNotification "+$allAnimeNotification), "AnimeReleaseActivity");
                                                            }
                                                            if ($allAnimeNotification != null && !$allAnimeNotification.isEmpty()) {
                                                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 27"), "AnimeReleaseActivity");
                                                                }
                                                                AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
                                                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 28 AnimeNotificationManager.allAnimeNotification.size() "+AnimeNotificationManager.allAnimeNotification.size()), "AnimeReleaseActivity");
                                                                }
                                                            }
                                                        } catch (Exception ignored) {
                                                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                                Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 24.5"), "AnimeReleaseActivity");
                                                            }
                                                        }
                                                    }
                                                    ArrayList<Map.Entry<String, AnimeNotification>> allAnimeNotificationEntries = new ArrayList<>($importedAllAnimeNotification.entrySet());
                                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                        Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 29 allAnimeNotificationEntries "+allAnimeNotificationEntries), "AnimeReleaseActivity");
                                                        Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 30 allAnimeNotificationEntries.size() "+allAnimeNotificationEntries.size()), "AnimeReleaseActivity");
                                                    }
                                                    for (int j = 0; j < allAnimeNotificationEntries.size(); j++) {
                                                        Map.Entry<String, AnimeNotification> currentEntry = allAnimeNotificationEntries.get(j);
                                                        AnimeNotificationManager.allAnimeNotification.putIfAbsent(currentEntry.getKey(), currentEntry.getValue());
                                                    }
                                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                        Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 31"), "AnimeReleaseActivity");
                                                    }
                                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                        Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 32 AnimeNotificationManager.allAnimeNotification "+AnimeNotificationManager.allAnimeNotification), "AnimeReleaseActivity");
                                                        Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 33 AnimeNotificationManager.allAnimeNotification.size() "+AnimeNotificationManager.allAnimeNotification.size()), "AnimeReleaseActivity");
                                                    }
                                                    if (!AnimeNotificationManager.allAnimeNotification.isEmpty()) {
                                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 34"), "AnimeReleaseActivity");
                                                        }
                                                        LocalPersistence.writeObjectToFile(this, AnimeNotificationManager.allAnimeNotification, "allAnimeNotification");
                                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 35"), "AnimeReleaseActivity");
                                                        }
                                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 36"), "AnimeReleaseActivity");
                                                            Utils.exportReleasedAnime(this.getApplicationContext());
                                                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 37"), "AnimeReleaseActivity");
                                                        }
                                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 38"), "AnimeReleaseActivity");
                                                        }
                                                    }
                                                    SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
                                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                        Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 40 schedulesTabFragment "+schedulesTabFragment), "AnimeReleaseActivity");
                                                    }
                                                    if (schedulesTabFragment != null) {
                                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 41"), "AnimeReleaseActivity");
                                                        }
                                                        schedulesTabFragment.updateScheduledAnime();
                                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 42"), "AnimeReleaseActivity");
                                                        }
                                                    }
                                                    ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();
                                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                        Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 43 releasedTabFragment "+releasedTabFragment), "AnimeReleaseActivity");
                                                    }
                                                    if (releasedTabFragment != null) {
                                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 44"), "AnimeReleaseActivity");
                                                        }
                                                        releasedTabFragment.updateReleasedAnime();
                                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                            Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 45"), "AnimeReleaseActivity");
                                                        }
                                                    }
                                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                        Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 46"), "AnimeReleaseActivity");
                                                    }
                                                    showToast(Toast.makeText(this, "Anime Releases has been Imported", Toast.LENGTH_SHORT));
                                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                        Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 47"), "AnimeReleaseActivity");
                                                    }
                                                } else {
                                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                        Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 22.5"), "AnimeReleaseActivity");
                                                    }
                                                    showToast(Toast.makeText(this, "Something went wrong", Toast.LENGTH_SHORT));
                                                }
                                                objectIn.close();
                                            } else {
                                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 16.5"), "AnimeReleaseActivity");
                                                }
                                                showToast(Toast.makeText(this, "Something went wrong", Toast.LENGTH_SHORT));
                                            }
                                        } catch (Exception ignored) {
                                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 14.5"), "AnimeReleaseActivity");
                                            }
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
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 7"), "AnimeReleaseActivity");
                                }
                                AlertDialog dialog = alertDialog.create();
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 8 dialog "+dialog), "AnimeReleaseActivity");
                                }
                                Window dialogWindow = dialog.getWindow();
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 9 dialogWindow "+dialogWindow), "AnimeReleaseActivity");
                                }
                                if (dialogWindow!=null) {
                                    dialogWindow.setBackgroundDrawableResource(R.drawable.dialog);
                                }
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 10"), "AnimeReleaseActivity");
                                }
                                dialog.show();
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 11"), "AnimeReleaseActivity");
                                }
                            } catch (Exception ignored) {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                    Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 5.5"), "AnimeReleaseActivity");
                                }
                                showToast(Toast.makeText(this, "Something went wrong", Toast.LENGTH_SHORT));
                            }
                        } else {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                Utils.handleUncaughtException(AnimeReleaseActivity.this.getApplicationContext(), new Exception("import 4.5"), "AnimeReleaseActivity");
                            }
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

        ImageView completed_anime_switch = findViewById(R.id.completed_anime_switch);
        if (showUnwatchedAnime) {
            completed_anime_switch.setImageResource(R.drawable.not_done_white);
        } else {
            completed_anime_switch.setImageResource(R.drawable.done_white);
        }
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

        ImageView backupAnimeReleases = findViewById(R.id.backup_anime_releases);
        backupAnimeReleases.setVisibility(View.VISIBLE);
        backupAnimeReleases.setOnClickListener(view -> backupBottomDialog());

        String[] animeReleaseOption = {"Updates", "My List", "Watching", "Finished", "Others"};
        ArrayAdapter<String> animeReleaseOptionsAdapter = new ArrayAdapter<>(this, R.layout.spinner_item, animeReleaseOption);
        animeReleaseOptionsAdapter.setDropDownViewResource(R.layout.spinner_dropdown);
        animeReleaseSpinner.setAdapter(animeReleaseOptionsAdapter);

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

        TabLayout tabLayout = findViewById(R.id.tab_layout);

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

        weakActivity = new WeakReference<>(AnimeReleaseActivity.this);
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
            if (mainActivity!=null) {
                mainActivity.checkEntries();
            }
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
