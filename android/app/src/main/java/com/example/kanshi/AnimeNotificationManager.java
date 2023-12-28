package com.example.kanshi;

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
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;

import androidx.annotation.RequiresApi;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

public class AnimeNotificationManager {
    private static final String ANIME_RELEASES_CHANNEL = "anime_releases";
    private static final String RECENTLY_UPDATED_ANIME_CHANNEL = "recently_updated_anime";
    private static final String ANIME_RELEASE_NOTIFICATION_GROUP = "anime_release_notification_group";
    private static final int NOTIFICATION_ANIME_RELEASE = 1000;
    private static final int NOTIFICATION_MY_ANIME = 999;
    private static final int NOTIFICATION_OTHER_ANIME = 998;
    private static final int ANIME_RELEASE_PENDING_INTENT = 997;
    private static final int NOTIFICATION_UPDATED_ANIME = 996;
    private static final ExecutorService notificationImageDownloaderExecutor = Executors.newFixedThreadPool(1);
    private static final ExecutorService showRecentReleasesExecutor = Executors.newFixedThreadPool(1);
    private static Future<?> showRecentReleasesFuture;
    private static final ScheduledExecutorService addNotificationFutureExecutor = Executors.newScheduledThreadPool(1);
    private static ScheduledFuture<?> addNotificationFuture;
    private static final Handler showRecentReleasesHandler = new Handler(Looper.getMainLooper());
    public static final ConcurrentHashMap<String, Boolean> ongoingImageDownloads = new ConcurrentHashMap<>();
    public static final ConcurrentHashMap<String, AnimeNotification> allAnimeNotification = new ConcurrentHashMap<>();
    public static final ConcurrentHashMap<String, AnimeNotification> allAnimeToUpdate = new ConcurrentHashMap<>();
    public static AnimeNotification nearestNotificationInfo = null;
    public static long nearestNotificationTime = 0L;
    public static void scheduleAnimeNotification(Context context, long animeId, String title, long releaseEpisode, long maxEpisode, long releaseDateMillis, String imageUrl, boolean isMyAnime) {
        context = context.getApplicationContext();
        createAnimeReleasesNotificationChannel(context);
        if (allAnimeNotification.size() == 0) {
            try {
                @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(context, "allAnimeNotification");
                if ($allAnimeNotification != null && $allAnimeNotification.size() > 0) {
                    allAnimeNotification.putAll($allAnimeNotification);
                }
            } catch (Exception ignored) {
            }
        }
        AnimeNotification checkingAnime = allAnimeNotification.get(animeId + "-" + releaseEpisode);
        if (checkingAnime == null || checkingAnime.imageByte == null || checkingAnime.imageByte.length == 0) {
            if (ongoingImageDownloads.putIfAbsent(animeId + "-" + releaseEpisode, true) == null) {
                Context finalContext = context;
                notificationImageDownloaderExecutor.execute(() -> {
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
                                LocalPersistence.writeObjectToFile(finalContext, stream.toByteArray(), "notificationLogoIcon");
                            }
                        } catch (Exception ignored) {}
                    }
                    AnimeNotification anime = new AnimeNotification(animeId, title, releaseEpisode, maxEpisode, releaseDateMillis, imageByte, isMyAnime);
                    addAnimeNotification(finalContext, anime);
                    ongoingImageDownloads.remove(animeId + "-" + releaseEpisode);
                    if (ongoingImageDownloads.size()==0) {
                        MainService mainService = MainService.getInstanceActivity();
                        if (mainService!=null) {
                            mainService.finishedAddingAnimeReleaseNotification();
                        }
                    }
                });
            }
        } else {
            AnimeNotification anime = new AnimeNotification(animeId, title, releaseEpisode, maxEpisode, releaseDateMillis, checkingAnime.imageByte, isMyAnime);
            addAnimeNotification(context, anime);
        }
    }

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
            writeAnimeNotificationInFile(context);
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
                    } catch (SecurityException ignored) {
                        alarmManager.set(AlarmManager.RTC_WAKEUP, nearestNotificationTime, pendingIntent);
                    }
                }
            }
        } else {
            allAnimeNotification.put(anime.animeId + "-" + anime.releaseEpisode, anime);
            writeAnimeNotificationInFile(context);
        }
    }

    private static void writeAnimeNotificationInFile(Context context) {
        if (addNotificationFuture != null && !addNotificationFuture.isDone()) {
            addNotificationFuture.cancel(false);
        }
        addNotificationFuture = addNotificationFutureExecutor.schedule(() -> LocalPersistence.writeObjectToFile(context, allAnimeNotification, "allAnimeNotification"), 300, TimeUnit.MILLISECONDS);
    }

    public static void createAnimeReleasesNotificationChannel(Context context) {
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
    }

    public static void createRecentlyAddedAnimeNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context = context.getApplicationContext();
            CharSequence name = "Recently Updated Anime";
            String description = "Notifications for anime that are recently added or updated (trailer or cover)";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel(RECENTLY_UPDATED_ANIME_CHANNEL, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }
    private static Bitmap downloadImage(String imageUrl) {
        try {
            URL url = new URL(imageUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setDoInput(true);
            connection.connect();
            InputStream input = connection.getInputStream();
            return BitmapFactory.decodeStream(input);
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }

    public static void recentlyUpdatedAnimeNotification(Context context, long addedAnimeCount, long updatedAnimeCount) {
        context = context.getApplicationContext();
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            if (addedAnimeCount > 0 || updatedAnimeCount > 0) {
                createRecentlyAddedAnimeNotificationChannel(context);
                PackageManager pm = context.getPackageManager();
                Intent intent = pm.getLaunchIntentForPackage("com.example.kanshi");
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
                MainService mainService = MainService.getInstanceActivity();
                if (mainService!=null) {
                    mainService.finishedAddingUpdatedAnimeNotification();
                }
            }
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.P)
    public static boolean showRecentReleases(Context context) {
        context = context.getApplicationContext();
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return false;
        } else {
            Context finalContext = context;
            if (showRecentReleasesFuture != null && !showRecentReleasesFuture.isCancelled()) {
                showRecentReleasesFuture.cancel(true);
            }
            showRecentReleasesFuture = showRecentReleasesExecutor.submit(() -> {
                String message = null;
                ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = null;
                try {
                    //noinspection unchecked
                    $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(finalContext, "allAnimeNotification");
                    if (($allAnimeNotification != null && $allAnimeNotification.size() == 0) && allAnimeNotification.size() == 0) {
                        message = "No recent anime releases.";
                    }
                } catch (Exception ignored) {
                    message = "No recent anime releases.";
                }

                if ($allAnimeNotification != null && $allAnimeNotification.size() != 0) {
                    allAnimeNotification.putAll($allAnimeNotification);
                }

                long lastSentMyAnimeNotificationTime = 0L;
                long lastSentOtherAnimeNotificationTime = 0L;
                HashMap<String, AnimeNotification> myAnimeNotifications = new HashMap<>();
                HashMap<String, AnimeNotification> animeNotifications = new HashMap<>();

                List<AnimeNotification> allAnimeNotificationValues = new ArrayList<>(allAnimeNotification.values());
                for (AnimeNotification anime : allAnimeNotificationValues) {
                    if (anime.releaseDateMillis <= System.currentTimeMillis()) {
                        if (anime.isMyAnime) {
                            if (lastSentMyAnimeNotificationTime==0 || anime.releaseDateMillis>lastSentMyAnimeNotificationTime){
                                lastSentMyAnimeNotificationTime = anime.releaseDateMillis;
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
                    }
                }
                if (animeNotifications.size() == 0 && myAnimeNotifications.size() == 0) {
                    message = "No recent anime releases.";
                }
                if (message == null) {
                    NotificationManagerCompat notificationManager = NotificationManagerCompat.from(finalContext);

                    notificationManager.cancel(NOTIFICATION_OTHER_ANIME);
                    notificationManager.cancel(NOTIFICATION_MY_ANIME);
                    notificationManager.cancel(NOTIFICATION_ANIME_RELEASE);
                    if (lastSentMyAnimeNotificationTime==0) {
                        lastSentMyAnimeNotificationTime = System.currentTimeMillis();
                    }
                    if (lastSentOtherAnimeNotificationTime==0) {
                        lastSentOtherAnimeNotificationTime = System.currentTimeMillis();
                    }
                    byte[] dummyImage = null;

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
                                    byte[] $dummyImage = (byte[]) LocalPersistence.readObjectFromFile(finalContext, "notificationLogoIcon");
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
                        boolean justAired = anime.releaseDateMillis > System.currentTimeMillis()-(1000*60);
                        String addedInfo = justAired? " just aired." : " aired.";
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

                    PackageManager pm = finalContext.getPackageManager();
                    Intent intent = pm.getLaunchIntentForPackage("com.example.kanshi");
                    PendingIntent pendingIntent = PendingIntent.getActivity(finalContext, 0, intent, PendingIntent.FLAG_IMMUTABLE);
                    pendingIntent.cancel();
                    pendingIntent = PendingIntent.getActivity(finalContext, 0, intent, PendingIntent.FLAG_IMMUTABLE);

                    Notification.Builder notificationMABuilder = new Notification.Builder(finalContext, ANIME_RELEASES_CHANNEL)
                            .setSmallIcon(R.drawable.ic_stat_name)
                            .setContentTitle(notificationTitleMA)
                            .setStyle(styleMA)
                            .setContentIntent(pendingIntent)
                            .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                            .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                            .setNumber(0)
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
                                    byte[] $dummyImage = (byte[]) LocalPersistence.readObjectFromFile(finalContext, "notificationLogoIcon");
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
                        boolean justAired = anime.releaseDateMillis > System.currentTimeMillis()-(1000*60);
                        String addedInfo = justAired? " just aired." : " aired.";
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

                    Notification.Builder notificationOABuilder = new Notification.Builder(finalContext, ANIME_RELEASES_CHANNEL)
                            .setContentTitle(notificationTitleOA)
                            .setSmallIcon(R.drawable.ic_stat_name)
                            .setStyle(styleOA)
                            .setPriority(Notification.PRIORITY_LOW)
                            .setContentIntent(pendingIntent)
                            .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                            .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                            .setNumber(0)
                            .setWhen(lastSentOtherAnimeNotificationTime)
                            .setShowWhen(true);

                    String notificationTitle = "Anime Aired";
                    long animeReleaseNotificationSize = myAnimeNotifications.size() + animeNotifications.size();
                    if (animeReleaseNotificationSize > 1) {
                        notificationTitle = notificationTitle + " +" + animeReleaseNotificationSize;
                    }

                    Notification.Builder notificationSummaryBuilder = new Notification.Builder(finalContext, ANIME_RELEASES_CHANNEL)
                            .setContentTitle(notificationTitle)
                            .setSmallIcon(R.drawable.ic_stat_name)
                            .setStyle(styleOA)
                            .setPriority(Notification.PRIORITY_DEFAULT)
                            .setContentIntent(pendingIntent)
                            .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                            .setGroupSummary(true)
                            .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                            .setWhen(Math.max(lastSentOtherAnimeNotificationTime, lastSentMyAnimeNotificationTime))
                            .setShowWhen(true);

                    Notification notificationMA = notificationMABuilder.build();
                    Notification notificationOA = notificationOABuilder.build();
                    Notification notificationSummary = notificationSummaryBuilder.build();
                    showRecentReleasesHandler.post(() -> {
                        if (animeNotifications.size() > 0 || myAnimeNotifications.size() > 0) {
                            if (animeNotifications.size() > 0) {
                                notificationManager.notify(NOTIFICATION_OTHER_ANIME, notificationOA);
                            }
                            if (myAnimeNotifications.size() > 0) {
                                notificationManager.notify(NOTIFICATION_MY_ANIME, notificationMA);
                            }
                            notificationManager.notify(NOTIFICATION_ANIME_RELEASE, notificationSummary);
                        }
                    });
                } else {
                    String finalMessage = message;
                    showRecentReleasesHandler.post(() -> {
                        MainActivity mainActivity = MainActivity.getInstanceActivity();
                        if (mainActivity!=null) {
                            mainActivity.showToast(Toast.makeText(finalContext, finalMessage, Toast.LENGTH_LONG));
                        }
                    });
                }
            });
            return true;
        }
    }
}


