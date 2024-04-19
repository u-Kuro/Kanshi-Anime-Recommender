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
public class SchedulesTabFragment extends Fragment {
    public static WeakReference<SchedulesTabFragment> weakActivity;
    Context context;
    ListView animeReleasesList;
    SwipeRefreshLayout swipeRefresh;
    ArrayList<AnimeReleaseGroup> groupedAnimeSchedules = null;
    AnimeReleaseGroupAdapter animeReleaseGroupAdapter = null;

    @RequiresApi(api = Build.VERSION_CODES.O)
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        weakActivity = new WeakReference<>(SchedulesTabFragment.this);

        View schedulesView = inflater.inflate(R.layout.anime_release_tab_fragment, container, false);

        context = requireContext();

        animeReleasesList = schedulesView.findViewById(R.id.anime_releases_list);

        swipeRefresh = schedulesView.findViewById(R.id.swipe_refresh_anime_release);
        swipeRefresh.setProgressBackgroundColorSchemeResource(R.color.darker_grey);
        swipeRefresh.setColorSchemeResources(R.color.faded_white);

        swipeRefresh.setOnRefreshListener(() -> {
            MainActivity mainActivity = MainActivity.getInstanceActivity();
            if (mainActivity!=null) {
                mainActivity.updateCurrentNotifications();
                mainActivity.checkEntries();
            }
            updateScheduledAnime();
            swipeRefresh.setRefreshing(false);
        });

        updateScheduledAnime();

        return schedulesView;
    }

    private final ExecutorService updateScheduledAnimeExecutorService = Executors.newFixedThreadPool(1);
    private Future<?> updateScheduledAnimeFuture;
    @RequiresApi(api = Build.VERSION_CODES.O)
    public void updateScheduledAnime() {
        AnimeReleaseActivity animeReleaseActivity = AnimeReleaseActivity.getInstanceActivity();
        final String selectedAnimeReleaseOption;
        final boolean showCompleteAnime;
        if (animeReleaseActivity!=null) {
            showCompleteAnime = animeReleaseActivity.showCompleteAnime;
            selectedAnimeReleaseOption = animeReleaseActivity.animeReleaseSpinner.getSelectedItem().toString();
        } else {
            showCompleteAnime = false;
            selectedAnimeReleaseOption = "Updates";
        }
        if (updateScheduledAnimeFuture != null && !updateScheduledAnimeFuture.isCancelled()) {
            updateScheduledAnimeFuture.cancel(true);
        }
        updateScheduledAnimeFuture = updateScheduledAnimeExecutorService.submit(() -> {
            if (AnimeNotificationManager.allAnimeNotification.isEmpty()) {
                @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(context, "allAnimeNotification");
                if ($allAnimeNotification != null && $allAnimeNotification.size() > 0) {
                    AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
                }
            }

            ArrayList<AnimeNotification> allAnimeNotificationValues = new ArrayList<>(AnimeNotificationManager.allAnimeNotification.values());
            Collections.sort(allAnimeNotificationValues, (anime1, anime2) -> Long.compare(anime2.releaseDateMillis, anime1.releaseDateMillis));

            ArrayList<AnimeNotification> animeSchedules = new ArrayList<>();

            for (AnimeNotification anime : allAnimeNotificationValues) {
                boolean isMyAnime = anime.userStatus != null && !anime.userStatus.isEmpty() && !anime.userStatus.equalsIgnoreCase("UNWATCHED");
                if (!"Updates".equals(selectedAnimeReleaseOption)) {
                    if ("My List".equals(selectedAnimeReleaseOption) && !isMyAnime) {
                        continue;
                    } else if ("Others".equals(selectedAnimeReleaseOption) && isMyAnime) {
                        continue;
                    }
                }
                if (anime.releaseDateMillis >= System.currentTimeMillis()) {
                    if (showCompleteAnime) {
                        if (anime.releaseEpisode >= anime.maxEpisode && anime.maxEpisode >= 0) {
                            anime.message = "Final: Episode " + anime.releaseEpisode;
                            animeSchedules.add(anime);
                        }
                    } else {
                        if (anime.maxEpisode < 0) { // No Given Max Episodes
                            anime.message = "Episode " + anime.releaseEpisode;
                        } else if (anime.releaseEpisode >= anime.maxEpisode) {
                            anime.message = "Final: Episode " + anime.releaseEpisode;
                        } else {
                            anime.message = "Episode " + anime.releaseEpisode + " / " + anime.maxEpisode;
                        }
                        animeSchedules.add(anime);
                    }
                }
            }

            Map<String, ArrayList<AnimeNotification>> map = new TreeMap<>();

            for (AnimeNotification anime : animeSchedules) {
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

            ArrayList<AnimeReleaseGroup> groupedAnimeSchedules = new ArrayList<>();
            for (Map.Entry<String, ArrayList<AnimeNotification>> entry : map.entrySet()) {
                ArrayList<AnimeNotification> animeList = entry.getValue();
                if (animeList != null && !animeList.isEmpty()) {
                    Collections.sort(animeList, Comparator.comparingLong(a -> a.releaseDateMillis));

                    AnimeNotification anime = animeList.get(0);
                    LocalDateTime localDateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(anime.releaseDateMillis), ZoneId.systemDefault());

                    groupedAnimeSchedules.add(new AnimeReleaseGroup(entry.getKey(), localDateTime, animeList));
                }
            }

            Collections.sort(groupedAnimeSchedules, (a1, a2) -> {
                try {
                    if (a1.date == null && a2.date == null) return 0;
                    if (a1.date == null) return 1;
                    if (a2.date == null) return -1;
                    return a1.date.compareTo(a2.date);
                } catch (Exception e) {
                    return 0;
                }
            });
            if (SchedulesTabFragment.this.groupedAnimeSchedules==null) {
                SchedulesTabFragment.this.groupedAnimeSchedules = groupedAnimeSchedules;
                new Handler(Looper.getMainLooper()).post(() -> {
                    SchedulesTabFragment.this.animeReleaseGroupAdapter = new AnimeReleaseGroupAdapter(context, R.layout.anime_release_group_card, SchedulesTabFragment.this.groupedAnimeSchedules);
                    SchedulesTabFragment.this.animeReleasesList.setAdapter(animeReleaseGroupAdapter);
                });
            } else {
                SchedulesTabFragment.this.groupedAnimeSchedules.clear();
                SchedulesTabFragment.this.groupedAnimeSchedules.addAll(groupedAnimeSchedules);
                new Handler(Looper.getMainLooper()).post(() -> SchedulesTabFragment.this.animeReleaseGroupAdapter.notifyDataSetChanged());
            }
        });
    }

    public static SchedulesTabFragment getInstanceActivity() {
        if (weakActivity != null) {
            return weakActivity.get();
        } else {
            return null;
        }
    }
}
