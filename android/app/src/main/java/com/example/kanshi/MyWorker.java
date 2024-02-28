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
import android.os.Handler;
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
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.TimeZone;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

public class MyWorker extends Worker {
    private static final int UPDATE_DATA_PENDING_INTENT = 994;
    public final String retryKey = "Kanshi-Anime-Recommendation.Retry";

    public MyWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @RequiresApi(api = Build.VERSION_CODES.P)
    @NonNull
    @Override
    public Result doWork() {
        String action = getInputData().getString("action");
        if ("UPDATE_DATA".equals(action)) {
            boolean isManual = getInputData().getBoolean("isManual",true);
            updateData(isManual);
        } else {
            boolean isBooted = getInputData().getBoolean("isBooted", false);
            if (AnimeNotificationManager.allAnimeNotification.size()==0) {
                @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(this.getApplicationContext(), "allAnimeNotification");
                if ($allAnimeNotification != null && $allAnimeNotification.size() > 0) {
                    AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
                }
            }
            showNotification(isBooted);
            if (isBooted) {
                updateData(true);
            }
        }
        return Result.success();
    }

    @RequiresApi(api = Build.VERSION_CODES.P)
    private void showNotification(boolean isBooted) {

        SharedPreferences prefs = this.getApplicationContext().getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
        AnimeNotificationManager.createAnimeReleasesNotificationChannel(this.getApplicationContext());
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this.getApplicationContext());

        notificationManager.cancel(AnimeNotificationManager.NOTIFICATION_OTHER_ANIME);
        notificationManager.cancel(AnimeNotificationManager.NOTIFICATION_MY_ANIME);
        notificationManager.cancel(AnimeNotificationManager.NOTIFICATION_ANIME_RELEASE);

        byte[] dummyImage = null;
        HashMap<String, AnimeNotification> myAnimeNotifications = new HashMap<>();
        HashMap<String, AnimeNotification> animeNotifications = new HashMap<>();

        long lastSentNotificationTime = prefs.getLong("lastSentNotificationTime", 0L);
        long currentTimeInMillis = System.currentTimeMillis();
        long realLastSentNotificationTime = lastSentNotificationTime != 0L ? lastSentNotificationTime : currentTimeInMillis;
        AnimeNotification nextAnimeNotificationInfo = null;

        long sixtySecondsAgoInMillis = Math.min(realLastSentNotificationTime, System.currentTimeMillis()-TimeUnit.MINUTES.toMillis(1));

        long mostRecentlySentMyAnimeNotificationTime = 0L;
        long mostRecentlySentOtherAnimeNotificationTime = 0L;

        List<AnimeNotification> newSentAnimeNotification = new ArrayList<>();
        List<AnimeNotification> allAnimeNotificationValues = new ArrayList<>(AnimeNotificationManager.allAnimeNotification.values());

        for (AnimeNotification anime : allAnimeNotificationValues) {
            if (anime.releaseDateMillis <= currentTimeInMillis) {
                if (anime.releaseDateMillis > realLastSentNotificationTime) {
                    newSentAnimeNotification.add(anime);
                }
                boolean isMyAnime = anime.userStatus != null && !anime.userStatus.equals("") && !anime.userStatus.equalsIgnoreCase("UNWATCHED");
                if (isMyAnime) {
                    if (anime.releaseDateMillis > mostRecentlySentMyAnimeNotificationTime){
                        mostRecentlySentMyAnimeNotificationTime = anime.releaseDateMillis;
                    }
                    if (sixtySecondsAgoInMillis < anime.releaseDateMillis) {
                        if (myAnimeNotifications.get(String.valueOf(anime.animeId)) == null) {
                            myAnimeNotifications.put(String.valueOf(anime.animeId), anime);
                        } else {
                            AnimeNotification $anime = myAnimeNotifications.get(String.valueOf(anime.animeId));
                            if ($anime != null && $anime.releaseDateMillis < anime.releaseDateMillis) {
                                myAnimeNotifications.put(String.valueOf(anime.animeId), anime);
                            }
                        }
                    }
                } else {
                    if (anime.releaseDateMillis > mostRecentlySentOtherAnimeNotificationTime){
                        mostRecentlySentOtherAnimeNotificationTime = anime.releaseDateMillis;
                    }
                    if (sixtySecondsAgoInMillis < anime.releaseDateMillis) {
                        if (animeNotifications.get(String.valueOf(anime.animeId)) == null) {
                            animeNotifications.put(String.valueOf(anime.animeId), anime);
                        } else {
                            AnimeNotification $anime = animeNotifications.get(String.valueOf(anime.animeId));
                            if ($anime != null && $anime.releaseDateMillis < anime.releaseDateMillis) {
                                animeNotifications.put(String.valueOf(anime.animeId), anime);
                            }
                        }
                    }
                }
            } else {
                if (nextAnimeNotificationInfo==null || nextAnimeNotificationInfo.releaseDateMillis > anime.releaseDateMillis) {
                    nextAnimeNotificationInfo = anime;
                }
            }
        }

