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
        String action = intent.getAction();
        if ("ANIME_NOTIFICATION".equals(action) ||
                "android.intent.action.BOOT_COMPLETED".equals(action) ||
                "android.intent.action.QUICKBOOT_POWERON".equals(action)
        ) {
            String uniqueWorkName = "ANIME_NOTIFICATION";
            Data data = new Data.Builder()
                    .putBoolean("isBooted", !(uniqueWorkName.equals(action)))
                    .putString("action", uniqueWorkName)
                    .build();
            OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(MyWorker.class)
                    .setConstraints(Constraints.NONE)
                    .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                    .setInputData(data)
                    .build();
            WorkManager.getInstance(context).enqueueUniqueWork(uniqueWorkName, ExistingWorkPolicy.REPLACE, workRequest);
        } else if ("UPDATE_DATA_MANUAL".equals(action) || "UPDATE_DATA_AUTO".equals(action)) {
            String uniqueWorkName = "UPDATE_DATA";
            Data data = new Data.Builder()
                    .putBoolean("isManual", "UPDATE_DATA_MANUAL".equals(action))
                    .putString("action", uniqueWorkName)
                    .build();
            OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(MyWorker.class)
                    .setConstraints(Constraints.NONE)
                    .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                    .setInputData(data)
                    .build();
            WorkManager.getInstance(context).enqueueUniqueWork(uniqueWorkName, ExistingWorkPolicy.REPLACE, workRequest);
        }
    }
}