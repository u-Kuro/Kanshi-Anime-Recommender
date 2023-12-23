package com.example.kanshi;

import static com.example.kanshi.Utils.createRoundIcon;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.PendingIntent;
import android.app.Person;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

public class AnimeNotificationWorker extends Worker {

    private static final int ANIME_RELEASE_PENDING_INTENT = 997;
    private static final int ANIME_RELEASE_UPDATE_PENDING_INTENT = 996;
    public final String retryKey = "Kanshi-Anime-Recommendation.Retry";

    public AnimeNotificationWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @RequiresApi(api = Build.VERSION_CODES.P)
    @NonNull
    @Override
    public Result doWork() {
        String action = getInputData().getString("action");
        @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeToUpdate = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(this.getApplicationContext(),"allAnimeToUpdate");
        if ($allAnimeToUpdate != null && $allAnimeToUpdate.size() > 0) {
            AnimeNotificationManager.allAnimeToUpdate.putAll($allAnimeToUpdate);
        }
        @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(this.getApplicationContext(), "allAnimeNotification");
        if ($allAnimeNotification != null && $allAnimeNotification.size() > 0) {
            AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
        }
        if ("ANIME_RELEASE_UPDATE".equals(action)) {
            delayAnimeReleaseUpdate();
            animeReleaseUpdate();
        } else {
            boolean isBooted = getInputData().getBoolean("isBooted", false);

            showNotification(isBooted);
        }
        return Result.success();
    }