        if (mostRecentlySentMyAnimeNotificationTime==0L) {
            mostRecentlySentMyAnimeNotificationTime = currentTimeInMillis;
        }

        if (mostRecentlySentOtherAnimeNotificationTime==0L) {
            mostRecentlySentOtherAnimeNotificationTime = currentTimeInMillis;
        }

        final int maxNotificationCount = 6;

        Notification.MessagingStyle styleMA = new Notification.MessagingStyle(new Person.Builder().setName("").build()).setGroupConversation(true);

        // Put in Descending Order for in Adding items for the Message Style Notification
        List<AnimeNotification> ascendedMyAnimeNotificationsValues = new ArrayList<>(myAnimeNotifications.values());
        Collections.sort(ascendedMyAnimeNotificationsValues, Comparator.comparingLong(a -> a.releaseDateMillis));

        // Get the last 6 items in the list to only show what can be seen
        int startIndexMA = Math.max(0, ascendedMyAnimeNotificationsValues.size() - maxNotificationCount);
        List<AnimeNotification> finalMyAnimeNotificationsValues = ascendedMyAnimeNotificationsValues.subList(startIndexMA, ascendedMyAnimeNotificationsValues.size());

        for (AnimeNotification anime : finalMyAnimeNotificationsValues) {
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
            String addedInfo = " just aired.";
            if (anime.maxEpisode < 0) { // No Given Max Episodes
                styleMA.addMessage("Episode " + anime.releaseEpisode + addedInfo, anime.releaseDateMillis, item);
            } else if (anime.releaseEpisode >= anime.maxEpisode) {
                styleMA.addMessage("Finished Airing: Episode " + anime.releaseEpisode + addedInfo, anime.releaseDateMillis, item);
            } else {
                styleMA.addMessage("Episode " + anime.releaseEpisode + " / " + anime.maxEpisode + addedInfo, anime.releaseDateMillis, item);
            }
        }
        String notificationTitleMA;
        if (myAnimeNotifications.size() > 0) {
            notificationTitleMA = "Your Anime Just Aired" + " +" + myAnimeNotifications.size();
        } else {
            notificationTitleMA = "Your Anime Aired";
        }
        styleMA.setConversationTitle(notificationTitleMA);

        PackageManager pm = this.getApplicationContext().getPackageManager();
        Intent intent = pm.getLaunchIntentForPackage("com.example.kanshi");
        PendingIntent pendingIntent = PendingIntent.getActivity(this.getApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);
        pendingIntent.cancel();
        pendingIntent = PendingIntent.getActivity(this.getApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);

