package com.example.kanshi;

import android.content.Context;
import android.os.Build;

import androidx.annotation.RequiresApi;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.ObjectOutputStream;
import java.io.ObjectInputStream;
import java.nio.channels.ClosedByInterruptException;
import java.nio.file.Path;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.logging.Level;
import java.util.logging.Logger;

@RequiresApi(api = Build.VERSION_CODES.O)
public class LocalPersistence {
    private static final Logger logger = Logger.getLogger(LocalPersistence.class.getName());
    private static final ConcurrentHashMap<String, ReentrantLock> fileLockMap = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<String, ReentrantLock> fileNameLockMap = new ConcurrentHashMap<>();
    public static ReentrantLock getLockForFile(File file) {
        return fileLockMap.computeIfAbsent(file.toPath().toAbsolutePath().normalize().toString(), k -> new ReentrantLock());
    }
    public static ReentrantLock getLockForFileName(String fileName) {
        return fileNameLockMap.computeIfAbsent(fileName, k -> new ReentrantLock());
    }
    public static void writeObjectToFile(Context context, Object object, String filename) {
        String tempFileName = filename + ".tmp";
        File tempFile = new File(context.getFilesDir(), tempFileName);
        File finalFile = new File(context.getFilesDir(), filename);

        // Use filename-based locking to prevent concurrent operations on the same logical file
        ReentrantLock fileNameLock = getLockForFileName(filename);
        fileNameLock.lock();

        try {
            // Write to temporary file
            writeToTempFile(object, tempFile);
            // Atomically replace the final file
            atomicReplace(tempFile, finalFile);
        } catch (ClosedByInterruptException ignored) {
        } catch (Exception e) {
            handleException(context, e, "writeObjectToFile");
        } finally {
            // Clean up temp file if it still exists
            safeDelete(tempFile);
            fileNameLock.unlock();
        }
    }
    public static Object readObjectFromFile(Context context, String filename) {
        File mainFile = new File(context.getFilesDir(), filename);
        File tempFile = new File(context.getFilesDir(), filename + ".tmp");

        ReentrantLock fileNameLock = getLockForFileName(filename);
        fileNameLock.lock();

        try {
            // Try main file first
            Object result = readFromFile(context, mainFile);
            if (result != null) {
                return result;
            }
            // If main file failed or is empty, try temp file as fallback
            return readFromFile(context, tempFile);
        } finally {
            fileNameLock.unlock();
        }
    }

    private static void writeToTempFile(Object object, File tempFile) throws IOException {
        Path tempPath = tempFile.toPath();

        // Ensure parent directory exists
        Path parentDir = tempPath.getParent();
        if (parentDir != null) {
            Files.createDirectories(parentDir);
        }

        // Serialize object to byte array first
        byte[] serializedData;
        try (
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ObjectOutputStream objectOut = new ObjectOutputStream(baos)
        ) {
            objectOut.writeObject(object);
            objectOut.flush();
            serializedData = baos.toByteArray();
        }

        // Write to temp file atomically
        Files.write(
            tempPath, serializedData,
            StandardOpenOption.CREATE,
            StandardOpenOption.WRITE,
            StandardOpenOption.TRUNCATE_EXISTING,
            StandardOpenOption.SYNC
        ); // Force sync to disk

        // Verify the temp file was written successfully
        if (!Files.exists(tempPath) || Files.size(tempPath) == 0) {
            throw new IOException("Temporary file was not written correctly");
        }
    }
    private static void atomicReplace(File tempFile, File finalFile) throws Exception {
        Path tempPath = tempFile.toPath();
        Path finalPath = finalFile.toPath();

        Files.move(
            tempPath, finalPath,
            StandardCopyOption.REPLACE_EXISTING,
            StandardCopyOption.ATOMIC_MOVE
        );
    }
    private static Object readFromFile(Context context, File file) {
        Path filePath = file.toPath();

        if (!Files.exists(filePath) || !Files.isRegularFile(filePath)) {
            return null;
        }

        try {
            // Check if file is empty
            if (Files.size(filePath) == 0) {
                return null;
            }
            // Read all bytes and deserialize
            byte[] data = Files.readAllBytes(filePath);
            try (
                ByteArrayInputStream bais = new ByteArrayInputStream(data);
                ObjectInputStream objectIn = new ObjectInputStream(bais)
            ) {
                return objectIn.readObject();
            }
        } catch (Exception e) {
            handleException(context, e, "readObjectFromFile");
            return null;
        }
    }
    private static void safeDelete(File file) {
        if (file != null) {
            try {
                Files.deleteIfExists(file.toPath());
            } catch (Exception e) {
                logger.log(Level.WARNING, "Exception while deleting file: " + file.getAbsolutePath(), e);
            }
        }
    }
    private static void handleException(Context context, Exception e, String operation) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Utils.handleUncaughtException(context.getApplicationContext(), e, operation);
        } else {
            logger.log(Level.SEVERE, "Exception in " + operation + ": " + e.getMessage(), e);
        }
    }
}