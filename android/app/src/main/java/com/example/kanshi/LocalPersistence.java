package com.example.kanshi;

import android.content.Context;
import android.os.Build;

import androidx.annotation.RequiresApi;

import java.io.File;
import java.io.FileOutputStream;
import java.io.ObjectOutputStream;
import java.io.FileInputStream;
import java.io.ObjectInputStream;
import java.nio.file.Path;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
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
        ReentrantLock fileLock = getLockForFile(tempFile);
        fileLock.lock();

        FileOutputStream fileOut = null;
        ObjectOutputStream objectOut = null;
        try {
            // Create the temporary file if it doesn't exist
            //noinspection ResultOfMethodCallIgnored
            tempFile.createNewFile();

            fileOut = new FileOutputStream(tempFile);
            objectOut = new ObjectOutputStream(fileOut);
            objectOut.writeObject(object);
            fileOut.getFD().sync();

            File finalFile = new File(context.getFilesDir(), filename);
            if (tempFile.exists() && tempFile.isFile() && tempFile.length() > 0) {
                ReentrantLock finalFileNameLock = getLockForFileName(finalFile.getName());
                finalFileNameLock.lock();
                try {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        //noinspection ResultOfMethodCallIgnored
                        finalFile.createNewFile();
                        Path finalFilePath = finalFile.toPath();
                        Path tempFilePath = tempFile.toPath();
                        Files.copy(tempFilePath, finalFilePath, StandardCopyOption.REPLACE_EXISTING);
                    } else {
                        //noinspection ResultOfMethodCallIgnored
                        tempFile.renameTo(finalFile);
                    }
                } catch (Exception e) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        Utils.handleUncaughtException(context.getApplicationContext(), e, "writeObjectToFile 0");
                    }
                    logger.log(Level.SEVERE, e.getMessage(), e);
                } finally {
                    finalFileNameLock.unlock();
                }
            }
        } catch (Exception e) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Utils.handleUncaughtException(context.getApplicationContext(), e, "writeObjectToFile 1");
            }
            logger.log(Level.SEVERE, e.getMessage(), e);
        } finally {
            try {
                if (objectOut != null) {
                    objectOut.close();
                }
                if (fileOut != null) {
                    fileOut.close();
                }
            } catch (Exception ignored) {}
            if (tempFile.exists()) {
                //noinspection ResultOfMethodCallIgnored
                tempFile.delete();
            }
            fileLock.unlock();
        }
    }

    public static Object readObjectFromFile(Context context, String filename) {
        File file = new File(context.getFilesDir(), filename);
        ReentrantLock fileLock = getLockForFile(file);
        fileLock.lock();

        FileInputStream fileIn = null;
        ObjectInputStream objectIn = null;
        Object object = null;

        try {
            if (file.exists() && file.isFile()) {
                fileIn = new FileInputStream(file);
                objectIn = new ObjectInputStream(fileIn);
                object = objectIn.readObject();
            }
        } catch (Exception e) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Utils.handleUncaughtException(context.getApplicationContext(), e, "readObjectFromFile");
            }
            logger.log(Level.SEVERE, e.getMessage(), e);
        } finally {
            try {
                if (objectIn != null) {
                    objectIn.close();
                }
                if (fileIn != null) {
                    fileIn.close();
                }
            } catch (Exception ignored) {}
            fileLock.unlock();
        }
        return object;
    }
}