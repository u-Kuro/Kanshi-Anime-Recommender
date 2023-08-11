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

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.util.HashMap;
import java.util.HashSet;
import java.util.concurrent.ConcurrentHashMap;

public class AnimeNotificationWorkManager extends Worker {

    public AnimeNotificationWorkManager(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @RequiresApi(api = Build.VERSION_CODES.P)
    @NonNull
    @Override
    public Result doWork() {
        long releaseDateMillis = getInputData().getLong("releaseDateMillis", 0);
        @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(this.getApplicationContext(), "allAnimeNotification");
        if ($allAnimeNotification!=null && $allAnimeNotification.size()>0) {
            AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
        }
        showNotification(releaseDateMillis);
        return Result.success();
    }

    @RequiresApi(api = Build.VERSION_CODES.P)
    private void showNotification(long releaseDateMillis) {
        if (ActivityCompat.checkSelfPermission(this.getApplicationContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this.getApplicationContext());

        notificationManager.cancelAll();

        byte[] dummyImage = null;
        HashMap<String, AnimeNotification> myAnimeNotifications = new HashMap<>();
        HashMap<String, AnimeNotification> animeNotifications = new HashMap<>();

        long newNearestNotificationTime = 0;
        AnimeNotification newNearestNotificationInfo = null;

        boolean hasMyAnime = false;
        for (AnimeNotification anime : AnimeNotificationManager.allAnimeNotification.values()) {
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
                if (anime.releaseDateMillis<newNearestNotificationTime || newNearestNotificationTime==0) {
                    newNearestNotificationTime = anime.releaseDateMillis;
                    newNearestNotificationInfo = anime;
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
                    try {
                        byte[] $dummyImage = (byte[]) LocalPersistence.readObjectFromFile(this.getApplicationContext(), "notificationLogoIcon");
                        if ($dummyImage!=null && $dummyImage.length!=0) {
                            dummyImage = $dummyImage;
                            Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                            itemBuilder.setIcon(createRoundIcon(image));
                        }
                    } catch (Exception ignored) {}
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
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY);

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

        Notification.Builder notificationOABuilder = new Notification.Builder(this.getApplicationContext(), CHANNEL_ID)
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

        Notification.Builder notificationSummaryBuilder = new Notification.Builder(this.getApplicationContext(), CHANNEL_ID)
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

        MainActivity mainActivity = MainActivity.getInstanceActivity();

        if (mainActivity!=null) {
            mainActivity.setLastNotificationSentDate(releaseDateMillis);
        } else {
            SharedPreferences prefs = this.getApplicationContext().getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
            SharedPreferences.Editor prefsEdit = prefs.edit();
            prefsEdit.putLong("lastNotificationSentDate", releaseDateMillis).apply();
        }
        HashSet<String> animeNotificationsToBeRemoved = new HashSet<>();
        for (AnimeNotification anime : AnimeNotificationManager.allAnimeNotification.values()) {
            // If ReleaseDate was Before 1 day ago
            int DAY_IN_MILLIS = 1000 * 60 * 60 * 24;
            if (anime.releaseDateMillis < (System.currentTimeMillis() - DAY_IN_MILLIS)) {
                animeNotificationsToBeRemoved.add(anime.animeId+"-"+anime.releaseEpisode);
            }
        }
        for (String animeKey : animeNotificationsToBeRemoved) {
            AnimeNotificationManager.allAnimeNotification.remove(animeKey);
        }
        LocalPersistence.writeObjectToFile(this.getApplicationContext(), AnimeNotificationManager.allAnimeNotification, "allAnimeNotification");
        getNewNotification(newNearestNotificationInfo);
    }

    public void getNewNotification(AnimeNotification newNearestNotificationInfo) {
        if (newNearestNotificationInfo!=null) {
            AnimeNotificationManager.nearestNotificationInfo = newNearestNotificationInfo;
            AnimeNotificationManager.nearestNotificationTime = newNearestNotificationInfo.releaseDateMillis;
            if (newNearestNotificationInfo.isMyAnime) {
                SharedPreferences prefs = this.getApplicationContext().getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
                SharedPreferences.Editor prefsEdit = prefs.edit();
                prefsEdit.putBoolean("permissionIsAsked", false).apply();
            }
            Intent newIntent = new Intent(this.getApplicationContext(), AnimeNotificationManager.NotificationReceiver.class);
            newIntent.setAction("ANIME_NOTIFICATION");
            newIntent.putExtra("releaseDateMillis", newNearestNotificationInfo.releaseDateMillis);

            int notificationId = newNearestNotificationInfo.animeId;
            PendingIntent newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), notificationId, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager alarmManager = (AlarmManager) this.getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            // Cancel Old
            newPendingIntent.cancel();
            alarmManager.cancel(newPendingIntent);
            // Create New
            newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), notificationId, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, newNearestNotificationInfo.releaseDateMillis, newPendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, newNearestNotificationInfo.releaseDateMillis, newPendingIntent);
            }
        }
    }
}

