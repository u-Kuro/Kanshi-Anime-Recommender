package com.example.kanshi;

import java.io.Serializable;
import java.util.Arrays;
import java.util.Objects;

class AnimeNotification extends GroupedListItem implements Serializable {
    private static final long serialVersionUID = 7899732545740810962L;
    final long animeId;
    final public long releaseEpisode;
    final byte[] imageByte;
    final public long releaseDateMillis;

    public final String title;
    public long maxEpisode;
    public final String animeUrl;
    public final String userStatus;
    public String message;
    public final long episodeProgress;
    public AnimeNotification(long animeId, String title, long releaseEpisode, long maxEpisode, long releaseDateMillis, byte[] imageByte, String animeUrl, String userStatus, long episodeProgress) {
        this.animeId = animeId;
        this.title = title;
        this.releaseEpisode = releaseEpisode;
        this.maxEpisode = maxEpisode;
        this.releaseDateMillis = releaseDateMillis;
        this.imageByte = imageByte;
        this.animeUrl = animeUrl;
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
        AnimeNotification anime = (AnimeNotification) item;
        return anime.animeId!=animeId
            || anime.releaseDateMillis!=releaseDateMillis
            || anime.releaseEpisode!=releaseEpisode
            || anime.episodeProgress!=episodeProgress
            || !Objects.equals(anime.userStatus, userStatus)
            || !Objects.equals(anime.message, message)
            || !Objects.equals(anime.animeUrl, animeUrl)
            || !Objects.equals(anime.title, title)
            || !Arrays.equals(anime.imageByte, imageByte);
    }
}
