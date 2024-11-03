package com.example.kanshi;

import java.io.Serializable;
import java.util.Arrays;
import java.util.Objects;

public class MediaNotification extends GroupedListItem implements Serializable {
    private static final long serialVersionUID = 7899732545740810962L;
    public final long mediaId;
    final public long releaseEpisode;
    public final byte[] imageByte;
    final public long releaseDateMillis;

    public final String title;
    public long maxEpisode;
    public final String mediaUrl;
    public final String userStatus;
    public String message;
    public final long episodeProgress;
    public MediaNotification(long mediaId, String title, long releaseEpisode, long maxEpisode, long releaseDateMillis, byte[] imageByte, String mediaUrl, String userStatus, long episodeProgress) {
        this.mediaId = mediaId;
        this.title = title;
        this.releaseEpisode = releaseEpisode;
        this.maxEpisode = maxEpisode;
        this.releaseDateMillis = releaseDateMillis;
        this.imageByte = imageByte;
        this.mediaUrl = mediaUrl;
        this.userStatus = userStatus;
        this.episodeProgress = episodeProgress;
    }
    @Override
    public int getType() {
        return ITEM;
    }
    @Override
    public boolean isNotEqual(GroupedListItem item) {
        if (getType() != item.getType()) {
            return true;
        }
        MediaNotification media = (MediaNotification) item;
        return media.mediaId != mediaId
            || media.releaseDateMillis!=releaseDateMillis
            || media.releaseEpisode!=releaseEpisode
            || media.episodeProgress!=episodeProgress
            || !Objects.equals(media.userStatus, userStatus)
            || !Objects.equals(media.message, message)
            || !Objects.equals(media.mediaUrl, mediaUrl)
            || !Objects.equals(media.title, title)
            || !Arrays.equals(media.imageByte, imageByte);
    }
}
