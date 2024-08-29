package com.example.kanshi;

import static com.example.kanshi.BuildConfig.DEBUG;
import static com.example.kanshi.Configs.OWNER;
import static com.example.kanshi.LocalPersistence.getLockForFile;
import static com.example.kanshi.LocalPersistence.getLockForFileName;

import android.content.ContentUris;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Looper;
import android.os.storage.StorageManager;
import android.os.storage.StorageVolume;
import android.provider.DocumentsContract;
import android.provider.MediaStore;

import androidx.annotation.RequiresApi;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.ObjectOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.locks.ReentrantLock;

/** @noinspection CommentedOutCode*/
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
                                final boolean isUriInVolume = documentPathFromUri != null && documentPathFromUri.startsWith(volumePath);
                                if (isUriInVolume) {
                                    String[] pathSegments = docId.split(":");
                                    return volumeDir.getAbsolutePath() + "/" + pathSegments[1];
                                }
                                cursor.close();
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
//    private static final ExecutorService cleanIndexedDBFilesExecutorService = Executors.newFixedThreadPool(1);
//    private static Future<?> cleanIndexedDBFilesFuture;
//    private static ConcurrentHashMap<String, List<File>> webGroupedModifiedDate = new ConcurrentHashMap<>();
//    private static final SimpleDateFormat dateFormat = new SimpleDateFormat("M/d/yyyy", Locale.US);
//    @RequiresApi(api = Build.VERSION_CODES.O)
//    public static void cleanIndexedDBFiles(Context context) {
//        if (cleanIndexedDBFilesFuture != null && !cleanIndexedDBFilesFuture.isCancelled()) {
//            cleanIndexedDBFilesFuture.cancel(true);
//        }
//        cleanIndexedDBFilesFuture = cleanIndexedDBFilesExecutorService.submit(() -> {
//            try {
//                // Web App
//                webGroupedModifiedDate = new ConcurrentHashMap<>();
//
//                final String mainDir = "app_webview/Default/IndexedDB/";
//                String location = mainDir+"https_appassets.androidplatform.net_0.indexeddb.blob";
//                location = location.replaceAll("/", Matcher.quoteReplacement(File.separator));
//
//                final File dataDir = context.getApplicationContext().getDataDir();
//
//                try {
//                    if (!dataDir.exists() || !dataDir.isDirectory()) {
//                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
//                            executeHandleUncaughtException(context, new Throwable("Data Directory NOT FOUND at: " + location), "cleanIndexedDBFiles");
//                        }
//                    }
//                } catch (Exception ignored) {}
//
//                addIndexedDBFiles(new File(dataDir, location).listFiles());
//
//                List<Map.Entry<String, List<File>>> sortedModifiedDateEntries = new ArrayList<>(webGroupedModifiedDate.entrySet());
//                Collections.sort(sortedModifiedDateEntries, (entry1, entry2) -> {
//                    try {
//                        Date date1 = dateFormat.parse(entry1.getKey());
//                        Date date2 = dateFormat.parse(entry2.getKey());
//                        if (date1 == null && date2 == null) return 0;
//                        if (date1 == null) return 1;
//                        if (date2 == null) return -1;
//                        return date1.compareTo(date2);
//                    } catch (Exception ignored) {
//                        return 0;
//                    }
//                });
//                // Include a 3 Day Allowance
//                final int allowedDays = 3;
//                // Reason/Example:
//                // Worst Case Scenario (Sets of Blob are saved/separated in 2 different days):
//                // Let: ...Day[...Set of Blob] = Day1[SetA] - 2[A, B] - 3[B, C] - 4[C]
//                // If Set C is still an incomplete Set then Set B should exist as it may still be used by chrome.
//                // In this case Set B is separated into Days 2 and 3.
//                // To save Set B, Days 2 and 3 should exist.
//                // Thus, 3 day Allowance allows Days 4, 3, and 2 to exist.
//                // 1) Days 4 and 3 for incomplete Set C (May be used by Chrome)
//                // 2) Days 3 and 2 for Set B (May be used by Chrome too)
//                for (int i = 0; i < sortedModifiedDateEntries.size() - allowedDays; i++) {
//                    Map.Entry<String, List<File>> currentEntry = sortedModifiedDateEntries.get(i);
//                    List<File> filesToRemove = currentEntry.getValue();
//                    for (File fileToRemove : filesToRemove) {
//                        //noinspection ResultOfMethodCallIgnored
//                        fileToRemove.delete();
//                    }
//                }
//                webGroupedModifiedDate = null;
//            } catch (Exception e) {
//                webGroupedModifiedDate = null;
//                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
//                    Utils.handleUncaughtException(context.getApplicationContext(), e, "cleanIndexedDBFilesExecutorService");
//                }
//                e.printStackTrace();
//            }
//        });
//    }

    @RequiresApi(api = Build.VERSION_CODES.R)
    public static void exportReleasedMedia(Context context) {
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
        boolean autoExportReleasedMedia = prefs.getBoolean("autoExportReleasedMedia", false);
        if (!autoExportReleasedMedia) return;
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
                    if (!MediaNotificationManager.allMediaNotification.isEmpty()) {
                        FileOutputStream fileOut = null;
                        ObjectOutputStream objectOut = null;
                        final String filename = "Released Media.bin";
                        File tempFile = new File(directory, filename + ".tmp");
                        ReentrantLock fileLock = getLockForFile(tempFile);
                        fileLock.lock();
                        try {
                            fileOut = new FileOutputStream(tempFile);
                            objectOut = new ObjectOutputStream(fileOut);
                            objectOut.writeObject(MediaNotificationManager.allMediaNotification);
                            fileOut.getFD().sync();
                            if (tempFile.exists() && tempFile.isFile() && tempFile.length() > 0) {
                                File finalFile = new File(directory, filename);
                                ReentrantLock finalFileNameLock = getLockForFileName(finalFile.getName());
                                finalFileNameLock.lock();
                                try {
                                    //noinspection ResultOfMethodCallIgnored
                                    finalFile.createNewFile();
                                    Path tempFilePath = tempFile.toPath();
                                    Path finalFilePath = finalFile.toPath();
                                    Files.copy(tempFilePath, finalFilePath, StandardCopyOption.REPLACE_EXISTING);
                                } catch (Exception e) {
                                    handleUncaughtException(context.getApplicationContext(), e, "exportReleasedMedia 0");
                                    e.printStackTrace();
                                } finally {
                                    finalFileNameLock.unlock();
                                }
                            }
                        } catch (Exception e) {
                            handleUncaughtException(context.getApplicationContext(), e, "exportReleasedMedia 1");
                            e.printStackTrace();
                        } finally {
                            try {
                                if (objectOut != null) {
                                    objectOut.close();
                                }
                                if (fileOut != null) {
                                    fileOut.close();
                                }
                                if (tempFile.exists()) {
                                    //noinspection ResultOfMethodCallIgnored
                                    tempFile.delete();
                                }
                            } catch (Exception ignored) {}
                            fileLock.unlock();
                        }
                    }
                }
            }
        }
    }

