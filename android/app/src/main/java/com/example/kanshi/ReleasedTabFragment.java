package com.example.kanshi;

import static com.example.kanshi.Configs.loadedGroupedReleasedAnime;

import android.annotation.SuppressLint;
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

import com.example.kanshi.utils.BackgroundTaskQueue;
import com.example.kanshi.utils.UITaskQueue;

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

@RequiresApi(api = Build.VERSION_CODES.N)
public class ReleasedTabFragment extends Fragment {
    public BackgroundTaskQueue backgroundTaskQueue;
    public UITaskQueue uiTaskQueue;
    public static WeakReference<ReleasedTabFragment> weakActivity;
    Context context;
    RecyclerView animeReleasesList;
    SwipeRefreshLayout swipeRefresh;
    ProgressBar progressCircular;
    AnimeReleaseGroupAdapter animeReleaseGroupAdapter = null;

    @SuppressLint("ClickableViewAccessibility")
    @RequiresApi(api = Build.VERSION_CODES.O)
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        context = requireContext();
        // Log Errors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Thread.setDefaultUncaughtExceptionHandler((thread, e) -> Utils.handleUncaughtException(context.getApplicationContext(), e, "ReleasedTabFragment"));
        }
        backgroundTaskQueue = new BackgroundTaskQueue(context);
        uiTaskQueue = new UITaskQueue(context);

        View releasedView = inflater.inflate(R.layout.anime_release_tab_fragment, container, false);
        // Init Global Variables
        animeReleasesList = releasedView.findViewById(R.id.anime_releases_list);
        swipeRefresh = releasedView.findViewById(R.id.swipe_refresh_anime_release);
        progressCircular = releasedView.findViewById(R.id.progress_circular);

        animeReleasesList.setItemAnimator(null);
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

        if (!loadedGroupedReleasedAnime.isEmpty()) {
            int newDataSize = loadedGroupedReleasedAnime.size();
            int lastImmediateGroupIndex = 0;
            final ArrayList<AnimeReleaseGroup> immediateGroupedReleasedAnime = new ArrayList<>();
            int animeCount = 0;
            for (int i = 0; i < newDataSize; i++) {
                lastImmediateGroupIndex = i;
                AnimeReleaseGroup releaseGroup = loadedGroupedReleasedAnime.get(i);
                immediateGroupedReleasedAnime.add(releaseGroup);
                if (releaseGroup.anime!=null) {
                    animeCount = animeCount + releaseGroup.anime.size();
                    if (animeCount >= 12) {
                        break;
                    }
                }
            }
            animeReleaseGroupAdapter = new AnimeReleaseGroupAdapter(context, immediateGroupedReleasedAnime, animeReleasesList);
            animeReleasesList.setAdapter(animeReleaseGroupAdapter);
            progressCircular.setVisibility(View.GONE);
            String handlerId = "updateReleasedAnime";
            for (int i = lastImmediateGroupIndex+1; i < newDataSize; i++) {
                final int finalI = i;
                AnimeReleaseGroup animeReleaseGroup = loadedGroupedReleasedAnime.get(finalI);
                uiTaskQueue.replaceTask(handlerId,"add"+finalI, ()-> {
                    if (animeReleaseGroupAdapter!=null) {
                        animeReleaseGroupAdapter.add(finalI, animeReleaseGroup);
                    }
                });
            }
        }

        updateReleasedAnime();

        weakActivity = new WeakReference<>(ReleasedTabFragment.this);

        return releasedView;
    }

    @RequiresApi(api = Build.VERSION_CODES.O)
    public void updateReleasedAnime() {
        String handlerId = "updateReleasedAnime";
        backgroundTaskQueue.replaceTask(handlerId, () -> {
            uiTaskQueue.cancelTasks(handlerId);
            try {
                final boolean showUnwatchedAnime = AnimeReleaseActivity.showUnwatchedAnime;

                AnimeReleaseActivity animeReleaseActivity = AnimeReleaseActivity.getInstanceActivity();
                final String selectedAnimeReleaseOption;
                if (animeReleaseActivity!=null) {
                    if (animeReleaseActivity.animeReleaseSpinner!=null && animeReleaseActivity.animeReleaseSpinner.getSelectedItem()!=null) {
                        selectedAnimeReleaseOption = animeReleaseActivity.animeReleaseSpinner.getSelectedItem().toString();
                    } else {
                        selectedAnimeReleaseOption = "Updates";
                    }
                } else {
                    selectedAnimeReleaseOption = "Updates";
                }

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

                final int newDataSize = groupedReleasedAnime.size();
                final ArrayList<AnimeReleaseGroup> lastGroupedAnimeReleased;
                if (ReleasedTabFragment.this.animeReleaseGroupAdapter!=null && ReleasedTabFragment.this.animeReleaseGroupAdapter.mAnimeGroups.get()!=null) {
                    lastGroupedAnimeReleased = ReleasedTabFragment.this.animeReleaseGroupAdapter.mAnimeGroups.get();
                } else {
                    lastGroupedAnimeReleased = new ArrayList<>();
                }
                final int existingSize = lastGroupedAnimeReleased.size();

                if (ReleasedTabFragment.this.animeReleaseGroupAdapter==null ||
                    ReleasedTabFragment.this.animeReleaseGroupAdapter.mAnimeGroups.get()==null
                ) {
                    int lastImmediateGroupIndex = 0;
                    final ArrayList<AnimeReleaseGroup> immediateGroupedReleasedAnime = new ArrayList<>();
                    int animeCount = 0;
                    for (int i = 0; i < newDataSize; i++) {
                        lastImmediateGroupIndex = i;
                        AnimeReleaseGroup releaseGroup = groupedReleasedAnime.get(i);
                        immediateGroupedReleasedAnime.add(releaseGroup);
                        if (releaseGroup.anime!=null) {
                            animeCount = animeCount + releaseGroup.anime.size();
                            if (animeCount >= 12) {
                                break;
                            }
                        }
                    }
                    uiTaskQueue.replaceTask(handlerId,"setAdapter", ()-> {
                        ReleasedTabFragment.this.animeReleaseGroupAdapter = new AnimeReleaseGroupAdapter(context, immediateGroupedReleasedAnime, ReleasedTabFragment.this.animeReleasesList);
                        ReleasedTabFragment.this.animeReleasesList.setAdapter(ReleasedTabFragment.this.animeReleaseGroupAdapter);
                        ReleasedTabFragment.this.progressCircular.setVisibility(View.GONE);
                    });
                    for (int i = lastImmediateGroupIndex+1; i < newDataSize; i++) {
                        final int finalI = i;
                        AnimeReleaseGroup animeReleaseGroup = groupedReleasedAnime.get(finalI);
                        if (finalI < existingSize) {
                            uiTaskQueue.replaceTask(handlerId,"update"+finalI, () -> {
                                if (ReleasedTabFragment.this.animeReleaseGroupAdapter!=null) {
                                    ReleasedTabFragment.this.animeReleaseGroupAdapter.set(finalI, animeReleaseGroup);
                                }
                            });
                        } else {
                            uiTaskQueue.replaceTask(handlerId,"add"+finalI, ()-> {
                                if (ReleasedTabFragment.this.animeReleaseGroupAdapter!=null) {
                                    ReleasedTabFragment.this.animeReleaseGroupAdapter.add(finalI, animeReleaseGroup);
                                }
                            });
                        }
                    }
                } else {
                    if (existingSize > newDataSize) {
                        // remove extra items
                        final int removeCount = existingSize - newDataSize;
                        // march backwards since length is being lessened/removed inside loop
                        for (int i = newDataSize + removeCount - 1; i >= newDataSize; i--) {
                            final int finalI = i;
                            uiTaskQueue.replaceTask(handlerId,"remove"+finalI, () -> {
                                if (ReleasedTabFragment.this.animeReleaseGroupAdapter!=null) {
                                    ReleasedTabFragment.this.animeReleaseGroupAdapter.remove(finalI);
                                }
                            });
                        }
                    }

                    for (int i = 0; i < newDataSize; i++) {
                        // Update existing items
                        final int finalI = i;
                        AnimeReleaseGroup animeReleaseGroup = groupedReleasedAnime.get(finalI);
                        if (finalI < existingSize) {
                            if (!animeReleaseGroup.isEqual(lastGroupedAnimeReleased.get(finalI), context)) {
                                uiTaskQueue.replaceTask(handlerId,"update"+finalI, () -> {
                                    if (ReleasedTabFragment.this.animeReleaseGroupAdapter!=null) {
                                        ReleasedTabFragment.this.animeReleaseGroupAdapter.set(finalI, animeReleaseGroup);
                                    }
                                });
                            }
                        } else {
                            uiTaskQueue.replaceTask(handlerId,"add"+finalI, ()-> {
                                if (ReleasedTabFragment.this.animeReleaseGroupAdapter!=null) {
                                    ReleasedTabFragment.this.animeReleaseGroupAdapter.add(finalI, animeReleaseGroup);
                                }
                            });
                        }
                    }
                }
            } catch (Exception e) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context.getApplicationContext(), e, "updateReleasedAnimeExecutorService");
                }
                e.printStackTrace();
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