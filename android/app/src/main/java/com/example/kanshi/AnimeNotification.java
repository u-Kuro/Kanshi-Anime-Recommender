package com.example.kanshi;

import java.io.Serializable;

class AnimeNotification implements Serializable {
    final int animeId;
    final String title;
    final public int releaseEpisode;
    public int maxEpisode;
    final public long releaseDateMillis;
    final byte[] imageByte;
    final boolean isMyAnime;
    public AnimeNotification(int animeId, String title, int releaseEpisode, int maxEpisode, long releaseDateMillis, byte[] imageByte, boolean isMyAnime) {
        this.animeId = animeId;
        this.title = title;
        this.releaseEpisode = releaseEpisode;
        this.maxEpisode = maxEpisode;
        this.releaseDateMillis = releaseDateMillis;
        this.imageByte = imageByte;
        this.isMyAnime = isMyAnime;
    }
}
