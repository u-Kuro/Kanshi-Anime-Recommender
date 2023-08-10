package com.example.kanshi;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Person;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.os.Bundle;

import androidx.annotation.RequiresApi;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.Serializable;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.HashSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AnimeNotificationManager {

    private static class AnimeNotification implements Serializable {
        final int animeId;
        final String title;
        final int releaseEpisode;
        final int maxEpisode;
        final long releaseDateMillis;
        final byte[] imageByte;
        final boolean isMyAnime;
        public AnimeNotification(int animeId, String title, int releaseEpisode, int maxEpisode, long releaseDateMillis, byte[] imageByte, boolean isMyAnime) {
            this.animeId = animeId;
            this.title = title;
            this.releaseEpisode = releaseEpisode;
            this.maxEpisode = maxEpisode;
            this.releaseDateMillis = releaseDateMillis;
            this.imageByte = imageByte;
            this.isMyAnime = isMyAnime;
        }
    }
    private static final int NOTIFICATION_ID_BASE = 1000;
    private static final int NOTIFICATION_MY_ANIME = 999;
    private static final int NOTIFICATION_OTHER_ANIME = 998;
    private static final String CHANNEL_ID = "anime_releases_channel";
    private static final ConcurrentHashMap<String, AnimeNotification> allAnimeNotification = new ConcurrentHashMap<>();
    private static long nearestNotificationTime = 0;
    private static AnimeNotification nearestNotificationInfo = null;
    private static final String ANIME_RELEASE_NOTIFICATION_GROUP = "anime_release_notification_group";
    private static final int DAY_IN_MILLIS = 1000 * 60 * 60 * 24;
    private static final ExecutorService executorService = Executors.newFixedThreadPool(10); // Adjust the pool size as needed
    private static final ConcurrentHashMap<String, Boolean> ongoingImageDownloads = new ConcurrentHashMap<>();

    public static void scheduleAnimeNotification(Context context, int animeId, String title, int releaseEpisode, int maxEpisode, long releaseDateMillis, String imageUrl, boolean isMyAnime) {
        context = context.getApplicationContext();
        createNotificationChannel(context);
        if (allAnimeNotification.size()==0) {
            @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(context, "allAnimeNotification");
            if ($allAnimeNotification != null && $allAnimeNotification.size() > 0) {
                allAnimeNotification.putAll($allAnimeNotification);
            }
        }
        AnimeNotification checkingAnime = allAnimeNotification.get(animeId+"-"+releaseEpisode);
        if (checkingAnime==null || checkingAnime.imageByte==null || checkingAnime.imageByte.length==0) {
            if (ongoingImageDownloads.putIfAbsent(animeId+"-"+releaseEpisode, true) == null) {
                Context finalContext = context;
                executorService.execute(() -> {
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
                        byte[] $imageBitmap = (byte[]) LocalPersistence.readObjectFromFile(finalContext, "notificationLogoIcon");
                        if ($imageBitmap==null || $imageBitmap.length==0) {
                            imageBitmap = BitmapFactory.decodeResource(finalContext.getResources(), R.drawable.ic_launcher_round);
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                imageBitmap.compress(Bitmap.CompressFormat.WEBP_LOSSY, 25, stream);
                            } else {
                                imageBitmap.compress(Bitmap.CompressFormat.WEBP, 25, stream);
                            }
                            LocalPersistence.writeObjectToFile(finalContext, stream.toByteArray(), "notificationLogoIcon");
                        }
                    }
                    AnimeNotification anime = new AnimeNotification(animeId, title, releaseEpisode, maxEpisode, releaseDateMillis, imageByte, isMyAnime);
                    addAnimeNotification(finalContext, anime);
                    ongoingImageDownloads.remove(animeId+"-"+releaseEpisode);
                });
            }
        } else {
            AnimeNotification anime = new AnimeNotification(animeId, title, releaseEpisode, maxEpisode, releaseDateMillis, checkingAnime.imageByte, isMyAnime);
            addAnimeNotification(context, anime);
        }
    }

    public static void addAnimeNotification(Context context, AnimeNotification anime) {
        Intent intent = new Intent(context, NotificationReceiver.class);
        if (nearestNotificationTime==0 || anime.releaseDateMillis<nearestNotificationTime) {
            if (nearestNotificationInfo!=null) {
                Intent oldIntent = new Intent(context, NotificationReceiver.class);
                oldIntent.setAction("ANIME_NOTIFICATION");
                oldIntent.putExtra("releaseDateMillis", nearestNotificationInfo.releaseDateMillis);
                int notificationId = nearestNotificationInfo.animeId;
                PendingIntent oldPendingIntent = PendingIntent.getBroadcast(context, notificationId, oldIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                // Cancel Old
                oldPendingIntent.cancel();
                alarmManager.cancel(oldPendingIntent);
            }
            nearestNotificationTime = anime.releaseDateMillis;
            nearestNotificationInfo = anime;
            intent.setAction("ANIME_NOTIFICATION");
            intent.putExtra("releaseDateMillis", anime.releaseDateMillis);
        } else {
            intent.setAction("ANIME_NOTIFICATION");
            intent.putExtra("releaseDateMillis", nearestNotificationInfo.releaseDateMillis);
        }
        allAnimeNotification.put(anime.animeId+"-"+anime.releaseEpisode, anime);
        LocalPersistence.writeObjectToFile(context, allAnimeNotification, "allAnimeNotification");
        int notificationId = nearestNotificationInfo.animeId;

        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, notificationId, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        // Cancel Old
        pendingIntent.cancel();
        alarmManager.cancel(pendingIntent);
        // Create New
        pendingIntent = PendingIntent.getBroadcast(context, notificationId, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nearestNotificationTime, pendingIntent);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, nearestNotificationTime, pendingIntent);
        }
    }

    private static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context = context.getApplicationContext();
            CharSequence name = "Anime Channel Releases";
            String description = "Notifications for Anime Releases";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    public static class NotificationReceiver extends BroadcastReceiver {

        @RequiresApi(api = Build.VERSION_CODES.P)
        @Override
        public void onReceive(Context context, Intent intent) {
            if ("ANIME_NOTIFICATION".equals(intent.getAction())) {
                Bundle extras = intent.getExtras();
                if (extras != null) {
                    context = context.getApplicationContext();
                    long releaseDateMillis = extras.getLong("releaseDateMillis");
                    if (allAnimeNotification.size()==0) {
                        @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(context, "allAnimeNotification");
                        if ($allAnimeNotification!=null && $allAnimeNotification.size()>0) {
                            allAnimeNotification.putAll($allAnimeNotification);
                        }
                    }
                    showNotification(context, releaseDateMillis);
                }
            }
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

    @RequiresApi(api = Build.VERSION_CODES.P)
    private static void showNotification(Context context, long releaseDateMillis) {
        context = context.getApplicationContext();
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);

        notificationManager.cancelAll();

        byte[] dummyImage = null;
        HashMap<String, AnimeNotification> myAnimeNotifications = new HashMap<>();
        HashMap<String, AnimeNotification> animeNotifications = new HashMap<>();

        long newNearestMyAnimeNotificationTime = 0;
        AnimeNotification newNearestMyAnimeNotificationInfo = null;

        long newNearestOtherAnimeNotificationTime = 0;
        AnimeNotification newNearestOtherAnimeNotificationInfo = null;
        boolean hasMyAnime = false;
        for (AnimeNotification anime : allAnimeNotification.values()) {
            if (anime.releaseDateMillis <= releaseDateMillis) {
                if (anime.isMyAnime) {
                    if (anime.releaseDateMillis==releaseDateMillis) {
                        hasMyAnime = true;
                    }
                    if (myAnimeNotifications.get(String.valueOf(anime.animeId))==null) {
                        myAnimeNotifications.put(String.valueOf(anime.animeId), anime);
                    } else {
                        AnimeNotification $anime = myAnimeNotifications.get(String.valueOf(anime.animeId));
                        if ($anime!=null && $anime.releaseDateMillis<anime.releaseDateMillis) {
                            myAnimeNotifications.put(String.valueOf(anime.animeId), anime);
                        }
                    }
                } else {
                    if (animeNotifications.get(String.valueOf(anime.animeId))==null) {
                        animeNotifications.put(String.valueOf(anime.animeId), anime);
                    } else {
                        AnimeNotification $anime = animeNotifications.get(String.valueOf(anime.animeId));
                        if ($anime!=null && $anime.releaseDateMillis<anime.releaseDateMillis) {
                            animeNotifications.put(String.valueOf(anime.animeId), anime);
                        }
                    }
                }
            } else {
                if (anime.isMyAnime) {
                    if (anime.releaseDateMillis<newNearestMyAnimeNotificationTime || newNearestMyAnimeNotificationTime==0) {
                        newNearestMyAnimeNotificationTime = anime.releaseDateMillis;
                        newNearestMyAnimeNotificationInfo = anime;
                    }
                } else {
                    if (anime.releaseDateMillis<newNearestOtherAnimeNotificationTime || newNearestOtherAnimeNotificationTime==0) {
                        newNearestOtherAnimeNotificationTime = anime.releaseDateMillis;
                        newNearestOtherAnimeNotificationInfo = anime;
                    }
                }
            }
        }
        String notificationTitleMA = "Your Anime Aired";
        if (myAnimeNotifications.size() > 1) {
            notificationTitleMA = notificationTitleMA+" +"+myAnimeNotifications.size();
        }
        Notification.MessagingStyle styleMA = new Notification.MessagingStyle("")
                .setConversationTitle(notificationTitleMA)
                .setGroupConversation(true);
        int totalMyNotifications = myAnimeNotifications.size();
        int currentIndex = 0;
        for (AnimeNotification anime : myAnimeNotifications.values()) {
            Person.Builder itemBuilder = new Person.Builder()
                    .setName(anime.title)
                    .setKey(String.valueOf(anime.animeId))
                    .setBot(true);
            if (anime.imageByte != null) {
                Bitmap image = BitmapFactory.decodeByteArray(anime.imageByte, 0, anime.imageByte.length);
                itemBuilder.setIcon(createRoundIcon(image));
            } else {
                if (dummyImage!=null && dummyImage.length!=0) {
                    Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                    itemBuilder.setIcon(createRoundIcon(image));
                } else {
                    byte[] $dummyImage = (byte[]) LocalPersistence.readObjectFromFile(context, "notificationLogoIcon");
                    if ($dummyImage!=null && $dummyImage.length!=0) {
                        dummyImage = $dummyImage;
                        Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                        itemBuilder.setIcon(createRoundIcon(image));
                    }
                }
            }
            Person item = itemBuilder.build();
            String nextLine = "\n";
            ++currentIndex;
            if (currentIndex >= totalMyNotifications) {
                nextLine = "";
            }
            if (anime.maxEpisode<0) { // No Given Max Episodes
                styleMA.addMessage("Episode " + anime.releaseEpisode + " is now available." + nextLine, anime.releaseDateMillis, item);
            } else if (anime.releaseEpisode>=anime.maxEpisode) {
                styleMA.addMessage("Finished airing: Episode " + anime.releaseEpisode + " is now available." + nextLine, anime.releaseDateMillis, item);
            } else {
                if (anime.maxEpisode-anime.releaseEpisode>1) {
                    styleMA.addMessage("Episode " + anime.releaseEpisode + " is now available. There are " + (anime.maxEpisode-anime.releaseEpisode) +" episodes left." + nextLine, anime.releaseDateMillis, item);
                } else {
                    styleMA.addMessage("Episode " + anime.releaseEpisode + " is now available. " + anime.maxEpisode +" will be the last." + nextLine, anime.releaseDateMillis, item);
                }
            }
        }

        PackageManager pm = context.getPackageManager();
        Intent intent = pm.getLaunchIntentForPackage("com.example.kanshi");
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);
        pendingIntent.cancel();
        pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder notificationMABuilder = new Notification.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY);

        if (myAnimeNotifications.size()>0) {
            notificationMABuilder
                    .setContentTitle(notificationTitleMA)
                    .setStyle(styleMA);
        } else {
            notificationMABuilder
                    .setContentTitle("Your Anime")
                    .setContentText("There are no recent releases in your list.");
        }
        if (newNearestMyAnimeNotificationInfo!=null) {
            notificationMABuilder
                    .setChronometerCountDown(true)
                    .setUsesChronometer(true)
                    .setShowWhen(true)
                    .setWhen(newNearestMyAnimeNotificationInfo.releaseDateMillis);
        }

        // Other Anime Released
        String notificationTitleOA = "Some Anime Aired";

        if (animeNotifications.size() > 1) {
            notificationTitleOA = notificationTitleOA+" +"+animeNotifications.size();
        }
        Notification.MessagingStyle styleOA = new Notification.MessagingStyle("")
                .setConversationTitle(notificationTitleOA)
                .setGroupConversation(true);
        int totalOtherNotifications = animeNotifications.size();
        currentIndex = 0;
        for (AnimeNotification anime : animeNotifications.values()) {
            Person.Builder itemBuilder = new Person.Builder()
                    .setName(anime.title)
                    .setKey(String.valueOf(anime.animeId))
                    .setBot(true);
            if (anime.imageByte != null) {
                Bitmap image = BitmapFactory.decodeByteArray(anime.imageByte, 0, anime.imageByte.length);
                itemBuilder.setIcon(createRoundIcon(image));
            } else {
                if (dummyImage!=null && dummyImage.length!=0) {
                    Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                    itemBuilder.setIcon(createRoundIcon(image));
                } else {
                    byte[] $dummyImage = (byte[]) LocalPersistence.readObjectFromFile(context, "notificationLogoIcon");
                    if ($dummyImage!=null && $dummyImage.length!=0) {
                        dummyImage = $dummyImage;
                        Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                        itemBuilder.setIcon(createRoundIcon(image));
                    }
                }
            }
            Person item = itemBuilder.build();
            String nextLine = "\n";
            ++currentIndex;
            if (currentIndex >= totalOtherNotifications) {
                nextLine = "";
            }
            if (anime.maxEpisode<0) { // No Given Max Episodes
                styleOA.addMessage("Episode " + anime.releaseEpisode + " is now available." + nextLine, anime.releaseDateMillis, item);
            } else if (anime.releaseEpisode>=anime.maxEpisode) {
                styleOA.addMessage("Finished airing: Episode " + anime.releaseEpisode + " is now available." + nextLine, anime.releaseDateMillis, item);
            } else {
                if (anime.maxEpisode-anime.releaseEpisode>1) {
                    styleOA.addMessage("Episode " + anime.releaseEpisode + " is now available. There are " + (anime.maxEpisode-anime.releaseEpisode) +" episodes left." + nextLine, anime.releaseDateMillis, item);
                } else {
                    styleOA.addMessage("Episode " + anime.releaseEpisode + " is now available. " + anime.maxEpisode +" will be the last." + nextLine, anime.releaseDateMillis, item);
                }
            }
        }

        Notification.Builder notificationOABuilder = new Notification.Builder(context, CHANNEL_ID)
                .setContentTitle(notificationTitleOA)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY);

        String notificationTitle = "Anime Aired";
        int animeReleaseNotificationSize = myAnimeNotifications.size() + animeNotifications.size();
        if (animeReleaseNotificationSize > 1) {
            notificationTitle = notificationTitle+" +"+animeReleaseNotificationSize;
        }

        Notification.Builder notificationSummaryBuilder = new Notification.Builder(context, CHANNEL_ID)
                .setContentTitle(notificationTitle)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupSummary(true);

        if (!hasMyAnime) {
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

        if (animeNotifications.size() > 0 || myAnimeNotifications.size() > 0 || newNearestMyAnimeNotificationInfo!=null) {
            if (animeNotifications.size() > 0) {
                notificationManager.notify(NOTIFICATION_OTHER_ANIME, notificationOA);
            }
            if (myAnimeNotifications.size() > 0 || newNearestMyAnimeNotificationInfo!=null) {
                notificationManager.notify(NOTIFICATION_MY_ANIME, notificationMA);
            }
            notificationManager.notify(NOTIFICATION_ID_BASE, notificationSummary);
        }

        MainActivity mainActivity = MainActivity.getInstanceActivity();

        if (mainActivity!=null) {
            mainActivity.setLastNotificationSentDate(releaseDateMillis);
        } else {
            SharedPreferences prefs = context.getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
            SharedPreferences.Editor prefsEdit = prefs.edit();
            prefsEdit.putLong("lastNotificationSentDate", releaseDateMillis).apply();
        }
        HashSet<String> animeNotificationsToBeRemoved = new HashSet<>();
        for (AnimeNotification anime : allAnimeNotification.values()) {
            // If ReleaseDate was Before 1 day ago
            if (anime.releaseDateMillis < (System.currentTimeMillis() - DAY_IN_MILLIS)) {
                animeNotificationsToBeRemoved.add(anime.animeId+"-"+anime.releaseEpisode);
            }
        }
        for (String animeKey : animeNotificationsToBeRemoved) {
            allAnimeNotification.remove(animeKey);
        }
        LocalPersistence.writeObjectToFile(context, allAnimeNotification, "allAnimeNotification");
        AnimeNotification newNearestNotificationInfo = null;
        if (newNearestMyAnimeNotificationInfo!=null && newNearestOtherAnimeNotificationInfo!=null) {
            if (newNearestOtherAnimeNotificationInfo.releaseDateMillis>newNearestMyAnimeNotificationInfo.releaseDateMillis) {
                newNearestNotificationInfo = newNearestMyAnimeNotificationInfo;
            } else {
                newNearestNotificationInfo = newNearestOtherAnimeNotificationInfo;
            }
        } else if (newNearestMyAnimeNotificationInfo!=null) {
            newNearestNotificationInfo = newNearestMyAnimeNotificationInfo;
        } else if (newNearestOtherAnimeNotificationInfo!=null) {
            newNearestNotificationInfo = newNearestOtherAnimeNotificationInfo;
        }
        getNewNotification(context, newNearestNotificationInfo);
    }
    public static void getNewNotification(Context context, AnimeNotification newNearestNotificationInfo) {
        if (newNearestNotificationInfo!=null) {
            context = context.getApplicationContext();
            nearestNotificationInfo = newNearestNotificationInfo;
            nearestNotificationTime = nearestNotificationInfo.releaseDateMillis;
            if (newNearestNotificationInfo.isMyAnime) {
                SharedPreferences prefs = context.getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
                SharedPreferences.Editor prefsEdit = prefs.edit();
                prefsEdit.putBoolean("permissionIsAsked", false).apply();
            }
            Intent newIntent = new Intent(context, NotificationReceiver.class);
            newIntent.setAction("ANIME_NOTIFICATION");
            newIntent.putExtra("releaseDateMillis", newNearestNotificationInfo.releaseDateMillis);

            int notificationId = newNearestNotificationInfo.animeId;
            PendingIntent newPendingIntent = PendingIntent.getBroadcast(context, notificationId, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            // Cancel Old
            newPendingIntent.cancel();
            alarmManager.cancel(newPendingIntent);
            // Create New
            newPendingIntent = PendingIntent.getBroadcast(context, notificationId, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, newNearestNotificationInfo.releaseDateMillis, newPendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, newNearestNotificationInfo.releaseDateMillis, newPendingIntent);
            }
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.P)
    public static String showRecentReleases(Context context) {
        context = context.getApplicationContext();
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return "Require Permission for Notification.";
        }
        @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(context, "allAnimeNotification");
        if (($allAnimeNotification == null || $allAnimeNotification.size() == 0) && allAnimeNotification.size()==0) {
            return "There are no recently released anime.";
        }

        if ($allAnimeNotification!=null && $allAnimeNotification.size()!=0) {
            allAnimeNotification.putAll($allAnimeNotification);
        }

        long lastNotifiedTime = 0;
        for (AnimeNotification anime : allAnimeNotification.values()) {
            if (anime.releaseDateMillis<System.currentTimeMillis()) {
                if (anime.releaseDateMillis>lastNotifiedTime || lastNotifiedTime==0) {
                    lastNotifiedTime = anime.releaseDateMillis;
                }
            }
        }
        if (lastNotifiedTime==0) {
            return "There are no recently released anime.";
        }

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);

        notificationManager.cancelAll();

        byte[] dummyImage = null;
        HashMap<String, AnimeNotification> myAnimeNotifications = new HashMap<>();
        HashMap<String, AnimeNotification> animeNotifications = new HashMap<>();

        long newNearestMyAnimeNotificationTime = 0;
        AnimeNotification newNearestMyAnimeNotificationInfo = null;

        boolean hasMyAnime = false;
        for (AnimeNotification anime : allAnimeNotification.values()) {
            if (anime.releaseDateMillis <= lastNotifiedTime) {
                if (anime.isMyAnime) {
                    if (anime.releaseDateMillis==lastNotifiedTime) {
                        hasMyAnime = true;
                    }
                    if (myAnimeNotifications.get(String.valueOf(anime.animeId))==null) {
                        myAnimeNotifications.put(String.valueOf(anime.animeId), anime);
                    } else {
                        AnimeNotification $anime = myAnimeNotifications.get(String.valueOf(anime.animeId));
                        if ($anime!=null && $anime.releaseDateMillis<anime.releaseDateMillis) {
                            myAnimeNotifications.put(String.valueOf(anime.animeId), anime);
                        }
                    }
                } else {
                    if (animeNotifications.get(String.valueOf(anime.animeId))==null) {
                        animeNotifications.put(String.valueOf(anime.animeId), anime);
                    } else {
                        AnimeNotification $anime = animeNotifications.get(String.valueOf(anime.animeId));
                        if ($anime!=null && $anime.releaseDateMillis<anime.releaseDateMillis) {
                            animeNotifications.put(String.valueOf(anime.animeId), anime);
                        }
                    }
                }
            } else {
                if (anime.isMyAnime) {
                    if (anime.releaseDateMillis<newNearestMyAnimeNotificationTime || newNearestMyAnimeNotificationTime==0) {
                        newNearestMyAnimeNotificationTime = anime.releaseDateMillis;
                        newNearestMyAnimeNotificationInfo = anime;
                    }
                }
            }
        }
        String notificationTitleMA = "Your Anime Aired";
        if (myAnimeNotifications.size() > 1) {
            notificationTitleMA = notificationTitleMA+" +"+myAnimeNotifications.size();
        }
        Notification.MessagingStyle styleMA = new Notification.MessagingStyle("")
                .setConversationTitle(notificationTitleMA)
                .setGroupConversation(true);
        int totalMyNotifications = myAnimeNotifications.size();
        int currentIndex = 0;
        for (AnimeNotification anime : myAnimeNotifications.values()) {
            Person.Builder itemBuilder = new Person.Builder()
                    .setName(anime.title)
                    .setKey(String.valueOf(anime.animeId))
                    .setBot(true);
            if (anime.imageByte != null) {
                Bitmap image = BitmapFactory.decodeByteArray(anime.imageByte, 0, anime.imageByte.length);
                itemBuilder.setIcon(createRoundIcon(image));
            } else {
                if (dummyImage!=null && dummyImage.length!=0) {
                    Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                    itemBuilder.setIcon(createRoundIcon(image));
                } else {
                    byte[] $dummyImage = (byte[]) LocalPersistence.readObjectFromFile(context, "notificationLogoIcon");
                    if ($dummyImage!=null && $dummyImage.length!=0) {
                        dummyImage = $dummyImage;
                        Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                        itemBuilder.setIcon(createRoundIcon(image));
                    }
                }
            }
            Person item = itemBuilder.build();
            String nextLine = "\n";
            ++currentIndex;
            if (currentIndex >= totalMyNotifications) {
                nextLine = "";
            }
            if (anime.maxEpisode<0) { // No Given Max Episodes
                styleMA.addMessage("Episode " + anime.releaseEpisode + " is now available." + nextLine, anime.releaseDateMillis, item);
            } else if (anime.releaseEpisode>=anime.maxEpisode) {
                styleMA.addMessage("Finished airing: Episode " + anime.releaseEpisode + " is now available." + nextLine, anime.releaseDateMillis, item);
            } else {
                if (anime.maxEpisode-anime.releaseEpisode>1) {
                    styleMA.addMessage("Episode " + anime.releaseEpisode + " is now available. There are " + (anime.maxEpisode-anime.releaseEpisode) +" episodes left." + nextLine, anime.releaseDateMillis, item);
                } else {
                    styleMA.addMessage("Episode " + anime.releaseEpisode + " is now available. " + anime.maxEpisode +" will be the last." + nextLine, anime.releaseDateMillis, item);
                }
            }
        }

        PackageManager pm = context.getPackageManager();
        Intent intent = pm.getLaunchIntentForPackage("com.example.kanshi");
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);
        pendingIntent.cancel();
        pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder notificationMABuilder = new Notification.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY);

        if (myAnimeNotifications.size()>0) {
            notificationMABuilder
                    .setContentTitle(notificationTitleMA)
                    .setStyle(styleMA);
        } else {
            notificationMABuilder
                    .setContentTitle("Your Anime")
                    .setContentText("There are no recent releases in your list.");
        }
        if (newNearestMyAnimeNotificationInfo!=null) {
            notificationMABuilder
                    .setChronometerCountDown(true)
                    .setUsesChronometer(true)
                    .setShowWhen(true)
                    .setWhen(newNearestMyAnimeNotificationInfo.releaseDateMillis);
        }

        // Other Anime Released
        String notificationTitleOA = "Some Anime Aired";

        if (animeNotifications.size() > 1) {
            notificationTitleOA = notificationTitleOA+" +"+animeNotifications.size();
        }
        Notification.MessagingStyle styleOA = new Notification.MessagingStyle("")
                .setConversationTitle(notificationTitleOA)
                .setGroupConversation(true);
        int totalOtherNotifications = animeNotifications.size();
        currentIndex = 0;
        for (AnimeNotification anime : animeNotifications.values()) {
            Person.Builder itemBuilder = new Person.Builder()
                    .setName(anime.title)
                    .setKey(String.valueOf(anime.animeId))
                    .setBot(true);
            if (anime.imageByte != null) {
                Bitmap image = BitmapFactory.decodeByteArray(anime.imageByte, 0, anime.imageByte.length);
                itemBuilder.setIcon(createRoundIcon(image));
            } else {
                if (dummyImage!=null && dummyImage.length!=0) {
                    Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                    itemBuilder.setIcon(createRoundIcon(image));
                } else {
                    byte[] $dummyImage = (byte[]) LocalPersistence.readObjectFromFile(context, "notificationLogoIcon");
                    if ($dummyImage!=null && $dummyImage.length!=0) {
                        dummyImage = $dummyImage;
                        Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                        itemBuilder.setIcon(createRoundIcon(image));
                    }
                }
            }
            Person item = itemBuilder.build();
            String nextLine = "\n";
            ++currentIndex;
            if (currentIndex >= totalOtherNotifications) {
                nextLine = "";
            }
            if (anime.maxEpisode<0) { // No Given Max Episodes
                styleOA.addMessage("Episode " + anime.releaseEpisode + " is now available." + nextLine, anime.releaseDateMillis, item);
            } else if (anime.releaseEpisode>=anime.maxEpisode) {
                styleOA.addMessage("Finished airing: Episode " + anime.releaseEpisode + " is now available." + nextLine, anime.releaseDateMillis, item);
            } else {
                if (anime.maxEpisode-anime.releaseEpisode>1) {
                    styleOA.addMessage("Episode " + anime.releaseEpisode + " is now available. There are " + (anime.maxEpisode-anime.releaseEpisode) +" episodes left." + nextLine, anime.releaseDateMillis, item);
                } else {
                    styleOA.addMessage("Episode " + anime.releaseEpisode + " is now available. " + anime.maxEpisode +" will be the last." + nextLine, anime.releaseDateMillis, item);
                }
            }
        }

        Notification.Builder notificationOABuilder = new Notification.Builder(context, CHANNEL_ID)
                .setContentTitle(notificationTitleOA)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY);

        String notificationTitle = "Anime Aired";
        int animeReleaseNotificationSize = myAnimeNotifications.size() + animeNotifications.size();
        if (animeReleaseNotificationSize > 1) {
            notificationTitle = notificationTitle+" +"+animeReleaseNotificationSize;
        }

        Notification.Builder notificationSummaryBuilder = new Notification.Builder(context, CHANNEL_ID)
                .setContentTitle(notificationTitle)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupSummary(true);

        if (!hasMyAnime) {
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

        if (animeNotifications.size() > 0 || myAnimeNotifications.size() > 0 || newNearestMyAnimeNotificationInfo!=null) {
            if (animeNotifications.size() > 0) {
                notificationManager.notify(NOTIFICATION_OTHER_ANIME, notificationOA);
            }
            if (myAnimeNotifications.size() > 0 || newNearestMyAnimeNotificationInfo!=null) {
                notificationManager.notify(NOTIFICATION_MY_ANIME, notificationMA);
            }
            notificationManager.notify(NOTIFICATION_ID_BASE, notificationSummary);
        }
        return null;
    }

    @RequiresApi(api = Build.VERSION_CODES.M)
    public static Icon createRoundIcon(Bitmap bitmap) {
        Bitmap output = Bitmap.createBitmap(bitmap.getWidth(),
                bitmap.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);

        final int color = 0xff424242;
        final Paint paint = new Paint();
        final Rect rect = new Rect(0, 0, bitmap.getWidth(), bitmap.getHeight());

        paint.setAntiAlias(true);
        canvas.drawARGB(0, 0, 0, 0);
        paint.setColor(color);
        canvas.drawCircle((float) bitmap.getWidth() / 2, (float) bitmap.getHeight() / 2,
                (float) bitmap.getWidth() / 2, paint);
        paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        canvas.drawBitmap(bitmap, rect, rect, paint);

        return Icon.createWithBitmap(output);
    }
}


