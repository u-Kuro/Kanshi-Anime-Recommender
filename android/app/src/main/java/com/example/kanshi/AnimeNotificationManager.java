package com.example.kanshi;

import static com.example.kanshi.Configs.OWNER;
import static com.example.kanshi.Utils.createRoundBitmap;
import static com.example.kanshi.Utils.createRoundIcon;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Person;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;

import androidx.annotation.RequiresApi;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

public class AnimeNotificationManager {
    public static final String ANIME_RELEASES_CHANNEL = "anime_releases";
    private static final String RECENTLY_UPDATED_ANIME_CHANNEL = "recently_updated_anime";
    public static final String ANIME_RELEASE_NOTIFICATION_GROUP = "anime_release_notification_group";
    public static final int NOTIFICATION_ANIME_RELEASE = 1000;
    public static final int NOTIFICATION_MY_ANIME = 999;
    public static final int NOTIFICATION_OTHER_ANIME = 998;
    public static final int ANIME_RELEASE_PENDING_INTENT = 997;
    private static final int NOTIFICATION_UPDATED_ANIME = 996;
    private static final ExecutorService notificationImageDownloaderExecutor = Executors.newFixedThreadPool(1);
    private static final ScheduledExecutorService addNotificationFutureExecutor = Executors.newScheduledThreadPool(1);
    private static ScheduledFuture<?> addNotificationFuture;
    public static final ConcurrentHashMap<String, Boolean> ongoingImageDownloads = new ConcurrentHashMap<>();
    public static final ConcurrentHashMap<String, AnimeNotification> allAnimeNotification = new ConcurrentHashMap<>();
    public static AnimeNotification nearestNotificationInfo = null;
    public static long nearestNotificationTime = 0L;

