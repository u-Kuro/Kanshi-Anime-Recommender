package com.example.kanshi;

import static com.example.kanshi.LocalPersistence.getLockForFile;

import android.content.Context;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Environment;

import androidx.annotation.RequiresApi;
import androidx.webkit.WebViewAssetLoader;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

public class Configs {
    public static final boolean OWNER = false;

    public static String TOKEN = null;
    @RequiresApi(api = Build.VERSION_CODES.R)
    public static String getTOKEN(String directory) {
        if (directory != null && !directory.isEmpty() && Environment.isExternalStorageManager()) {
            File exportDirectory = new File(directory);
            if (exportDirectory.isDirectory()) {
                File file = new File(exportDirectory, "TOKEN.txt");
                ReentrantLock fileLock = getLockForFile(file);
                fileLock.lock();
                try {
                    if (file.exists() && file.isFile() && file.length() > 0) {
                        try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
                            String line = reader.readLine().trim();
                            if (!line.isEmpty()) {
                                return reader.readLine();
                            }
                        } catch (Exception ignored) {}
                    } else {
                        //noinspection ResultOfMethodCallIgnored
                        file.createNewFile();
                    }
                } catch (Exception ignored) {
                } finally {
                    fileLock.unlock();
                }
            }
        }
        return null;
    }
    private static final String UNIQUE_KEY = "Kanshi.Anime.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70";
    public static final String IS_BACKGROUND_UPDATE_KEY = UNIQUE_KEY +".isBackgroundUpdate";
    public static final String VISITED_KEY = UNIQUE_KEY +".visited";
    public static final String IS_OWNER_KEY = UNIQUE_KEY +".isOwner";
    public static final int UPDATE_DATA_PENDING_INTENT = 994;
    public static final int NOTIFICATION_DATA_EVICTION = 993;
    public static final String DATA_EVICTION_CHANNEL = "data_eviction_channel";
    public static final Map<String, Bitmap> imageCache = new ConcurrentHashMap<>();
    public static ArrayList<AnimeReleaseGroup> loadedGroupedReleasedAnime = new ArrayList<>();
    public static ArrayList<AnimeReleaseGroup> loadedGroupedAnimeSchedules = new ArrayList<>();
    private static WebViewAssetLoader assetLoader;
    public static WebViewAssetLoader getAssetLoader(Context context) {
        if (assetLoader==null) {
            assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(context))
                .build();
        }
        return assetLoader;
    }
}
