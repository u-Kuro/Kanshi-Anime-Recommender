package com.example.kanshi;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.widget.ImageView;
import android.widget.ListView;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.lang.ref.WeakReference;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;

@RequiresApi(api = Build.VERSION_CODES.N)
public class AnimeReleaseActivity extends AppCompatActivity {
    public static WeakReference<AnimeReleaseActivity> weakActivity;
    ListView animeReleasesList;
    ArrayList<AnimeReleaseGroup> groupedAnimeReleases = null;
    AnimeReleaseGroupAdapter animeReleaseGroupAdapter = null;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        weakActivity = new WeakReference<>(AnimeReleaseActivity.this);

        super.onCreate(savedInstanceState);
        setContentView(R.layout.anime_releases_activity);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                finish();
                overridePendingTransition(R.anim.none, R.anim.fade_out);
            }
        });
        animeReleasesList = findViewById(R.id.anime_releases_list);

        SwipeRefreshLayout swipeRefresh = findViewById(R.id.swipe_refresh_anime_release);

        swipeRefresh.setOnRefreshListener(() -> {
            updateAnimeRelease();
            swipeRefresh.setRefreshing(false);
        });

        ImageView close = findViewById(R.id.close_anime_release);
        close.setOnClickListener(view -> {
            Intent i = new Intent(this, MainActivity.class);
            i.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(i);
            overridePendingTransition(R.anim.none, R.anim.fade_out);
        });

        updateAnimeRelease();
    }

    @Override
    protected void onResume() {
        overridePendingTransition(R.anim.fade_in, R.anim.remove);
        super.onResume();
    }

    public void updateAnimeRelease() {
        @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(this, "allAnimeNotification");
        if ($allAnimeNotification != null && $allAnimeNotification.size() > 0) {
            AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
        }

        ArrayList<AnimeNotification> allAnimeNotificationValues = new ArrayList<>(AnimeNotificationManager.allAnimeNotification.values());
        Collections.sort(allAnimeNotificationValues, Comparator.comparingLong(anime -> anime.releaseDateMillis));

        ArrayList<AnimeNotification> animeReleases = new ArrayList<>();
        AnimeNotification nearestMyAnimeRelease = null;
        AnimeNotification nearestAnimeRelease = null;

        for (AnimeNotification anime : allAnimeNotificationValues) {
            if (anime.maxEpisode < 0) { // No Given Max Episodes
                anime.message = "Episode " + anime.releaseEpisode;
            } else if (anime.releaseEpisode >= anime.maxEpisode) {
                anime.message = "Finished Airing: Episode " + anime.releaseEpisode;
            } else {
                anime.message = "Episode " + anime.releaseEpisode + " / " + anime.maxEpisode;
            }
            if (anime.releaseDateMillis <= System.currentTimeMillis()) {
                animeReleases.add(anime);
            } else if (nearestMyAnimeRelease == null) {
                nearestMyAnimeRelease = anime;
            } else if (nearestAnimeRelease == null) {
                nearestAnimeRelease = anime;
            } else {
                break;
            }
        }

        Map<String, ArrayList<AnimeNotification>> map = new TreeMap<>();

        if (nearestMyAnimeRelease != null) {
            SimpleDateFormat shownDateFormat = new SimpleDateFormat("MMMM d yyyy", Locale.US);
            SimpleDateFormat shownTimeFormat = new SimpleDateFormat("h:mm a", Locale.US);
            SimpleDateFormat shownWeekTimeFormat = new SimpleDateFormat("EEEE hh:mm a", Locale.US);
            Date date = new Date(nearestMyAnimeRelease.releaseDateMillis);
            long diffInMillis = System.currentTimeMillis() - nearestMyAnimeRelease.releaseDateMillis;
            long diffInDays = diffInMillis / (24 * 60 * 60 * 1000);
            long diffInHours = diffInMillis / (60 * 60 * 1000) % 24;
            long diffInMinutes = diffInMillis / (60 * 1000) % 60;
            long diffInSeconds = diffInMillis / (1000) % 60;

            String dateStr;
            if (diffInDays <= -7) {
                dateStr = "Airing in " + shownDateFormat.format(date);
            } else if (diffInDays < -1) {
                dateStr = "Airing in " + shownWeekTimeFormat.format(date);
            } else if (diffInDays == -1) {
                dateStr = "Tomorrow at " + shownTimeFormat.format(date);
            } else if (diffInDays <= 0) {
                if (diffInHours <= -1 || diffInMinutes <= -1 || diffInSeconds < -1) {
                    dateStr = "Airing at " + shownTimeFormat.format(date);
                } else {
                    dateStr = "Today";
                }
            } else if (diffInDays < 2) {
                dateStr = "Yesterday";
            } else if (diffInDays < 7) {
                dateStr = diffInDays + " days ago";
            } else {
                dateStr = shownDateFormat.format(date);
            }

            ArrayList<AnimeNotification> list = new ArrayList<>();
            list.add(nearestMyAnimeRelease);

            map.put(dateStr, list);
        }

        if (nearestAnimeRelease != null) {
            SimpleDateFormat shownDateFormat = new SimpleDateFormat("MMMM d yyyy", Locale.US);
            SimpleDateFormat shownTimeFormat = new SimpleDateFormat("h:mm a", Locale.US);
            SimpleDateFormat shownWeekTimeFormat = new SimpleDateFormat("EEEE h:mm a", Locale.US);
            Date date = new Date(nearestAnimeRelease.releaseDateMillis);
            long diffInMillis = System.currentTimeMillis() - nearestAnimeRelease.releaseDateMillis;
            long diffInDays = diffInMillis / (24 * 60 * 60 * 1000);
            long diffInHours = diffInMillis / (60 * 60 * 1000) % 24;
            long diffInMinutes = diffInMillis / (60 * 1000) % 60;
            long diffInSeconds = diffInMillis / (1000) % 60;

            String dateStr;
            if (diffInDays <= -7) {
                dateStr = "Airing in " + shownDateFormat.format(date);
            } else if (diffInDays < -1) {
                dateStr = "Airing in " + shownWeekTimeFormat.format(date);
            } else if (diffInDays == -1) {
                dateStr = "Tomorrow at " + shownTimeFormat.format(date);
            } else if (diffInDays <= 0) {
                if (diffInHours <= -1 || diffInMinutes <= -1 || diffInSeconds < -1) {
                    dateStr = "Airing at " + shownTimeFormat.format(date);
                } else {
                    dateStr = "Today";
                }
            } else if (diffInDays < 2) {
                dateStr = "Yesterday";
            } else if (diffInDays < 7) {
                dateStr = diffInDays + " days ago";
            } else {
                dateStr = shownDateFormat.format(date);
            }

            if (map.containsKey(dateStr)) {
                Objects.requireNonNull(map.get(dateStr)).add(nearestAnimeRelease);
            } else {
                ArrayList<AnimeNotification> list = new ArrayList<>();
                list.add(nearestAnimeRelease);
                map.put(dateStr, list);
            }
        }

        for (AnimeNotification anime : animeReleases) {

            SimpleDateFormat shownDateFormat = new SimpleDateFormat("MMMM d yyyy", Locale.US);
            SimpleDateFormat shownTimeFormat = new SimpleDateFormat("h:mm a", Locale.US);
            SimpleDateFormat shownWeekTimeFormat = new SimpleDateFormat("EEEE h:mm a", Locale.US);
            Date date = new Date(anime.releaseDateMillis);
            long diffInMillis = System.currentTimeMillis() - anime.releaseDateMillis;
            long diffInDays = diffInMillis / (24 * 60 * 60 * 1000);
            long diffInHours = diffInMillis / (60 * 60 * 1000) % 24;
            long diffInMinutes = diffInMillis / (60 * 1000) % 60;
            long diffInSeconds = diffInMillis / (1000) % 60;

            String dateStr;
            if (diffInDays <= -7) {
                dateStr = "Airing in " + shownDateFormat.format(date);
            } else if (diffInDays < -1) {
                dateStr = "Airing in " + shownWeekTimeFormat.format(date);
            } else if (diffInDays == -1) {
                dateStr = "Airing in a day";
            } else if (diffInDays <= 0) {
                if (diffInHours <= -1 || diffInMinutes <= -1 || diffInSeconds < -1) {
                    dateStr = "Airing at " + shownTimeFormat.format(date);
                } else {
                    dateStr = "Today";
                }
            } else if (diffInDays < 2) {
                dateStr = "Yesterday";
            } else if (diffInDays < 7) {
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

        ArrayList<AnimeReleaseGroup> groupedAnimeReleases = new ArrayList<>();
        for (Map.Entry<String, ArrayList<AnimeNotification>> entry : map.entrySet()) {
            ArrayList<AnimeNotification> animeList = entry.getValue();
            if (!animeList.isEmpty()) {
                Collections.sort(animeList, (a1, a2) -> Long.compare(a2.releaseDateMillis, a1.releaseDateMillis));
                AnimeNotification anime = animeList.get(0);

                if (anime.releaseDateMillis > System.currentTimeMillis()) {
                    Collections.sort(animeList, Comparator.comparingLong(a -> a.releaseDateMillis));
                    anime = animeList.get(0);
                }

                Calendar releaseDate = Calendar.getInstance();
                releaseDate.setTimeInMillis(anime.releaseDateMillis);

                SimpleDateFormat dateFormat = new SimpleDateFormat("MM/dd/yyyy HH:mm:ss", Locale.US);
                String dateStr = dateFormat.format(releaseDate.getTime());

                groupedAnimeReleases.add(new AnimeReleaseGroup(dateStr, animeList));
            }
        }

        Collections.sort(groupedAnimeReleases, (a1, a2) -> {
            SimpleDateFormat sdf = new SimpleDateFormat("MM/dd/yyyy HH:mm:ss", Locale.US);
            try {
                if (a1.dateString == null && a2.dateString == null) return 0;
                if (a1.dateString == null) return 1;
                if (a2.dateString == null) return -1;
                Date date1 = sdf.parse(a1.dateString);
                Date date2 = sdf.parse(a2.dateString);
                if (date1 == null && date2 == null) return 0;
                if (date1 == null) return 1;
                if (date2 == null) return -1;
                long currentTimeMillis = System.currentTimeMillis();
                if (date1.getTime()>currentTimeMillis && date2.getTime()>currentTimeMillis) {
                    return date1.compareTo(date2);
                }
                return date2.compareTo(date1);
            } catch (ParseException e) {
                return 0;
            }
        });

        if (this.animeReleaseGroupAdapter==null) {
            this.groupedAnimeReleases = groupedAnimeReleases;
            this.animeReleaseGroupAdapter = new AnimeReleaseGroupAdapter(this, R.layout.anime_release_group_card, this.groupedAnimeReleases);
            this.animeReleasesList.setAdapter(animeReleaseGroupAdapter);
        } else {
            this.groupedAnimeReleases = groupedAnimeReleases;
            this.animeReleaseGroupAdapter.notifyDataSetChanged();
        }
    }

    public static AnimeReleaseActivity getInstanceActivity() {
        if (weakActivity != null) {
            return weakActivity.get();
        } else {
            return null;
        }
    }
}
