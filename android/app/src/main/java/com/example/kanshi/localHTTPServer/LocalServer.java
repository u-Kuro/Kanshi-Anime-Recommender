package com.example.kanshi.localHTTPServer;

import static com.example.kanshi.LocalPersistence.getLockForFileName;

import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

import com.example.kanshi.LocalPersistence;
import com.example.kanshi.MainActivity;
import com.example.kanshi.MainService;
import com.example.kanshi.MediaNotification;
import com.example.kanshi.MediaNotificationManager;
import com.example.kanshi.ReleasedTabFragment;
import com.example.kanshi.SchedulesTabFragment;
import com.example.kanshi.Utils;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

import fi.iki.elonen.NanoHTTPD;

public class LocalServer extends NanoHTTPD {
    private final Logger logger = Logger.getLogger(LocalServer.class.getName());
    private final ExecutorService executorService = Executors.newSingleThreadExecutor();
    private final Handler UIHandler = new Handler(Looper.getMainLooper());
    @NonNull private final LocalServerListener localServerListener;
    private final boolean isMain;
    public LocalServer(
        @NonNull LocalServerListener localServerListener,
        boolean isMain
    ) {
        super(0);
        this.isMain = isMain;
        this.localServerListener = localServerListener;
    }
    // METHODS TO START AND GET LOCAL SERVER URL
    public final String LOCAL_SERVER_URL_PROMISE = "LOCAL_SERVER_URL_PROMISE";
    private final AtomicReference<String> localServerURL = new AtomicReference<>();
    public void getLocalServerURL() {
        executorService.submit(() -> {
            try {
                final String finalLocalServerURL = localServerURL.get();
                if (finalLocalServerURL != null && !finalLocalServerURL.isEmpty()) {
                    UIHandler.post(() -> localServerListener.onStart(finalLocalServerURL));
                    return;
                }
                start(Integer.MAX_VALUE, false);
                final int port = getListeningPort();
                if (port != -1) {
                    final String newLocalServerURL = "http://localhost:" + port;
                    localServerURL.set(newLocalServerURL);
                    UIHandler.post(() -> localServerListener.onStart(newLocalServerURL));
                    return;
                }
            } catch (Exception exception) {
                logException(getApplicationContext(), exception, "getLocalServerURL");
            }
            UIHandler.post(() -> localServerListener.onError(LOCAL_SERVER_URL_PROMISE));
        });
    }
    @RequiresApi(api = Build.VERSION_CODES.VANILLA_ICE_CREAM)
    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();

        // Handle OPTIONS requests first
        if ("OPTIONS".equalsIgnoreCase(session.getMethod().name())) {
            Response response = newFixedLengthResponse(Response.Status.NO_CONTENT, null, null);
            addCORSHeaders(response);
            return response;
        }

