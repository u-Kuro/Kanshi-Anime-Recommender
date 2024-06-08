package com.example.kanshi;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.RecyclerView;
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
    RecyclerView animeReleasesList;
    SwipeRefreshLayout swipeRefresh;
    AnimeReleaseGroupAdapter animeReleaseGroupAdapter = null;

    @SuppressLint("ClickableViewAccessibility")
    @RequiresApi(api = Build.VERSION_CODES.O)
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        context = requireContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 1"), "ReleasedTabFragment");
        }
        // Log Errors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Thread.setDefaultUncaughtExceptionHandler((thread, e) -> Utils.handleUncaughtException(context.getApplicationContext(), e, "ReleasedTabFragment"));
        }

        View releasedView = inflater.inflate(R.layout.anime_release_tab_fragment, container, false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 2"), "ReleasedTabFragment");
        }
        // Init Global Variables
        animeReleasesList = releasedView.findViewById(R.id.anime_releases_list);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 3"), "ReleasedTabFragment");
        }
        swipeRefresh = releasedView.findViewById(R.id.swipe_refresh_anime_release);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 4"), "ReleasedTabFragment");
        }

        swipeRefresh.setProgressBackgroundColorSchemeResource(R.color.darker_grey);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 5"), "ReleasedTabFragment");
        }
        swipeRefresh.setColorSchemeResources(R.color.faded_white);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 6"), "ReleasedTabFragment");
        }

        swipeRefresh.setOnRefreshListener(() -> {
            MainActivity mainActivity = MainActivity.getInstanceActivity();
            if (mainActivity!=null) {
                mainActivity.updateCurrentNotifications();
                mainActivity.checkEntries();
            }
            updateReleasedAnime();
            swipeRefresh.setRefreshing(false);
        });
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 7"), "ReleasedTabFragment");
        }

        updateReleasedAnime();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 8"), "ReleasedTabFragment");
        }

        weakActivity = new WeakReference<>(ReleasedTabFragment.this);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 9.1"), "ReleasedTabFragment");
        }
        return releasedView;
    }

    private final ExecutorService updateReleasedAnimeExecutorService = Executors.newFixedThreadPool(1);
    private Future<?> updateReleasedAnimeFuture;
    @SuppressLint("NotifyDataSetChanged")
    @RequiresApi(api = Build.VERSION_CODES.O)
    public void updateReleasedAnime() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 10"), "ReleasedTabFragment");
        }
        AnimeReleaseActivity animeReleaseActivity = AnimeReleaseActivity.getInstanceActivity();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 11 animeReleaseActivity "+animeReleaseActivity), "ReleasedTabFragment");
        }
        final String selectedAnimeReleaseOption;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 12"), "ReleasedTabFragment");
        }
        final boolean showUnwatchedAnime;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 13"), "ReleasedTabFragment");
        }
        if (animeReleaseActivity!=null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Utils.handleUncaughtException(context, new Exception("releasedTab 14"), "ReleasedTabFragment");
            }
            showUnwatchedAnime = animeReleaseActivity.showUnwatchedAnime;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Utils.handleUncaughtException(context, new Exception("releasedTab 15 showUnwatchedAnime "+showUnwatchedAnime), "ReleasedTabFragment");
            }
            if (animeReleaseActivity.animeReleaseSpinner!=null && animeReleaseActivity.animeReleaseSpinner.getSelectedItem()!=null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context, new Exception("releasedTab 16 animeReleaseActivity.animeReleaseSpinner.getSelectedItem().toString() "+animeReleaseActivity.animeReleaseSpinner.getSelectedItem().toString()), "ReleasedTabFragment");
                }
                selectedAnimeReleaseOption = animeReleaseActivity.animeReleaseSpinner.getSelectedItem().toString();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context, new Exception("releasedTab 17"), "ReleasedTabFragment");
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context, new Exception("releasedTab 18"), "ReleasedTabFragment");
                }
                selectedAnimeReleaseOption = "Updates";
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context, new Exception("releasedTab 19"), "ReleasedTabFragment");
                }
            }
        } else {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Utils.handleUncaughtException(context, new Exception("releasedTab 20"), "ReleasedTabFragment");
            }
            showUnwatchedAnime = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Utils.handleUncaughtException(context, new Exception("releasedTab 21"), "ReleasedTabFragment");
            }
            selectedAnimeReleaseOption = "Updates";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Utils.handleUncaughtException(context, new Exception("releasedTab 22"), "ReleasedTabFragment");
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 23 updateReleasedAnimeFuture "+updateReleasedAnimeFuture), "ReleasedTabFragment");
        }
        if (updateReleasedAnimeFuture != null && !updateReleasedAnimeFuture.isCancelled()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Utils.handleUncaughtException(context, new Exception("releasedTab 24"), "ReleasedTabFragment");
            }
            updateReleasedAnimeFuture.cancel(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Utils.handleUncaughtException(context, new Exception("releasedTab 25"), "ReleasedTabFragment");
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context, new Exception("releasedTab 26"), "ReleasedTabFragment");
        }
        updateReleasedAnimeFuture = updateReleasedAnimeExecutorService.submit(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Utils.handleUncaughtException(context, new Exception("releasedTab 27"), "ReleasedTabFragment");
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context, new Exception("releasedTab 28 AnimeNotificationManager.allAnimeNotification.isEmpty() "+AnimeNotificationManager.allAnimeNotification.isEmpty()), "ReleasedTabFragment");
                }
                if (AnimeNotificationManager.allAnimeNotification.isEmpty()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        Utils.handleUncaughtException(context, new Exception("releasedTab 29"), "ReleasedTabFragment");
                    }
                    @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(context, "allAnimeNotification");
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        Utils.handleUncaughtException(context, new Exception("releasedTab 30 $allAnimeNotification "+$allAnimeNotification), "ReleasedTabFragment");
                        if ($allAnimeNotification != null) {
                            Utils.handleUncaughtException(context, new Exception("releasedTab 31 $allAnimeNotification.size() "+$allAnimeNotification.size()), "ReleasedTabFragment");
                        }
                    }
                    if ($allAnimeNotification != null && !$allAnimeNotification.isEmpty()) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(context, new Exception("releasedTab 32 $allAnimeNotification "+$allAnimeNotification), "ReleasedTabFragment");
                        }
                        AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(context, new Exception("releasedTab 33 AnimeNotificationManager.allAnimeNotification.size() "+AnimeNotificationManager.allAnimeNotification.size()), "ReleasedTabFragment");
                        }
                    }
                }

                ArrayList<AnimeNotification> allAnimeNotificationValues = new ArrayList<>(AnimeNotificationManager.allAnimeNotification.values());
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context, new Exception("releasedTab 34 allAnimeNotificationValues.size() "+allAnimeNotificationValues.size()), "ReleasedTabFragment");
                }
                Collections.sort(allAnimeNotificationValues, Comparator.comparingLong(anime -> anime.releaseDateMillis));
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context, new Exception("releasedTab 35"), "ReleasedTabFragment");
                }

                ArrayList<AnimeNotification> animeReleased = new ArrayList<>();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context, new Exception("releasedTab 36"), "ReleasedTabFragment");
                }

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
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context, new Exception("releasedTab 37"), "ReleasedTabFragment");
                }

                Map<String, ArrayList<AnimeNotification>> map = new TreeMap<>();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context, new Exception("releasedTab 38"), "ReleasedTabFragment");
                }
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

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context, new Exception("releasedTab 39"), "ReleasedTabFragment");
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

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context, new Exception("releasedTab 40"), "ReleasedTabFragment");
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

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context, new Exception("releasedTab 41"), "ReleasedTabFragment");
                }

                new Handler(Looper.getMainLooper()).post(() -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        Utils.handleUncaughtException(context, new Exception("releasedTab 42"), "ReleasedTabFragment");
                    }
                    if (ReleasedTabFragment.this.animeReleaseGroupAdapter==null ||
                            ReleasedTabFragment.this.animeReleaseGroupAdapter.mAnimeGroups==null ||
                            ReleasedTabFragment.this.animeReleaseGroupAdapter.mAnimeGroups.isEmpty()
                    ) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(context, new Exception("releasedTab 43"), "ReleasedTabFragment");
                        }
                        ReleasedTabFragment.this.animeReleaseGroupAdapter = new AnimeReleaseGroupAdapter(context, groupedReleasedAnime, ReleasedTabFragment.this.animeReleasesList);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(context, new Exception("releasedTab 44"), "ReleasedTabFragment");
                        }
                        ReleasedTabFragment.this.animeReleasesList.setAdapter(ReleasedTabFragment.this.animeReleaseGroupAdapter);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(context, new Exception("releasedTab 45"), "ReleasedTabFragment");
                        }
                        ReleasedTabFragment.this.animeReleaseGroupAdapter.notifyDataSetChanged();
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(context, new Exception("releasedTab 46"), "ReleasedTabFragment");
                        }
                    } else {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(context, new Exception("releasedTab 47"), "ReleasedTabFragment");
                        }
                        ArrayList<AnimeReleaseGroup> lastGroupedAnimeSchedules = ReleasedTabFragment.this.animeReleaseGroupAdapter.mAnimeGroups;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(context, new Exception("releasedTab 48"), "ReleasedTabFragment");
                        }
                        int existingSize = lastGroupedAnimeSchedules.size();
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(context, new Exception("releasedTab 49"), "ReleasedTabFragment");
                        }
                        int newDataSize = groupedReleasedAnime.size();
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(context, new Exception("releasedTab 50"), "ReleasedTabFragment");
                        }
                        int minSize = Math.min(newDataSize, existingSize);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(context, new Exception("releasedTab 51"), "ReleasedTabFragment");
                        }
                        for (int i = 0; i < minSize; i++) {
                            // Update existing items
                            AnimeReleaseGroup animeReleaseGroup = groupedReleasedAnime.get(i);
                            if (!animeReleaseGroup.isEqual(lastGroupedAnimeSchedules.get(i), context)) {
                                ReleasedTabFragment.this.animeReleaseGroupAdapter.mAnimeGroups = groupedReleasedAnime;
                                ReleasedTabFragment.this.animeReleaseGroupAdapter.notifyItemChanged(i);
                            }
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(context, new Exception("releasedTab 52"), "ReleasedTabFragment");
                        }
                        if (newDataSize > existingSize) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                Utils.handleUncaughtException(context, new Exception("releasedTab 53"), "ReleasedTabFragment");
                            }
                            // Add new items
                            int itemCount = newDataSize - existingSize;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                Utils.handleUncaughtException(context, new Exception("releasedTab 54"), "ReleasedTabFragment");
                            }
                            ReleasedTabFragment.this.animeReleaseGroupAdapter.mAnimeGroups = groupedReleasedAnime;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                Utils.handleUncaughtException(context, new Exception("releasedTab 55"), "ReleasedTabFragment");
                            }
                            animeReleaseGroupAdapter.notifyItemRangeInserted(existingSize, itemCount);
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                Utils.handleUncaughtException(context, new Exception("releasedTab 56"), "ReleasedTabFragment");
                            }
                        } else if (existingSize > newDataSize) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                Utils.handleUncaughtException(context, new Exception("releasedTab 57"), "ReleasedTabFragment");
                            }
                            // Remove extra items
                            int removeCount = existingSize - newDataSize;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                Utils.handleUncaughtException(context, new Exception("releasedTab 58"), "ReleasedTabFragment");
                            }
                            ReleasedTabFragment.this.animeReleaseGroupAdapter.mAnimeGroups = groupedReleasedAnime;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                Utils.handleUncaughtException(context, new Exception("releasedTab 59"), "ReleasedTabFragment");
                            }
                            ReleasedTabFragment.this.animeReleaseGroupAdapter.notifyItemRangeRemoved(newDataSize, removeCount);
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                Utils.handleUncaughtException(context, new Exception("releasedTab 60"), "ReleasedTabFragment");
                            }
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(context, new Exception("releasedTab 61"), "ReleasedTabFragment");
                        }
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        Utils.handleUncaughtException(context, new Exception("releasedTab 62"), "ReleasedTabFragment");
                    }
                });
            } catch (Exception e) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context, new Exception("releasedTab 27.5"), "ReleasedTabFragment");
                }
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