package com.example.kanshi;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

import android.app.Activity;
import android.content.Context;

public class LocalPersistence {
    public static void writeObjectToFile(Context context, Object object, String filename) {
        ObjectOutputStream objectOut = null;
        String tempFileName = filename + ".tmp";
        File tempFile = new File(context.getFilesDir(), tempFileName);
        try {
            FileOutputStream fileOut = context.openFileOutput(tempFileName, Activity.MODE_PRIVATE);
            objectOut = new ObjectOutputStream(fileOut);
            objectOut.writeObject(object);
            fileOut.getFD().sync();
            fileOut.close();
            File finalFile = new File(context.getFilesDir(), filename);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                Path finalFilePath = finalFile.toPath();
                Path tempFilePath = tempFile.toPath();
                Files.copy(tempFilePath, finalFilePath, StandardCopyOption.REPLACE_EXISTING);
            } else {
                //noinspection ResultOfMethodCallIgnored
                tempFile.renameTo(finalFile);
            }
        } catch (IOException ignored) {
        } finally {
            try {
                if (objectOut != null) {
                    try {
                        objectOut.close();
                    } catch (IOException ignored) {}
                }
                if (tempFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    tempFile.delete();
                }
            } catch (Exception ignored) {}
        }
    }


    public static Object readObjectFromFile(Context context, String filename) {
        ObjectInputStream objectIn = null;
        Object object = null;
        try {
            FileInputStream fileIn = context.getApplicationContext().openFileInput(filename);
            objectIn = new ObjectInputStream(fileIn);
            object = objectIn.readObject();
        } catch (IOException | ClassNotFoundException ignored) {
        } finally {
            if (objectIn != null) {
                try {
                    objectIn.close();
                } catch (IOException ignored) {}
            }
        }
        return object;
    }
}
