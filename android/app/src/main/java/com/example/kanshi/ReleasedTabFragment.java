package com.example.kanshi;

import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ListView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.fragment.app.Fragment;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.lang.ref.WeakReference;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@RequiresApi(api = Build.VERSION_CODES.N)
public class ReleasedTabFragment extends Fragment {
    public static WeakReference<ReleasedTabFragment> weakActivity;
    Context context;
    ListView animeReleasesList;
    SwipeRefreshLayout swipeRefresh;
    ArrayList<AnimeReleaseGroup> groupedReleasedAnime = null;
    AnimeReleaseGroupAdapter animeReleaseGroupAdapter = null;

    @RequiresApi(api = Build.VERSION_CODES.O)
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        context = requireContext();
        // Log Errors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Thread.setDefaultUncaughtExceptionHandler((thread, e) -> Utils.handleUncaughtException(context.getApplicationContext(), e, "ReleasedTabFragment"));
        }

        View releasedView = inflater.inflate(R.layout.anime_release_tab_fragment, container, false);
        // Init Global Variables
        animeReleasesList = releasedView.findViewById(R.id.anime_releases_list);
        swipeRefresh = releasedView.findViewById(R.id.swipe_refresh_anime_release);

        swipeRefresh.setProgressBackgroundColorSchemeResource(R.color.darker_grey);
        swipeRefresh.setColorSchemeResources(R.color.faded_white);

        swipeRefresh.setOnRefreshListener(() -> {
            MainActivity mainActivity = MainActivity.getInstanceActivity();
            if (mainActivity!=null) {
                mainActivity.updateCurrentNotifications();
                mainActivity.checkEntries();
            }
            updateReleasedAnime();
            swipeRefresh.setRefreshing(false);
        });

        updateReleasedAnime();

        weakActivity = new WeakReference<>(ReleasedTabFragment.this);
        return releasedView;
    }

    private final ExecutorService updateReleasedAnimeExecutorService = Executors.newFixedThreadPool(1);
    private Future<?> updateReleasedAnimeFuture;
    @RequiresApi(api = Build.VERSION_CODES.O)
    public void updateReleasedAnime() {
        AnimeReleaseActivity animeReleaseActivity = AnimeReleaseActivity.getInstanceActivity();
        final String selectedAnimeReleaseOption;
        final boolean showUnwatchedAnime;
        if (animeReleaseActivity!=null) {
            showUnwatchedAnime = animeReleaseActivity.showUnwatchedAnime;
            if (animeReleaseActivity.animeReleaseSpinner!=null && animeReleaseActivity.animeReleaseSpinner.getSelectedItem()!=null) {
                selectedAnimeReleaseOption = animeReleaseActivity.animeReleaseSpinner.getSelectedItem().toString();
            } else {
                selectedAnimeReleaseOption = "Updates";
            }
        } else {
            showUnwatchedAnime = false;
            selectedAnimeReleaseOption = "Updates";
        }

        if (updateReleasedAnimeFuture != null && !updateReleasedAnimeFuture.isCancelled()) {
            updateReleasedAnimeFuture.cancel(true);
        }
        updateReleasedAnimeFuture = updateReleasedAnimeExecutorService.submit(() -> {
            try {
                if (AnimeNotificationManager.allAnimeNotification.isEmpty()) {
                    @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(context, "allAnimeNotification");
                    if ($allAnimeNotification != null && !$allAnimeNotification.isEmpty()) {
                        AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
                    }
                }

                ArrayList<AnimeNotification> allAnimeNotificationValues = new ArrayList<>(AnimeNotificationManager.allAnimeNotification.values());
                Collections.sort(allAnimeNotificationValues, Comparator.comparingLong(anime -> anime.releaseDateMillis));

                ArrayList<AnimeNotification> animeReleased = new ArrayList<>();

                for (AnimeNotification anime : allAnimeNotificationValues) {
                    if (!"Updates".equals(selectedAnimeReleaseOption)) {
                        boolean isMyAnime = anime.userStatus != null && !anime.userStatus.isEmpty() && !anime.userStatus.equalsIgnoreCase("UNWATCHED");
                        switch (selectedAnimeReleaseOption) {
                            case "My List":
                                if (!isMyAnime) {
                                    continue;
                                }
                                break;
                            case "Watching":
                                if (!isMyAnime || !("CURRENT".equalsIgnoreCase(anime.userStatus) || "REPEATING".equalsIgnoreCase(anime.userStatus))) {
                                    continue;
                                }
                                break;
                            case "Finished":
                                if (!isMyAnime || anime.releaseEpisode < anime.maxEpisode || anime.maxEpisode <= 0) {
                                    continue;
                                }
                                break;
                            case "Others":
                                if (isMyAnime) {
                                    continue;
                                }
                                break;
                        }
                    }
                    if (anime.releaseDateMillis <= System.currentTimeMillis()) {
                        final boolean isNotComplete = !("COMPLETED".equalsIgnoreCase(anime.userStatus) || ("My List".equals(selectedAnimeReleaseOption) && "DROPPED".equalsIgnoreCase(anime.userStatus)));
                        final boolean isNotWatched = anime.episodeProgress == 0 || anime.episodeProgress < anime.releaseEpisode;
                        if (!showUnwatchedAnime || (isNotComplete && isNotWatched)) {
                            if (anime.maxEpisode < 0) { // No Given Max Episodes
                                anime.message = "Episode " + anime.releaseEpisode;
                            } else if (anime.releaseEpisode >= anime.maxEpisode) {
                                anime.message = "Finished Airing: Episode " + anime.releaseEpisode;
                            } else {
                                anime.message = "Episode " + anime.releaseEpisode + " / " + anime.maxEpisode;
                            }
                            animeReleased.add(anime);
                        }
                    }
                }

                Map<String, ArrayList<AnimeNotification>> map = new TreeMap<>();
                for (AnimeNotification anime : animeReleased) {
                    DateTimeFormatter shownDateFormat = DateTimeFormatter.ofPattern("MMMM d yyyy, EEEE");
                    DateTimeFormatter shownWeekDayFormat = DateTimeFormatter.ofPattern("EEEE");

                    Instant releaseDateInstant = Instant.ofEpochMilli(anime.releaseDateMillis);
                    LocalDate localDate = releaseDateInstant.atZone(ZoneId.systemDefault()).toLocalDate();
                    LocalDate today = LocalDate.now();

                    String dateStr;
                    if (localDate.isAfter(today.plusDays(6))) { // more than a week
                        dateStr = shownDateFormat.format(localDate);
                    } else if (localDate.isAfter(today.plusDays(1))) { // more than a day
                        dateStr = shownWeekDayFormat.format(localDate);
                    } else if (localDate.isAfter(today)) {
                        dateStr = "Tomorrow, " + shownWeekDayFormat.format(localDate);
                    } else if (localDate.isEqual(today)) {
                        dateStr = "Today, " + shownWeekDayFormat.format(localDate);
                    } else if (localDate.isAfter(today.minusWeeks(1))) {
                        long daysDifference = ChronoUnit.DAYS.between(localDate, today);
                        if (daysDifference == 1) {
                            LocalDateTime localDateTime = LocalDateTime.ofInstant(releaseDateInstant, ZoneId.systemDefault());
                            LocalDateTime now = LocalDateTime.now();
                            long minutesDifference = ChronoUnit.MINUTES.between(localDateTime, now);
                            if (minutesDifference == 1) {
                                dateStr = "1 minute ago" + ", " + shownWeekDayFormat.format(localDate);
                            } else if (minutesDifference < 60) {
                                dateStr = minutesDifference + " minutes ago" + ", " + shownWeekDayFormat.format(localDate);
                            } else {
                                dateStr = "Yesterday" + ", " + shownWeekDayFormat.format(localDate);
                            }
                        } else {
                            dateStr = daysDifference + " days ago" + ", " + shownWeekDayFormat.format(localDate);
                        }
                    } else {
                        dateStr = shownDateFormat.format(localDate);
                    }

                    if (!map.containsKey(dateStr)) {
                        map.put(dateStr, new ArrayList<>());
                    }
                    if (map.containsKey(dateStr)) {
                        Objects.requireNonNull(map.get(dateStr)).add(anime);
                    }
                }

                ArrayList<AnimeReleaseGroup> groupedReleasedAnime = new ArrayList<>();
                for (Map.Entry<String, ArrayList<AnimeNotification>> entry : map.entrySet()) {
                    ArrayList<AnimeNotification> animeList = entry.getValue();
                    if (animeList != null && !animeList.isEmpty()) {
                        Collections.sort(animeList, (a1, a2) -> Long.compare(a2.releaseDateMillis, a1.releaseDateMillis));

                        AnimeNotification anime = animeList.get(0);
                        LocalDateTime localDateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(anime.releaseDateMillis), ZoneId.systemDefault());

                        groupedReleasedAnime.add(new AnimeReleaseGroup(entry.getKey(), localDateTime, animeList));
                    }
                }

                Collections.sort(groupedReleasedAnime, (a1, a2) -> {
                    try {
                        if (a1.date == null && a2.date == null) return 0;
                        if (a1.date == null) return 1;
                        if (a2.date == null) return -1;
                        return a2.date.compareTo(a1.date);
                    } catch (Exception e) {
                        return 0;
                    }
                });
                if (ReleasedTabFragment.this.groupedReleasedAnime == null) {
                    ReleasedTabFragment.this.groupedReleasedAnime = groupedReleasedAnime;
                    new Handler(Looper.getMainLooper()).post(() -> {
                        ReleasedTabFragment.this.animeReleaseGroupAdapter = new AnimeReleaseGroupAdapter(context, R.layout.anime_release_group_card, ReleasedTabFragment.this.groupedReleasedAnime);
                        ReleasedTabFragment.this.animeReleasesList.setAdapter(animeReleaseGroupAdapter);
                    });
                } else {
                    ReleasedTabFragment.this.groupedReleasedAnime.clear();
                    ReleasedTabFragment.this.groupedReleasedAnime.addAll(groupedReleasedAnime);
                    new Handler(Looper.getMainLooper()).post(() -> ReleasedTabFragment.this.animeReleaseGroupAdapter.notifyDataSetChanged());
                }
            } catch (Exception e) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context.getApplicationContext(), e, "updateReleasedAnimeExecutorService");
                }
            }
        });
    }

    public static ReleasedTabFragment getInstanceActivity() {
        if (weakActivity != null) {
            return weakActivity.get();
        } else {
            return null;
        }
    }
}