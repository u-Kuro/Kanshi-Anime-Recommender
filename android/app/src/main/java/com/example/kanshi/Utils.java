package com.example.kanshi;

import android.content.ContentUris;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.storage.StorageManager;
import android.os.storage.StorageVolume;
import android.provider.DocumentsContract;
import android.provider.MediaStore;

import androidx.annotation.RequiresApi;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectOutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.regex.Matcher;

public class Utils {
    public static String getPath(Context context, Uri uri) {
        // DocumentProvider
        if (DocumentsContract.isDocumentUri(context, uri)) {
            // ExternalStorageProvider
            if (isExternalStorageDocument(uri)) {
                final String docId = DocumentsContract.getDocumentId(uri);
                final String[] split = docId.split(":");
                final String type = split[0];
                if ("primary".equalsIgnoreCase(type)) {
                    if (split.length > 1) {
                        return Environment.getExternalStorageDirectory().toString() + "/" + split[1];
                    } else {
                        return Environment.getExternalStorageDirectory().toString() + "/";
                    }
                } else if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                    // Handle non-primary volumes
                    StorageManager storageManager = (StorageManager) context.getSystemService(Context.STORAGE_SERVICE);
                    List<StorageVolume> storageVolumes = storageManager.getStorageVolumes();
                    for (StorageVolume volume : storageVolumes) {
                        File volumeDir = volume.getDirectory();
                        if (volumeDir != null) {
                            String volumePath = volumeDir.getAbsolutePath();
                            String[] projection = {MediaStore.Files.FileColumns.DATA};
                            Cursor cursor = context.getContentResolver().query(uri, projection, null, null, null);
                            if (cursor != null && cursor.moveToFirst()) {
                                int columnIndex = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DATA);
                                String documentPathFromUri = cursor.getString(columnIndex);
                                cursor.close();
                                final boolean isUriInVolume = documentPathFromUri != null && documentPathFromUri.startsWith(volumePath);
                                if (isUriInVolume) {
                                    String[] pathSegments = docId.split(":");
                                    return volumeDir.getAbsolutePath() + "/" + pathSegments[1];
                                }
                            }
                        }
                    }
                }
            } else if (isDownloadsDocument(uri)) { // DownloadsProvider
                final String id = DocumentsContract.getDocumentId(uri);
                final Uri contentUri = ContentUris.withAppendedId(Uri.parse("content://downloads/public_downloads"), Long.parseLong(id));
                return getDataColumn(context, contentUri, null, null);
            } else if (isMediaDocument(uri)) { // MediaProvider
                final String docId = DocumentsContract.getDocumentId(uri);
                final String[] split = docId.split(":");
                final String type = split[0];
                Uri contentUri = null;
                if ("image".equals(type)) {
                    contentUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                } else if ("video".equals(type)) {
                    contentUri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
                } else if ("audio".equals(type)) {
                    contentUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
                }
                final String selection = "_id=?";
                final String[] selectionArgs = new String[]{split[1]};
                return getDataColumn(context, contentUri, selection, selectionArgs);
            }
        } else if ("content".equalsIgnoreCase(uri.getScheme())) { // MediaStore (and general)
            // Return the remote address
            if (isGooglePhotosUri(uri)) {
                return uri.getLastPathSegment();
            }
            return getDataColumn(context, uri, null, null);
        } else if ("file".equalsIgnoreCase(uri.getScheme())) { // File
            return uri.getPath();
        }
        return null;
    }
    public static String getDataColumn(Context context, Uri uri, String selection, String[] selectionArgs) {
        Cursor cursor = null;
        final String column = "_data";
        final String[] projection = {column};
        try {
            cursor = context.getContentResolver().query(uri, projection, selection, selectionArgs, null);
            if (cursor != null && cursor.moveToFirst()) {
                final int index = cursor.getColumnIndexOrThrow(column);
                return cursor.getString(index);
            }
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        return null;
    }
    /**
     * @param uri The Uri to check.
     * @return Whether the Uri authority is ExternalStorageProvider.
     */
    public static boolean isExternalStorageDocument(Uri uri) {
        return "com.android.externalstorage.documents".equals(uri.getAuthority());
    }

    /**
     * @param uri The Uri to check.
     * @return Whether the Uri authority is DownloadsProvider.
     */
    public static boolean isDownloadsDocument(Uri uri) {
        return "com.android.providers.downloads.documents".equals(uri.getAuthority());
    }
    /**
     * @param uri The Uri to check.
     * @return Whether the Uri authority is MediaProvider.
     */
    public static boolean isMediaDocument(Uri uri) {
        return "com.android.providers.media.documents".equals(uri.getAuthority());
    }
    /**
     * @param uri The Uri to check.
     * @return Whether the Uri authority is Google Photos.
     */
    public static boolean isGooglePhotosUri(Uri uri) {
        return "com.google.android.apps.photos.content".equals(uri.getAuthority());
    }

    // Manual Clean for the following reason:
    // IndexedDB saves Set of Blob in device storage to be used in origin.
    // It has a Storage Leak that creates a new Set of Blob,
    // While leaving previous Sets of Blob unmanaged and not being deleted.
    private static final ExecutorService cleanIndexedDBFilesExecutorService = Executors.newFixedThreadPool(1);
    private static Future<?> cleanIndexedDBFilesFuture;
    private static ConcurrentHashMap<String, List<File>> webGroupedModifiedDate = new ConcurrentHashMap<>();
    private static ConcurrentHashMap<String, List<File>> localGroupedModifiedDate = new ConcurrentHashMap<>();
    private static final SimpleDateFormat dateFormat = new SimpleDateFormat("M/d/yyyy", Locale.US);
    @RequiresApi(api = Build.VERSION_CODES.O)
    public static void cleanIndexedDBFiles(Context context) {
        if (cleanIndexedDBFilesFuture != null && !cleanIndexedDBFilesFuture.isCancelled()) {
            cleanIndexedDBFilesFuture.cancel(true);
        }
        cleanIndexedDBFilesFuture = cleanIndexedDBFilesExecutorService.submit(() -> {
            // Web App
            webGroupedModifiedDate = new ConcurrentHashMap<>();

            final String mainDir = "app_webview/Default/IndexedDB/";
            String location = mainDir+"https_u-kuro.github.io_0.indexeddb.blob/1";
            location = location.replaceAll("/", Matcher.quoteReplacement(File.separator));

            final File dataDir = context.getApplicationContext().getDataDir();
            addIndexedDBFiles(new File(dataDir, location).listFiles(), true);

            List<Map.Entry<String, List<File>>> sortedModifiedDateEntries = new ArrayList<>(webGroupedModifiedDate.entrySet());
            Collections.sort(sortedModifiedDateEntries, (entry1, entry2) -> {
                try {
                    Date date1 = dateFormat.parse(entry1.getKey());
                    Date date2 = dateFormat.parse(entry2.getKey());
                    if (date1 == null && date2 == null) return 0;
                    if (date1 == null) return 1;
                    if (date2 == null) return -1;
                    return date1.compareTo(date2);
                } catch (Exception e) {
                    return 0;
                }
            });
            // Include a 3 Day Allowance
            final int allowedDays = 3;
            // Reason/Example:
            // Worst Case Scenario (Sets of Blob are saved/separated in 2 different days):
            // Let: ...Day[...Set of Blob] = Day1[SetA] - 2[A, B] - 3[B, C] - 4[C]
            // If Set C is still an incomplete Set then Set B should exist as it may still be used by chrome.
            // In this case Set B is separated into Days 2 and 3.
            // To save Set B, Days 2 and 3 should exist.
            // Thus, 3 day Allowance allows Days 4, 3, and 2 to exist.
            // 1) Days 4 and 3 for incomplete Set C (May be used by Chrome)
            // 2) Days 3 and 2 for Set B (May be used by Chrome too)
            for (int i = 0; i < sortedModifiedDateEntries.size() - allowedDays; i++) {
                Map.Entry<String, List<File>> currentEntry = sortedModifiedDateEntries.get(i);
                List<File> filesToRemove = currentEntry.getValue();
                for (File fileToRemove : filesToRemove) {
                    //noinspection ResultOfMethodCallIgnored
                    fileToRemove.delete();
                }
            }
            webGroupedModifiedDate = null;

            // Also for Local app
            localGroupedModifiedDate = new ConcurrentHashMap<>();

            location = mainDir+"file__0.indexeddb.blob/1";
            location = location.replaceAll("/", Matcher.quoteReplacement(File.separator));

            addIndexedDBFiles(new File(dataDir, location).listFiles(), false);

            sortedModifiedDateEntries = new ArrayList<>(localGroupedModifiedDate.entrySet());
            Collections.sort(sortedModifiedDateEntries, (entry1, entry2) -> {
                try {
                    Date date1 = dateFormat.parse(entry1.getKey());
                    Date date2 = dateFormat.parse(entry2.getKey());
                    if (date1 == null && date2 == null) return 0;
                    if (date1 == null) return 1;
                    if (date2 == null) return -1;
                    return date1.compareTo(date2);
                } catch (Exception e) {
                    return 0;
                }
            });

            for (int i = 0; i < sortedModifiedDateEntries.size() - allowedDays; i++) {
                Map.Entry<String, List<File>> currentEntry = sortedModifiedDateEntries.get(i);
                List<File> filesToRemove = currentEntry.getValue();
                for (File fileToRemove : filesToRemove) {
                    //noinspection ResultOfMethodCallIgnored
                    fileToRemove.delete();
                }
            }
            localGroupedModifiedDate = null;
        });
    }

    @RequiresApi(api = Build.VERSION_CODES.R)
    public static void exportReleasedAnime(Context context) {
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
        boolean autoExportReleasedAnime = prefs.getBoolean("autoExportReleasedAnime", false);
        if (!autoExportReleasedAnime) return;
        String exportPath = prefs.getString("savedExportPath", "");
        if (!exportPath.isEmpty() && Environment.isExternalStorageManager()) {
            File exportDirectory = new File(exportPath);
            if (exportDirectory.isDirectory()) {
                String directoryPath = exportPath + File.separator;
                File directory = new File(directoryPath);
                boolean dirIsCreated;
                if (!directory.exists()) {
                    dirIsCreated = directory.mkdirs();
                } else {
                    dirIsCreated = true;
                }
                if (directory.isDirectory() && dirIsCreated) {
                    ObjectOutputStream objectOut = null;
                    final String filename = "Released Anime.bin";
                    File finalFile = new File(directory, filename);
                    try {
                        FileOutputStream fileOut = new FileOutputStream(finalFile);
                        objectOut = new ObjectOutputStream(fileOut);
                        if (AnimeNotificationManager.allAnimeNotification.size() > 0) {
                            objectOut.writeObject(AnimeNotificationManager.allAnimeNotification);
                            fileOut.getFD().sync();
                            fileOut.close();
                            File tempFile = new File(directory, filename + ".tmp");
                            finalFile = new File(directory, filename);
                            if (!tempFile.renameTo(finalFile) && tempFile.exists()) {
                                //noinspection ResultOfMethodCallIgnored
                                tempFile.delete();
                            }
                        }
                    } catch (IOException ignored) {
                    } finally {
                        if (objectOut != null) {
                            try {
                                objectOut.close();
                            } catch (IOException ignored) {}
                        }
                    }
                }
            }
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.O)
    public static void addIndexedDBFiles(File[] files, boolean isWeb) {
        if (files!=null) {
            for (File file:files) {
                if (file.isFile()) {
                    Date modifiedDate = new Date(file.lastModified());
                    String modifiedDateKey = dateFormat.format(modifiedDate);
                    if (isWeb) {
                        if (webGroupedModifiedDate.containsKey(modifiedDateKey)) {
                            List<File> modifiedFiles = webGroupedModifiedDate.get(modifiedDateKey);
                            if (modifiedFiles == null) {
                                modifiedFiles = new ArrayList<>();
                            }
                            modifiedFiles.add(file);
                            webGroupedModifiedDate.put(modifiedDateKey, modifiedFiles);
                        } else {
                            List<File> newModifiedFiles = new ArrayList<>();
                            newModifiedFiles.add(file);
                            webGroupedModifiedDate.put(modifiedDateKey, newModifiedFiles);
                        }
                    } else {
                        if (localGroupedModifiedDate.containsKey(modifiedDateKey)) {
                            List<File> modifiedFiles = localGroupedModifiedDate.get(modifiedDateKey);
                            if (modifiedFiles == null) {
                                modifiedFiles = new ArrayList<>();
                            }
                            modifiedFiles.add(file);
                            localGroupedModifiedDate.put(modifiedDateKey, modifiedFiles);
                        } else {
                            List<File> newModifiedFiles = new ArrayList<>();
                            newModifiedFiles.add(file);
                            localGroupedModifiedDate.put(modifiedDateKey, newModifiedFiles);
                        }
                    }
                } else if (file.isDirectory()) {
                    File[] newFiles = file.listFiles();
                    addIndexedDBFiles(newFiles, isWeb);
                }
            }
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.M)
    public static Icon createRoundIcon(Bitmap bitmap) {
        return Icon.createWithBitmap(createRoundBitmap(bitmap));
    }

    public static Bitmap createRoundBitmap(Bitmap bitmap) {
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

        return output;
    }
}

