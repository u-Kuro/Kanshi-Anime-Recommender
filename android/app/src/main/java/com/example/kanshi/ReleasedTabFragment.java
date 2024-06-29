package com.example.kanshi;

import static com.example.kanshi.AnimeReleaseActivity.selectedAnimeReleaseOption;
import static com.example.kanshi.AnimeReleaseActivity.showUnwatchedAnime;
import static com.example.kanshi.Configs.loadedGroupedReleasedAnime;

import android.annotation.SuppressLint;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.example.kanshi.utils.BackgroundTask;
import com.example.kanshi.utils.UITask;

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
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RequiresApi(api = Build.VERSION_CODES.N)
public class ReleasedTabFragment extends Fragment {
    public static final String UPDATE_RELEASED_ANIME = "UPDATE_RELEASED_ANIME";
    public static WeakReference<ReleasedTabFragment> weakActivity;
    public BackgroundTask backgroundTask;
    public UITask uiTask;
    Context context;
    RecyclerView animeReleasesList;
    SwipeRefreshLayout swipeRefresh;
    ProgressBar progressCircular;
    AnimeReleaseGroupAdapter animeReleaseGroupAdapter = null;
    final AtomicInteger maxReleasesList = new AtomicInteger();

    @SuppressLint("ClickableViewAccessibility")
    @RequiresApi(api = Build.VERSION_CODES.P)
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        context = requireContext();
        // Log Errors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Thread.setDefaultUncaughtExceptionHandler((thread, e) -> Utils.handleUncaughtException(context.getApplicationContext(), e, "ReleasedTabFragment"));
        }
        backgroundTask = new BackgroundTask(context);
        uiTask = new UITask(context);

        View releasedView = inflater.inflate(R.layout.anime_release_tab_fragment, container, false);
        // Init Global Variables
        animeReleasesList = releasedView.findViewById(R.id.anime_releases_list);
        swipeRefresh = releasedView.findViewById(R.id.swipe_refresh_anime_release);
        progressCircular = releasedView.findViewById(R.id.progress_circular);

        animeReleasesList.setItemAnimator(null);
        PrefetchLayoutManager layoutManager = new PrefetchLayoutManager(context);
        layoutManager.setItemPrefetchEnabled(true);
        animeReleasesList.setLayoutManager(layoutManager);
        animeReleasesList.setHasFixedSize(true);

        swipeRefresh.setProgressBackgroundColorSchemeResource(R.color.darker_grey);
        swipeRefresh.setColorSchemeResources(R.color.faded_white);

        animeReleasesList.addOnItemTouchListener(new RecyclerItemTouchListener(context, animeReleasesList, new RecyclerItemTouchListener.OnItemClickListener() {
            @Override
            public boolean onItemClick(int position) {
                if (animeReleaseGroupAdapter == null) return false;
                try {
                    final AnimeNotification anime = (AnimeNotification) animeReleaseGroupAdapter.items.get(position);
                    final String animeUrl = anime.animeUrl;
                    if (animeUrl == null || animeUrl.isEmpty()) return false;

                    AnimeReleaseActivity animeReleaseActivity = AnimeReleaseActivity.getInstanceActivity();
                    if (animeReleaseActivity != null) {
                        animeReleaseActivity.openAnimeInAniList(animeUrl);
                    }
                    return true;
                } catch (Exception ignored) {}
                return false;
            }
            @Override
            public void onItemLongPress(int position) {
                if (animeReleaseGroupAdapter == null) return;
                try {
                    final AnimeNotification anime = (AnimeNotification) animeReleaseGroupAdapter.items.get(position);
                    final String title = anime.title;
                    if (title == null || title.isEmpty()) return;

                    ClipboardManager clipboard = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
                    ClipData clip = ClipData.newPlainText("Copied Text", title);
                    clipboard.setPrimaryClip(clip);
                } catch (Exception ignored) {}
            }
        }));

        if (!loadedGroupedReleasedAnime.isEmpty()) {
            backgroundTask.execute(UPDATE_RELEASED_ANIME, () -> {
                final int newGroupedAnimeCount = loadedGroupedReleasedAnime.size();
                final int newItemListCount = newGroupedAnimeCount + loadedGroupedReleasedAnime.stream().mapToInt(group -> group.anime.size()).sum();

                maxReleasesList.updateAndGet(count -> Math.max(count, newItemListCount));
                uiTask.post(() -> {
                    animeReleasesList.setItemViewCacheSize(maxReleasesList.get());
                    animeReleaseGroupAdapter = new AnimeReleaseGroupAdapter(context, new ArrayList<>(), progressCircular);
                    animeReleasesList.setAdapter(animeReleaseGroupAdapter);
                }, UPDATE_RELEASED_ANIME);

                int itemPosition = 0;
                for (int i = 0; i < newGroupedAnimeCount; i++) {
                    AnimeReleaseGroup animeReleaseGroup = loadedGroupedReleasedAnime.get(i);
                    int finalHeaderPosition = itemPosition++;
                    uiTask.post(() -> animeReleaseGroupAdapter.add(finalHeaderPosition, animeReleaseGroup), UPDATE_RELEASED_ANIME);
                    for (AnimeNotification anime : animeReleaseGroup.anime) {
                        int finalAnimePosition = itemPosition++;
                        uiTask.post(() -> animeReleaseGroupAdapter.add(finalAnimePosition, anime), UPDATE_RELEASED_ANIME);
                    }
                }
            });
        }

        swipeRefresh.setOnRefreshListener(() -> {
            MainActivity mainActivity = MainActivity.getInstanceActivity();
            if (mainActivity!=null) {
                mainActivity.updateCurrentNotifications();
                mainActivity.checkEntries();
            }
            updateReleasedAnime(true);
            swipeRefresh.setRefreshing(false);
        });

        updateReleasedAnime(false);

        weakActivity = new WeakReference<>(ReleasedTabFragment.this);

        return releasedView;
    }

    @RequiresApi(api = Build.VERSION_CODES.P)
    public void updateReleasedAnime(boolean shouldSetAdapter) {
        backgroundTask.cancel(UPDATE_RELEASED_ANIME);
        uiTask.cancel(UPDATE_RELEASED_ANIME);

        backgroundTask.execute(UPDATE_RELEASED_ANIME, () -> {
            if (AnimeNotificationManager.allAnimeNotification.isEmpty()) {
                @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(context, "allAnimeNotification");
                if ($allAnimeNotification != null && !$allAnimeNotification.isEmpty()) {
                    AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
                }
            }

            ArrayList<AnimeNotification> allAnimeNotificationValues = new ArrayList<>(AnimeNotificationManager.allAnimeNotification.values());
            Collections.sort(allAnimeNotificationValues, Comparator.comparingLong(anime -> anime.releaseDateMillis));

            ArrayList<AnimeNotification> animeReleased = new ArrayList<>();

            String currentSelectedAnimeReleaseOption = selectedAnimeReleaseOption.get();
            boolean currentShowUnwatchedAnime = showUnwatchedAnime.get();
            for (AnimeNotification anime : allAnimeNotificationValues) {
                if (!"Updates".equals(currentSelectedAnimeReleaseOption)) {
                    boolean isMyAnime = anime.userStatus != null && !anime.userStatus.isEmpty() && !anime.userStatus.equalsIgnoreCase("UNWATCHED");
                    switch (currentSelectedAnimeReleaseOption) {
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
                    final boolean isNotComplete = !("COMPLETED".equalsIgnoreCase(anime.userStatus) || ("My List".equals(currentSelectedAnimeReleaseOption) && "DROPPED".equalsIgnoreCase(anime.userStatus)));
                    final boolean isNotWatched = anime.episodeProgress == 0 || anime.episodeProgress < anime.releaseEpisode;
                    if (!currentShowUnwatchedAnime || (isNotComplete && isNotWatched)) {
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

            final ArrayList<AnimeReleaseGroup> groupedReleasedAnime = new ArrayList<>();
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
                } catch (Exception ignored) {
                    return 0;
                }
            });

            loadedGroupedReleasedAnime = groupedReleasedAnime;

            final ArrayList<GroupedListItem> newItemList = groupedReleasedAnime.stream()
                    .flatMap(item -> Stream.concat(
                            Stream.of(item),
                            item.anime.stream()
                    ))
                    .collect(Collectors.toCollection(ArrayList::new));
            final int newItemListCount = newItemList.size();
            final ArrayList<GroupedListItem> lastItemList;
            if (animeReleaseGroupAdapter != null) {
                lastItemList = animeReleaseGroupAdapter.items;
            } else {
                lastItemList = new ArrayList<>();
            }
            final int lastItemListCount = lastItemList.size();

            if (animeReleaseGroupAdapter == null || shouldSetAdapter) {
                maxReleasesList.updateAndGet(count -> Math.max(count, newItemListCount));
                uiTask.post(() -> {
                    animeReleasesList.setItemViewCacheSize(maxReleasesList.get());
                    animeReleaseGroupAdapter = new AnimeReleaseGroupAdapter(context, new ArrayList<>(), progressCircular);
                    animeReleasesList.setAdapter(animeReleaseGroupAdapter);
                }, UPDATE_RELEASED_ANIME);

                int itemPosition = 0;
                for (GroupedListItem item : newItemList) {
                    int finalItemPosition = itemPosition++;
                    uiTask.post(() -> {
                        if (animeReleaseGroupAdapter != null) {
                            animeReleaseGroupAdapter.add(finalItemPosition, item);
                        } else {
                            updateReleasedAnime(shouldSetAdapter);
                        }
                    }, UPDATE_RELEASED_ANIME);
                }
            } else {
                maxReleasesList.updateAndGet(count -> Math.max(count, newItemListCount));
                uiTask.post(() -> animeReleasesList.setItemViewCacheSize(maxReleasesList.get()), UPDATE_RELEASED_ANIME);

                int itemPosition = 0;
                for (int i = 0; i < newItemListCount; i++) {
                    GroupedListItem item = newItemList.get(i);
                    int finalItemPosition = itemPosition++;
                    if (finalItemPosition < lastItemListCount) {
                        if (item.isNotEqual(lastItemList.get(finalItemPosition))) {
                            uiTask.post(() -> animeReleaseGroupAdapter.set(finalItemPosition, item), UPDATE_RELEASED_ANIME);
                        }
                    } else {
                        uiTask.post(() -> animeReleaseGroupAdapter.add(finalItemPosition, item), UPDATE_RELEASED_ANIME);
                    }
                }

                if (lastItemListCount > newItemListCount) {
                    for (int i = lastItemListCount - 1; i >= newItemListCount; i--) {
                        int finalItemPosition = i;
                        uiTask.post(() -> animeReleaseGroupAdapter.remove(finalItemPosition), UPDATE_RELEASED_ANIME);
                    }
                }
            }
            if (newItemListCount == 0) {
                uiTask.post(()-> progressCircular.setVisibility(View.GONE), UPDATE_RELEASED_ANIME);
            }
        });
    }

    @Override
    public void onDestroy() {
        backgroundTask.shutDownNow();
        uiTask.shutDownNow();
        super.onDestroy();
    }

    public static ReleasedTabFragment getInstanceActivity() {
        if (weakActivity != null) {
            return weakActivity.get();
        } else {
            return null;
        }
    }
}