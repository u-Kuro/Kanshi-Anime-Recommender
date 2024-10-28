package com.example.kanshi;

import static com.example.kanshi.LocalPersistence.getLockForFileName;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.view.LayoutInflater;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
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
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;


@RequiresApi(api = Build.VERSION_CODES.O)
public class MediaReleaseActivity extends AppCompatActivity {
    public static WeakReference<MediaReleaseActivity> weakActivity;
    public static final AtomicBoolean showUnseenMedia = new AtomicBoolean(false);
    public static final AtomicReference<String> selectedMediaReleaseOption = new AtomicReference<>("Updates");
    private final CustomTabsHelper customTabsIntent = CustomTabsHelper.getInstance();
    Spinner mediaReleaseSpinner;
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
                        String fileNameHolder = "your file";
                        String importedFileName;
                        String filepath = uri.getPath();
                        if (filepath!=null) {
                            importedFileName = new File(filepath).getName();
                            fileNameHolder = "\""+importedFileName+"\"";
                        } else {
                            importedFileName = null;
                        }
                        AlertDialog.Builder alertDialog = new AlertDialog.Builder(MediaReleaseActivity.this)
                            .setTitle("Confirmation")
                            .setMessage("Do you want to import "+fileNameHolder+"?")
                            .setPositiveButton("OK", ((dialogInterface, i) -> {
                                if (MediaNotificationManager.allMediaNotification.isEmpty()) {
                                    try {
                                        @SuppressWarnings("unchecked") ConcurrentHashMap<String, MediaNotification> $allMediaNotification = (ConcurrentHashMap<String, MediaNotification>) LocalPersistence.readObjectFromFile(this, "allMediaNotification");
                                        if ($allMediaNotification != null && !$allMediaNotification.isEmpty()) {
                                            MediaNotificationManager.allMediaNotification.putAll($allMediaNotification);
                                        }
                                    } catch (Exception ignored) {}
                                }
                                ReentrantLock importedFileNameLock = null;
                                if (importedFileName!=null) {
                                    importedFileNameLock = getLockForFileName(importedFileName);
                                    importedFileNameLock.lock();
                                }
                                ParcelFileDescriptor pfd = null;
                                FileInputStream fileIn = null;
                                ObjectInputStream objectIn = null;
                                Object object;
                                boolean hasImportedFile = false;
                                try {
                                    pfd = getContentResolver().openFileDescriptor(uri, "r");
                                    if (pfd != null) {
                                        fileIn = new FileInputStream(pfd.getFileDescriptor());
                                        objectIn = new ObjectInputStream(fileIn);
                                        object = objectIn.readObject();
                                        @SuppressWarnings("unchecked") ConcurrentHashMap<String, MediaNotification> $importedAllMediaNotification = (ConcurrentHashMap<String, MediaNotification>) object;
                                        if ($importedAllMediaNotification != null && !$importedAllMediaNotification.isEmpty()) {
                                            ArrayList<Map.Entry<String, MediaNotification>> allMediaNotificationEntries = new ArrayList<>($importedAllMediaNotification.entrySet());
                                            hasImportedFile = !allMediaNotificationEntries.isEmpty();
                                            for (int j = 0; j < allMediaNotificationEntries.size(); j++) {
                                                Map.Entry<String, MediaNotification> currentEntry = allMediaNotificationEntries.get(j);
                                                MediaNotificationManager.allMediaNotification.putIfAbsent(currentEntry.getKey(), currentEntry.getValue());
                                            }
                                            showToast(Toast.makeText(this, "File has been imported", Toast.LENGTH_SHORT));
                                        } else {
                                            showToast(Toast.makeText(this, "Invalid file", Toast.LENGTH_SHORT));
                                        }
                                    } else {
                                        showToast(Toast.makeText(this, "Failed to open", Toast.LENGTH_SHORT));
                                    }
                                } catch (Exception e) {
                                    showToast(Toast.makeText(this, "Something went wrong", Toast.LENGTH_SHORT));
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                        Utils.handleUncaughtException(MediaReleaseActivity.this.getApplicationContext(), e, "MediaReleaseActivity chooseImportFile");
                                    }
                                    e.printStackTrace();
                                } finally {
                                    try {
                                        if (objectIn != null) {
                                            objectIn.close();
                                        }
                                        if (fileIn != null) {
                                            fileIn.close();
                                        }
                                        if (pfd != null) {
                                            pfd.close();
                                        }
                                    } catch (Exception ignored) {}
                                    if (importedFileNameLock != null) {
                                        importedFileNameLock.unlock();
                                    }
                                    if (hasImportedFile) {
                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                                            SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
                                            if (schedulesTabFragment != null) {
                                                schedulesTabFragment.updateScheduledMedia(false, false);
                                            }
                                            ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();
                                            if (releasedTabFragment != null) {
                                                releasedTabFragment.updateReleasedMedia(false, false);
                                            }
                                        }
                                        if (!MediaNotificationManager.allMediaNotification.isEmpty()) {
                                            LocalPersistence.writeObjectToFile(this, MediaNotificationManager.allMediaNotification, "allMediaNotification");
                                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                                Utils.exportReleasedMedia(this.getApplicationContext());
                                            }
                                        }
                                    }
                                }
                            }))
                            .setNegativeButton("CANCEL", null);
                        AlertDialog dialog = alertDialog.create();
                        Window dialogWindow = dialog.getWindow();
                        if (dialogWindow!=null) {
                            dialogWindow.setBackgroundDrawableResource(R.drawable.dialog);
                        }
                        dialog.show();
                    }
            );

    @RequiresApi(api = Build.VERSION_CODES.O)
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        // Log Errors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Thread.setDefaultUncaughtExceptionHandler((thread, e) -> Utils.handleUncaughtException(MediaReleaseActivity.this.getApplicationContext(), e, "MediaReleaseActivity"));
        }

        super.onCreate(savedInstanceState);
        setContentView(R.layout.media_releases_activity);
        // Init Global Variables
        mediaReleaseSpinner = findViewById(R.id.media_release_spinner);
        viewPager = findViewById(R.id.view_pager);
        prefs = this.getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
        prefsEdit = prefs.edit();
        showUnseenMedia.set(prefs.getBoolean("showUnseenMedia", false));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            final WindowInsetsController insetsController = getWindow().getInsetsController();
            if (insetsController != null) {
                insetsController.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        }
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().getDecorView().setBackgroundColor(Color.BLACK);

        recheckStatusBar();

        ImageView completedMediaSwitch = findViewById(R.id.completed_media_switch);
        if (showUnseenMedia.get()) {
            completedMediaSwitch.setImageResource(R.drawable.not_done_white);
        } else {
            completedMediaSwitch.setImageResource(R.drawable.done_white);
        }

        ImageView backupMediaReleases = findViewById(R.id.back_up_media_releases);
        backupMediaReleases.setVisibility(View.VISIBLE);

        String[] mediaReleaseOption = {"Updates", "My List", "Watching", "Finished", "Others"};
        ArrayAdapter<String> mediaReleaseOptionsAdapter = new ArrayAdapter<>(this, R.layout.spinner_item, mediaReleaseOption);
        mediaReleaseOptionsAdapter.setDropDownViewResource(R.layout.spinner_dropdown);
        mediaReleaseSpinner.setAdapter(mediaReleaseOptionsAdapter);

        TabLayout tabLayout = findViewById(R.id.tab_layout);

        FragmentStateAdapter adminViewAdapter = new MediaReleaseViewAdapter(this);

        viewPager.setAdapter(adminViewAdapter);
        viewPager.setOffscreenPageLimit(adminViewAdapter.getItemCount());

        ImageView close = findViewById(R.id.close_media_release);
        close.setOnClickListener(view -> {
            Intent i = new Intent(this, MainActivity.class);
            i.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            finish();
            overridePendingTransition(R.anim.none, R.anim.fade_out);
            startActivity(i);
        });

        viewPager.registerOnPageChangeCallback(new ViewPager2.OnPageChangeCallback() {
            @Override
            public void onPageSelected(int position) {
                super.onPageSelected(position);
                TabLayout.Tab tab = tabLayout.getTabAt(position);
                if (tab!=null) {
                    tab.select();
                }
                prefsEdit.putInt("selectedMediaReleasePageIndex", position).apply();
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

        selectedMediaReleaseOption.set(prefs.getString("mediaReleaseOption", "Updates"));
        switch (selectedMediaReleaseOption.get()) {
            case "My List":
                mediaReleaseSpinner.setSelection(1, false);
                break;
            case "Watching":
                mediaReleaseSpinner.setSelection(2, false);
                break;
            case "Finished":
                mediaReleaseSpinner.setSelection(3, false);
                break;
            case "Others":
                mediaReleaseSpinner.setSelection(4, false);
                break;
            default:
                mediaReleaseSpinner.setSelection(0, false);
                break;
        }

        mediaReleaseSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @RequiresApi(api = Build.VERSION_CODES.O)
            @Override
            public void onItemSelected(AdapterView<?> adapterView, View view, int i, long l) {
                if (adapterView == null) return;

                Object item = adapterView.getItemAtPosition(i);
                if (item == null) return;

                String newSelectedMediaReleaseOption = item.toString();
                if (newSelectedMediaReleaseOption.isEmpty()) return;
                selectedMediaReleaseOption.set(newSelectedMediaReleaseOption);

                prefsEdit.putString("mediaReleaseOption", selectedMediaReleaseOption.get()).apply();

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
                    if (schedulesTabFragment != null) {
                        schedulesTabFragment.updateScheduledMedia(false, true);
                    }
                    ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();
                    if (releasedTabFragment != null) {
                        releasedTabFragment.updateReleasedMedia(false, true);
                    }
                }
            }
            @Override
            public void onNothingSelected(AdapterView<?> adapterView) {}
        });

        backupMediaReleases.setOnClickListener(view -> backupBottomDialog());

        completedMediaSwitch.setOnClickListener(view -> {
            showUnseenMedia.set(!showUnseenMedia.get());
            if (showUnseenMedia.get()) {
                completedMediaSwitch.setImageResource(R.drawable.not_done_white);
            } else {
                completedMediaSwitch.setImageResource(R.drawable.done_white);
            }
            prefsEdit.putBoolean("showUnseenMedia", showUnseenMedia.get()).apply();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
                if (schedulesTabFragment != null) {
                    schedulesTabFragment.updateScheduledMedia(false, true);
                }
                ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();
                if (releasedTabFragment != null) {
                    releasedTabFragment.updateReleasedMedia(false, true);
                }
            }
        });

        int selectedMediaReleasePageIndex = prefs.getInt("selectedMediaReleasePageIndex", 0);
        viewPager.setCurrentItem(selectedMediaReleasePageIndex, false);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                Intent i = new Intent(MediaReleaseActivity.this, MainActivity.class);
                i.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                finish();
                overridePendingTransition(R.anim.none, R.anim.fade_out);
                startActivity(i);
            }
        });

        weakActivity = new WeakReference<>(MediaReleaseActivity.this);
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
        recheckStatusBar();
        if (viewPager!=null) {
            viewPager.beginFakeDrag();
            viewPager.fakeDragBy(1);
            viewPager.endFakeDrag();
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.O)
    public void backupBottomDialog() {
        if (bottomSheetDialog != null && bottomSheetDialog.isShowing()) {
            bottomSheetDialog.dismiss();
        }

        bottomSheetDialog = new BottomSheetDialog(this);
        LayoutInflater inflater = getLayoutInflater();
        @SuppressLint("InflateParams") View bottomSheet = inflater.inflate(R.layout.backup_drawer, null);
        bottomSheetDialog.setContentView(bottomSheet);

        LinearLayout importMediaReleases = bottomSheetDialog.findViewById(R.id.import_media_releases);

        if (importMediaReleases==null) {
            showToast(Toast.makeText(this,"Something went wrong", Toast.LENGTH_SHORT));
            return;
        }

        importMediaReleases.setOnClickListener(view -> {
            chooseImportFile.launch("application/octet-stream");
            showToast(Toast.makeText(getApplicationContext(), "Please select your backup file", Toast.LENGTH_LONG));
        });

        if (MediaNotificationManager.allMediaNotification.isEmpty()) {
            try {
                @SuppressWarnings("unchecked") ConcurrentHashMap<String, MediaNotification> $allMediaNotification = (ConcurrentHashMap<String, MediaNotification>) LocalPersistence.readObjectFromFile(this, "allMediaNotification");
                if ($allMediaNotification != null && !$allMediaNotification.isEmpty()) {
                    MediaNotificationManager.allMediaNotification.putAll($allMediaNotification);
                }
            } catch (Exception ignored) {}
        }

        LinearLayout autoExportMediaReleases = bottomSheetDialog.findViewById(R.id.auto_export_media_releases);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (autoExportMediaReleases != null) {
                autoExportMediaReleases.setVisibility(View.VISIBLE);
                TextView autoExportMediaReleasesText = autoExportMediaReleases.findViewById(R.id.auto_export_media_releases_textview);
                ImageView autoExportMediaReleasesImage = autoExportMediaReleases.findViewById(R.id.auto_export_media_releases_imageview);

                if (autoExportMediaReleasesText == null || autoExportMediaReleasesImage == null) {
                    showToast(Toast.makeText(this, "Something went wrong", Toast.LENGTH_SHORT));
                    return;
                }

                boolean autoExportReleasedMedia = prefs.getBoolean("autoExportReleasedMedia", false);

                if (autoExportReleasedMedia) {
                    autoExportMediaReleasesText.setText(R.string.enabled_automatic_back_up);
                    autoExportMediaReleasesImage.setImageResource(R.drawable.sync_white);
                } else {
                    autoExportMediaReleasesText.setText(R.string.disabled_automatic_back_up);
                    autoExportMediaReleasesImage.setImageResource(R.drawable.sync_disabled_white);
                }

                autoExportMediaReleases.setOnClickListener(view -> {
                    final boolean newAutoExportReleasedMedia = !autoExportReleasedMedia;
                    prefsEdit.putBoolean("autoExportReleasedMedia", newAutoExportReleasedMedia).apply();
                    if (newAutoExportReleasedMedia) {
                        Utils.exportReleasedMedia(MediaReleaseActivity.this);
                    }
                    bottomSheetDialog.dismiss();
                });
            } else {
                showToast(Toast.makeText(this, "Something went wrong", Toast.LENGTH_SHORT));
            }
        } else if (autoExportMediaReleases != null) {
            autoExportMediaReleases.setVisibility(View.GONE);
        }

        bottomSheetDialog.show();
    }

    public void openMediaInAniList(String url) {
        try {
            customTabsIntent.launchUrl(
                MediaReleaseActivity.this,
                Uri.parse(url),
                getResources().getColor(R.color.dark_blue),
                true
            );
            overridePendingTransition(R.anim.remove, R.anim.remove);
        } catch (Exception ignored) {
            showToast(Toast.makeText(getApplicationContext(), "Can't open the link", Toast.LENGTH_LONG));
        }
    }

    public void showToast(Toast toast) {
        if (currentToast != null) {
            currentToast.cancel();
        }
        currentToast = toast;
        currentToast.show();
    }

    public void recheckStatusBar() {
        if (getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE) {
            hideStatusBar();
        } else {
            showStatusBar();
        }
    }
    public void showStatusBar() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            final WindowInsetsController insetsController = getWindow().getInsetsController();
            if (insetsController != null) {
                insetsController.show(WindowInsets.Type.statusBars());
            }
        }
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
    }
    public void hideStatusBar() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            final WindowInsetsController insetsController = getWindow().getInsetsController();
            if (insetsController != null) {
                insetsController.hide(WindowInsets.Type.statusBars());
            }
            getWindow().setFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
        } else {
            getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
            );
        }
    }
    public static MediaReleaseActivity getInstanceActivity() {
        if (weakActivity != null) {
            return weakActivity.get();
        } else {
            return null;
        }
    }
}
