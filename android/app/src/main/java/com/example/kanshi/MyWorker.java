package com.example.kanshi;

import static com.example.kanshi.MediaNotificationManager.NOTIFICATION_MEDIA_RELEASE;
import static com.example.kanshi.MediaNotificationManager.NOTIFICATION_MY_MEDIA;
import static com.example.kanshi.MediaNotificationManager.NOTIFICATION_OTHER_MEDIA;
import static com.example.kanshi.Configs.UPDATE_DATA_PENDING_INTENT;
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
    public final String RETRY_KEY = "Kanshi-Media-Recommendation.Retry";
    public MyWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
        // Log Errors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Thread.setDefaultUncaughtExceptionHandler((thread, e) -> Utils.handleUncaughtException(context.getApplicationContext(), e, "MyWorker 1"));
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.VANILLA_ICE_CREAM)
    @NonNull
    @Override
    public Result doWork() {
        // Log Errors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Thread.setDefaultUncaughtExceptionHandler((thread, e) -> Utils.handleUncaughtException(MyWorker.this.getApplicationContext(), e, "MyWorker 2"));
        }
        String action = getInputData().getString("action");
        if ("UPDATE_DATA".equals(action)) {
            boolean isManual = getInputData().getBoolean("isManual",true);
            updateData(isManual);
        } else {
            boolean isBooted = getInputData().getBoolean("isBooted", false);
            showNotification(isBooted);
            if (isBooted) {
                updateData(true);
            }
        }
        return Result.success();
    }

    @RequiresApi(api = Build.VERSION_CODES.VANILLA_ICE_CREAM)
    private void showNotification(boolean isBooted) {

        SharedPreferences prefs = this.getApplicationContext().getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
        MediaNotificationManager.createMediaReleasesNotificationChannel(this.getApplicationContext());
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this.getApplicationContext());

        byte[] dummyImage = null;
        HashMap<String, MediaNotification> myMediaNotifications = new HashMap<>();
        HashMap<String, MediaNotification> mediaNotifications = new HashMap<>();

        MediaNotification nextMediaNotificationInfo = null;
        long lastSentNotificationTime = prefs.getLong("lastSentNotificationTime", 0L);
        long currentTimeInMillis = System.currentTimeMillis();
        long realLastSentNotificationTime = lastSentNotificationTime != 0L ? lastSentNotificationTime : currentTimeInMillis;

        long timeForNewReleaseInMillis = Math.min(realLastSentNotificationTime, currentTimeInMillis-TimeUnit.MINUTES.toMillis(1));

        long mostRecentlySentMyMediaNotificationTime = 0L;
        long mostRecentlySentOtherMediaNotificationTime = 0L;

        if (MediaNotificationManager.allMediaNotification.isEmpty()) {
            @SuppressWarnings("unchecked") ConcurrentHashMap<String, MediaNotification> $allMediaNotification = (ConcurrentHashMap<String, MediaNotification>) LocalPersistence.readObjectFromFile(this.getApplicationContext(), "allMediaNotification");
            if ($allMediaNotification != null && !$allMediaNotification.isEmpty()) {
                MediaNotificationManager.allMediaNotification.putAll($allMediaNotification);
            }
        }

        List<MediaNotification> newSentMedia = new ArrayList<>();
        List<MediaNotification> allMediaNotificationValues = new ArrayList<>(MediaNotificationManager.allMediaNotification.values());

        for (MediaNotification media : allMediaNotificationValues) {
            if ("DROPPED".equalsIgnoreCase(media.userStatus)) {
                if (
                    media.releaseDateMillis <= currentTimeInMillis
                    && media.releaseDateMillis > realLastSentNotificationTime
                ) {
                    newSentMedia.add(media);
                }
                continue;
            }
            if (media.releaseDateMillis <= currentTimeInMillis) {
                if (media.releaseDateMillis > realLastSentNotificationTime) {
                    newSentMedia.add(media);
                }
                boolean isMyMedia = media.userStatus != null && !media.userStatus.isEmpty() && !media.userStatus.equalsIgnoreCase("UNSEEN");
                if (isMyMedia) {
                    if (media.releaseDateMillis > mostRecentlySentMyMediaNotificationTime){
                        mostRecentlySentMyMediaNotificationTime = media.releaseDateMillis;
                    }
                    if (timeForNewReleaseInMillis < media.releaseDateMillis) {
                        if (myMediaNotifications.get(String.valueOf(media.mediaId)) == null) {
                            myMediaNotifications.put(String.valueOf(media.mediaId), media);
                        } else {
                            MediaNotification $media = myMediaNotifications.get(String.valueOf(media.mediaId));
                            if ($media != null && $media.releaseDateMillis < media.releaseDateMillis) {
                                myMediaNotifications.put(String.valueOf(media.mediaId), media);
                            }
                        }
                    }
                } else {
                    if (media.releaseDateMillis > mostRecentlySentOtherMediaNotificationTime){
                        mostRecentlySentOtherMediaNotificationTime = media.releaseDateMillis;
                    }
                    if (timeForNewReleaseInMillis < media.releaseDateMillis) {
                        if (mediaNotifications.get(String.valueOf(media.mediaId)) == null) {
                            mediaNotifications.put(String.valueOf(media.mediaId), media);
                        } else {
                            MediaNotification $media = mediaNotifications.get(String.valueOf(media.mediaId));
                            if ($media != null && $media.releaseDateMillis < media.releaseDateMillis) {
                                mediaNotifications.put(String.valueOf(media.mediaId), media);
                            }
                        }
                    }
                }
            } else {
                if (nextMediaNotificationInfo ==null || nextMediaNotificationInfo.releaseDateMillis > media.releaseDateMillis) {
                    nextMediaNotificationInfo = media;
                }
            }
        }

        if (mostRecentlySentMyMediaNotificationTime==0L) {
            mostRecentlySentMyMediaNotificationTime = currentTimeInMillis;
        }

        if (mostRecentlySentOtherMediaNotificationTime==0L) {
            mostRecentlySentOtherMediaNotificationTime = currentTimeInMillis;
        }

        final int maxNotificationCount = 6;

        Notification.MessagingStyle styleMA = new Notification.MessagingStyle(new Person.Builder().setName("").build()).setGroupConversation(true);

        // Put in Descending Order for in Adding items for the Message Style Notification
        List<MediaNotification> ascendedMyMediaNotificationsValues = new ArrayList<>(myMediaNotifications.values());
        Collections.sort(ascendedMyMediaNotificationsValues, Comparator.comparingLong(a -> a.releaseDateMillis));

        // Get the last 6 items in the list to only show what can be seen
        int startIndexMA = Math.max(0, ascendedMyMediaNotificationsValues.size() - maxNotificationCount);
        List<MediaNotification> finalMyMediaNotificationsValues = ascendedMyMediaNotificationsValues.subList(startIndexMA, ascendedMyMediaNotificationsValues.size());

        for (MediaNotification media : finalMyMediaNotificationsValues) {
            Person.Builder itemBuilder = new Person.Builder()
                    .setName(media.title)
                    .setKey(String.valueOf(media.mediaId))
                    .setBot(true);
            if (media.imageByte != null) {
                Bitmap image = BitmapFactory.decodeByteArray(media.imageByte, 0, media.imageByte.length);
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
                    } catch (Exception ignored) {}
                }
            }
            Person item = itemBuilder.build();
            String addedInfo = " just aired.";
            if (media.maxEpisode < 0) { // No Given Max Episodes
                styleMA.addMessage("Episode " + media.releaseEpisode + addedInfo, media.releaseDateMillis, item);
            } else if (media.releaseEpisode >= media.maxEpisode) {
                styleMA.addMessage("Finished Airing: Episode " + media.releaseEpisode + addedInfo, media.releaseDateMillis, item);
            } else {
                styleMA.addMessage("Episode " + media.releaseEpisode + " / " + media.maxEpisode + addedInfo, media.releaseDateMillis, item);
            }
        }
        String notificationTitleMA;
        if (!myMediaNotifications.isEmpty()) {
            notificationTitleMA = "Your Anime Just Aired" + " +" + myMediaNotifications.size();
        } else {
            notificationTitleMA = "Your Anime Aired";
        }
        styleMA.setConversationTitle(notificationTitleMA);

        Intent intent = new Intent(this.getApplicationContext(), MediaReleaseActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(this.getApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);
        pendingIntent.cancel();
        pendingIntent = PendingIntent.getActivity(this.getApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);

        Intent seeMoreIntent = new Intent(this.getApplicationContext(), MyReceiver.class);
        seeMoreIntent.setAction("SEE_MORE_RELEASED");
        PendingIntent seeMorePendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), 0, seeMoreIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);

        Notification.Builder notificationMABuilder = new Notification.Builder(this.getApplicationContext(), MediaNotificationManager.MEDIA_RELEASES_CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setContentTitle(notificationTitleMA)
                .setStyle(styleMA)
                .setContentIntent(pendingIntent)
                .setGroup(MediaNotificationManager.MEDIA_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                .setNumber(0)
                .addAction(R.drawable.more_white_horizontal, "SEE MORE", seeMorePendingIntent)
                .setOnlyAlertOnce(true)
                .setWhen(mostRecentlySentMyMediaNotificationTime)
                .setShowWhen(true);

        // Other Media Released
        Notification.MessagingStyle styleOA = new Notification.MessagingStyle(new Person.Builder().setName("").build()).setGroupConversation(true);

        // Put in Ascending Order for in Adding items for the Message Style Notification
        List<MediaNotification> ascendedMediaNotificationsValues = new ArrayList<>(mediaNotifications.values());
        Collections.sort(ascendedMediaNotificationsValues, Comparator.comparingLong(a -> a.releaseDateMillis));

        // Get the last 6 items in the list to only show what can be seen
        int startIndexOA = Math.max(0, ascendedMediaNotificationsValues.size() - maxNotificationCount);
        List<MediaNotification> finalMediaNotificationsValues = ascendedMediaNotificationsValues.subList(startIndexOA, ascendedMediaNotificationsValues.size());

        for (MediaNotification media : finalMediaNotificationsValues) {
            Person.Builder itemBuilder = new Person.Builder()
                    .setName(media.title)
                    .setKey(String.valueOf(media.mediaId))
                    .setBot(true);
            if (media.imageByte != null) {
                Bitmap image = BitmapFactory.decodeByteArray(media.imageByte, 0, media.imageByte.length);
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
                    } catch (Exception ignored) {}
                }
            }
            Person item = itemBuilder.build();
            String addedInfo = " just aired.";
            if (media.maxEpisode < 0) { // No Given Max Episodes
                styleOA.addMessage("Episode " + media.releaseEpisode + addedInfo, media.releaseDateMillis, item);
            } else if (media.releaseEpisode >= media.maxEpisode) {
                styleOA.addMessage("Finished Airing: Episode " + media.releaseEpisode + addedInfo, media.releaseDateMillis, item);
            } else {
                styleOA.addMessage("Episode " + media.releaseEpisode + " / " + media.maxEpisode + addedInfo, media.releaseDateMillis, item);
            }
        }
        String notificationTitleOA;
        if (!mediaNotifications.isEmpty()) {
            notificationTitleOA = "Other Anime Just Aired" + " +" + mediaNotifications.size();
        } else {
            notificationTitleOA = "Other Anime Aired";
        }
        styleOA.setConversationTitle(notificationTitleOA);

        Notification.Builder notificationOABuilder = new Notification.Builder(this.getApplicationContext(), MediaNotificationManager.MEDIA_RELEASES_CHANNEL)
                .setContentTitle(notificationTitleOA)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .setGroup(MediaNotificationManager.MEDIA_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                .setNumber(0)
                .addAction(R.drawable.more_white_horizontal, "SEE MORE", seeMorePendingIntent)
                .setOnlyAlertOnce(true)
                .setWhen(mostRecentlySentOtherMediaNotificationTime)
                .setShowWhen(true);

        long mostRecentlySentNotificationTime = Math.max(mostRecentlySentMyMediaNotificationTime, mostRecentlySentOtherMediaNotificationTime);

        if (ActivityCompat.checkSelfPermission(this.getApplicationContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            String notificationTitle = "Anime Aired";
            long mediaReleaseNotificationSize = myMediaNotifications.size() + mediaNotifications.size();
            if (mediaReleaseNotificationSize > 0) {
                notificationTitle = notificationTitle + " +" + mediaReleaseNotificationSize;
            }

            Notification.Builder notificationSummaryBuilder = new Notification.Builder(this.getApplicationContext(), MediaNotificationManager.MEDIA_RELEASES_CHANNEL)
                    .setContentTitle(notificationTitle)
                    .setSmallIcon(R.drawable.ic_stat_name)
                    .setStyle(styleOA)
                    .setPriority(Notification.PRIORITY_DEFAULT)
                    .setContentIntent(pendingIntent)
                    .setGroup(MediaNotificationManager.MEDIA_RELEASE_NOTIFICATION_GROUP)
                    .setGroupSummary(true)
                    .setOnlyAlertOnce(true)
                    .setWhen(mostRecentlySentNotificationTime)
                    .setShowWhen(true);

            boolean hasNewMyMediaNotification = !myMediaNotifications.isEmpty();
            if (hasNewMyMediaNotification) { // Set with vibration
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
                new Handler(Looper.getMainLooper()).post(()->schedulesTabFragment.updateScheduledMedia(false, false));
            }
            ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();
            if (releasedTabFragment!=null) {
                new Handler(Looper.getMainLooper()).post(()->releasedTabFragment.updateReleasedMedia(false, false));
            }

            boolean shouldNotify = lastSentNotificationTime == 0L || mostRecentlySentNotificationTime > lastSentNotificationTime;
            if (!isBooted || shouldNotify) {
                if (mediaReleaseNotificationSize > 0) {
                    notificationManager.cancel(NOTIFICATION_MEDIA_RELEASE);
                    if (!mediaNotifications.isEmpty()) {
                        notificationManager.cancel(NOTIFICATION_OTHER_MEDIA);
                        Notification notificationOA = notificationOABuilder.build();
                        notificationManager.notify(NOTIFICATION_OTHER_MEDIA, notificationOA);
                    }
                    if (!myMediaNotifications.isEmpty()) {
                        notificationManager.cancel(NOTIFICATION_MY_MEDIA);
                        Notification notificationMA = notificationMABuilder.build();
                        notificationManager.notify(NOTIFICATION_MY_MEDIA, notificationMA);
                    }
                    Notification notificationSummary = notificationSummaryBuilder.build();
                    notificationManager.notify(NOTIFICATION_MEDIA_RELEASE, notificationSummary);
                }
            }
        }

        HashSet<String> mediaNotificationsToBeRemoved = new HashSet<>();
        long THIRTY_DAY_IN_MILLIS_AGO = currentTimeInMillis - TimeUnit.DAYS.toMillis(30);
        for (MediaNotification media : allMediaNotificationValues) {
            // If ReleaseDate was Before 30 days ago
            if (media.releaseDateMillis < THIRTY_DAY_IN_MILLIS_AGO) {
                mediaNotificationsToBeRemoved.add(media.mediaId +"-"+media.releaseEpisode);
            }
        }
        if (!mediaNotificationsToBeRemoved.isEmpty() && !MediaNotificationManager.allMediaNotification.isEmpty()) {
            for (String mediaKey : mediaNotificationsToBeRemoved) {
                MediaNotificationManager.allMediaNotification.remove(mediaKey);
            }
            LocalPersistence.writeObjectToFile(this.getApplicationContext(), MediaNotificationManager.allMediaNotification, "allMediaNotification");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Utils.exportReleasedMedia(this.getApplicationContext());
            }
        }

        for (MediaNotification media : newSentMedia) {
            getAiringMedia(media, 0);
        }

        SharedPreferences.Editor prefsEdit = prefs.edit();
        prefsEdit.putLong("lastSentNotificationTime", mostRecentlySentNotificationTime).apply();
        getNewNotification(nextMediaNotificationInfo);
    }

    public void getNewNotification(MediaNotification nextMediaNotificationInfo) {
        if (nextMediaNotificationInfo !=null) {
            MediaNotificationManager.nearestNotificationInfo = nextMediaNotificationInfo;
            MediaNotificationManager.nearestNotificationTime = nextMediaNotificationInfo.releaseDateMillis;

            Intent newIntent = new Intent(this.getApplicationContext(), MyReceiver.class);
            newIntent.setAction("MEDIA_NOTIFICATION");

            PendingIntent newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), MediaNotificationManager.MEDIA_RELEASE_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager alarmManager = (AlarmManager) this.getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            // Cancel Old
            newPendingIntent.cancel();
            alarmManager.cancel(newPendingIntent);
            // Create New
            newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), MediaNotificationManager.MEDIA_RELEASE_PENDING_INTENT, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextMediaNotificationInfo.releaseDateMillis, newPendingIntent);
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextMediaNotificationInfo.releaseDateMillis, newPendingIntent);
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextMediaNotificationInfo.releaseDateMillis, newPendingIntent);
                } else {
                    try {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, nextMediaNotificationInfo.releaseDateMillis, newPendingIntent);
                    } catch (Exception ignored) {
                        alarmManager.set(AlarmManager.RTC_WAKEUP, nextMediaNotificationInfo.releaseDateMillis, newPendingIntent);
                    }
                }
            }
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.O)
    private void getAiringMedia(MediaNotification media, int retries) {
        if (retries>=4) {
            return;
        }
        try {
            String query = "{AiringSchedule(mediaId:"+ media.mediaId +",episode_greater:"+media.releaseEpisode+"){media{episodes}airingAt episode}}";
            JSONObject jsonData = new JSONObject();
            jsonData.put("query", query);
            makePostRequest(response -> {
                if (response != null) {
                    JSONObject data = response.optJSONObject("data");
                    if (response.has(RETRY_KEY) || data == null) {
                        // Call Another
                        new android.os.Handler(Looper.getMainLooper()).postDelayed(() -> getAiringMedia(media, retries + 1), 60000);
                    } else {
                        JSONObject airingSchedule = data.optJSONObject("AiringSchedule");
                        if (airingSchedule != null) {
                            if (MediaNotificationManager.allMediaNotification.isEmpty()) {
                                @SuppressWarnings("unchecked") ConcurrentHashMap<String, MediaNotification> $allMediaNotification = (ConcurrentHashMap<String, MediaNotification>) LocalPersistence.readObjectFromFile(this.getApplicationContext(), "allMediaNotification");
                                if ($allMediaNotification != null && !$allMediaNotification.isEmpty()) {
                                    MediaNotificationManager.allMediaNotification.putAll($allMediaNotification);
                                }
                                if (MediaNotificationManager.allMediaNotification.isEmpty()) {
                                    return;
                                }
                            }
                            boolean isEdited = false;
                            long episodes;
                            JSONObject mediaObj = airingSchedule.optJSONObject("media");
                            if (mediaObj != null) {
                                episodes = mediaObj.optLong("episodes", 0);
                                if (episodes != media.maxEpisode && episodes > 0) {
                                    media.maxEpisode = episodes;
                                    MediaNotificationManager.allMediaNotification.put(media.mediaId + "-" + media.releaseEpisode, media);
                                    isEdited = true;
                                } else {
                                    episodes = media.maxEpisode;
                                }
                            } else {
                                episodes = media.maxEpisode;
                            }
                            long releaseDateMillis = airingSchedule.optLong("airingAt",0);
                            long episode = airingSchedule.optLong("episode",0);
                            if (releaseDateMillis > 0 && episode > 0 && episode > media.releaseEpisode) {
                                releaseDateMillis = releaseDateMillis * 1000L;
                                MediaNotification newMediaRelease = new MediaNotification(media.mediaId, media.title, episode, episodes, releaseDateMillis, media.imageByte, media.mediaUrl, media.userStatus, media.episodeProgress);
                                MediaNotificationManager.allMediaNotification.put(newMediaRelease.mediaId + "-" + newMediaRelease.releaseEpisode, newMediaRelease);
                                MediaNotificationManager.addMediaNotification(this.getApplicationContext(), newMediaRelease);
                                isEdited = true;
                                // Get next if new media release is past current time
                                if (releaseDateMillis <= System.currentTimeMillis()) {
                                    getAiringMedia(newMediaRelease, 0);
                                }
                            }
                            if (isEdited) {
                                if (!MediaNotificationManager.allMediaNotification.isEmpty()) {
                                    LocalPersistence.writeObjectToFile(this.getApplicationContext(), MediaNotificationManager.allMediaNotification, "allMediaNotification");
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                        Utils.exportReleasedMedia(this.getApplicationContext());
                                    }
                                }
                            }
                        }
                    }
                }
            },jsonData);
        } catch (Exception ignored) {}
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
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(urlConnection.getInputStream()))) {
                        StringBuilder response = new StringBuilder();
                        String line;

                        while ((line = reader.readLine()) != null) {
                            response.append(line);
                        }

                        urlConnection.disconnect();

                        // Parse the JSON response and return as JSONObject
                        JSONObject responseJSON = new JSONObject(response.toString());
                        String rateLimitStr = urlConnection.getHeaderField("x-ratelimit-remaining");
                        try {
                            int rateLimit = Integer.parseInt(rateLimitStr);
                            responseJSON.put("rateLimit", rateLimit);
                        } catch (Exception ignored) {}
                        return responseJSON;
                    }
                } else {
                    urlConnection.disconnect();
                    JSONObject jsonObject = new JSONObject();
                    try {
                        jsonObject.put(RETRY_KEY,true);
                        return jsonObject;
                    } catch (Exception ignored) {
                        return null;
                    }
                }
            } catch (Exception ignored) {
                return null;
            }
        });
        try {
            return future.get();
        } catch (Exception ignored) {
            return null;
        }
    }

    interface PostRequestCallback {
        void onResponse(JSONObject response);
    }

    private void updateData(boolean isManual) {
        long currentTimeMillis = System.currentTimeMillis();
        long newBackgroundUpdateTime;

        TimeZone tz = TimeZone.getDefault();
        Calendar calendar = Calendar.getInstance(tz);

        int hourOfDay = calendar.get(Calendar.HOUR_OF_DAY);
        int minute = calendar.get(Calendar.MINUTE);

        // Sleep time is 1:30am to 7:59am
        boolean isSleepTime = ((hourOfDay == 1 && minute >= 30) || (hourOfDay >= 2 && hourOfDay < 8));

        // Determine next update time
        if (isSleepTime) {
            // During sleep time: normal 1 hour interval
            newBackgroundUpdateTime = currentTimeMillis + TimeUnit.HOURS.toMillis(1);

            // But check if 1 hour later would go at or after 8am
            Calendar oneHourLater = Calendar.getInstance(tz);
            oneHourLater.setTimeInMillis(newBackgroundUpdateTime);
            int nextHour = oneHourLater.get(Calendar.HOUR_OF_DAY);

            // If next update would be at or after 8am, schedule for next day at 1:30am instead
            if (nextHour >= 8) {
                calendar.add(Calendar.DAY_OF_MONTH, 1);
                calendar.set(Calendar.HOUR_OF_DAY, 1);
                calendar.set(Calendar.MINUTE, 30);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                newBackgroundUpdateTime = calendar.getTimeInMillis();
            }
        } else {
            // Awake time: schedule for next 1:30am
            calendar.set(Calendar.HOUR_OF_DAY, 1);
            calendar.set(Calendar.MINUTE, 30);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);

            // If 1:30am today has already passed, schedule for tomorrow
            if (calendar.getTimeInMillis() <= currentTimeMillis) {
                calendar.add(Calendar.DAY_OF_MONTH, 1);
            }

            newBackgroundUpdateTime = calendar.getTimeInMillis();
        }

        // Only run foreground service if manual OR during active time
        if (isManual || isSleepTime) {
            SharedPreferences prefs = this.getApplicationContext().getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
            boolean keepAppRunningInBackground = prefs.getBoolean("keepAppRunningInBackground", true);
            boolean isInApp = false;
            MainActivity mainActivity = MainActivity.getInstanceActivity();
            if (mainActivity != null) {
                isInApp = mainActivity.isInApp;
            }
            // Run service if background update is enabled and user is not in app
            if (keepAppRunningInBackground && !isInApp) {
                Intent intent = new Intent(this.getApplicationContext(), MainService.class);
                this.getApplicationContext().startService(intent);
            }
        }

        // Schedule next
        Intent newIntent = new Intent(this.getApplicationContext(), MyReceiver.class);
        newIntent.setAction("UPDATE_DATA_AUTO");

        PendingIntent newPendingIntent = PendingIntent.getBroadcast(
            this.getApplicationContext(),
            UPDATE_DATA_PENDING_INTENT,
            newIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager alarmManager = (AlarmManager) this.getApplicationContext().getSystemService(Context.ALARM_SERVICE);

        // Cancel old
        newPendingIntent.cancel();
        alarmManager.cancel(newPendingIntent);

        // Create new
        newPendingIntent = PendingIntent.getBroadcast(
            this.getApplicationContext(),
            UPDATE_DATA_PENDING_INTENT,
            newIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

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
                } catch (Exception ignored) {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, newBackgroundUpdateTime, newPendingIntent);
                }
            }
        }
    }
}