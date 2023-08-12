package com.example.kanshi;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.util.concurrent.ConcurrentHashMap;

public class BootCompleteWorkManager extends Worker  {

    public BootCompleteWorkManager(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        @SuppressWarnings("unchecked") ConcurrentHashMap<String, AnimeNotification> $allAnimeNotification = (ConcurrentHashMap<String, AnimeNotification>) LocalPersistence.readObjectFromFile(this.getApplicationContext(), "allAnimeNotification");
        if ($allAnimeNotification!=null && $allAnimeNotification.size()>0) {
            AnimeNotificationManager.allAnimeNotification.putAll($allAnimeNotification);
        }
        getNearestAnimeReleaseNotification();
        return Result.success();
    }

    private void getNearestAnimeReleaseNotification() {
        long nearestNotificationTime = 0;
        AnimeNotification nearestNotificationInfo = null;
        for (AnimeNotification anime : AnimeNotificationManager.allAnimeNotification.values()) {
            if (anime.releaseDateMillis >= System.currentTimeMillis()) {
                if (anime.releaseDateMillis<nearestNotificationTime || nearestNotificationTime==0) {
                    nearestNotificationTime = anime.releaseDateMillis;
                    nearestNotificationInfo = anime;
                }
            }
        }
        if (nearestNotificationInfo!=null) {
            AnimeNotificationManager.nearestNotificationInfo = nearestNotificationInfo;
            AnimeNotificationManager.nearestNotificationTime = nearestNotificationInfo.releaseDateMillis;
            if (nearestNotificationInfo.isMyAnime) {
                SharedPreferences prefs = this.getApplicationContext().getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
                SharedPreferences.Editor prefsEdit = prefs.edit();
                prefsEdit.putBoolean("permissionIsAsked", false).apply();
            }
            Intent newIntent = new Intent(this.getApplicationContext(), AnimeNotificationManager.NotificationReceiver.class);
            newIntent.setAction("ANIME_NOTIFICATION");
            newIntent.putExtra("releaseDateMillis", nearestNotificationInfo.releaseDateMillis);

            int notificationId = nearestNotificationInfo.animeId;
            PendingIntent newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), notificationId, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager alarmManager = (AlarmManager) this.getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            // Cancel Old
            newPendingIntent.cancel();
            alarmManager.cancel(newPendingIntent);
            // Create New
            newPendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), notificationId, newIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nearestNotificationInfo.releaseDateMillis, newPendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, nearestNotificationInfo.releaseDateMillis, newPendingIntent);
            }
        }
    }
}
