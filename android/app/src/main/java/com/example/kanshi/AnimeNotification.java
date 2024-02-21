package com.example.kanshi;

import java.io.Serializable;

class AnimeNotification implements Serializable {
    final long animeId;
    final String title;
    final public long releaseEpisode;
    public long maxEpisode;
    final public long releaseDateMillis;
    final byte[] imageByte;
    final boolean isMyAnime;
    public String message;
    public AnimeNotification(long animeId, String title, long releaseEpisode, long maxEpisode, long releaseDateMillis, byte[] imageByte, boolean isMyAnime) {
        this.animeId = animeId;
        this.title = title;
        this.releaseEpisode = releaseEpisode;
        this.maxEpisode = maxEpisode;
        this.releaseDateMillis = releaseDateMillis;
        this.imageByte = imageByte;
        this.isMyAnime = isMyAnime;
    }
}
