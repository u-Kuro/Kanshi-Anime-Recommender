package com.example.kanshi.LocalHTTPServer;

import static com.example.kanshi.LocalPersistence.getLockForFile;
import static com.example.kanshi.LocalPersistence.getLockForFileName;

import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.locks.ReentrantLock;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

import fi.iki.elonen.NanoHTTPD;

public class UpdateMediaNotificationLocalServer extends NanoHTTPD {
    private final ExecutorService executorService = Executors.newSingleThreadExecutor();
    private final Handler UIHandler = new Handler(Looper.getMainLooper());
    private final File outputDirectory;
    private final boolean isMain;
    @NonNull
    private final LocalServerListener localServerListener;
    public final String LOCAL_SERVER_URL_PROMISE = "localServerUrlPromise";
    /** @noinspection FieldCanBeLocal*/
    public final String EXPORT_PROMISE = "exportPromise";
    private ReentrantLock tempOutputFileLock;
    private ReentrantLock outputFileLock;

    public UpdateMediaNotificationLocalServer(
            File outputDirectory,
            boolean isMain,
            @NonNull LocalServerListener localServerListener
    ) {
        super(0);
        this.outputDirectory = outputDirectory;
        this.isMain = isMain;
        this.localServerListener = localServerListener;
    }
    public void startServer() {
        executorService.execute(() -> {
            try {
                start(SOCKET_READ_TIMEOUT, false);
                UIHandler.post(() -> localServerListener.onStart("http://localhost:"+getListeningPort()));
            } catch (IOException e) {
                UIHandler.post(() -> localServerListener.onError(LOCAL_SERVER_URL_PROMISE));
                stopServer();
            }
        });
    }
    final AtomicBoolean backUpServed = new AtomicBoolean(false);
    @RequiresApi(api = Build.VERSION_CODES.O)
    @Override
    public Response serve(IHTTPSession session) {
        if ("OPTIONS".equalsIgnoreCase(session.getMethod().name())) {
            Response response = newFixedLengthResponse(Response.Status.OK, "text/plain", "CORS is Enabled");
            response.addHeader("Access-Control-Allow-Origin", "https://appassets.androidplatform.net");
            response.addHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            response.addHeader("Access-Control-Allow-Headers", "Content-Type, Content-Encoding, Content-Length, filename");
            return response;
        }
        if (backUpServed.get()) return null;
        backUpServed.set(true);

        String filename = session.getHeaders().get("filename");
        if (filename == null || filename.isEmpty()) {
            UIHandler.post(() -> localServerListener.onError(EXPORT_PROMISE));
            return null;
        }

        File tempOutputFile = new File(outputDirectory, isMain ? ".tmp" : "bg.tmp");
        if (tempOutputFile.exists() && tempOutputFile.isFile()) {
            //noinspection ResultOfMethodCallIgnored
            tempOutputFile.delete();
        }
        tempOutputFileLock = getLockForFile(tempOutputFile);
        tempOutputFileLock.lock();
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
            File outputFile = new File(outputDirectory, filename);
            outputFileLock = getLockForFileName(outputFile.getName());
            outputFileLock.lock();
            try {
                //noinspection ResultOfMethodCallIgnored
                outputFile.createNewFile();
                Path tempPath = tempOutputFile.toPath();
                Path backupPath = outputFile.toPath();
                Files.copy(tempPath, backupPath, StandardCopyOption.REPLACE_EXISTING);
                UIHandler.post(localServerListener::onFinish);
                if (tempOutputFile.exists() && tempOutputFile.isFile()) {
                    //noinspection ResultOfMethodCallIgnored
                    tempOutputFile.delete();
                }
                stopServer();
            } finally {
                if (
                        outputFileLock != null
                                && outputFileLock.isHeldByCurrentThread()
                                && outputFileLock.isLocked()
                ) {
                    outputFileLock.unlock();
                }
            }
        } catch (Exception e) {
            UIHandler.post(() -> localServerListener.onError(EXPORT_PROMISE));
        } finally {
            if (
                    tempOutputFileLock != null
                            && tempOutputFileLock.isHeldByCurrentThread()
                            && tempOutputFileLock.isLocked()
            ) {
                tempOutputFileLock.unlock();
            }
        }
        executorService.shutdownNow();
        return null;
    }
    public void stopServer() {
        try {
            stop();
            executorService.shutdownNow();
            if (
                    tempOutputFileLock != null
                            && tempOutputFileLock.isHeldByCurrentThread()
                            && tempOutputFileLock.isLocked()
            ) {
                tempOutputFileLock.unlock();
            }
            if (
                    outputFileLock != null
                            && outputFileLock.isHeldByCurrentThread()
                            && outputFileLock.isLocked()
            ) {
                outputFileLock.unlock();
            }
        } catch (Exception ignored) {}
    }
}