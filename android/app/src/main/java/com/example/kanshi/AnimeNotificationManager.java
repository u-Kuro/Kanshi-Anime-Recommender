package com.example.kanshi;

import static com.example.kanshi.Utils.createRoundBitmap;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
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
    public static final int NOTIFICATION_UPDATED_ANIME = 996;
    private static final ExecutorService notificationImageDownloaderExecutor = Executors.newFixedThreadPool(1);
    private static final ScheduledExecutorService addNotificationFutureExecutor = Executors.newScheduledThreadPool(1);
    private static ScheduledFuture<?> addNotificationFuture;
    public static final ConcurrentHashMap<String, Boolean> ongoingImageDownloads = new ConcurrentHashMap<>();
    public static final ConcurrentHashMap<String, AnimeNotification> allAnimeNotification = new ConcurrentHashMap<>();
    public static final ConcurrentHashMap<String, AnimeNotification> allAnimeToUpdate = new ConcurrentHashMap<>();
    public static AnimeNotification nearestNotificationInfo = null;
    public static long nearestNotificationTime = 0L;

    public static void scheduleAnimeNotification(Context context, long animeId, String title, long releaseEpisode, long maxEpisode, long releaseDateMillis, String imageUrl, String animeUrl, String userStatus) {
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
                    AnimeNotification anime = new AnimeNotification(animeId, title, releaseEpisode, maxEpisode, releaseDateMillis, imageByte, animeUrl, userStatus);
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
            AnimeNotification anime = new AnimeNotification(animeId, title, releaseEpisode, maxEpisode, releaseDateMillis, checkingAnime.imageByte, animeUrl, userStatus);
            addAnimeNotification(context, anime);
        }
        if (ongoingImageDownloads.size()==0) {
            MainService mainService = MainService.getInstanceActivity();
            if (mainService!=null) {
                mainService.finishedAddingAnimeReleaseNotification();
            }
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

    public static void writeAnimeNotificationInFile(Context context) {
        if (addNotificationFuture != null && !addNotificationFuture.isDone()) {
            addNotificationFuture.cancel(false);
        }
        addNotificationFuture = addNotificationFutureExecutor.schedule(() -> LocalPersistence.writeObjectToFile(context, allAnimeNotification, "allAnimeNotification"), 300, TimeUnit.MILLISECONDS);
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
            channel.enableVibration(true);

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
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }

    public static void recentlyUpdatedAnimeNotification(Context context, long addedAnimeCount, long updatedAnimeCount) {
        context = context.getApplicationContext();
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            if (addedAnimeCount > 0 || updatedAnimeCount > 0) {
                createRecentlyUpdatedAnimeNotificationChannel(context);
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
            }
        }
    }
}