//    @RequiresApi(api = Build.VERSION_CODES.O)
//    public static void addIndexedDBFiles(File[] files) {
//        if (files!=null) {
//            for (File file : files) {
//                if (file.exists() && file.isFile() && file.length() > 0) {
//                    long lastModified = file.lastModified();
//                    if (lastModified > 0L) {
//                        Date modifiedDate = new Date(file.lastModified());
//                        String modifiedDateKey = dateFormat.format(modifiedDate);
//                        if (webGroupedModifiedDate.containsKey(modifiedDateKey)) {
//                            List<File> modifiedFiles = webGroupedModifiedDate.get(modifiedDateKey);
//                            if (modifiedFiles == null) {
//                                modifiedFiles = new ArrayList<>();
//                            }
//                            modifiedFiles.add(file);
//                            webGroupedModifiedDate.put(modifiedDateKey, modifiedFiles);
//                        } else {
//                            List<File> newModifiedFiles = new ArrayList<>();
//                            newModifiedFiles.add(file);
//                            webGroupedModifiedDate.put(modifiedDateKey, newModifiedFiles);
//                        }
//                    }
//                } else if (file.exists() && file.isDirectory()) {
//                    File[] newFiles = file.listFiles();
//                    addIndexedDBFiles(newFiles);
//                }
//            }
//        }
//    }

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
    public static Bitmap cropAndRoundCorners(Bitmap original, int cornerRadius) {
        // Crop the bitmap to a square
        int minDimension = Math.min(original.getWidth(), original.getHeight());
        int cropX = (original.getWidth() - minDimension) /  2;
        int cropY = (original.getHeight() - minDimension) /  2;
        Bitmap cropped = Bitmap.createBitmap(original, cropX, cropY, minDimension, minDimension);

        // Create a new bitmap for the rounded corners
        Bitmap rounded = Bitmap.createBitmap(minDimension, minDimension, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(rounded);

        // Draw the cropped bitmap with rounded corners
        Paint paint = new Paint();
        paint.setAntiAlias(true);
        paint.setShader(new BitmapShader(cropped, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP));
        RectF rectF = new RectF(0,  0, minDimension, minDimension);
        canvas.drawRoundRect(rectF, cornerRadius, cornerRadius, paint);

        // Recycle the original and cropped bitmaps to free up memory
        original.recycle();
        cropped.recycle();

        return rounded;
    }

    private static boolean isUIThread() {
        return Looper.getMainLooper().getThread() == Thread.currentThread();
    }

    @RequiresApi(api = Build.VERSION_CODES.R)
    public static void handleUncaughtException(Context context, Throwable e, String fileFrom) {
        if (!OWNER || !DEBUG) { return; }
        executeHandleUncaughtException(context, e, fileFrom);
    }

    @RequiresApi(api = Build.VERSION_CODES.R)
    public static void executeHandleUncaughtException(Context context, Throwable e, String fileFrom) {
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
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
                    final String filename = "error_log.txt";
                    File file = new File(directory, filename);
                    String threadType = isUIThread() ? "UI Thread" : "Non-UI Thread";
                    logErrorToFile(file, e, threadType, fileFrom);
                }
            }
        }
        e.printStackTrace();
    }

    @RequiresApi(api = Build.VERSION_CODES.R)
    private static void logErrorToFile(File logFile, Throwable e, String threadType, String fileFrom) {
        final SimpleDateFormat dateFormat = new SimpleDateFormat("EEEE, MMMM d, yyyy h:mm:ss a", Locale.US);
        StringBuilder newLogEntry = new StringBuilder();
        String timestamp = dateFormat.format(new Date());
        newLogEntry.append("_________________________________________\n\n");
        newLogEntry.append("Time: ").append(timestamp).append("\n");
        newLogEntry.append("File From: ").append(fileFrom).append("\n");
        newLogEntry.append("Thread: ").append(threadType).append("\n");
        newLogEntry.append("Exception: ").append(e.toString()).append("\n");
        if (e.getStackTrace().length > 0) {
            StackTraceElement firstElement = e.getStackTrace()[0];
            newLogEntry.append("At: ")
                    .append(firstElement.getClassName())
                    .append(".")
                    .append(firstElement.getMethodName())
                    .append("(")
                    .append(firstElement.getFileName())
                    .append(":")
                    .append(firstElement.getLineNumber())
                    .append(")\n");
        }
        for (StackTraceElement element : e.getStackTrace()) {
            newLogEntry.append("\tat ").append(element.toString()).append("\n");
        }

        ReentrantLock fileLock = getLockForFile(logFile);
        fileLock.lock();
        try {
            String existingContent = "";
            if (logFile.exists()) {
                existingContent = new String(Files.readAllBytes(logFile.toPath()), StandardCharsets.UTF_8);
            }
            try (BufferedWriter writer = new BufferedWriter(new FileWriter(logFile))) {
                writer.write(newLogEntry.toString());
                writer.write(existingContent);
            } catch (Exception e1) {
                e1.printStackTrace();
            }
        } catch (Exception e2) {
            e2.printStackTrace();
        } finally {
            fileLock.unlock();
        }
    }

