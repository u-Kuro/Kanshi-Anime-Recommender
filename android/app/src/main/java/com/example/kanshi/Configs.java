package com.example.kanshi;

import android.content.Context;
import android.graphics.Bitmap;

import androidx.webkit.WebViewAssetLoader;

import java.util.ArrayList;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class Configs {
    public static final boolean isOwner = false;
    public static final boolean isDebug = false;
    public static final int appID = 414;

    private static final String uniqueKey = "Kanshi.Anime.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70";
    public static final String isBackgroundUpdateKey = uniqueKey+".isBackgroundUpdate";
    public static final String visitedKey = uniqueKey+".visited";
    public static final String isOwnerKey = uniqueKey+".isOwner";

    public static final int UPDATE_DATA_PENDING_INTENT = 994;

    public static final int NOTIFICATION_DATA_EVICTION = 993;
    public static final String DATA_EVICTION_CHANNEL = "data_eviction_channel";

    public static final Map<String, Bitmap> imageCache = new ConcurrentHashMap<>();
    public static ArrayList<AnimeReleaseGroup> loadedGroupedReleasedAnime = new ArrayList<>();
    public static ArrayList<AnimeReleaseGroup> loadedGroupedAnimeSchedules = new ArrayList<>();

    public static WebViewAssetLoader assetLoader;
    public static WebViewAssetLoader getAssetLoader(Context context) {
        if (assetLoader==null) {
            assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(context))
                .build();
        }
        return assetLoader;
    }
}
