package com.example.kanshi;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;

public class DownloadUtils {
    private static DownloadManager downloadManager;
    private static long enqueueId;

    public static void downloadFile(Context context, String fileUrl, String fileName, final DownloadCallback callback) {
        downloadManager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(fileUrl));
        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

        enqueueId = downloadManager.enqueue(request);

        // Register a broadcast receiver to receive download events
        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long downloadId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (downloadId == enqueueId) {
                    // Retrieve the downloaded file name
                    String downloadedFilePath = getDownloadedFilePath(downloadId);

                    DownloadManager.Query query = new DownloadManager.Query();
                    query.setFilterById(downloadId);

                    Cursor cursor = downloadManager.query(query);
                    if (cursor.moveToFirst()) {
                        int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                        if (statusIndex != -1) {
                            int status = cursor.getInt(statusIndex);
                            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                                // Download completed
                                callback.onDownloadCompleted(downloadedFilePath);
                            } else {
                                // Download failed
                                callback.onDownloadFailed();
                            }
                        }
                    }
                    cursor.close();
                }
            }
        };

        // Register the broadcast receiver to receive download events
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED);
        }
    }

    private static String getDownloadedFilePath(long downloadId) {
        DownloadManager.Query query = new DownloadManager.Query();
        query.setFilterById(downloadId);

        Cursor cursor = downloadManager.query(query);
        if(cursor.moveToFirst()) {
            int fileNameIndex = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI);
            if (fileNameIndex >= 0) {
                return (cursor.getString(fileNameIndex)).replace("file://","");
            } else {
                return null;
            }
        }
        cursor.close();
        return null;
    }
    public interface DownloadCallback {
        void onDownloadCompleted(String fileName);
        void onDownloadFailed();
    }
}
