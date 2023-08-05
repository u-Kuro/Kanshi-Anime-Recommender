package com.example.kanshi;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Person;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
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

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AnimeNotificationManager {

    private static class AnimeNotification {
        final int notificationId;
        final String title;
        final int releaseEpisode;
        final int maxEpisode;
        final Bitmap image;
        public AnimeNotification(int notificationId, String title, int releaseEpisode, int maxEpisode, Bitmap image) {
            this.notificationId = notificationId;
            this.title = title;
            this.releaseEpisode = releaseEpisode;
            this.maxEpisode = maxEpisode;
            this.image = image;
        }
    }
    private static final int NOTIFICATION_ID_BASE = 1000;
    private static final int NOTIFICATION_MY_ANIME = 999;
    private static final int NOTIFICATION_OTHER_ANIME = 998;
    private static final String CHANNEL_ID = "anime_channel";
    private static final HashMap<String, AnimeNotification> myAnimeNotifications = new HashMap<>();

    private static final HashMap<String, AnimeNotification> animeNotifications = new HashMap<>();
    private static final String ANIME_RELEASE_NOTIFICATION_GROUP = "anime_release_notification_group";
    private static Bitmap dummyAnimeImage;


    public static void scheduleAnimeNotification(Context context, int animeId, String title, int releaseEpisode, int maxEpisode, long releaseDateMillis, String imageUrl, boolean isMyAnime) {
        context = context.getApplicationContext();
        if (dummyAnimeImage==null) {
            dummyAnimeImage = BitmapFactory.decodeResource(context.getResources(), R.drawable.ic_launcher_round);
        }
        createNotificationChannel(context);

        Intent intent = new Intent(context, NotificationReceiver.class);
        intent.setAction("ANIME_NOTIFICATION");
        intent.putExtra("animeId", animeId);
        intent.putExtra("title", title);
        intent.putExtra("releaseEpisode", releaseEpisode);
        intent.putExtra("maxEpisode", maxEpisode);
        intent.putExtra("imageUrl", imageUrl);
        intent.putExtra("isMyAnime", isMyAnime);

        int notificationId = NOTIFICATION_ID_BASE + animeId;
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, notificationId, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        // Cancel Old
        pendingIntent.cancel();
        alarmManager.cancel(pendingIntent);
        // Create New
        pendingIntent = PendingIntent.getBroadcast(context, notificationId, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        alarmManager.set(AlarmManager.RTC_WAKEUP, releaseDateMillis, pendingIntent);
    }

    private static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context = context.getApplicationContext();
            CharSequence name = "Anime Channel";
            String description = "Notifications for anime releases";
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
                    int animeId = extras.getInt("animeId");
                    String title = extras.getString("title");
                    int releaseEpisode = extras.getInt("releaseEpisode");
                    int maxEpisode = extras.getInt("maxEpisode");
                    String imageUrl = extras.getString("imageUrl");
                    boolean isMyAnime = extras.getBoolean("isMyAnime");

                    performNotificationTask(context, animeId, title, releaseEpisode, maxEpisode, imageUrl, isMyAnime);
                }
            }
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.P)
    private static void performNotificationTask(Context context, int animeId, String title, int releaseEpisode, int maxEpisode, String imageUrl, boolean isMyAnime) {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        Handler handler = new Handler(Looper.getMainLooper());
        Context finalContext = context.getApplicationContext();
        executor.execute(() -> {
            String finalImageUrl = "";
            if (imageUrl!=null) {
                finalImageUrl = imageUrl;
            }
            Bitmap imageBitmap = downloadImage(finalContext, finalImageUrl);
            handler.post(() -> {
                int notificationId = NOTIFICATION_ID_BASE + animeId;
                showNotification(finalContext, notificationId, title, releaseEpisode, maxEpisode, imageBitmap, isMyAnime);
            });
        });
    }

    private static Bitmap downloadImage(Context context, String imageUrl) {
        context = context.getApplicationContext();
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
            if (dummyAnimeImage!=null) {
                bitmap = dummyAnimeImage;
            } else {
                bitmap = BitmapFactory.decodeResource(context.getResources(), R.drawable.ic_launcher_round);
                if (bitmap != null) {
                    dummyAnimeImage = bitmap;
                }
            }
        }
        return bitmap;
    }

    @RequiresApi(api = Build.VERSION_CODES.P)
    private static void showNotification(Context context, int notificationId, String title, int releaseEpisode, int maxEpisode, Bitmap imageBitmap, boolean isMyAnime) {
        context = context.getApplicationContext();
        if (ActivityCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);

        notificationManager.cancelAll();

        if (isMyAnime) {
            myAnimeNotifications.put(String.valueOf(notificationId), new AnimeNotification(notificationId, title, releaseEpisode, maxEpisode, imageBitmap));
        } else {
            animeNotifications.put(String.valueOf(notificationId), new AnimeNotification(notificationId, title, releaseEpisode, maxEpisode, imageBitmap));
        }

        String notificationTitleMA = "My Anime Aired";
        if (myAnimeNotifications.size() > 1) {
            notificationTitleMA = notificationTitleMA+" +"+myAnimeNotifications.size();
        }
        Notification.MessagingStyle styleMA = new Notification.MessagingStyle("")
                .setConversationTitle(notificationTitleMA)
                .setGroupConversation(true);
        int totalNotifications = myAnimeNotifications.size();
        int currentIndex = 0;
        for (AnimeNotification anime : myAnimeNotifications.values()) {
            Person.Builder itemBuilder = new Person.Builder()
                    .setName(anime.title)
                    .setKey(String.valueOf(anime.notificationId))
                    .setBot(true);
            if (anime.image != null) {
                itemBuilder.setIcon(createRoundIcon(anime.image));
            } else {
                itemBuilder.setIcon(Icon.createWithResource(context,R.mipmap.ic_launcher_round));
            }
            Person item = itemBuilder.build();
            String nextLine = "\n";
            ++currentIndex;
            if (currentIndex >= totalNotifications) {
                nextLine = "";
            }
            if (anime.maxEpisode<0) { // No Given Max Episodes
                styleMA.addMessage("Episode " + anime.releaseEpisode + " is now available." + nextLine, anime.releaseEpisode, item);
            } else if (anime.releaseEpisode>=anime.maxEpisode) {
                styleMA.addMessage("Finished airing: Episode " + anime.releaseEpisode + " is now available." + nextLine, anime.releaseEpisode, item);
            } else {
                if (anime.maxEpisode-anime.releaseEpisode>1) {
                    styleMA.addMessage("Episode " + anime.releaseEpisode + " is now available. There are " + (anime.maxEpisode-anime.releaseEpisode) +" episodes left." + nextLine, anime.releaseEpisode, item);
                } else {
                    styleMA.addMessage("Episode " + anime.releaseEpisode + " is now available. " + anime.maxEpisode +" will be the last." + nextLine, anime.releaseEpisode, item);
                }
            }
        }

        Intent intentMA = new Intent(context, MainActivity.class);
        intentMA.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intentMA.putExtra("notificationID",NOTIFICATION_MY_ANIME);
        PendingIntent pendingIntentMA = PendingIntent.getActivity(context, NOTIFICATION_MY_ANIME, intentMA, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_CANCEL_CURRENT);
        pendingIntentMA.cancel();
        pendingIntentMA = PendingIntent.getActivity(context, NOTIFICATION_MY_ANIME, intentMA, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_CANCEL_CURRENT);

        Notification notificationMA = new Notification.Builder(context, CHANNEL_ID)
                .setContentTitle(notificationTitleMA)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setColor(Color.BLACK)
                .setStyle(styleMA)
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntentMA)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .build();

        // Other Anime Released
        String notificationTitleOA = "Other Anime Aired";
        if (animeNotifications.size() > 1) {
            notificationTitleOA = notificationTitleOA+" +"+animeNotifications.size();
        }
        Notification.MessagingStyle styleOA = new Notification.MessagingStyle("")
                .setConversationTitle(notificationTitleOA)
                .setGroupConversation(true);
        totalNotifications = animeNotifications.size();
        currentIndex = 0;
        for (AnimeNotification anime : animeNotifications.values()) {
            Person.Builder itemBuilder = new Person.Builder()
                    .setName(anime.title)
                    .setKey(String.valueOf(anime.notificationId))
                    .setBot(true);
            if (anime.image != null) {
                itemBuilder.setIcon(createRoundIcon(anime.image));
            } else {
                itemBuilder.setIcon(Icon.createWithResource(context,R.mipmap.ic_launcher_round));
            }
            Person item = itemBuilder.build();
            String nextLine = "\n";
            ++currentIndex;
            if (currentIndex >= totalNotifications) {
                nextLine = "";
            }
            if (anime.maxEpisode<0) { // No Given Max Episodes
                styleOA.addMessage("Episode " + anime.releaseEpisode + " is now available." + nextLine, anime.releaseEpisode, item);
            } else if (anime.releaseEpisode>=anime.maxEpisode) {
                styleOA.addMessage("Finished airing: Episode " + anime.releaseEpisode + " is now available." + nextLine, anime.releaseEpisode, item);
            } else {
                if (anime.maxEpisode-anime.releaseEpisode>1) {
                    styleOA.addMessage("Episode " + anime.releaseEpisode + " is now available. There are " + (anime.maxEpisode-anime.releaseEpisode) +" episodes left." + nextLine, anime.releaseEpisode, item);
                } else {
                    styleOA.addMessage("Episode " + anime.releaseEpisode + " is now available. " + anime.maxEpisode +" will be the last." + nextLine, anime.releaseEpisode, item);
                }
            }
        }

        Intent intentOA = new Intent(context, MainActivity.class);
        intentOA.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intentOA.putExtra("notificationID",NOTIFICATION_OTHER_ANIME);
        PendingIntent pendingIntentOA = PendingIntent.getActivity(context, NOTIFICATION_OTHER_ANIME, intentOA, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_CANCEL_CURRENT);
        pendingIntentOA.cancel();

        pendingIntentOA = PendingIntent.getActivity(context, NOTIFICATION_OTHER_ANIME, intentOA, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_CANCEL_CURRENT);
        Notification notificationOA = new Notification.Builder(context, CHANNEL_ID)
                .setContentTitle(notificationTitleOA)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setColor(Color.BLACK)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_LOW)
                .setContentIntent(pendingIntentOA)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .build();

        String notificationTitle = "Anime Aired";
        int animeReleaseNotificationSize = myAnimeNotifications.size() + animeNotifications.size();
        if (animeReleaseNotificationSize > 1) {
            notificationTitle = notificationTitle+" +"+animeReleaseNotificationSize;
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("notificationID",NOTIFICATION_ID_BASE);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, NOTIFICATION_ID_BASE, intentOA, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_CANCEL_CURRENT);
        pendingIntent.cancel();

        pendingIntent = PendingIntent.getActivity(context, NOTIFICATION_ID_BASE, intentOA, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_CANCEL_CURRENT);
        Notification notificationSummary = new Notification.Builder(context, CHANNEL_ID)
                .setContentTitle(notificationTitle)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setColor(Color.BLACK)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setGroup(ANIME_RELEASE_NOTIFICATION_GROUP)
                .setGroupSummary(true)
                .build();

        if (animeNotifications.size() > 0 || myAnimeNotifications.size() > 0) {
            if (animeNotifications.size() > 0) {
                notificationManager.notify(NOTIFICATION_OTHER_ANIME, notificationOA);
            }
            if (myAnimeNotifications.size() > 0) {
                notificationManager.notify(NOTIFICATION_MY_ANIME, notificationMA);
            }
            notificationManager.notify(NOTIFICATION_ID_BASE, notificationSummary);
        }
    }
    public static void cancelCurrentNotification(Context context, int id) {
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        notificationManager.cancel(id);
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


