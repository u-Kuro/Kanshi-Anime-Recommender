package com.example.kanshi;

import java.util.ArrayList;

public class AnimeReleaseGroup {
    public final String dateString;
    public final ArrayList<AnimeNotification> anime;
    public AnimeReleaseGroup(String dateString, ArrayList<AnimeNotification> anime) {
        this.dateString = dateString;
        this.anime = anime;
    }
}