        try {
            return switch (uri) {
                case "/backup-user-data" -> backUpUserData(session);
                case "/schedule-media-notifications" -> scheduleMediaNotifications(session);
                case "/update-media-notifications" -> updateMediaNotifications(session);
                case "/get-current-media-notification-ids" -> getCurrentMediaNotificationIds();
                default ->
                        newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not Found");
            };
        } catch (Exception e) {
            logException(getApplicationContext(), e, "serve ("+uri+"): "+getBodyText(session.getInputStream()));
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Internal Server Error: " + e.getMessage());
        }
    }
    private void addCORSHeaders(Response response) {
        response.addHeader("Access-Control-Allow-Origin", "https://appassets.androidplatform.net");
        response.addHeader("Access-Control-Allow-Methods", "*");
        response.addHeader("Access-Control-Allow-Headers", "*");
        response.addHeader("Cache-Control", "no-store");
    }
    // METHODS FOR BACK UP
    public final AtomicReference<File> atomicBackupDirectory = new AtomicReference<>();
    public void setBackupDirectory(File backupDirectory) { this.atomicBackupDirectory.set(backupDirectory); }
    @RequiresApi(api = Build.VERSION_CODES.TIRAMISU)
    private Response backUpUserData(IHTTPSession session) {
        try {
            if (session.getInputStream().available() == 0) {
                return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Input Stream is Empty");
            }

            File backupDirectory = atomicBackupDirectory.get();
            if (backupDirectory == null || !backupDirectory.isDirectory()) {
                return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Backup Folder Not Found");
            }

            String filename = session.getHeaders().get("filename");
            if (filename == null || filename.isEmpty()) {
                return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Filename Header Not Found");
            }

            Response response = newFixedLengthResponse(Response.Status.NO_CONTENT, null, null);
            addCORSHeaders(response);

            Path tempOutputFile = backupDirectory.toPath().resolve(isMain ? ".tmp" : "bg.tmp");
            Path outputFile = backupDirectory.toPath().resolve(filename);

            // Use filename-based locking for consistency
            ReentrantLock backupFileLock = getLockForFileName(filename);
            backupFileLock.lock();

            try {
                // Download and process the backup file
                downloadAndProcessBackup(session, tempOutputFile);
                // Atomically replace the final file
                atomicReplaceBackupFile(tempOutputFile, outputFile);
                // Return a successful response
                return response;
            } finally {
                // Clean up temp file
                safeDeleteFile(tempOutputFile);
                backupFileLock.unlock();
            }
        } catch (Exception e) {
            logException(getApplicationContext(), e, "backUpUserData: "+getBodyText(session.getInputStream()));
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Error: " + e.getMessage());
        }
    }
    @RequiresApi(api = Build.VERSION_CODES.O)
    private void downloadAndProcessBackup(IHTTPSession session, Path tempOutputFile) throws IOException {
        // Ensure parent directory exists
        Path parentDir = tempOutputFile.getParent();
        if (parentDir != null) {
            Files.createDirectories(parentDir);
        }
        // Delete existing temp file if it exists
        Files.deleteIfExists(tempOutputFile);
        // Download and decompress the backup file
        GZIPInputStream gzipInput = new GZIPInputStream(new BufferedInputStream(session.getInputStream()));
        try (
            OutputStream fileOutput = Files.newOutputStream(
                tempOutputFile,
                StandardOpenOption.CREATE,
                StandardOpenOption.WRITE,
                StandardOpenOption.TRUNCATE_EXISTING
            );
            BufferedOutputStream bufferedOutput = new BufferedOutputStream(fileOutput);
            GZIPOutputStream gzipOutput = new GZIPOutputStream(bufferedOutput)
        ) {
            // Copy data with proper buffer management
            copyWithBuffer(gzipInput, gzipOutput);
            // Ensure all data is written and synced
            gzipOutput.finish();
            gzipOutput.flush();
            bufferedOutput.flush();
            // Force sync to disk for critical backup data
            if (fileOutput instanceof FileOutputStream) {
                ((FileOutputStream) fileOutput).getFD().sync();
            }
        }
        // Verify the temp file was created successfully
        if (!Files.exists(tempOutputFile) || Files.size(tempOutputFile) == 0) {
            throw new IOException("Failed to download backup file - temp file is empty or missing");
        }
    }
    private void copyWithBuffer(InputStream input, OutputStream output) throws IOException {
        byte[] buffer = new byte[8192];
        int bytesRead;
        while ((bytesRead = input.read(buffer)) != -1) {
            output.write(buffer, 0, bytesRead);
        }
    }
    @RequiresApi(api = Build.VERSION_CODES.O)
    private void atomicReplaceBackupFile(Path tempFile, Path finalFile) throws IOException {
        Files.move(
            tempFile, finalFile,
            StandardCopyOption.REPLACE_EXISTING,
            StandardCopyOption.ATOMIC_MOVE
        );
    }
    @RequiresApi(api = Build.VERSION_CODES.O)
    private void safeDeleteFile(Path file) {
        if (file != null) {
            try {
                Files.deleteIfExists(file);
            } catch (Exception e) {
                logger.log(Level.WARNING, "Failed to delete temporary backup file: " + file, e);
            }
        }
    }
    @RequiresApi(api = Build.VERSION_CODES.TIRAMISU)
    private Response scheduleMediaNotifications(IHTTPSession session) {
        Context context;
        try {
            if ((context = getApplicationContext()) == null) {
                return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Application Context Not Found");
            }

            if (session.getInputStream().available() == 0) {
                return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Input Stream is Empty");
            }

            Response response = newFixedLengthResponse(Response.Status.NO_CONTENT, null, null);
            addCORSHeaders(response);

            JSONArray jsonArray = getJsonArray(session);

            MainService mainService = isMain ? null : MainService.getInstanceActivity();
            for (int i = 0; i < jsonArray.length(); i++) {
                if (mainService != null) { mainService.isAddingMediaReleaseNotification = true; }
                JSONObject jsonObject = jsonArray.getJSONObject(i);
                MediaNotificationManager.scheduleMediaNotification(
                    context,
                    jsonObject.getLong("id"),
                    jsonObject.getString("title"),
                    jsonObject.getLong("releaseEpisode"),
                    jsonObject.getLong("maxEpisode"),
                    jsonObject.getLong("releaseDateMillis"),
                    jsonObject.getString("imageUrl"),
                    jsonObject.getString("mediaUrl"),
                    jsonObject.getString("userStatus"),
                    jsonObject.getLong("episodeProgress")
                );
            }
            return response;
        } catch (Exception e) {
            logException(getApplicationContext(), e, "scheduleMediaNotifications: "+getBodyText(session.getInputStream()));
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Error: " + e.getMessage());
        }
    }
    @RequiresApi(api = Build.VERSION_CODES.VANILLA_ICE_CREAM)
    private Response updateMediaNotifications(IHTTPSession session) {
        Context context;
        try {
            if ((context = getApplicationContext()) == null) {
                return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Application Context Not Found");
            }

            if (session.getInputStream().available() == 0) {
                return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Input Stream is Empty");
            }

            Response response = newFixedLengthResponse(Response.Status.NO_CONTENT, null, null);
            addCORSHeaders(response);

            // Get Media Notification Entries
            if (MediaNotificationManager.allMediaNotification.isEmpty()) {
                @SuppressWarnings("unchecked")
                ConcurrentHashMap<String, MediaNotification> $allMediaNotification = (ConcurrentHashMap<String, MediaNotification>) LocalPersistence.readObjectFromFile(context, "allMediaNotification");
                if ($allMediaNotification != null && !$allMediaNotification.isEmpty()) {
                    MediaNotificationManager.allMediaNotification.putAll($allMediaNotification);
                } else {
                    return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Media Notification Entries Not Found");
                }
            }

            JSONArray jsonArray = getJsonArray(session);
            ConcurrentHashMap<String, MediaNotification> updatedMediaNotifications = new ConcurrentHashMap<>();
            List<MediaNotification> allMediaNotificationValues = new ArrayList<>(MediaNotificationManager.allMediaNotification.values());

            for (int i = 0; i < jsonArray.length(); i++) {
                JSONObject jsonObject = jsonArray.getJSONObject(i);
                long mediaId = jsonObject.getLong("id");

                for (MediaNotification media : allMediaNotificationValues) {
                    if (media.mediaId == mediaId) {
                        MediaNotification newMedia = new MediaNotification(
                            media.mediaId,
                            jsonObject.getString("title"),
                            media.releaseEpisode,
                            jsonObject.getLong("maxEpisode"),
                            media.releaseDateMillis,
                            media.imageByte,
                            jsonObject.getString("mediaUrl"),
                            jsonObject.getString("userStatus"),
                            jsonObject.getLong("episodeProgress")
                        );
                        updatedMediaNotifications.put(media.mediaId + "-" + media.releaseEpisode, newMedia);
                    }
                }
            }

            MediaNotificationManager.allMediaNotification.putAll(updatedMediaNotifications);
            MediaNotificationManager.writeMediaNotificationInFile(context, true);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
                if (schedulesTabFragment != null) {
                    UIHandler.post(() -> schedulesTabFragment.updateScheduledMedia(false, false));
                }
                ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();
                if (releasedTabFragment != null) {
                    UIHandler.post(() -> releasedTabFragment.updateReleasedMedia(false, false));
                }
            }

            return response;
        } catch (Exception e) {
            logException(getApplicationContext(), e, "updateMediaNotifications: "+getBodyText(session.getInputStream()));
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Error: " + e.getMessage());
        }
    }
    @RequiresApi(api = Build.VERSION_CODES.O)
    private Response getCurrentMediaNotificationIds() {
        Context context;
        try {
            if ((context = getApplicationContext()) == null) {
                return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Application Context Not Found");
            }

            // Get Media Notification Entries
            if (MediaNotificationManager.allMediaNotification.isEmpty()) {
                @SuppressWarnings("unchecked")
                ConcurrentHashMap<String, MediaNotification> $allMediaNotification = (ConcurrentHashMap<String, MediaNotification>) LocalPersistence.readObjectFromFile(context, "allMediaNotification");
                if ($allMediaNotification != null && !$allMediaNotification.isEmpty()) {
                    MediaNotificationManager.allMediaNotification.putAll($allMediaNotification);
                } else {
                    return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Media Notification Entries Not Found");
                }
            }

            Set<String> mediaIdsToBeUpdated = new HashSet<>();
            List<MediaNotification> allMediaNotificationValues = new ArrayList<>(MediaNotificationManager.allMediaNotification.values());
            for (MediaNotification media : allMediaNotificationValues) {
                mediaIdsToBeUpdated.add(String.valueOf(media.mediaId));
            }
            String joinedMediaIds = "[" + String.join(",", mediaIdsToBeUpdated) + "]";

            try (
                ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
                BufferedOutputStream bufferedOutputStream = new BufferedOutputStream(byteArrayOutputStream);
                GZIPOutputStream gzipOutputStream = new GZIPOutputStream(bufferedOutputStream)
            ) {
                gzipOutputStream.write(joinedMediaIds.getBytes(StandardCharsets.UTF_8));
                gzipOutputStream.finish();
                bufferedOutputStream.flush();

                Response response = newChunkedResponse(
                    Response.Status.OK,
                    "application/octet-stream",
                    new BufferedInputStream(new ByteArrayInputStream(byteArrayOutputStream.toByteArray()))
                );
                addCORSHeaders(response);
                response.setChunkedTransfer(true);
                return response;
            }
        } catch (Exception e) {
            logException(getApplicationContext(), e, "getCurrentMediaNotificationIds");
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Error: " + e.getMessage());
        }
    }
    @RequiresApi(api = Build.VERSION_CODES.TIRAMISU)
    @NonNull
    private static JSONArray getJsonArray(IHTTPSession session) throws Exception {
        String jsonData;
        GZIPInputStream gzipInputStream = new GZIPInputStream(new BufferedInputStream(session.getInputStream()));
        try (ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = gzipInputStream.read(buffer)) != -1) {
                byteArrayOutputStream.write(buffer, 0, bytesRead);
            }
            byteArrayOutputStream.flush();
            jsonData = byteArrayOutputStream.toString(StandardCharsets.UTF_8);
        }

        return new JSONArray(jsonData);
    }
    private Context getApplicationContext() {
        Context context = null;
        try {
            if (isMain) {
                MainActivity mainActivity = MainActivity.getInstanceActivity();
                if (mainActivity != null) context = mainActivity.getApplicationContext();
            } else {
                MainService mainService = MainService.getInstanceActivity();
                if (mainService != null) context = mainService.getApplicationContext();
            }
        } catch (Exception ignored) {}
        return context;
    }
    private void logException(Context context, @NonNull Exception e, @NonNull String fileFrom) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && context != null) {
            Utils.handleUncaughtException(context.getApplicationContext(), e, fileFrom);
        }
        logger.log(Level.SEVERE, e.getMessage(), e);
    }
    @RequiresApi(api = Build.VERSION_CODES.TIRAMISU)
    private String getBodyText(InputStream inputStream) {
        try {
            if (inputStream == null) return "InputStream is Null";
            if (inputStream.available() == 0) return "InputStream is Not Available";
            ByteArrayOutputStream result = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int length;
            while ((length = inputStream.read(buffer)) != -1) {
                result.write(buffer, 0, length);
            }
            return result.toString(StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return "Failed to Read Body As Text";
        }
    }
}