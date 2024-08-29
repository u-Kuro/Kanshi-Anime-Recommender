package com.example.kanshi;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Objects;

public class MediaReleaseGroup extends GroupedListItem {
    public final String dateString;
    public final LocalDateTime date;
    public final ArrayList<MediaNotification> media;
    public MediaReleaseGroup(String dateString, LocalDateTime date, ArrayList<MediaNotification> media) {
        this.dateString = dateString;
        this.date = date;
        this.media = media;
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
        MediaReleaseGroup mediaReleaseGroup = (MediaReleaseGroup) item;
        return !Objects.equals(mediaReleaseGroup.dateString, dateString);
    }
}
