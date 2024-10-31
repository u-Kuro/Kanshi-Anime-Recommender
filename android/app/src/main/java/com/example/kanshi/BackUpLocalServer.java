package com.example.kanshi;

import static com.example.kanshi.LocalPersistence.getLockForFile;
import static com.example.kanshi.LocalPersistence.getLockForFileName;

import android.os.Build;

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

public class BackUpLocalServer extends NanoHTTPD {
    private final ExecutorService executorService = Executors.newSingleThreadExecutor();
    private final File outputDirectory;
    private final boolean isMain;
    public interface OnStartListener { void onStart(String port); }
    public interface OnFinishListener { void onFinish(); }
    public interface OnErrorListener { void onError(String promise); }
    private final OnStartListener onStartListener;
    private final OnFinishListener onFinishListener;
    private final OnErrorListener onErrorListener;
    private final String LOCAL_SERVER_URL_PROMISE = "localServerUrlPromise";
    /** @noinspection FieldCanBeLocal*/
    private final String EXPORT_PROMISE = "exportPromise";
    private ReentrantLock tempOutputFileLock;
    private ReentrantLock outputFileLock;

    public BackUpLocalServer(
        File outputDirectory,
        boolean isMain,
        OnStartListener onStartListener,
        OnFinishListener onFinishListener,
        OnErrorListener onErrorListener
    ) {
        super(0);
        this.outputDirectory = outputDirectory;
        this.isMain = isMain;
        this.onStartListener = onStartListener;
        this.onFinishListener = onFinishListener;
        this.onErrorListener = onErrorListener;
    }
    public void startServer() {
        executorService.execute(() -> {
            try {
                start(SOCKET_READ_TIMEOUT, false);
                if (onStartListener != null) onStartListener.onStart("http://localhost:"+getListeningPort());
            } catch (IOException e) {
                if (onErrorListener != null) {
                    onErrorListener.onError(LOCAL_SERVER_URL_PROMISE);
                    stopServer();
                }
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
            onErrorListener.onError(EXPORT_PROMISE);
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
                if (onFinishListener != null) onFinishListener.onFinish();
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
            if (onErrorListener != null) onErrorListener.onError(EXPORT_PROMISE);
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
