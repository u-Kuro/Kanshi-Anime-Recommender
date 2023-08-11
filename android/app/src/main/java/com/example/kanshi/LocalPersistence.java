package com.example.kanshi;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;

import android.app.Activity;
import android.content.Context;

public class LocalPersistence {
    public static void writeObjectToFile(Context context, Object object, String filename) {
        ObjectOutputStream objectOut = null;
        try {
            FileOutputStream fileOut = context.openFileOutput(filename + ".tmp", Activity.MODE_PRIVATE);
            objectOut = new ObjectOutputStream(fileOut);
            objectOut.writeObject(object);
            fileOut.getFD().sync();
            fileOut.close();
            File tempFile = new File(context.getFilesDir(), filename + ".tmp");
            File finalFile = new File(context.getFilesDir(), filename);
            if (!tempFile.renameTo(finalFile) && tempFile.exists()) {
                //noinspection ResultOfMethodCallIgnored
                tempFile.delete();
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