//    private static List<FileData> fileList = new ArrayList<>();
//    @RequiresApi(api = Build.VERSION_CODES.O)
//    public static void readFiles(Context context) {
//        fileList = new ArrayList<>();
//
//        File file = context.getApplicationContext().getDataDir();
//        File[] files = file.listFiles();
//        addFiles(files, file.getPath());
//
//        // Sort the list by file size
//        Collections.sort(fileList, (f1, f2) -> Long.compare(f2.size, f1.size));
//
//        // Print each file path and size with appropriate units
//        for (FileData fileData : fileList) {
//            System.out.println("kanshi-kuro "+fileData.path + File.separator + fileData.name + " " + formatSize(fileData.size));
//        }
//    }
//
//    public static void addFiles(File[] files, String path) {
//        if (files != null) {
//            for (File file : files) {
//                if (file.isFile()) {
//                    // Add file path and size to the global list
//                    fileList.add(new FileData(path, file.getName(), file.length()));
//                } else if (file.isDirectory()) {
//                    File[] newFiles = file.listFiles();
//                    addFiles(newFiles, path + File.separator + file.getName());
//                }
//            }
//        }
//    }
//
//    // Helper class to store file data
//    static class FileData {
//        String path;
//        String name;
//        long size;
//
//        FileData(String path, String name, long size) {
//            this.path = path;
//            this.name = name;
//            this.size = size;
//        }
//    }
//
//    // Method to format the size in a readable format
//    private static String formatSize(long size) {
//        if (size >= 1024 * 1024 * 1024) {
//            return String.format("%.2f GB", (double) size / (1024 * 1024 * 1024));
//        } else if (size >= 1024 * 1024) {
//            return String.format("%.2f MB", (double) size / (1024 * 1024));
//        } else if (size >= 1024) {
//            return String.format("%.2f KB", (double) size / 1024);
//        } else {
//            return size + " bytes";
//        }
//    }
}