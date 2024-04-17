package com.example.kanshi;

import java.time.LocalDateTime;
import java.util.ArrayList;

public class AnimeReleaseGroup {
    public final String dateString;
    public final LocalDateTime date;
    public final ArrayList<AnimeNotification> anime;
    public AnimeReleaseGroup(String dateString, LocalDateTime date, ArrayList<AnimeNotification> anime) {
        this.dateString = dateString;
        this.date = date;
        this.anime = anime;
    }
}
