package com.example.kanshi;

import java.io.Serializable;

class AnimeNotification implements Serializable {
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
}
