package com.example.kanshi;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;

import android.app.Activity;
import android.content.Context;

public class LocalPersistence {
    public synchronized static void writeObjectToFile(Context context, Object object, String filename) {
        ObjectOutputStream objectOut = null;
        try {
            FileOutputStream fileOut = context.openFileOutput(filename, Activity.MODE_PRIVATE);
            objectOut = new ObjectOutputStream(fileOut);
            objectOut.writeObject(object);
            fileOut.getFD().sync();
        } catch (IOException ignored) {
        } finally {
            if (objectOut != null) {
                try {
                    objectOut.close();
                } catch (IOException ignored) {}
            }
        }
    }

    public synchronized static Object readObjectFromFile(Context context, String filename) {

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
