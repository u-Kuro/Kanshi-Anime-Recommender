package com.example.kanshi;

import static com.example.kanshi.MediaReleaseActivity.selectedMediaReleaseOption;
import static com.example.kanshi.MediaReleaseActivity.showUnseenMedia;
import static com.example.kanshi.Configs.loadedGroupedReleasedMedia;

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
    public static final String UPDATE_RELEASED_MEDIA = "UPDATE_RELEASED_MEDIA";
    public static WeakReference<ReleasedTabFragment> weakActivity;
    public BackgroundTask backgroundTask;
    public UITask uiTask;
    Context context;
    RecyclerView mediaReleasesList;
    SwipeRefreshLayout swipeRefresh;
    ProgressBar progressCircular;
    MediaReleaseGroupAdapter mediaReleaseGroupAdapter = null;
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

        View releasedView = inflater.inflate(R.layout.media_release_tab_fragment, container, false);
        // Init Global Variables
        mediaReleasesList = releasedView.findViewById(R.id.media_releases_list);
        swipeRefresh = releasedView.findViewById(R.id.swipe_refresh_media_release);
        progressCircular = releasedView.findViewById(R.id.progress_circular);

        mediaReleasesList.setItemAnimator(null);
        mediaReleasesList.setHasFixedSize(true);

        swipeRefresh.setProgressBackgroundColorSchemeResource(R.color.darker_grey);
        swipeRefresh.setColorSchemeResources(R.color.faded_white);

        mediaReleasesList.addOnItemTouchListener(new RecyclerItemTouchListener(context, mediaReleasesList, new RecyclerItemTouchListener.OnItemClickListener() {
            @Override
            public boolean onItemClick(int position) {
                if (mediaReleaseGroupAdapter == null) return false;
                try {
                    final MediaNotification media = (MediaNotification) mediaReleaseGroupAdapter.items.get(position);
                    final String mediaUrl = media.mediaUrl;
                    if (mediaUrl == null || mediaUrl.isEmpty()) return false;

                    MediaReleaseActivity mediaReleaseActivity = MediaReleaseActivity.getInstanceActivity();
                    if (mediaReleaseActivity != null) {
                        mediaReleaseActivity.openMediaInAniList(mediaUrl);
                    }
                    return true;
                } catch (Exception ignored) {}
                return false;
            }
            @Override
            public void onItemLongPress(int position) {
                if (mediaReleaseGroupAdapter == null) return;
                try {
                    final MediaNotification media = (MediaNotification) mediaReleaseGroupAdapter.items.get(position);
                    final String title = media.title;
                    if (title == null || title.isEmpty()) return;

                    ClipboardManager clipboard = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
                    ClipData clip = ClipData.newPlainText("Copied Text", title);
                    clipboard.setPrimaryClip(clip);
                } catch (Exception ignored) {}
            }
        }));

        if (!loadedGroupedReleasedMedia.isEmpty()) {
            backgroundTask.execute(UPDATE_RELEASED_MEDIA, () -> {
                final int newGroupedMediaCount = loadedGroupedReleasedMedia.size();
                final int newItemListCount = newGroupedMediaCount + loadedGroupedReleasedMedia.stream().mapToInt(group -> group.media.size()).sum();

                maxReleasesList.updateAndGet(count -> Math.max(count, newItemListCount));
                uiTask.post(() -> {
                    mediaReleasesList.setItemViewCacheSize(maxReleasesList.get());
                    mediaReleaseGroupAdapter = new MediaReleaseGroupAdapter(context, new ArrayList<>(), progressCircular);
                    mediaReleasesList.setAdapter(mediaReleaseGroupAdapter);
                }, UPDATE_RELEASED_MEDIA);

                int itemPosition = 0;
                for (int i = 0; i < newGroupedMediaCount; i++) {
                    MediaReleaseGroup mediaReleaseGroup = loadedGroupedReleasedMedia.get(i);
                    int finalHeaderPosition = itemPosition++;
                    uiTask.post(() -> mediaReleaseGroupAdapter.add(finalHeaderPosition, mediaReleaseGroup), UPDATE_RELEASED_MEDIA);
                    for (MediaNotification media : mediaReleaseGroup.media) {
                        int finalMediaPosition = itemPosition++;
                        uiTask.post(() -> mediaReleaseGroupAdapter.add(finalMediaPosition, media), UPDATE_RELEASED_MEDIA);
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
            updateReleasedMedia(true, false);
            swipeRefresh.setRefreshing(false);
        });

        updateReleasedMedia(false, false);

        weakActivity = new WeakReference<>(ReleasedTabFragment.this);

        return releasedView;
    }

    @RequiresApi(api = Build.VERSION_CODES.P)
    public void updateReleasedMedia(boolean shouldSetAdapter, boolean shouldScrollToTop) {
        if (shouldScrollToTop) {
            mediaReleasesList.scrollToPosition(0);
        }
        backgroundTask.cancel(UPDATE_RELEASED_MEDIA);
        uiTask.cancel(UPDATE_RELEASED_MEDIA);

        backgroundTask.execute(UPDATE_RELEASED_MEDIA, () -> {
            if (MediaNotificationManager.allMediaNotification.isEmpty()) {
                @SuppressWarnings("unchecked") ConcurrentHashMap<String, MediaNotification> $allMediaNotification = (ConcurrentHashMap<String, MediaNotification>) LocalPersistence.readObjectFromFile(context, "allMediaNotification");
                if ($allMediaNotification != null && !$allMediaNotification.isEmpty()) {
                    MediaNotificationManager.allMediaNotification.putAll($allMediaNotification);
                }
            }

            ArrayList<MediaNotification> allMediaNotificationValues = new ArrayList<>(MediaNotificationManager.allMediaNotification.values());
            Collections.sort(allMediaNotificationValues, Comparator.comparingLong(media -> media.releaseDateMillis));

            ArrayList<MediaNotification> mediaReleased = new ArrayList<>();

            String currentSelectedMediaReleaseOption = selectedMediaReleaseOption.get();
            boolean currentShowUnseenMedia = showUnseenMedia.get();
            for (MediaNotification media : allMediaNotificationValues) {
                if (!"Updates".equals(currentSelectedMediaReleaseOption)) {
                    boolean isMyMedia = media.userStatus != null && !media.userStatus.isEmpty() && !media.userStatus.equalsIgnoreCase("UNSEEN");
                    switch (currentSelectedMediaReleaseOption) {
                        case "My List":
                            if (!isMyMedia) {
                                continue;
                            }
                            break;
                        case "Watching":
                            if (!isMyMedia || !("CURRENT".equalsIgnoreCase(media.userStatus) || "REPEATING".equalsIgnoreCase(media.userStatus))) {
                                continue;
                            }
                            break;
                        case "Finished":
                            if (!isMyMedia || media.releaseEpisode < media.maxEpisode || media.maxEpisode <= 0) {
                                continue;
                            }
                            break;
                        case "Others":
                            if (isMyMedia) {
                                continue;
                            }
                            break;
                    }
                }
                if (media.releaseDateMillis <= System.currentTimeMillis()) {
                    final boolean isNotComplete = !("COMPLETED".equalsIgnoreCase(media.userStatus) || ("My List".equals(currentSelectedMediaReleaseOption) && "DROPPED".equalsIgnoreCase(media.userStatus)));
                    final boolean isNotWatched = media.episodeProgress == 0 || media.episodeProgress < media.releaseEpisode;
                    if (!currentShowUnseenMedia || (isNotComplete && isNotWatched)) {
                        if (media.maxEpisode < 0) { // No Given Max Episodes
                            media.message = "Episode " + media.releaseEpisode;
                        } else if (media.releaseEpisode >= media.maxEpisode) {
                            media.message = "Finished Airing: Episode " + media.releaseEpisode;
                        } else {
                            media.message = "Episode " + media.releaseEpisode + " / " + media.maxEpisode;
                        }
                        mediaReleased.add(media);
                    }
                }
            }

            Map<String, ArrayList<MediaNotification>> map = new TreeMap<>();

            for (MediaNotification media : mediaReleased) {
                DateTimeFormatter shownDateFormat = DateTimeFormatter.ofPattern("MMMM d yyyy, EEEE");
                DateTimeFormatter shownWeekDayFormat = DateTimeFormatter.ofPattern("EEEE");

                Instant releaseDateInstant = Instant.ofEpochMilli(media.releaseDateMillis);
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
                    Objects.requireNonNull(map.get(dateStr)).add(media);
                }
            }

            final ArrayList<MediaReleaseGroup> groupedReleasedMedia = new ArrayList<>();
            for (Map.Entry<String, ArrayList<MediaNotification>> entry : map.entrySet()) {
                ArrayList<MediaNotification> mediaList = entry.getValue();
                if (mediaList != null && !mediaList.isEmpty()) {
                    Collections.sort(mediaList, (a1, a2) -> Long.compare(a2.releaseDateMillis, a1.releaseDateMillis));

                    MediaNotification media = mediaList.get(0);
                    LocalDateTime localDateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(media.releaseDateMillis), ZoneId.systemDefault());

                    groupedReleasedMedia.add(new MediaReleaseGroup(entry.getKey(), localDateTime, mediaList));
                }
            }

            Collections.sort(groupedReleasedMedia, (a1, a2) -> {
                try {
                    if (a1.date == null && a2.date == null) return 0;
                    if (a1.date == null) return 1;
                    if (a2.date == null) return -1;
                    return a2.date.compareTo(a1.date);
                } catch (Exception ignored) {
                    return 0;
                }
            });

            loadedGroupedReleasedMedia = groupedReleasedMedia;

            final ArrayList<GroupedListItem> newItemList = groupedReleasedMedia.stream()
                    .flatMap(item -> Stream.concat(
                            Stream.of(item),
                            item.media.stream()
                    ))
                    .collect(Collectors.toCollection(ArrayList::new));
            final int newItemListCount = newItemList.size();
            final ArrayList<GroupedListItem> lastItemList;
            if (mediaReleaseGroupAdapter != null) {
                lastItemList = mediaReleaseGroupAdapter.items;
            } else {
                lastItemList = new ArrayList<>();
            }
            final int lastItemListCount = lastItemList.size();

            if (mediaReleaseGroupAdapter == null || shouldSetAdapter) {
                maxReleasesList.updateAndGet(count -> Math.max(count, newItemListCount));
                uiTask.post(() -> {
                    mediaReleasesList.setItemViewCacheSize(maxReleasesList.get());
                    mediaReleaseGroupAdapter = new MediaReleaseGroupAdapter(context, new ArrayList<>(), progressCircular);
                    mediaReleasesList.setAdapter(mediaReleaseGroupAdapter);
                }, UPDATE_RELEASED_MEDIA);

                int itemPosition = 0;
                for (GroupedListItem item : newItemList) {
                    int finalItemPosition = itemPosition++;
                    uiTask.post(() -> {
                        if (mediaReleaseGroupAdapter != null) {
                            mediaReleaseGroupAdapter.add(finalItemPosition, item);
                        } else {
                            updateReleasedMedia(shouldSetAdapter, false);
                        }
                    }, UPDATE_RELEASED_MEDIA);
                }
            } else {
                maxReleasesList.updateAndGet(count -> Math.max(count, newItemListCount));
                uiTask.post(() -> mediaReleasesList.setItemViewCacheSize(maxReleasesList.get()), UPDATE_RELEASED_MEDIA);

                int itemPosition = 0;
                for (int i = 0; i < newItemListCount; i++) {
                    GroupedListItem item = newItemList.get(i);
                    int finalItemPosition = itemPosition++;
                    if (finalItemPosition < lastItemListCount) {
                        if (item.isNotEqual(lastItemList.get(finalItemPosition))) {
                            uiTask.post(() -> mediaReleaseGroupAdapter.set(finalItemPosition, item), UPDATE_RELEASED_MEDIA);
                        }
                    } else {
                        uiTask.post(() -> mediaReleaseGroupAdapter.add(finalItemPosition, item), UPDATE_RELEASED_MEDIA);
                    }
                }

                if (lastItemListCount > newItemListCount) {
                    for (int i = lastItemListCount - 1; i >= newItemListCount; i--) {
                        int finalItemPosition = i;
                        uiTask.post(() -> mediaReleaseGroupAdapter.remove(finalItemPosition), UPDATE_RELEASED_MEDIA);
                    }
                }
            }
            if (newItemListCount == 0) {
                uiTask.post(()-> progressCircular.setVisibility(View.GONE), UPDATE_RELEASED_MEDIA);
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