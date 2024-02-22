package com.example.kanshi;

import android.content.Context;
import android.os.Build;
import android.os.Bundle;
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
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;

@RequiresApi(api = Build.VERSION_CODES.N)
public class SchedulesTabFragment extends Fragment {
    public static WeakReference<SchedulesTabFragment> weakActivity;
    Context context;
    ListView animeReleasesList;
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

        SwipeRefreshLayout swipeRefresh = schedulesView.findViewById(R.id.swipe_refresh_anime_release);
        swipeRefresh.setProgressBackgroundColorSchemeResource(R.color.darker_grey);
        swipeRefresh.setColorSchemeResources(R.color.faded_white);

        swipeRefresh.setOnRefreshListener(() -> {
            MainActivity mainActivity = MainActivity.getInstanceActivity();
            if (mainActivity!=null) {
                mainActivity.updateCurrentNotifications();
            }
            updateScheduledAnime();
            swipeRefresh.setRefreshing(false);
        });

        updateScheduledAnime();

        return schedulesView;
    }

    @RequiresApi(api = Build.VERSION_CODES.O)
    public void updateScheduledAnime() {
        AnimeReleaseActivity animeReleaseActivity = AnimeReleaseActivity.getInstanceActivity();
        String selectedAnimeReleaseOption = "Updates";
        if (animeReleaseActivity!=null) {
            selectedAnimeReleaseOption = animeReleaseActivity.animeReleaseSpinner.getSelectedItem().toString();
        }

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
            if (!selectedAnimeReleaseOption.equals("Updates")) {
                if (selectedAnimeReleaseOption.equals("My List") && !anime.isMyAnime) {
                    continue;
                } else if (selectedAnimeReleaseOption.equals("Others") && anime.isMyAnime) {
                    continue;
                }
            }
            if (anime.releaseDateMillis >= System.currentTimeMillis()) {
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

        Map<String, ArrayList<AnimeNotification>> map = new TreeMap<>();

        for (AnimeNotification anime : animeSchedules) {
            SimpleDateFormat shownDateFormat = new SimpleDateFormat("MMMM d yyyy", Locale.US);
            SimpleDateFormat shownTimeFormat = new SimpleDateFormat("h:mm a", Locale.US);
            SimpleDateFormat shownWeekTimeFormat = new SimpleDateFormat("EEEE h:mm a", Locale.US);

            long nowInMillis = System.currentTimeMillis();
            long diffInMillis = nowInMillis - anime.releaseDateMillis;
            long diffInDays = diffInMillis / (24 * 60 * 60 * 1000);

            Date date = new Date(anime.releaseDateMillis);
            LocalDate localDate = date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
            LocalDate today = LocalDate.now();

            String dateStr;
            if (localDate.isAfter(today.plusDays(6))) { // more than a week
                dateStr = "Airing in " + shownDateFormat.format(date);
            } else if (localDate.isAfter(today.plusDays(1))) { // more than a day
                dateStr = "Airing in " + shownWeekTimeFormat.format(date);
            } else if (localDate.isAfter(today)) {
                dateStr = "Tomorrow at " + shownTimeFormat.format(date);
            } else if (localDate.isEqual(today)) {
                if (anime.releaseDateMillis > nowInMillis) {
                    dateStr = "Airing at " + shownTimeFormat.format(date);
                } else {
                    dateStr = "Today at " + shownTimeFormat.format(date);
                }
            } else if (localDate.isEqual(today.minusDays(1))) {
                dateStr = "Yesterday";
            } else if (localDate.isAfter(today.minusWeeks(1))) {
                dateStr = diffInDays + " days ago";
            } else {
                dateStr = shownDateFormat.format(date);
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
            if (!animeList.isEmpty()) {
                Collections.sort(animeList, Comparator.comparingLong(a -> a.releaseDateMillis));

                AnimeNotification anime = animeList.get(0);
                Date date = new Date(anime.releaseDateMillis);

                groupedAnimeSchedules.add(new AnimeReleaseGroup(entry.getKey(), date, animeList));
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

        this.groupedAnimeSchedules = groupedAnimeSchedules;
        this.animeReleaseGroupAdapter = new AnimeReleaseGroupAdapter(context, R.layout.anime_release_group_card, this.groupedAnimeSchedules);
        this.animeReleasesList.setAdapter(animeReleaseGroupAdapter);
    }

    public static SchedulesTabFragment getInstanceActivity() {
        if (weakActivity != null) {
            return weakActivity.get();
        } else {
            return null;
        }
    }
}
