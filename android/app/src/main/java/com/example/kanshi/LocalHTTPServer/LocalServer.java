package com.example.kanshi.LocalHTTPServer;

import static com.example.kanshi.LocalPersistence.getLockForFile;
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

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

import fi.iki.elonen.NanoHTTPD;

public class LocalServer extends NanoHTTPD {
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
                }
                start(SOCKET_READ_TIMEOUT, false);
                final int port = getListeningPort();
                if (port != -1) {
                    final String newLocalServerURL = "http://localhost:" + port;
                    localServerURL.set(newLocalServerURL);
                    UIHandler.post(() -> localServerListener.onStart(newLocalServerURL));
                    return;
                }
            } catch (Exception ignored) {}
            UIHandler.post(() -> localServerListener.onError(LOCAL_SERVER_URL_PROMISE));
        });
    }
    @RequiresApi(api = Build.VERSION_CODES.O)
    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri(); // Get the requested URI
        switch (uri) {
            case "/backup-user-data": return backUpUserData(session);
            case "/schedule-media-notifications": return scheduleMediaNotifications(session);
            case "/update-media-notifications": return updateMediaNotifications(session);
            case "/get-current-media-notification-ids": return getCurrentMediaNotificationIds(session);
        }
        return null;
    }
    // METHODS FOR BACK UP
    public final String BACKUP_PROMISE = "BACKUP_PROMISE";
    public File backupDirectory;
    public void setBackupDirectory(File backupDirectory) { this.backupDirectory = backupDirectory; }
    private ReentrantLock tempBackupFileLock;
    private ReentrantLock backupFileLock;
    final AtomicBoolean backUpUserDataServed = new AtomicBoolean(false);
    @RequiresApi(api = Build.VERSION_CODES.O)
    private Response backUpUserData(IHTTPSession session) {
        try {
            Response response = newFixedLengthResponse(null);
            response.addHeader("Access-Control-Allow-Origin", "https://appassets.androidplatform.net");
            response.addHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            response.addHeader("Access-Control-Allow-Headers", "Content-Type, Content-Encoding, filename");

            if ("OPTIONS".equalsIgnoreCase(session.getMethod().name())) {
                return response;
            }

            // Only Allow 1 Request to Process
            if (backUpUserDataServed.get()) return null;
            backUpUserDataServed.set(true);

            // Check Backup Directory
            if (backupDirectory == null || !backupDirectory.isDirectory()) {
                throw new Exception("Backup Folder was Not Found");
            }

            // Check Backup Filename
            String filename = session.getHeaders().get("filename");
            if (filename == null || filename.isEmpty()) {
                throw new Exception("Filename Header was Not Found");
            }

            File tempOutputFile = new File(backupDirectory, isMain ? ".tmp" : "bg.tmp");
            if (tempOutputFile.exists() && tempOutputFile.isFile()) {
                //noinspection ResultOfMethodCallIgnored
                tempOutputFile.delete();
            }
            tempBackupFileLock = getLockForFile(tempOutputFile);
            tempBackupFileLock.lock();
            try (
                GZIPInputStream gzipInputStream = new GZIPInputStream(new BufferedInputStream(session.getInputStream()));
                GZIPOutputStream gzipOutputStream = new GZIPOutputStream(new BufferedOutputStream(new FileOutputStream(tempOutputFile, true)))
            ) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = gzipInputStream.read(buffer)) != -1) {
                    gzipOutputStream.write(buffer, 0, bytesRead);
                }
                gzipOutputStream.flush();
                gzipOutputStream.finish();
                gzipInputStream.close();
                gzipOutputStream.close();
                File outputFile = new File(backupDirectory, filename);
                backupFileLock = getLockForFileName(outputFile.getName());
                backupFileLock.lock();
                //noinspection ResultOfMethodCallIgnored
                outputFile.createNewFile();
                Path tempPath = tempOutputFile.toPath();
                Path backupPath = outputFile.toPath();
                Files.copy(tempPath, backupPath, StandardCopyOption.REPLACE_EXISTING);
                if (tempOutputFile.exists() && tempOutputFile.isFile()) {
                    //noinspection ResultOfMethodCallIgnored
                    tempOutputFile.delete();
                }
                return response;
            }
        } catch (Exception exception) {
            System.out.println("KANSHII backup "+exception);
            UIHandler.post(() -> localServerListener.onError(BACKUP_PROMISE));
        } finally {
            try {
                if (
                    backupFileLock != null
                    && backupFileLock.isHeldByCurrentThread()
                    && backupFileLock.isLocked()
                ) {
                    backupFileLock.unlock();
                }
                if (
                    tempBackupFileLock != null
                    && tempBackupFileLock.isHeldByCurrentThread()
                    && tempBackupFileLock.isLocked()
                ) {
                    tempBackupFileLock.unlock();
                }
            } catch (Exception ignored) {}
            backUpUserDataServed.set(false);
        }
        return null;
    }
    // METHODS FOR SCHEDULING MEDIA NOTIFICATIONS
    public final String SCHEDULE_MEDIA_NOTIFICATION_PROMISE = "SCHEDULE_MEDIA_NOTIFICATION_PROMISE";
    final AtomicBoolean scheduleMediaNotificationsServed = new AtomicBoolean(false);
    @RequiresApi(api = Build.VERSION_CODES.O)
    private Response scheduleMediaNotifications(IHTTPSession session) {
        try {
            Response response = newFixedLengthResponse(null);
            response.addHeader("Access-Control-Allow-Origin", "https://appassets.androidplatform.net");
            response.addHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            response.addHeader("Access-Control-Allow-Headers", "Content-Type, Content-Encoding");

            if ("OPTIONS".equalsIgnoreCase(session.getMethod().name())) {
                return response;
            }

            // Only Allow 1 Request to Process
            if (scheduleMediaNotificationsServed.get()) return null;
            scheduleMediaNotificationsServed.set(true);

            // Get Context of Active Application
            Context context = null;
            if (isMain) {
                MainActivity mainActivity = MainActivity.getInstanceActivity();
                if (mainActivity != null) context = mainActivity.getApplicationContext();
            } else {
                MainService mainService = MainService.getInstanceActivity();
                if (mainService != null) context = mainService.getApplicationContext();
            }
            if (context == null) throw new Exception("Application Context was Not Found");

            try (
                GZIPInputStream gzipInputStream = new GZIPInputStream(new BufferedInputStream(session.getInputStream()));
                ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream()
            ) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = gzipInputStream.read(buffer)) != -1) {
                    byteArrayOutputStream.write(buffer, 0, bytesRead);
                }
                byteArrayOutputStream.flush();

                final JSONArray jsonArray = new JSONArray(byteArrayOutputStream.toString("UTF-8"));

                gzipInputStream.close();
                byteArrayOutputStream.close();

                for (int i = 0; i < jsonArray.length(); i++) {
                    JSONObject jsonObject = jsonArray.getJSONObject(i);
                    MediaNotificationManager.scheduleMediaNotification(
                        context,
                        jsonObject.getLong("id"),
                        jsonObject.getString("title"),
                        jsonObject.getLong("releaseEpisode"),
                        jsonObject.getLong("maxEpisode"),
                        jsonObject.getLong("releaseDateMillis"),
                        jsonObject.getString("imageURL"),
                        jsonObject.getString("mediaUrl"),
                        jsonObject.getString("userStatus"),
                        jsonObject.getLong("episodeProgress")
                    );
                }
                return response;
            }
        } catch (Exception exception) {
            System.out.println("KANSHII scheduleNotif "+exception);
            UIHandler.post(() -> localServerListener.onError(SCHEDULE_MEDIA_NOTIFICATION_PROMISE));
        } finally {
            scheduleMediaNotificationsServed.set(false);
        }
        return null;
    }
    // METHODS FOR UPDATING MEDIA NOTIFICATIONS
    public final String UPDATE_MEDIA_NOTIFICATION_PROMISE = "UPDATE_MEDIA_NOTIFICATION_PROMISE";
    final AtomicBoolean updateMediaNotificationsServed = new AtomicBoolean(false);
    @RequiresApi(api = Build.VERSION_CODES.O)
    private Response updateMediaNotifications(IHTTPSession session) {
        try {
            Response response = newFixedLengthResponse(null);
            response.addHeader("Access-Control-Allow-Origin", "https://appassets.androidplatform.net");
            response.addHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            response.addHeader("Access-Control-Allow-Headers", "Content-Type, Content-Encoding");

            if ("OPTIONS".equalsIgnoreCase(session.getMethod().name())) {
                return response;
            }

            // Only Allow 1 Request to Process
            if (updateMediaNotificationsServed.get()) return null;
            updateMediaNotificationsServed.set(true);

            // Get Context of Active Application
            Context context = null;
            if (isMain) {
                MainActivity mainActivity = MainActivity.getInstanceActivity();
                if (mainActivity != null) context = mainActivity.getApplicationContext();
            } else {
                MainService mainService = MainService.getInstanceActivity();
                if (mainService != null) context = mainService.getApplicationContext();
            }
            if (context == null) throw new Exception("Application Context was Not Found");

            // Get Media Notification Entries
            if (MediaNotificationManager.allMediaNotification.isEmpty()) {
                @SuppressWarnings("unchecked") ConcurrentHashMap<String, MediaNotification> $allMediaNotification = (ConcurrentHashMap<String, MediaNotification>) LocalPersistence.readObjectFromFile(context, "allMediaNotification");
                if ($allMediaNotification != null && !$allMediaNotification.isEmpty()) {
                    MediaNotificationManager.allMediaNotification.putAll($allMediaNotification);
                }
                if (MediaNotificationManager.allMediaNotification.isEmpty()) {
                    throw new Exception("Media Notification Entries Not Found");
                }
            }
            ConcurrentHashMap<String, MediaNotification> updatedMediaNotifications = new ConcurrentHashMap<>();
            List<MediaNotification> allMediaNotificationValues = new ArrayList<>(MediaNotificationManager.allMediaNotification.values());

            try (
                GZIPInputStream gzipInputStream = new GZIPInputStream(new BufferedInputStream(session.getInputStream()));
                ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream()
            ) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = gzipInputStream.read(buffer)) != -1) {
                    byteArrayOutputStream.write(buffer, 0, bytesRead);
                }
                byteArrayOutputStream.flush();

                final JSONArray jsonArray = new JSONArray(byteArrayOutputStream.toString("UTF-8"));

                gzipInputStream.close();
                byteArrayOutputStream.close();

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
                            updatedMediaNotifications.put(media.mediaId +"-"+media.releaseEpisode, newMedia);
                        }
                    }

                    MediaNotificationManager.allMediaNotification.putAll(updatedMediaNotifications);
                    MediaNotificationManager.writeMediaNotificationInFile(context, true);

                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                        SchedulesTabFragment schedulesTabFragment = SchedulesTabFragment.getInstanceActivity();
                        if (schedulesTabFragment != null) {
                            new Handler(Looper.getMainLooper()).post(() -> schedulesTabFragment.updateScheduledMedia(false, false));
                        }
                        ReleasedTabFragment releasedTabFragment = ReleasedTabFragment.getInstanceActivity();
                        if (releasedTabFragment != null) {
                            new Handler(Looper.getMainLooper()).post(() -> releasedTabFragment.updateReleasedMedia(false, false));
                        }
                    }
                }
                return response;
            }
        } catch (Exception exception) {
            System.out.println("KANSHII updateNotif "+exception);
            UIHandler.post(() -> localServerListener.onError(UPDATE_MEDIA_NOTIFICATION_PROMISE));
        } finally {
            updateMediaNotificationsServed.set(false);
        }
        return null;
    }
    // METHODS FOR GETTING CURRENT MEDIA NOTIFICATION IDS
    public final String GET_CURRENT_MEDIA_NOTIFICATION_IDS_PROMISE = "UPDATE_MEDIA_NOTIFICATION_PROMISE";
    final AtomicBoolean getCurrentMediaNotificationIdsServed = new AtomicBoolean(false);
    @RequiresApi(api = Build.VERSION_CODES.O)
    public Response getCurrentMediaNotificationIds(IHTTPSession session) {
        try {
            Response response = newFixedLengthResponse(null);
            response.addHeader("Access-Control-Allow-Origin", "https://appassets.androidplatform.net");
            response.addHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

            if ("OPTIONS".equalsIgnoreCase(session.getMethod().name())) {
                return response;
            }

            // Only Allow 1 Request to Process
            if (getCurrentMediaNotificationIdsServed.get()) return null;
            getCurrentMediaNotificationIdsServed.set(true);

            // Get Context of Active Application
            Context context = null;
            if (isMain) {
                MainActivity mainActivity = MainActivity.getInstanceActivity();
                if (mainActivity != null) context = mainActivity.getApplicationContext();
            } else {
                MainService mainService = MainService.getInstanceActivity();
                if (mainService != null) context = mainService.getApplicationContext();
            }
            if (context == null) throw new Exception("Application Context was Not Found");

            // Get Media Notification Entries
            if (MediaNotificationManager.allMediaNotification.isEmpty()) {
                @SuppressWarnings("unchecked") ConcurrentHashMap<String, MediaNotification> $allMediaNotification = (ConcurrentHashMap<String, MediaNotification>) LocalPersistence.readObjectFromFile(context, "allMediaNotification");
                if ($allMediaNotification != null && !$allMediaNotification.isEmpty()) {
                    MediaNotificationManager.allMediaNotification.putAll($allMediaNotification);
                } else {
                    throw new Exception("Media Notification Entries Not Found");
                }
            }

            Set<String> mediaIdsToBeUpdated = new HashSet<>();
            List<MediaNotification> allMediaNotificationValues = new ArrayList<>(MediaNotificationManager.allMediaNotification.values());
            for (MediaNotification media : allMediaNotificationValues) {
                mediaIdsToBeUpdated.add(String.valueOf(media.mediaId));
            }
            String joinedMediaIds = String.join(",", mediaIdsToBeUpdated);

            try (
                PipedInputStream pipedInputStream = new PipedInputStream(8192);
                PipedOutputStream pipedOutputStream = new PipedOutputStream(pipedInputStream);
                GZIPOutputStream gzipOutputStream = new GZIPOutputStream(pipedOutputStream)
            ) {
                gzipOutputStream.write(joinedMediaIds.getBytes(StandardCharsets.UTF_8));
                gzipOutputStream.flush();
                gzipOutputStream.finish();
                return newChunkedResponse(Response.Status.OK, "application/octet-stream", pipedInputStream);
            }
        } catch (Exception exception) {
            System.out.println("KANSHII getMediaNotifIds "+exception);
            UIHandler.post(() -> localServerListener.onError(GET_CURRENT_MEDIA_NOTIFICATION_IDS_PROMISE));
        } finally {
            getCurrentMediaNotificationIdsServed.set(false);
        }
        return null;
    }
}