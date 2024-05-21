package com.example.kanshi;

public class Configs {
    public static final boolean isOwner = false;
    public static final boolean isDebug = false;
    public static final int appID = 401;

    private static final String uniqueKey = "Kanshi.Anime.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70";
    public static final String isBackgroundUpdateKey = uniqueKey+".isBackgroundUpdate";
    public static final String visitedKey = uniqueKey+".visited";
    public static final String isOwnerKey = uniqueKey+".isOwner";

    public static final int UPDATE_DATA_PENDING_INTENT = 994;

    public static final int NOTIFICATION_DATA_EVICTION = 993;
    public static final String DATA_EVICTION_CHANNEL = "data_eviction_channel";
}
