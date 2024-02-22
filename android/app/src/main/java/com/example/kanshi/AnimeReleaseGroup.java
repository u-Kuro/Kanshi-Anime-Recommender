package com.example.kanshi;

import java.util.ArrayList;
import java.util.Date;

public class AnimeReleaseGroup {
    public final String dateString;
    public final Date date;
    public final ArrayList<AnimeNotification> anime;
    public AnimeReleaseGroup(String dateString, Date date, ArrayList<AnimeNotification> anime) {
        this.dateString = dateString;
        this.date = date;
        this.anime = anime;
    }
}