    @RequiresApi(api = Build.VERSION_CODES.P)
    private void showNotification(boolean isBooted) {
        if (ActivityCompat.checkSelfPermission(this.getApplicationContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        SharedPreferences prefs = this.getApplicationContext().getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this.getApplicationContext());

        notificationManager.cancelAll();

        byte[] dummyImage = null;
        HashMap<String, AnimeNotification> myAnimeNotifications = new HashMap<>();
        HashMap<String, AnimeNotification> animeNotifications = new HashMap<>();

        long lastSentNotificationTime = prefs.getLong("lastSentNotificationTime", 0L);
        long currentSentNotificationTime = lastSentNotificationTime;
        long newNearestNotificationTime = 0L;
        long lastSentMyAnimeNotificationTime = 0L;
        long lastSentOtherAnimeNotificationTime = 0L;
        AnimeNotification newNearestNotificationInfo = null;

        boolean hasMyAnime = false;
        boolean shouldNotifyAfterBoot = false;
        List<AnimeNotification> allAnimeNotificationValues = new ArrayList<>(AnimeNotificationManager.allAnimeNotification.values());
        for (AnimeNotification anime : allAnimeNotificationValues) {
            if (anime.releaseDateMillis <= System.currentTimeMillis()) {
                if (isBooted && (lastSentNotificationTime == 0 || anime.releaseDateMillis > lastSentNotificationTime)) {
                    shouldNotifyAfterBoot = true;
                }
                if (anime.releaseDateMillis > currentSentNotificationTime) {
                    currentSentNotificationTime = anime.releaseDateMillis;
                }
                if (anime.isMyAnime) {
                    if (lastSentMyAnimeNotificationTime==0 || anime.releaseDateMillis>lastSentMyAnimeNotificationTime){
                        lastSentMyAnimeNotificationTime = anime.releaseDateMillis;
                    }
                    if (lastSentNotificationTime == 0 || anime.releaseDateMillis > lastSentNotificationTime) {
                        hasMyAnime = true;
                    }
                    if (myAnimeNotifications.get(String.valueOf(anime.animeId)) == null) {
                        myAnimeNotifications.put(String.valueOf(anime.animeId), anime);
                    } else {
                        AnimeNotification $anime = myAnimeNotifications.get(String.valueOf(anime.animeId));
                        if ($anime != null && $anime.releaseDateMillis < anime.releaseDateMillis) {
                            myAnimeNotifications.put(String.valueOf(anime.animeId), anime);
                        }
                    }
                } else {
                    if (lastSentOtherAnimeNotificationTime==0 || anime.releaseDateMillis>lastSentOtherAnimeNotificationTime){
                        lastSentOtherAnimeNotificationTime = anime.releaseDateMillis;
                    }
                    if (animeNotifications.get(String.valueOf(anime.animeId)) == null) {
                        animeNotifications.put(String.valueOf(anime.animeId), anime);
                    } else {
                        AnimeNotification $anime = animeNotifications.get(String.valueOf(anime.animeId));
                        if ($anime != null && $anime.releaseDateMillis < anime.releaseDateMillis) {
                            animeNotifications.put(String.valueOf(anime.animeId), anime);
                        }
                    }
                }
            } else {
                if (anime.releaseDateMillis < newNearestNotificationTime || newNearestNotificationTime == 0) {
                    newNearestNotificationTime = anime.releaseDateMillis;
                    newNearestNotificationInfo = anime;
                }
            }
        }

        if (lastSentMyAnimeNotificationTime==0) {
            lastSentMyAnimeNotificationTime = System.currentTimeMillis();
        }
        if (lastSentOtherAnimeNotificationTime==0) {
            lastSentOtherAnimeNotificationTime = System.currentTimeMillis();
        }

        List<AnimeNotification> recentlyAiredAnime = new ArrayList<>();

        boolean hasJustAiredMA = false;
        Notification.MessagingStyle styleMA = new Notification.MessagingStyle("")
                .setGroupConversation(true);
        List<AnimeNotification> sortedMyAnimeNotificationsValues = new ArrayList<>(myAnimeNotifications.values());
        Collections.sort(sortedMyAnimeNotificationsValues, Comparator.comparingLong(anime -> anime.releaseDateMillis));
        for (AnimeNotification anime : sortedMyAnimeNotificationsValues) {
            Person.Builder itemBuilder = new Person.Builder()
                    .setName(anime.title)
                    .setKey(String.valueOf(anime.animeId))
                    .setBot(true);
            if (anime.imageByte != null) {
                Bitmap image = BitmapFactory.decodeByteArray(anime.imageByte, 0, anime.imageByte.length);
                itemBuilder.setIcon(createRoundIcon(image));
            } else {
                if (dummyImage != null) {
                    Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                    itemBuilder.setIcon(createRoundIcon(image));
                } else {
                    try {
                        byte[] $dummyImage = (byte[]) LocalPersistence.readObjectFromFile(this.getApplicationContext(), "notificationLogoIcon");
                        if ($dummyImage != null && $dummyImage.length != 0) {
                            dummyImage = $dummyImage;
                            Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                            itemBuilder.setIcon(createRoundIcon(image));
                        }
                    } catch (Exception ignored) {
                    }
                }
            }
            Person item = itemBuilder.build();
            boolean justAired = anime.releaseDateMillis > Math.min(lastSentNotificationTime, System.currentTimeMillis()-(1000*60));
            String addedInfo = " aired.";
            if (justAired) {
                addedInfo = " just aired.";
                recentlyAiredAnime.add(anime);
            }
            if (justAired && !hasJustAiredMA) {
                hasJustAiredMA = true;
            }
            if (anime.maxEpisode < 0) { // No Given Max Episodes
                styleMA.addMessage("Episode " + anime.releaseEpisode + addedInfo, anime.releaseDateMillis, item);
            } else if (anime.releaseEpisode >= anime.maxEpisode) {
                styleMA.addMessage("Finished Airing: Episode " + anime.releaseEpisode + addedInfo, anime.releaseDateMillis, item);
            } else {
                styleMA.addMessage("Episode " + anime.releaseEpisode + " / " + anime.maxEpisode + addedInfo, anime.releaseDateMillis, item);
            }
        }
        String notificationTitleMA;
        if (hasJustAiredMA) {
            notificationTitleMA = "Your Anime Just Aired";
        } else {
            notificationTitleMA = "Your Anime Aired";
        }
        if (myAnimeNotifications.size() > 1) {
            notificationTitleMA = notificationTitleMA + " +" + myAnimeNotifications.size();
        }
        styleMA.setConversationTitle(notificationTitleMA);

        PackageManager pm = this.getApplicationContext().getPackageManager();
        Intent intent = pm.getLaunchIntentForPackage("com.example.kanshi");
        PendingIntent pendingIntent = PendingIntent.getActivity(this.getApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);
        pendingIntent.cancel();
        pendingIntent = PendingIntent.getActivity(this.getApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);

        String ANIME_RELEASE_NOTIFICATION_GROUP = "anime_release_notification_group";
        String CHANNEL_ID = "anime_releases_channel";
        Notification.Builder notificationMABuilder = new Notification.Builder(this.getApplicationContext(), CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setContentTitle(notificationTitleMA)
                .setStyle(styleMA)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                .setNumber(myAnimeNotifications.size())
                .setWhen(lastSentMyAnimeNotificationTime)
                .setShowWhen(true);

        // Other Anime Released
        boolean hasJustAiredOA = false;
        Notification.MessagingStyle styleOA = new Notification.MessagingStyle("")
                .setGroupConversation(true);
        List<AnimeNotification> sortedAnimeNotificationsValues = new ArrayList<>(animeNotifications.values());
        Collections.sort(sortedAnimeNotificationsValues, Comparator.comparingLong(anime -> anime.releaseDateMillis));
        for (AnimeNotification anime : sortedAnimeNotificationsValues) {
            Person.Builder itemBuilder = new Person.Builder()
                    .setName(anime.title)
                    .setKey(String.valueOf(anime.animeId))
                    .setBot(true);
            if (anime.imageByte != null) {
                Bitmap image = BitmapFactory.decodeByteArray(anime.imageByte, 0, anime.imageByte.length);
                itemBuilder.setIcon(createRoundIcon(image));
            } else {
                if (dummyImage != null) {
                    Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                    itemBuilder.setIcon(createRoundIcon(image));
                } else {
                    try {
                        byte[] $dummyImage = (byte[]) LocalPersistence.readObjectFromFile(this.getApplicationContext(), "notificationLogoIcon");
                        if ($dummyImage != null && $dummyImage.length != 0) {
                            dummyImage = $dummyImage;
                            Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                            itemBuilder.setIcon(createRoundIcon(image));
                        }
                    } catch (Exception ignored) {
                    }
                }
            }
            Person item = itemBuilder.build();
            boolean justAired = anime.releaseDateMillis > Math.min(lastSentNotificationTime, System.currentTimeMillis()-(1000*60));
            String addedInfo = " aired.";
            if (justAired) {
                addedInfo = " just aired.";
                recentlyAiredAnime.add(anime);
            }
            if (justAired && !hasJustAiredOA) {
                hasJustAiredOA = true;
            }
            if (anime.maxEpisode < 0) { // No Given Max Episodes
                styleOA.addMessage("Episode " + anime.releaseEpisode + addedInfo, anime.releaseDateMillis, item);
            } else if (anime.releaseEpisode >= anime.maxEpisode) {
                styleOA.addMessage("Finished Airing: Episode " + anime.releaseEpisode + addedInfo, anime.releaseDateMillis, item);
            } else {
                styleOA.addMessage("Episode " + anime.releaseEpisode + " / " + anime.maxEpisode + addedInfo, anime.releaseDateMillis, item);
            }
        }
        String notificationTitleOA;
        if (hasJustAiredOA) {
            notificationTitleOA = "Other Anime Just Aired";
        } else {
            notificationTitleOA = "Other Anime Aired";
        }
        if (animeNotifications.size() > 1) {
            notificationTitleOA = notificationTitleOA + " +" + animeNotifications.size();
        }
        styleOA.setConversationTitle(notificationTitleOA);

        Notification.Builder notificationOABuilder = new Notification.Builder(this.getApplicationContext(), CHANNEL_ID)
                .setContentTitle(notificationTitleOA)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                .setNumber(animeNotifications.size())
                .setWhen(lastSentOtherAnimeNotificationTime)
                .setShowWhen(true);

        String notificationTitle = "Anime Aired";
        int animeReleaseNotificationSize = myAnimeNotifications.size() + animeNotifications.size();
        if (animeReleaseNotificationSize > 1) {
            notificationTitle = notificationTitle + " +" + animeReleaseNotificationSize;
        }

        Notification.Builder notificationSummaryBuilder = new Notification.Builder(this.getApplicationContext(), CHANNEL_ID)
                .setContentTitle(notificationTitle)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupSummary(true)
                .setWhen(Math.max(lastSentOtherAnimeNotificationTime, lastSentMyAnimeNotificationTime))
                .setShowWhen(true);

        if (!hasMyAnime || isBooted) {
            notificationSummaryBuilder
                    .setGroupAlertBehavior(Notification.GROUP_ALERT_CHILDREN)
                    .setDefaults(Notification.DEFAULT_ALL)
                    .setVibrate(new long[]{0L});
        } else {
            notificationSummaryBuilder
                    .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY);
        }
        Notification notificationMA = notificationMABuilder.build();
        Notification notificationOA = notificationOABuilder.build();
        Notification notificationSummary = notificationSummaryBuilder.build();

        if (!isBooted || shouldNotifyAfterBoot) {
            if (animeNotifications.size() > 0 || myAnimeNotifications.size() > 0) {
                if (animeNotifications.size() > 0) {
                    int NOTIFICATION_OTHER_ANIME = 998;
                    notificationManager.notify(NOTIFICATION_OTHER_ANIME, notificationOA);
                }
                if (myAnimeNotifications.size() > 0) {
                    int NOTIFICATION_MY_ANIME = 999;
                    notificationManager.notify(NOTIFICATION_MY_ANIME, notificationMA);
                }
                int NOTIFICATION_ID_BASE = 1000;
                notificationManager.notify(NOTIFICATION_ID_BASE, notificationSummary);
            }
        }

        SharedPreferences.Editor prefsEdit = prefs.edit();
        prefsEdit.putLong("lastSentNotificationTime", currentSentNotificationTime).apply();

        HashSet<String> animeNotificationsToBeRemoved = new HashSet<>();
        long DAY_IN_MILLIS = TimeUnit.DAYS.toMillis(1);
        allAnimeNotificationValues = new ArrayList<>(AnimeNotificationManager.allAnimeNotification.values());
        for (AnimeNotification anime : allAnimeNotificationValues) {
            // If ReleaseDate was Before 1 day ago
            if (anime.releaseDateMillis < (System.currentTimeMillis() - DAY_IN_MILLIS)) {
                animeNotificationsToBeRemoved.add(anime.animeId+"-"+anime.releaseEpisode);
            }
        }
        for (String animeKey : animeNotificationsToBeRemoved) {
            AnimeNotificationManager.allAnimeNotification.remove(animeKey);
        }
        LocalPersistence.writeObjectToFile(this.getApplicationContext(), AnimeNotificationManager.allAnimeNotification, "allAnimeNotification");
        getNewNotification(newNearestNotificationInfo);
        @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeToUpdate = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(this.getApplicationContext(),"allAnimeToUpdate");
        if ($allAnimeToUpdate != null && $allAnimeToUpdate.size() > 0) {
            AnimeNotificationManager.allAnimeToUpdate.putAll($allAnimeToUpdate);
        }
        for (AnimeNotification anime : recentlyAiredAnime) {
            AnimeNotificationManager.allAnimeToUpdate.put(String.valueOf(anime.animeId),anime);
            getAiringAnime(anime, lastSentNotificationTime, 0);
        }
    }

    public void getNewNotification(AnimeNotification newNearestNotificationInfo) {
        if (newNearestNotificationInfo!=null) {
            AnimeNotificationManager.nearestNotificationInfo = newNearestNotificationInfo;
            AnimeNotificationManager.nearestNotificationTime = newNearestNotificationInfo.releaseDateMillis;

            Intent newIntent = new Intent(this.getApplicationContext(), AnimeNotificationManager.NotificationReceiver.class);
            newIntent.setAction("ANIME_NOTIFICATION");

            PendingIntent newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), ANIME_RELEASE_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager alarmManager = (AlarmManager) this.getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            // Cancel Old
            newPendingIntent.cancel();
            alarmManager.cancel(newPendingIntent);
            // Create New
            newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), ANIME_RELEASE_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, newNearestNotificationInfo.releaseDateMillis, newPendingIntent);
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, newNearestNotificationInfo.releaseDateMillis, newPendingIntent);
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, newNearestNotificationInfo.releaseDateMillis, newPendingIntent);
                } else {
                    try {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, newNearestNotificationInfo.releaseDateMillis, newPendingIntent);
                    } catch (SecurityException ignored) {
                        alarmManager.set(AlarmManager.RTC_WAKEUP, newNearestNotificationInfo.releaseDateMillis, newPendingIntent);
                    }
                }
            }
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    private void getAiringAnime(AnimeNotification anime, long lastSentNotificationTime, int retries) {
        if (retries>=4) {
            return;
        }
        try {
            long lastSentNotificationTimeSecLong = lastSentNotificationTime/1000L;
            int lastSentNotificationTimeSec;
            if (lastSentNotificationTimeSecLong<Integer.MAX_VALUE) {
                lastSentNotificationTimeSec = (int) lastSentNotificationTimeSecLong;
            } else {
                lastSentNotificationTimeSec = Integer.MAX_VALUE;
            }
            String query = "{AiringSchedule(mediaId:"+ anime.animeId +",notYetAired:true,airingAt_greater:"+lastSentNotificationTimeSec+"){media{episodes}airingAt episode}}";
            JSONObject jsonData = new JSONObject();
            jsonData.put("query", query);
            makePostRequest(response -> {
                if (response!=null) {
                    if (response.has("error")) {
                        try {
                            String message = response.getJSONArray("error").getJSONObject(0).getString("message");
                            if ("Not Found.".equals(message)) {
                                AnimeNotificationManager.allAnimeToUpdate.remove(String.valueOf(anime.animeId));
                            }
                        } catch (JSONException ignored) {}
                    } else {
                        if (response.has(retryKey) || !response.has("data")) {
                            // Call Another
                            new android.os.Handler(Looper.getMainLooper()).postDelayed(() -> getAiringAnime(anime, lastSentNotificationTime, retries + 1), 60000);
                        } else {
                            try {
                                JSONObject airingSchedule = response.getJSONObject("data").getJSONObject("AiringSchedule");
                                JSONObject media = null;
                                if (!airingSchedule.isNull("media")) {
                                    media = airingSchedule.getJSONObject("media");
                                }
                                long releaseDateMillis = airingSchedule.getLong("airingAt") * 1000L;
                                int episode = airingSchedule.getInt("episode");
                                int episodes;
                                boolean isEdited = false;
                                if (media != null && !media.isNull("episodes")) {
                                    episodes = media.getInt("episodes");
                                    if (anime.maxEpisode != episodes && episodes >= anime.releaseEpisode) {
                                        anime.maxEpisode = episodes;
                                        AnimeNotificationManager.allAnimeNotification.put(anime.animeId + "-" + anime.releaseEpisode, anime);
                                        isEdited = true;
                                    } else {
                                        episodes = anime.maxEpisode;
                                    }
                                } else {
                                    episodes = anime.maxEpisode;
                                }
                                AnimeNotification newAnimeRelease;
                                if (episode > anime.releaseEpisode && releaseDateMillis > anime.releaseDateMillis) {
                                    newAnimeRelease = new AnimeNotification(anime.animeId, anime.title, episode, episodes, releaseDateMillis, anime.imageByte, anime.isMyAnime);
                                    AnimeNotificationManager.allAnimeNotification.put(newAnimeRelease.animeId + "-" + newAnimeRelease.releaseEpisode, newAnimeRelease);
                                    isEdited = true;
                                }
                                if (isEdited) {
                                    LocalPersistence.writeObjectToFile(this.getApplicationContext(), AnimeNotificationManager.allAnimeNotification, "allAnimeNotification");
                                }
                                AnimeNotificationManager.allAnimeToUpdate.remove(String.valueOf(anime.animeId));
                                LocalPersistence.writeObjectToFile(this.getApplicationContext(), AnimeNotificationManager.allAnimeToUpdate, "allAnimeToUpdate");
                                delayAnimeReleaseUpdate();
                            } catch (JSONException ignored) {
                            }
                        }
                    }
                }
            },jsonData);
        } catch (JSONException ignored) {}
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    private void animeReleaseUpdate() {
        SharedPreferences prefs = this.getApplicationContext().getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
        long lastSentNotificationTime = prefs.getLong("lastSentNotificationTime", 0L);
        HashSet<String> animeUpdatesToBeRemoved = new HashSet<>();
        long ONE_WEEK_IN_MILLIS = TimeUnit.DAYS.toMillis(7);
        List<AnimeNotification> allAnimeNotificationValues = new ArrayList<>(AnimeNotificationManager.allAnimeNotification.values());
        for (AnimeNotification anime : allAnimeNotificationValues) {
            // If ReleaseDate was Before 1 week ago
            if (anime.releaseDateMillis < (System.currentTimeMillis() - ONE_WEEK_IN_MILLIS)) {
                animeUpdatesToBeRemoved.add(String.valueOf(anime.animeId));
            }
        }
        for (String animeId : animeUpdatesToBeRemoved) {
            AnimeNotificationManager.allAnimeToUpdate.remove(animeId);
        }
        allAnimeNotificationValues = new ArrayList<>(AnimeNotificationManager.allAnimeNotification.values());
        for (AnimeNotification anime : allAnimeNotificationValues) {
            getAiringAnime(anime, lastSentNotificationTime, 0);
        }
        LocalPersistence.writeObjectToFile(this.getApplicationContext(), AnimeNotificationManager.allAnimeToUpdate, "allAnimeToUpdate");
    }

    private void delayAnimeReleaseUpdate() {
        Intent newIntent = new Intent(this.getApplicationContext(), AnimeNotificationManager.NotificationReceiver.class);
        newIntent.setAction("ANIME_RELEASE_UPDATE");

        PendingIntent newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), ANIME_RELEASE_UPDATE_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarmManager = (AlarmManager) this.getApplicationContext().getSystemService(Context.ALARM_SERVICE);
        // Cancel Old
        newPendingIntent.cancel();
        alarmManager.cancel(newPendingIntent);
        // Create New
        newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), ANIME_RELEASE_UPDATE_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        long TWELVE_HOURS_IN_MILLIS = TimeUnit.HOURS.toMillis(12);
        long nextUpdateInMillis = System.currentTimeMillis()+TWELVE_HOURS_IN_MILLIS;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextUpdateInMillis, newPendingIntent);
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextUpdateInMillis, newPendingIntent);
            }
        } else {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextUpdateInMillis, newPendingIntent);
            } else {
                try {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, nextUpdateInMillis, newPendingIntent);
                } catch (SecurityException ignored) {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, nextUpdateInMillis, newPendingIntent);
                }
            }
        }
    }
    @RequiresApi(api = Build.VERSION_CODES.N)
    private void makePostRequest(PostRequestCallback callback, JSONObject jsonData) {
        CompletableFuture.supplyAsync(() -> postRequest(jsonData))
                .thenAccept(callback::onResponse);
    }
    public JSONObject postRequest(JSONObject jsonData) {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        Future<JSONObject> future = executor.submit(()->{
            try {
                String apiUrl = "https://graphql.anilist.co";
                URL url = new URL(apiUrl);
                HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
                urlConnection.setRequestMethod("POST");
                urlConnection.setDoOutput(true);
                urlConnection.setRequestProperty("Content-Type", "application/json");
                urlConnection.setRequestProperty("Accept", "application/json");
                // Write the JSON data to the output stream
                DataOutputStream wr = new DataOutputStream(urlConnection.getOutputStream());
                byte[] postData = jsonData.toString().getBytes(StandardCharsets.UTF_8);
                wr.write(postData);

                int responseCode = urlConnection.getResponseCode();

                if (responseCode == HttpURLConnection.HTTP_OK) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(urlConnection.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String line;

                    while ((line = reader.readLine()) != null) {
                        response.append(line);
                    }

                    reader.close();

                    urlConnection.disconnect();

                    // Parse the JSON response and return as JSONObject
                    JSONObject responseJSON = new JSONObject(response.toString());
                    String rateLimitStr = urlConnection.getHeaderField("x-ratelimit-remaining");
                    try {
                        int rateLimit = Integer.parseInt(rateLimitStr);
                        responseJSON.put("rateLimit", rateLimit);
                    } catch (NumberFormatException ignored){
                    }
                    return responseJSON;
                } else {
                    urlConnection.disconnect();
                    JSONObject jsonObject = new JSONObject();
                    try {
                        jsonObject.put(retryKey,true);
                        return jsonObject;
                    } catch (JSONException ex) {
                        return null;
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
                return null;
            }
        });
        try {
            return future.get();
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        } finally {
            executor.shutdown();
        }
    }

    interface PostRequestCallback {
        void onResponse(JSONObject response);
    }
}

