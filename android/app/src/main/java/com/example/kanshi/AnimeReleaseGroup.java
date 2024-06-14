package com.example.kanshi;

import android.content.Context;
import android.os.Build;

import java.time.LocalDateTime;
import java.util.ArrayList;

/** @noinspection BooleanMethodIsAlwaysInverted*/
public class AnimeReleaseGroup {
    public final String dateString;
    public final LocalDateTime date;
    public final ArrayList<AnimeNotification> anime;
    public AnimeReleaseGroup(String dateString, LocalDateTime date, ArrayList<AnimeNotification> anime) {
        this.dateString = dateString;
        this.date = date;
        this.anime = anime;
    }
    public boolean isEqual(AnimeReleaseGroup animeReleaseGroup, Context context) {
        return animeReleaseGroup!=null &&
               objectIsEqual(dateString, animeReleaseGroup.dateString) &&
               objectIsEqual(date, animeReleaseGroup.date) &&
               animeNotificationListIsEqual(anime, animeReleaseGroup.anime, context);
    }
    private boolean objectIsEqual(Object a, Object b) {
        if (a==null) {
            return b == null;
        }
        return a.equals(b);
    }
    private boolean animeNotificationListIsEqual(ArrayList<AnimeNotification> a, ArrayList<AnimeNotification> b, Context context) {
        if (a==null) {
            return b == null;
        } else if (b!=null) {
            if (a.size()!=b.size()) {
                return false;
            }
            try {
                for (int i = 0; i < a.size(); i++) {
                    AnimeNotification a1 = a.get(i);
                    AnimeNotification b1 = b.get(i);
                    if (a1 == null || b1 == null ||
                            !objectIsEqual(a1.animeId, b1.animeId) ||
                            !objectIsEqual(a1.releaseDateMillis, b1.releaseDateMillis) ||
                            !objectIsEqual(a1.releaseEpisode, b1.releaseEpisode) ||
                            !objectIsEqual(a1.episodeProgress, b1.episodeProgress) ||
                            !objectIsEqual(a1.userStatus, b1.userStatus) ||
                            !objectIsEqual(a1.maxEpisode, b1.maxEpisode) ||
                            !objectIsEqual(a1.animeUrl, b1.animeUrl) ||
                            !objectIsEqual(a1.title, b1.title)
                    ) {
                        return false;
                    }
                }
            } catch (Exception e) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context.getApplicationContext(), e, "animeNotificationListIsEqual");
                }
                e.printStackTrace();
            }
            return true;
        }
        return false;
    }
}