        Intent seeMoreIntent = new Intent(this.getApplicationContext(), MyReceiver.class);
        seeMoreIntent.setAction("SEE_MORE_RELEASED");
        PendingIntent seeMorePendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), 0, seeMoreIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);

        Notification.Builder notificationMABuilder = new Notification.Builder(this.getApplicationContext(), AnimeNotificationManager.ANIME_RELEASES_CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setContentTitle(notificationTitleMA)
                .setStyle(styleMA)
                .setContentIntent(pendingIntent)
                .setGroup(AnimeNotificationManager.ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                .setNumber(0)
                .addAction(R.drawable.more_white_horizontal, "SEE MORE", seeMorePendingIntent)
                .setOnlyAlertOnce(true)
                .setWhen(mostRecentlySentMyAnimeNotificationTime)
                .setShowWhen(true);

        // Other Anime Released
        Notification.MessagingStyle styleOA = new Notification.MessagingStyle(new Person.Builder().setName("").build()).setGroupConversation(true);

        // Put in Ascending Order for in Adding items for the Message Style Notification
        List<AnimeNotification> ascendedAnimeNotificationsValues = new ArrayList<>(animeNotifications.values());
        Collections.sort(ascendedAnimeNotificationsValues, Comparator.comparingLong(a -> a.releaseDateMillis));

        // Get the last 6 items in the list to only show what can be seen
        int startIndexOA = Math.max(0, ascendedAnimeNotificationsValues.size() - maxNotificationCount);
        List<AnimeNotification> finalAnimeNotificationsValues = ascendedAnimeNotificationsValues.subList(startIndexOA, ascendedAnimeNotificationsValues.size());

        for (AnimeNotification anime : finalAnimeNotificationsValues) {
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
            String addedInfo = " just aired.";
            newSentAnimeNotification.add(anime);
            if (anime.maxEpisode < 0) { // No Given Max Episodes
                styleOA.addMessage("Episode " + anime.releaseEpisode + addedInfo, anime.releaseDateMillis, item);
            } else if (anime.releaseEpisode >= anime.maxEpisode) {
                styleOA.addMessage("Finished Airing: Episode " + anime.releaseEpisode + addedInfo, anime.releaseDateMillis, item);
            } else {
                styleOA.addMessage("Episode " + anime.releaseEpisode + " / " + anime.maxEpisode + addedInfo, anime.releaseDateMillis, item);
            }
        }
        String notificationTitleOA;
        if (animeNotifications.size() > 0) {
            notificationTitleOA = "Other Anime Just Aired" + " +" + animeNotifications.size();
        } else {
            notificationTitleOA = "Other Anime Aired";
        }
        styleOA.setConversationTitle(notificationTitleOA);

        Notification.Builder notificationOABuilder = new Notification.Builder(this.getApplicationContext(), AnimeNotificationManager.ANIME_RELEASES_CHANNEL)
                .setContentTitle(notificationTitleOA)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .setGroup(AnimeNotificationManager.ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                .setNumber(0)
                .addAction(R.drawable.more_white_horizontal, "SEE MORE", seeMorePendingIntent)
                .setOnlyAlertOnce(true)
                .setWhen(mostRecentlySentOtherAnimeNotificationTime)
                .setShowWhen(true);

        long mostRecentlySentNotificationTime = Math.max(mostRecentlySentMyAnimeNotificationTime, mostRecentlySentOtherAnimeNotificationTime);

        if (ActivityCompat.checkSelfPermission(this.getApplicationContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            String notificationTitle = "Anime Aired";
            long animeReleaseNotificationSize = myAnimeNotifications.size() + animeNotifications.size();
            if (animeReleaseNotificationSize > 0) {
                notificationTitle = notificationTitle + " +" + animeReleaseNotificationSize;
            }

            Notification.Builder notificationSummaryBuilder = new Notification.Builder(this.getApplicationContext(), AnimeNotificationManager.ANIME_RELEASES_CHANNEL)
                    .setContentTitle(notificationTitle)
                    .setSmallIcon(R.drawable.ic_stat_name)
                    .setStyle(styleOA)
                    .setPriority(Notification.PRIORITY_DEFAULT)
                    .setContentIntent(pendingIntent)
                    .setGroup(AnimeNotificationManager.ANIME_RELEASE_NOTIFICATION_GROUP)
                    .setGroupSummary(true)
                    .setOnlyAlertOnce(true)
                    .setWhen(mostRecentlySentNotificationTime)
                    .setShowWhen(true);

            boolean hasNewMyAnimeNotification = myAnimeNotifications.size() > 0;
            if (hasNewMyAnimeNotification) { // Set with vibration
                notificationSummaryBuilder
                        .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY);
            } else { // Set with no vibration
                notificationSummaryBuilder
                        .setGroupAlertBehavior(Notification.GROUP_ALERT_CHILDREN)
                        .setDefaults(Notification.DEFAULT_ALL)
                        .setVibrate(new long[]{0L});
            }

            SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
            if (schedulesTabFragment!=null) {
                new Handler(Looper.getMainLooper()).post(schedulesTabFragment::updateScheduledAnime);
            }
            ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();
            if (releasedTabFragment!=null) {
                new Handler(Looper.getMainLooper()).post(releasedTabFragment::updateReleasedAnime);
            }

            boolean shouldNotify = lastSentNotificationTime == 0L || mostRecentlySentNotificationTime > lastSentNotificationTime;
            if (!isBooted || shouldNotify) {
                if (animeReleaseNotificationSize > 0) {
                    if (animeNotifications.size() > 0) {
                        int NOTIFICATION_OTHER_ANIME = 998;
                        Notification notificationOA = notificationOABuilder.build();
                        notificationManager.notify(NOTIFICATION_OTHER_ANIME, notificationOA);
                    }
                    if (myAnimeNotifications.size() > 0) {
                        int NOTIFICATION_MY_ANIME = 999;
                        Notification notificationMA = notificationMABuilder.build();
                        notificationManager.notify(NOTIFICATION_MY_ANIME, notificationMA);
                    }
                    int NOTIFICATION_ID_BASE = 1000;
                    Notification notificationSummary = notificationSummaryBuilder.build();
                    notificationManager.notify(NOTIFICATION_ID_BASE, notificationSummary);
                }
            }
        }

        HashSet<String> animeNotificationsToBeRemoved = new HashSet<>();
        long THIRTY_DAY_IN_MILLIS = TimeUnit.DAYS.toMillis(30);
        for (AnimeNotification anime : allAnimeNotificationValues) {
            // If ReleaseDate was Before 30 days ago
            if (anime.releaseDateMillis < (System.currentTimeMillis() - THIRTY_DAY_IN_MILLIS)) {
                animeNotificationsToBeRemoved.add(anime.animeId+"-"+anime.releaseEpisode);
            }
        }
        if (!animeNotificationsToBeRemoved.isEmpty()) {
            for (String animeKey : animeNotificationsToBeRemoved) {
                AnimeNotificationManager.allAnimeNotification.remove(animeKey);
            }
            LocalPersistence.writeObjectToFile(this.getApplicationContext(), AnimeNotificationManager.allAnimeNotification, "allAnimeNotification");
        }

        for (AnimeNotification anime : newSentAnimeNotification) {
            getAiringAnime(anime, lastSentNotificationTime, 0);
        }

        SharedPreferences.Editor prefsEdit = prefs.edit();
        prefsEdit.putLong("lastSentNotificationTime", mostRecentlySentNotificationTime).apply();
        getNewNotification(nextAnimeNotificationInfo);
    }

    public void getNewNotification(AnimeNotification nextAnimeNotificationInfo) {
        if (nextAnimeNotificationInfo!=null) {
            AnimeNotificationManager.nearestNotificationInfo = nextAnimeNotificationInfo;
            AnimeNotificationManager.nearestNotificationTime = nextAnimeNotificationInfo.releaseDateMillis;

            Intent newIntent = new Intent(this.getApplicationContext(), MyReceiver.class);
            newIntent.setAction("ANIME_NOTIFICATION");

            PendingIntent newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), AnimeNotificationManager.ANIME_RELEASE_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager alarmManager = (AlarmManager) this.getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            // Cancel Old
            newPendingIntent.cancel();
            alarmManager.cancel(newPendingIntent);
            // Create New
            newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), AnimeNotificationManager.ANIME_RELEASE_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextAnimeNotificationInfo.releaseDateMillis, newPendingIntent);
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextAnimeNotificationInfo.releaseDateMillis, newPendingIntent);
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextAnimeNotificationInfo.releaseDateMillis, newPendingIntent);
                } else {
                    try {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, nextAnimeNotificationInfo.releaseDateMillis, newPendingIntent);
                    } catch (SecurityException ignored) {
                        alarmManager.set(AlarmManager.RTC_WAKEUP, nextAnimeNotificationInfo.releaseDateMillis, newPendingIntent);
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
                    if (!response.has("error")) {
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
                                long episode = airingSchedule.getInt("episode");
                                long episodes;
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
                                if (episode > anime.releaseEpisode) {
                                    AnimeNotification newAnimeRelease = new AnimeNotification(anime.animeId, anime.title, episode, episodes, releaseDateMillis, anime.imageByte, anime.animeUrl, anime.userStatus);
                                    AnimeNotificationManager.allAnimeNotification.put(newAnimeRelease.animeId + "-" + newAnimeRelease.releaseEpisode, newAnimeRelease);
                                    AnimeNotificationManager.addAnimeNotification(this.getApplicationContext(), newAnimeRelease);
                                    isEdited = true;
                                }
                                if (isEdited) {
                                    LocalPersistence.writeObjectToFile(this.getApplicationContext(), AnimeNotificationManager.allAnimeNotification, "allAnimeNotification");
                                }
                            } catch (JSONException ignored) {
                            }
                        }
                    }
                }
            },jsonData);
        } catch (JSONException ignored) {}
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    private void makePostRequest(PostRequestCallback callback, JSONObject jsonData) {
        CompletableFuture.supplyAsync(() -> postRequest(jsonData))
                .thenAccept(callback::onResponse);
    }
    final ExecutorService executor = Executors.newFixedThreadPool(1);
    public JSONObject postRequest(JSONObject jsonData) {
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
        }
    }

    interface PostRequestCallback {
        void onResponse(JSONObject response);
    }

    private void updateData(boolean isManual) {
        // Default 1 hour interval
        long newBackgroundUpdateTime = System.currentTimeMillis() + TimeUnit.HOURS.toMillis(1);

        TimeZone tz = TimeZone.getDefault();
        Calendar calendar = Calendar.getInstance(tz);

        int hourOfDay = calendar.get(Calendar.HOUR_OF_DAY);
        // Early morning (before 6am)
        boolean isEarlyMorning = hourOfDay < 6;
        // Check if the current time is less than 5am
        // This is to ensure that there is always an hour or greater interval between updates
        // Not really true when its currently 5:00am as it still has an hour before 6:00am
        // But next update default (5:00am + 1hour) is still set at 6am
        // So... Ah Eh Tooo... Blehhh...
        boolean hasAnHourBeforeEarlyMorning = hourOfDay < 5;
        if (hasAnHourBeforeEarlyMorning) {
            calendar.set(Calendar.HOUR_OF_DAY, 6);
            calendar.clear(Calendar.MINUTE);
            calendar.clear(Calendar.SECOND);
            calendar.clear(Calendar.MILLISECOND);
            long sixAmInMillis = calendar.getTimeInMillis();
            if (sixAmInMillis >= System.currentTimeMillis()) {
                newBackgroundUpdateTime = sixAmInMillis;
            }
        }

        // Only Run Foreground Service if its set Manually or not an Early Morning (before 6am)
        if (isManual || !isEarlyMorning) {
            SharedPreferences prefs = this.getApplicationContext().getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
            boolean keepAppRunningInBackground = prefs.getBoolean("keepAppRunningInBackground",true);
            boolean isInApp = false;
            MainActivity mainActivity = MainActivity.getInstanceActivity();
            if (mainActivity!=null) {
                isInApp = mainActivity.isInApp;
            }
            // Run service if background update is enabled and user is not in app
            if (keepAppRunningInBackground && !isInApp) {
                Intent intent = new Intent(this.getApplicationContext(), MainService.class);
                this.getApplicationContext().startService(intent);
            }
        }

        Intent newIntent = new Intent(this.getApplicationContext(), MyReceiver.class);
        newIntent.setAction("UPDATE_DATA_AUTO");

        PendingIntent newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), UPDATE_DATA_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarmManager = (AlarmManager) this.getApplicationContext().getSystemService(Context.ALARM_SERVICE);
        // Cancel Old
        newPendingIntent.cancel();
        alarmManager.cancel(newPendingIntent);
        // Create New
        newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), UPDATE_DATA_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, newBackgroundUpdateTime, newPendingIntent);
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, newBackgroundUpdateTime, newPendingIntent);
            }
        } else {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, newBackgroundUpdateTime, newPendingIntent);
            } else {
                try {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, newBackgroundUpdateTime, newPendingIntent);
                } catch (SecurityException ignored) {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, newBackgroundUpdateTime, newPendingIntent);
                }
            }
        }
    }
}

