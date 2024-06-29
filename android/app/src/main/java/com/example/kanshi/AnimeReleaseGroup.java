package com.example.kanshi;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Objects;

public class AnimeReleaseGroup extends GroupedListItem {
    public final String dateString;
    public final LocalDateTime date;
    public final ArrayList<AnimeNotification> anime;
    public AnimeReleaseGroup(String dateString, LocalDateTime date, ArrayList<AnimeNotification> anime) {
        this.dateString = dateString;
        this.date = date;
        this.anime = anime;
    }
    @Override
    public int getType() {
        return HEADER;
    }
    @Override
    public boolean isNotEqual(GroupedListItem item) {
        if (getType() != item.getType()) {
            return true;
        }
        AnimeReleaseGroup animeReleaseGroup = (AnimeReleaseGroup) item;
        return !Objects.equals(animeReleaseGroup.dateString, dateString);
    }
}