    @RequiresApi(api = Build.VERSION_CODES.O)
    public static void scheduleAnimeNotification(Context context, long animeId, String title, long releaseEpisode, long maxEpisode, long releaseDateMillis, String imageUrl, String animeUrl, String userStatus, long episodeProgress) {
        context = context.getApplicationContext();
        createAnimeReleasesNotificationChannel(context);
        if (allAnimeNotification.isEmpty()) {
            try {
                @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(context, "allAnimeNotification");
                if ($allAnimeNotification != null && !$allAnimeNotification.isEmpty()) {
                    allAnimeNotification.putAll($allAnimeNotification);
                }
            } catch (Exception ignored) {}
        }
        AnimeNotification checkingAnime = allAnimeNotification.get(animeId + "-" + releaseEpisode);
        if (checkingAnime == null || checkingAnime.imageByte == null || checkingAnime.imageByte.length == 0) {
            if (ongoingImageDownloads.putIfAbsent(animeId + "-" + releaseEpisode, true) == null) {
                Context finalContext = context;
                notificationImageDownloaderExecutor.execute(() -> {
                    try {
                        Bitmap imageBitmap = downloadImage(imageUrl);
                        byte[] imageByte = null;
                        ByteArrayOutputStream stream = new ByteArrayOutputStream();
                        if (imageBitmap != null) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                imageBitmap.compress(Bitmap.CompressFormat.WEBP_LOSSY, 25, stream);
                            } else {
                                imageBitmap.compress(Bitmap.CompressFormat.WEBP, 25, stream);
                            }
                            imageByte = stream.toByteArray();
                        } else {
                            try {
                                byte[] $imageBitmap = (byte[]) LocalPersistence.readObjectFromFile(finalContext, "notificationLogoIcon");
                                if ($imageBitmap == null || $imageBitmap.length == 0) {
                                    imageBitmap = BitmapFactory.decodeResource(finalContext.getResources(), R.drawable.ic_launcher_round);
                                    imageBitmap = createRoundBitmap(imageBitmap);
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                        imageBitmap.compress(Bitmap.CompressFormat.WEBP_LOSSY, 25, stream);
                                    } else {
                                        imageBitmap.compress(Bitmap.CompressFormat.WEBP, 25, stream);
                                    }
                                    $imageBitmap = stream.toByteArray();
                                    if ($imageBitmap.length > 0) {
                                        LocalPersistence.writeObjectToFile(finalContext, $imageBitmap, "notificationLogoIcon");
                                    }
                                }
                            } catch (Exception ignored) {}
                        }
                        AnimeNotification anime = new AnimeNotification(animeId, title, releaseEpisode, maxEpisode, releaseDateMillis, imageByte, animeUrl, userStatus, episodeProgress);
                        addAnimeNotification(finalContext, anime);
                        ongoingImageDownloads.remove(animeId + "-" + releaseEpisode);
                        if (ongoingImageDownloads.isEmpty()) {
                            MainService mainService = MainService.getInstanceActivity();
                            if (mainService!=null) {
                                mainService.finishedAddingAnimeReleaseNotification();
                            }
                        }
                    } catch (Exception e) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(finalContext.getApplicationContext(), e, "notificationImageDownloaderExecutor");
                        }
                        e.printStackTrace();
                    }
                });
            }
        } else {
            AnimeNotification anime = new AnimeNotification(animeId, title, releaseEpisode, maxEpisode, releaseDateMillis, checkingAnime.imageByte, animeUrl, userStatus, episodeProgress);
            addAnimeNotification(context, anime);
        }
        if (ongoingImageDownloads.isEmpty()) {
            MainService mainService = MainService.getInstanceActivity();
            if (mainService!=null) {
                mainService.finishedAddingAnimeReleaseNotification();
            }
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.O)
    public static void addAnimeNotification(Context context, AnimeNotification anime) {
        if ((nearestNotificationTime == 0 || anime.releaseDateMillis < nearestNotificationTime) && anime.releaseDateMillis >= System.currentTimeMillis()) {
            Intent intent = new Intent(context, MyReceiver.class);
            if (nearestNotificationInfo != null) {
                Intent oldIntent = new Intent(context, MyReceiver.class);
                oldIntent.setAction("ANIME_NOTIFICATION");
                PendingIntent oldPendingIntent = PendingIntent.getBroadcast(context, ANIME_RELEASE_PENDING_INTENT, oldIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                // Cancel Old
                oldPendingIntent.cancel();
                alarmManager.cancel(oldPendingIntent);
            }
            nearestNotificationTime = anime.releaseDateMillis;
            nearestNotificationInfo = anime;
            intent.setAction("ANIME_NOTIFICATION");
            allAnimeNotification.put(anime.animeId + "-" + anime.releaseEpisode, anime);
            writeAnimeNotificationInFile(context, false);
            // Create New
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(context, ANIME_RELEASE_PENDING_INTENT, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nearestNotificationTime, pendingIntent);
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nearestNotificationTime, pendingIntent);
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nearestNotificationTime, pendingIntent);
                } else {
                    try {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, nearestNotificationTime, pendingIntent);
                    } catch (Exception ignored) {
                        alarmManager.set(AlarmManager.RTC_WAKEUP, nearestNotificationTime, pendingIntent);
                    }
                }
            }
        } else {
            allAnimeNotification.put(anime.animeId + "-" + anime.releaseEpisode, anime);
            writeAnimeNotificationInFile(context, false);
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.O)
    public static void writeAnimeNotificationInFile(Context context, boolean isUpdating) {
        if (addNotificationFuture != null && !addNotificationFuture.isDone()) {
            addNotificationFuture.cancel(true);
        }
        addNotificationFuture = addNotificationFutureExecutor.schedule(() -> {
            try {
                if (!allAnimeNotification.isEmpty()) {
                    LocalPersistence.writeObjectToFile(context, allAnimeNotification, "allAnimeNotification");
                    if (isUpdating && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        Utils.exportReleasedAnime(context.getApplicationContext());
                    }
                }
            } catch (Exception e) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context.getApplicationContext(), e, "addNotificationFutureExecutor");
                }
                e.printStackTrace();
            }
        }, 300, TimeUnit.MILLISECONDS);
    }

    static boolean animeReleasesNotificationChannelIsAdded = false;
    public static void createAnimeReleasesNotificationChannel(Context context) {
        if (animeReleasesNotificationChannelIsAdded) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context = context.getApplicationContext();
            CharSequence name = "Anime Releases";
            String description = "Notifications for anime releases";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel(ANIME_RELEASES_CHANNEL, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
        animeReleasesNotificationChannelIsAdded = true;
    }

    static boolean recentlyUpdatedAnimeNotificationChannelIsAdded = false;
    public static void createRecentlyUpdatedAnimeNotificationChannel(Context context) {
        if (recentlyUpdatedAnimeNotificationChannelIsAdded) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context = context.getApplicationContext();
            CharSequence name = "Recently Updated Anime";
            String description = "Notifications for anime that are recently added or updated (trailer or cover)";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel(RECENTLY_UPDATED_ANIME_CHANNEL, name, importance);
            channel.setDescription(description);
            channel.enableVibration(OWNER);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
        recentlyUpdatedAnimeNotificationChannelIsAdded = true;
    }
    private static Bitmap downloadImage(String imageUrl) {
        try {
            URL url = new URL(imageUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setDoInput(true);
            connection.connect();
            InputStream input = connection.getInputStream();
            return BitmapFactory.decodeStream(input);
        } catch (Exception ignored) {
            return null;
        }
    }

    public static void recentlyUpdatedAnimeNotification(Context context, long addedAnimeCount, long updatedAnimeCount) {
        context = context.getApplicationContext();
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            if (addedAnimeCount > 0 || updatedAnimeCount > 0) {
                createRecentlyUpdatedAnimeNotificationChannel(context);
                Intent intent = new Intent(context, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);
                pendingIntent.cancel();
                pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);
                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, RECENTLY_UPDATED_ANIME_CHANNEL)
                        .setSmallIcon(R.drawable.ic_stat_name)
                        .setContentIntent(pendingIntent)
                        .setAutoCancel(true)
                        .setShowWhen(false)
                        .setNumber((int) (addedAnimeCount+updatedAnimeCount))
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT);
                if (updatedAnimeCount > 0 && addedAnimeCount > 0) {
                    builder.setContentTitle("Updates: "+addedAnimeCount+" New Anime, "+updatedAnimeCount+" "+(updatedAnimeCount>1?"Changes":"Modified"));
                } else if (updatedAnimeCount > 0) {
                    builder.setContentTitle("Updates: "+updatedAnimeCount+" Modified Anime");
                } else {
                    builder.setContentTitle("Updates: "+addedAnimeCount+" New Anime");
                }
                NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
                notificationManager.cancel(NOTIFICATION_UPDATED_ANIME);
                notificationManager.notify(NOTIFICATION_UPDATED_ANIME, builder.build());
            }
        }
    }
    @RequiresApi(api = Build.VERSION_CODES.P)
    public static void seeMoreReleasedAnimeNotification(Context context) {
        context = context.getApplicationContext();
        if (ActivityCompat.checkSelfPermission(context.getApplicationContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;

        if (allAnimeNotification.isEmpty()) {
            try {
                @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(context, "allAnimeNotification");
                if ($allAnimeNotification != null && !$allAnimeNotification.isEmpty()) {
                    allAnimeNotification.putAll($allAnimeNotification);
                }
                if (allAnimeNotification.isEmpty()) {
                    return;
                }
            } catch (Exception ignored) {}
        }

        createAnimeReleasesNotificationChannel(context.getApplicationContext());
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context.getApplicationContext());

        byte[] dummyImage = null;
        HashMap<String, AnimeNotification> myAnimeNotifications = new HashMap<>();
        HashMap<String, AnimeNotification> animeNotifications = new HashMap<>();

        AnimeNotification nextAnimeNotificationInfo = null;

        long currentTimeInMillis = System.currentTimeMillis();
        long sixtySecondsAgoInMillis = currentTimeInMillis-TimeUnit.MINUTES.toMillis(1);

        long mostRecentlySentMyAnimeNotificationTime = 0L;
        long mostRecentlySentOtherAnimeNotificationTime = 0L;

        List<AnimeNotification> allAnimeNotificationValues = new ArrayList<>(allAnimeNotification.values());

        for (AnimeNotification anime : allAnimeNotificationValues) {
            if (anime.releaseDateMillis <= currentTimeInMillis) {
                boolean isMyAnime = anime.userStatus != null && !anime.userStatus.isEmpty() && !anime.userStatus.equalsIgnoreCase("UNWATCHED");
                if (isMyAnime) {
                    if (anime.releaseDateMillis > mostRecentlySentMyAnimeNotificationTime){
                        mostRecentlySentMyAnimeNotificationTime = anime.releaseDateMillis;
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
                    if (anime.releaseDateMillis > mostRecentlySentOtherAnimeNotificationTime){
                        mostRecentlySentOtherAnimeNotificationTime = anime.releaseDateMillis;
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

        long newMyAnimeNotificationCount = 0;
        long newAnimeNotificationCount = 0;

        final int maxNotificationCount = 6;

        Notification.MessagingStyle styleMA = new Notification.MessagingStyle(new Person.Builder().setName("").build()).setGroupConversation(true);

        // Put in Descending Order for in Adding items for the Message Style Notification
        List<AnimeNotification> descendedMyAnimeNotificationsValues = new ArrayList<>(myAnimeNotifications.values());
        Collections.sort(descendedMyAnimeNotificationsValues, (a1, a2) -> Long.compare(a2.releaseDateMillis, a1.releaseDateMillis));

        // Get the first 6 items in the list to only show what can be seen
        List<AnimeNotification> finalMyAnimeNotificationsValues = descendedMyAnimeNotificationsValues.subList(0, Math.min(maxNotificationCount, descendedMyAnimeNotificationsValues.size()));

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
                        byte[] $dummyImage = (byte[]) LocalPersistence.readObjectFromFile(context.getApplicationContext(), "notificationLogoIcon");
                        if ($dummyImage != null && $dummyImage.length != 0) {
                            dummyImage = $dummyImage;
                            Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                            itemBuilder.setIcon(createRoundIcon(image));
                        }
                    } catch (Exception ignored) {}
                }
            }
            Person item = itemBuilder.build();
            boolean justAired = anime.releaseDateMillis > sixtySecondsAgoInMillis;
            String addedInfo = " aired.";
            if (justAired) {
                addedInfo = " just aired.";
                ++newMyAnimeNotificationCount;
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
        if (newMyAnimeNotificationCount > 0) {
            notificationTitleMA = "Your Anime Just Aired" + " +" + newMyAnimeNotificationCount;
        } else {
            notificationTitleMA = "Your Anime Aired";
        }
        styleMA.setConversationTitle(notificationTitleMA);

        Intent intent = new Intent(context, AnimeReleaseActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(context.getApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);
        pendingIntent.cancel();
        pendingIntent = PendingIntent.getActivity(context.getApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder notificationMABuilder = new Notification.Builder(context.getApplicationContext(), ANIME_RELEASES_CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setContentTitle(notificationTitleMA)
                .setStyle(styleMA)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                .setNumber(0)
                .setOnlyAlertOnce(true)
                .setWhen(mostRecentlySentMyAnimeNotificationTime)
                .setShowWhen(true);

        // Other Anime Released
        Notification.MessagingStyle styleOA = new Notification.MessagingStyle(new Person.Builder().setName("").build()).setGroupConversation(true);

        // Put in Ascending Order for in Adding items for the Message Style Notification
        List<AnimeNotification> descendedAnimeNotificationsValues = new ArrayList<>(animeNotifications.values());
        Collections.sort(descendedAnimeNotificationsValues, (a1, a2) -> Long.compare(a2.releaseDateMillis, a1.releaseDateMillis));

        // Get the last 6 items in the list to only show what can be seen
        List<AnimeNotification> finalAnimeNotificationsValues = descendedAnimeNotificationsValues.subList(0, Math.min(maxNotificationCount, descendedAnimeNotificationsValues.size()));

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
                        byte[] $dummyImage = (byte[]) LocalPersistence.readObjectFromFile(context.getApplicationContext(), "notificationLogoIcon");
                        if ($dummyImage != null && $dummyImage.length != 0) {
                            dummyImage = $dummyImage;
                            Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                            itemBuilder.setIcon(createRoundIcon(image));
                        }
                    } catch (Exception ignored) {}
                }
            }
            Person item = itemBuilder.build();
            boolean justAired = anime.releaseDateMillis > sixtySecondsAgoInMillis;
            String addedInfo = " aired.";
            if (justAired) {
                addedInfo = " just aired.";
                ++newAnimeNotificationCount;
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
        if (newAnimeNotificationCount > 0) {
            notificationTitleOA = "Other Anime Just Aired" + " +" + newAnimeNotificationCount;
        } else {
            notificationTitleOA = "Other Anime Aired";
        }
        styleOA.setConversationTitle(notificationTitleOA);

        Notification.Builder notificationOABuilder = new Notification.Builder(context.getApplicationContext(), ANIME_RELEASES_CHANNEL)
                .setContentTitle(notificationTitleOA)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                .setNumber(0)
                .setOnlyAlertOnce(true)
                .setWhen(mostRecentlySentOtherAnimeNotificationTime)
                .setShowWhen(true);

        long mostRecentlySentNotificationTime = Math.max(mostRecentlySentMyAnimeNotificationTime, mostRecentlySentOtherAnimeNotificationTime);

        String notificationTitle = "Anime Aired";
        long animeReleaseNotificationSize = newMyAnimeNotificationCount + newAnimeNotificationCount;
        if (animeReleaseNotificationSize > 0) {
            notificationTitle = notificationTitle + " +" + animeReleaseNotificationSize;
        }

        Notification.Builder notificationSummaryBuilder = new Notification.Builder(context.getApplicationContext(), ANIME_RELEASES_CHANNEL)
                .setContentTitle(notificationTitle)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupSummary(true)
                .setOnlyAlertOnce(true)
                .setWhen(mostRecentlySentNotificationTime)
                .setShowWhen(true);

        boolean hasNewMyAnimeNotification = newMyAnimeNotificationCount > 0;
        if (hasNewMyAnimeNotification) { // Set with vibration
            notificationSummaryBuilder
                    .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY);
        } else { // Set with no vibration
            notificationSummaryBuilder
                    .setGroupAlertBehavior(Notification.GROUP_ALERT_CHILDREN)
                    .setDefaults(Notification.DEFAULT_ALL)
                    .setVibrate(new long[]{0L});
        }

        boolean shouldNotify = !animeNotifications.isEmpty() || !myAnimeNotifications.isEmpty();
        if (shouldNotify) {
            notificationManager.cancel(NOTIFICATION_ANIME_RELEASE);
            if (!animeNotifications.isEmpty()) {
                notificationManager.cancel(NOTIFICATION_OTHER_ANIME);
                Notification notificationOA = notificationOABuilder.build();
                notificationManager.notify(NOTIFICATION_OTHER_ANIME, notificationOA);
            }
            if (!myAnimeNotifications.isEmpty()) {
                notificationManager.cancel(NOTIFICATION_MY_ANIME);
                Notification notificationMA = notificationMABuilder.build();
                notificationManager.notify(NOTIFICATION_MY_ANIME, notificationMA);
            }
            Notification notificationSummary = notificationSummaryBuilder.build();
            notificationManager.notify(NOTIFICATION_ANIME_RELEASE, notificationSummary);
        }
    }
}