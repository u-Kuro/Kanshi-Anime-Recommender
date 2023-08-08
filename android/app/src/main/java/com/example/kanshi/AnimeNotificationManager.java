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
import android.os.Handler;
import android.os.Looper;

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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AnimeNotificationManager {

    private static class AnimeNotification implements Serializable {
        final int animeId;
        final String title;
        final int releaseEpisode;
        final int maxEpisode;
        final long releaseDateMillis;
        final String imageUrl;
        final byte[] imageByte;
        final boolean imageIsRequested;
        final boolean isMyAnime;
        public AnimeNotification(int animeId, String title, int releaseEpisode, int maxEpisode, long releaseDateMillis, String imageUrl, boolean imageIsRequested, byte[] imageByte, boolean isMyAnime) {
            this.animeId = animeId;
            this.title = title;
            this.releaseEpisode = releaseEpisode;
            this.maxEpisode = maxEpisode;
            this.releaseDateMillis = releaseDateMillis;
            this.imageUrl = imageUrl;
            this.imageByte = imageByte;
            this.imageIsRequested = imageIsRequested;
            this.isMyAnime = isMyAnime;
        }
    }
    private static final int NOTIFICATION_ID_BASE = 1000;
    private static final int NOTIFICATION_MY_ANIME = 999;
    private static final int NOTIFICATION_OTHER_ANIME = 998;
    private static final String CHANNEL_ID = "anime_releases_channel";
    private static final HashMap<String, AnimeNotification> allAnimeNotification = new HashMap<>();
    private static long nearestNotificationTime = 0;
    private static AnimeNotification nearestNotificationInfo = null;
    private static final String ANIME_RELEASE_NOTIFICATION_GROUP = "anime_release_notification_group";
    private static final int DAY_IN_MILLIS = 1000 * 60 * 60 * 24;

    public static void scheduleAnimeNotification(Context context, int animeId, String title, int releaseEpisode, int maxEpisode, long releaseDateMillis, String imageUrl, boolean isMyAnime) {
        context = context.getApplicationContext();
        createNotificationChannel(context);

        Intent intent = new Intent(context, NotificationReceiver.class);
        if (nearestNotificationTime==0 || releaseDateMillis<nearestNotificationTime) {
            if (nearestNotificationInfo!=null) {
                Intent oldIntent = new Intent(context, NotificationReceiver.class);
                oldIntent.setAction("ANIME_NOTIFICATION");
                oldIntent.putExtra("animeId", nearestNotificationInfo.animeId);
                oldIntent.putExtra("title", nearestNotificationInfo.title);
                oldIntent.putExtra("releaseEpisode", nearestNotificationInfo.releaseEpisode);
                oldIntent.putExtra("maxEpisode", nearestNotificationInfo.maxEpisode);
                oldIntent.putExtra("imageUrl", nearestNotificationInfo.imageUrl);
                oldIntent.putExtra("isMyAnime", nearestNotificationInfo.isMyAnime);
                oldIntent.putExtra("releaseDateMillis", nearestNotificationInfo.releaseDateMillis);
                oldIntent.putExtra("allAnimeNotification", allAnimeNotification);
                int notificationId = nearestNotificationInfo.animeId;
                PendingIntent oldPendingIntent = PendingIntent.getBroadcast(context, notificationId, oldIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                // Cancel Old
                oldPendingIntent.cancel();
                alarmManager.cancel(oldPendingIntent);
            }
            nearestNotificationTime = releaseDateMillis;
            nearestNotificationInfo = new AnimeNotification(animeId, title, releaseEpisode, maxEpisode, releaseDateMillis, imageUrl, false, null, isMyAnime);
            intent.setAction("ANIME_NOTIFICATION");
            intent.putExtra("releaseDateMillis", releaseDateMillis);
        } else {
            intent.setAction("ANIME_NOTIFICATION");
            intent.putExtra("releaseDateMillis", nearestNotificationInfo.releaseDateMillis);
        }
        AnimeNotification anime = new AnimeNotification(animeId, title, releaseEpisode, maxEpisode, releaseDateMillis, imageUrl, false, null, isMyAnime);
        allAnimeNotification.put(String.valueOf(animeId), anime);
        intent.putExtra("allAnimeNotification", allAnimeNotification);
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
                    //noinspection unchecked
                    HashMap<String, AnimeNotification> allAnimeNotification = (HashMap<String, AnimeNotification>) intent.getSerializableExtra("allAnimeNotification");

                    performNotificationTask(context, releaseDateMillis, allAnimeNotification);
                }
            }
        }
    }


    @RequiresApi(api = Build.VERSION_CODES.P)
    private static void performNotificationTask(Context context, long releaseDateMillis, HashMap<String, AnimeNotification> allAnimeNotification) {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        Handler handler = new Handler(Looper.getMainLooper());
        Context finalContext = context.getApplicationContext();
        CountDownLatch latch = new CountDownLatch(allAnimeNotification.size());
        for (AnimeNotification anime : allAnimeNotification.values()) {
            executor.execute(() -> {
                if (anime.releaseDateMillis <= releaseDateMillis && !anime.imageIsRequested) {
                    Bitmap imageBitmap = anime.imageUrl!=null? downloadImage(finalContext, anime.imageUrl) : null;
                    byte[] imageByte = null;
                    if (imageBitmap!=null) {
                        ByteArrayOutputStream stream = new ByteArrayOutputStream();
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            imageBitmap.compress(Bitmap.CompressFormat.WEBP_LOSSY, 25, stream);
                        } else {
                            imageBitmap.compress(Bitmap.CompressFormat.WEBP, 25, stream);
                        }
                        imageByte = stream.toByteArray();
                    }
                    allAnimeNotification.put(String.valueOf(anime.animeId), new AnimeNotification(anime.animeId, anime.title, anime.releaseEpisode, anime.maxEpisode, anime.releaseDateMillis, anime.imageUrl, true, imageByte, anime.isMyAnime));
                }
                latch.countDown();
            });
        }
        try {
            latch.await();
            handler.post(() -> showNotification(finalContext, releaseDateMillis, allAnimeNotification));
        } catch (InterruptedException e) {
            getNewNotification(finalContext, releaseDateMillis, allAnimeNotification);
        }
    }

    private static Bitmap downloadImage(Context context, String imageUrl) {
        Bitmap bitmap = null;
        try {
            URL url = new URL(imageUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setDoInput(true);
            connection.connect();
            InputStream input = connection.getInputStream();
            bitmap = BitmapFactory.decodeStream(input);
        } catch (IOException e) {
            e.printStackTrace();
        }
        if (bitmap==null) {
            bitmap = BitmapFactory.decodeResource(context.getResources(), R.drawable.ic_launcher_round);
        }
        return bitmap;
    }


    @RequiresApi(api = Build.VERSION_CODES.P)
    private static void showNotification(Context context, long releaseDateMillis, HashMap<String, AnimeNotification> allAnimeNotification) {
        context = context.getApplicationContext();
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);

        notificationManager.cancelAll();

        HashMap<String, AnimeNotification> myAnimeNotifications = new HashMap<>();
        HashMap<String, AnimeNotification> animeNotifications = new HashMap<>();
        boolean hasMyAnime = false;
        for (AnimeNotification anime : allAnimeNotification.values()) {
            if (anime.releaseDateMillis <= releaseDateMillis) {
                if (anime.isMyAnime) {
                    if (anime.releaseDateMillis==releaseDateMillis) {
                        hasMyAnime = true;
                    }
                    myAnimeNotifications.put(String.valueOf(anime.animeId), anime);
                } else {
                    animeNotifications.put(String.valueOf(anime.animeId), anime);
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

        Notification notificationMA = new Notification.Builder(context, CHANNEL_ID)
                .setContentTitle(notificationTitleMA)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setStyle(styleMA)
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                .build();

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

        Notification notificationOA = new Notification.Builder(context, CHANNEL_ID)
                .setContentTitle(notificationTitleOA)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                .build();

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
        Notification notificationSummary = notificationSummaryBuilder.build();

        if (animeNotifications.size() > 0 || myAnimeNotifications.size() > 0) {
            if (animeNotifications.size() > 0) {
                notificationManager.notify(NOTIFICATION_OTHER_ANIME, notificationOA);
            }
            if (myAnimeNotifications.size() > 0) {
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
                animeNotificationsToBeRemoved.add(String.valueOf(anime.animeId));
            }
        }
        for (String animeKey : animeNotificationsToBeRemoved) {
            AnimeNotificationManager.allAnimeNotification.remove(animeKey);
            allAnimeNotification.remove(animeKey);
        }
        getNewNotification(context, releaseDateMillis, allAnimeNotification);
    }
    public static void getNewNotification(Context context, long oldReleaseDateMillis, HashMap<String, AnimeNotification> allAnimeNotification) {
        context = context.getApplicationContext();
        long newNearestNotificationTime = 0;
        AnimeNotification newNearestNotificationInfo = null;
        for (AnimeNotification anime : allAnimeNotification.values()) {
            if (anime.releaseDateMillis>oldReleaseDateMillis) {
                if (anime.releaseDateMillis<newNearestNotificationTime || newNearestNotificationTime==0) {
                    newNearestNotificationTime = anime.releaseDateMillis;
                    newNearestNotificationInfo = anime;
                }
            }
        }
        if (newNearestNotificationInfo!=null) {
            nearestNotificationInfo = newNearestNotificationInfo;
            nearestNotificationTime = nearestNotificationInfo.releaseDateMillis;
            Intent newIntent = new Intent(context, NotificationReceiver.class);
            newIntent.setAction("ANIME_NOTIFICATION");
            newIntent.putExtra("releaseDateMillis", nearestNotificationInfo.releaseDateMillis);
            newIntent.putExtra("allAnimeNotification", allAnimeNotification);

            int notificationId = nearestNotificationInfo.animeId;
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


