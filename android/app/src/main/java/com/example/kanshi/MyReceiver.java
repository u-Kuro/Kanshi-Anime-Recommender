package com.example.kanshi;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.annotation.RequiresApi;
import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.OutOfQuotaPolicy;
import androidx.work.WorkManager;

public class MyReceiver extends BroadcastReceiver {
    @RequiresApi(api = Build.VERSION_CODES.P)
    @Override
    public void onReceive(Context context, Intent intent) {
        if ("ANIME_NOTIFICATION".equals(intent.getAction()) ||
                "android.intent.action.BOOT_COMPLETED".equals(intent.getAction()) ||
                "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())
        ) {
            String uniqueWorkName = "ANIME_NOTIFICATION";
            Data data = new Data.Builder()
                    .putBoolean("isBooted", !(intent.getAction().equals(uniqueWorkName)))
                    .putString("action", uniqueWorkName)
                    .build();
            OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(AnimeNotificationWorker.class)
                    .setConstraints(Constraints.NONE)
                    .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                    .setInputData(data)
                    .build();
            WorkManager.getInstance(context).enqueueUniqueWork("ANIME_NOTIFICATION", ExistingWorkPolicy.REPLACE, workRequest);
        } else if ("ANIME_RELEASE_UPDATE".equals(intent.getAction())) {
            String uniqueWorkName = "ANIME_RELEASE_UPDATE";
            Data data = new Data.Builder()
                    .putString("action", uniqueWorkName)
                    .build();
            OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(AnimeNotificationWorker.class)
                    .setConstraints(Constraints.NONE)
                    .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                    .setInputData(data)
                    .build();
            WorkManager.getInstance(context).enqueueUniqueWork(uniqueWorkName, ExistingWorkPolicy.REPLACE, workRequest);
        }
    }
}