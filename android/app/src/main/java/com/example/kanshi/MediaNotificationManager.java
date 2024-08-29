package com.example.kanshi;

import static com.example.kanshi.Configs.OWNER;
import static com.example.kanshi.Utils.createRoundBitmap;
import static com.example.kanshi.Utils.createRoundIcon;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Person;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;

import androidx.annotation.RequiresApi;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

public class MediaNotificationManager {
    public static final String MEDIA_RELEASES_CHANNEL = "media_releases";
    private static final String RECENTLY_UPDATED_MEDIA_CHANNEL = "recently_updated_media";
    public static final String MEDIA_RELEASE_NOTIFICATION_GROUP = "media_release_notification_group";
    public static final int NOTIFICATION_MEDIA_RELEASE = 1000;
    public static final int NOTIFICATION_MY_MEDIA = 999;
    public static final int NOTIFICATION_OTHER_MEDIA = 998;
    public static final int MEDIA_RELEASE_PENDING_INTENT = 997;
    private static final int NOTIFICATION_UPDATED_MEDIA = 996;
    private static final ExecutorService notificationImageDownloaderExecutor = Executors.newFixedThreadPool(1);
    private static final ScheduledExecutorService addNotificationFutureExecutor = Executors.newScheduledThreadPool(1);
    private static ScheduledFuture<?> addNotificationFuture;
    public static final ConcurrentHashMap<String, Boolean> ongoingImageDownloads = new ConcurrentHashMap<>();
    public static final ConcurrentHashMap<String, MediaNotification> allMediaNotification = new ConcurrentHashMap<>();
    public static MediaNotification nearestNotificationInfo = null;
    public static long nearestNotificationTime = 0L;

    @RequiresApi(api = Build.VERSION_CODES.O)
    public static void scheduleMediaNotification(Context context, long mediaId, String title, long releaseEpisode, long maxEpisode, long releaseDateMillis, String imageUrl, String mediaUrl, String userStatus, long episodeProgress) {
        context = context.getApplicationContext();
        createMediaReleasesNotificationChannel(context);
        if (allMediaNotification.isEmpty()) {
            try {
                @SuppressWarnings("unchecked") ConcurrentHashMap<String, MediaNotification> $allMediaNotification = (ConcurrentHashMap<String, MediaNotification>) LocalPersistence.readObjectFromFile(context, "allMediaNotification");
                if ($allMediaNotification != null && !$allMediaNotification.isEmpty()) {
                    allMediaNotification.putAll($allMediaNotification);
                }
            } catch (Exception ignored) {}
        }
        MediaNotification checkingMedia = allMediaNotification.get(mediaId + "-" + releaseEpisode);
        if (checkingMedia == null || checkingMedia.imageByte == null || checkingMedia.imageByte.length == 0) {
            if (ongoingImageDownloads.putIfAbsent(mediaId + "-" + releaseEpisode, true) == null) {
                Context finalContext = context;
                notificationImageDownloaderExecutor.execute(() -> {
                    try {
                        Bitmap imageBitmap = downloadImage(imageUrl);
                        byte[] imageByte = null;
                        ByteArrayOutputStream stream = new ByteArrayOutputStream();
                        if (imageBitmap != null) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                imageBitmap.compress(Bitmap.CompressFormat.WEBP_LOSSY, 25, stream);
                            } else {
                                imageBitmap.compress(Bitmap.CompressFormat.WEBP, 25, stream);
                            }
                            imageByte = stream.toByteArray();
                        } else {
                            try {
                                byte[] $imageBitmap = (byte[]) LocalPersistence.readObjectFromFile(finalContext, "notificationLogoIcon");
                                if ($imageBitmap == null || $imageBitmap.length == 0) {
                                    imageBitmap = BitmapFactory.decodeResource(finalContext.getResources(), R.drawable.ic_launcher_round);
                                    imageBitmap = createRoundBitmap(imageBitmap);
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                        imageBitmap.compress(Bitmap.CompressFormat.WEBP_LOSSY, 25, stream);
                                    } else {
                                        imageBitmap.compress(Bitmap.CompressFormat.WEBP, 25, stream);
                                    }
                                    $imageBitmap = stream.toByteArray();
                                    if ($imageBitmap.length > 0) {
                                        LocalPersistence.writeObjectToFile(finalContext, $imageBitmap, "notificationLogoIcon");
                                    }
                                }
                            } catch (Exception ignored) {}
                        }
                        MediaNotification media = new MediaNotification(mediaId, title, releaseEpisode, maxEpisode, releaseDateMillis, imageByte, mediaUrl, userStatus, episodeProgress);
                        addMediaNotification(finalContext, media);
                        ongoingImageDownloads.remove(mediaId + "-" + releaseEpisode);
                        if (ongoingImageDownloads.isEmpty()) {
                            MainService mainService = MainService.getInstanceActivity();
                            if (mainService!=null) {
                                mainService.finishedAddingMediaReleaseNotification();
                            }
                        }
                    } catch (Exception e) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Utils.handleUncaughtException(finalContext.getApplicationContext(), e, "notificationImageDownloaderExecutor");
                        }
                        e.printStackTrace();
                    }
                });
            }
        } else {
            MediaNotification media = new MediaNotification(mediaId, title, releaseEpisode, maxEpisode, releaseDateMillis, checkingMedia.imageByte, mediaUrl, userStatus, episodeProgress);
            addMediaNotification(context, media);
        }
        if (ongoingImageDownloads.isEmpty()) {
            MainService mainService = MainService.getInstanceActivity();
            if (mainService!=null) {
                mainService.finishedAddingMediaReleaseNotification();
            }
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.O)
    public static void addMediaNotification(Context context, MediaNotification media) {
        if (
            (nearestNotificationTime == 0 || media.releaseDateMillis < nearestNotificationTime)
            && media.releaseDateMillis >= System.currentTimeMillis()
            && !"DROPPED".equalsIgnoreCase(media.userStatus)
        ) {
            Intent intent = new Intent(context, MyReceiver.class);
            if (nearestNotificationInfo != null) {
                Intent oldIntent = new Intent(context, MyReceiver.class);
                oldIntent.setAction("MEDIA_NOTIFICATION");
                PendingIntent oldPendingIntent = PendingIntent.getBroadcast(context, MEDIA_RELEASE_PENDING_INTENT, oldIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                // Cancel Old
                oldPendingIntent.cancel();
                alarmManager.cancel(oldPendingIntent);
            }
            nearestNotificationTime = media.releaseDateMillis;
            nearestNotificationInfo = media;
            intent.setAction("MEDIA_NOTIFICATION");
            allMediaNotification.put(media.mediaId + "-" + media.releaseEpisode, media);
            writeMediaNotificationInFile(context, false);
            // Create New
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(context, MEDIA_RELEASE_PENDING_INTENT, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nearestNotificationTime, pendingIntent);
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nearestNotificationTime, pendingIntent);
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nearestNotificationTime, pendingIntent);
                } else {
                    try {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, nearestNotificationTime, pendingIntent);
                    } catch (Exception ignored) {
                        alarmManager.set(AlarmManager.RTC_WAKEUP, nearestNotificationTime, pendingIntent);
                    }
                }
            }
        } else {
            allMediaNotification.put(media.mediaId + "-" + media.releaseEpisode, media);
            writeMediaNotificationInFile(context, false);
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.O)
    public static void writeMediaNotificationInFile(Context context, boolean isUpdating) {
        if (addNotificationFuture != null && !addNotificationFuture.isDone()) {
            addNotificationFuture.cancel(true);
        }
        addNotificationFuture = addNotificationFutureExecutor.schedule(() -> {
            try {
                if (!allMediaNotification.isEmpty()) {
                    LocalPersistence.writeObjectToFile(context, allMediaNotification, "allMediaNotification");
                    if (isUpdating && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        Utils.exportReleasedMedia(context.getApplicationContext());
                    }
                }
            } catch (Exception e) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(context.getApplicationContext(), e, "addNotificationFutureExecutor");
                }
                e.printStackTrace();
            }
        }, 300, TimeUnit.MILLISECONDS);
    }

    static boolean mediaReleasesNotificationChannelIsAdded = false;
    public static void createMediaReleasesNotificationChannel(Context context) {
        if (mediaReleasesNotificationChannelIsAdded) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context = context.getApplicationContext();
            CharSequence name = "Anime Releases";
            String description = "Notifications for anime releases";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel(MEDIA_RELEASES_CHANNEL, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
        mediaReleasesNotificationChannelIsAdded = true;
    }

    static boolean recentlyUpdatedMediaNotificationChannelIsAdded = false;
    public static void createRecentlyUpdatedMediaNotificationChannel(Context context) {
        if (recentlyUpdatedMediaNotificationChannelIsAdded) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context = context.getApplicationContext();
            CharSequence name = "Recently Updated Anime";
            String description = "Notifications for anime that are recently added or updated (trailer or cover)";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel(RECENTLY_UPDATED_MEDIA_CHANNEL, name, importance);
            channel.setDescription(description);
            channel.enableVibration(OWNER);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
        recentlyUpdatedMediaNotificationChannelIsAdded = true;
    }
    private static Bitmap downloadImage(String imageUrl) {
        try {
            URL url = new URL(imageUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setDoInput(true);
            connection.connect();
            InputStream input = connection.getInputStream();
            return BitmapFactory.decodeStream(input);
        } catch (Exception ignored) {
            return null;
        }
    }

    public static void recentlyUpdatedMediaNotification(Context context, long addedMediaCount, long updatedMediaCount) {
        context = context.getApplicationContext();
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            if (addedMediaCount > 0 || updatedMediaCount > 0) {
                createRecentlyUpdatedMediaNotificationChannel(context);
                Intent intent = new Intent(context, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);
                pendingIntent.cancel();
                pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);
                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, RECENTLY_UPDATED_MEDIA_CHANNEL)
                        .setSmallIcon(R.drawable.ic_stat_name)
                        .setContentIntent(pendingIntent)
                        .setAutoCancel(true)
                        .setShowWhen(false)
                        .setNumber((int) (addedMediaCount+updatedMediaCount))
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT);
                if (updatedMediaCount > 0 && addedMediaCount > 0) {
                    builder.setContentTitle("Updates: "+addedMediaCount+" New Anime, "+updatedMediaCount+" "+(updatedMediaCount>1?"Changes":"Modified"));
                } else if (updatedMediaCount > 0) {
                    builder.setContentTitle("Updates: "+updatedMediaCount+" Modified Anime");
                } else {
                    builder.setContentTitle("Updates: "+addedMediaCount+" New Anime");
                }
                NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
                notificationManager.cancel(NOTIFICATION_UPDATED_MEDIA);
                notificationManager.notify(NOTIFICATION_UPDATED_MEDIA, builder.build());
            }
        }
    }
    @RequiresApi(api = Build.VERSION_CODES.P)
    public static void seeMoreReleasedMediaNotification(Context context) {
        context = context.getApplicationContext();
        if (ActivityCompat.checkSelfPermission(context.getApplicationContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;

        if (allMediaNotification.isEmpty()) {
            try {
                @SuppressWarnings("unchecked") ConcurrentHashMap<String, MediaNotification> $allMediaNotification = (ConcurrentHashMap<String, MediaNotification>) LocalPersistence.readObjectFromFile(context, "allMediaNotification");
                if ($allMediaNotification != null && !$allMediaNotification.isEmpty()) {
                    allMediaNotification.putAll($allMediaNotification);
                }
                if (allMediaNotification.isEmpty()) {
                    return;
                }
            } catch (Exception ignored) {}
        }

        createMediaReleasesNotificationChannel(context.getApplicationContext());
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context.getApplicationContext());

        byte[] dummyImage = null;
        HashMap<String, MediaNotification> myMediaNotifications = new HashMap<>();
        HashMap<String, MediaNotification> mediaNotifications = new HashMap<>();

        MediaNotification nextMediaNotificationInfo = null;

        long currentTimeInMillis = System.currentTimeMillis();
        long sixtySecondsAgoInMillis = currentTimeInMillis-TimeUnit.MINUTES.toMillis(1);

        long mostRecentlySentMyMediaNotificationTime = 0L;
        long mostRecentlySentOtherMediaNotificationTime = 0L;

        List<MediaNotification> allMediaNotificationValues = new ArrayList<>(allMediaNotification.values());

        for (MediaNotification media : allMediaNotificationValues) {
            if ("DROPPED".equalsIgnoreCase(media.userStatus)) continue;
            if (media.releaseDateMillis <= currentTimeInMillis) {
                boolean isMyMedia = media.userStatus != null && !media.userStatus.isEmpty() && !media.userStatus.equalsIgnoreCase("UNSEEN");
                if (isMyMedia) {
                    if (media.releaseDateMillis > mostRecentlySentMyMediaNotificationTime){
                        mostRecentlySentMyMediaNotificationTime = media.releaseDateMillis;
                    }
                    if (myMediaNotifications.get(String.valueOf(media.mediaId)) == null) {
                        myMediaNotifications.put(String.valueOf(media.mediaId), media);
                    } else {
                        MediaNotification $media = myMediaNotifications.get(String.valueOf(media.mediaId));
                        if ($media != null && $media.releaseDateMillis < media.releaseDateMillis) {
                            myMediaNotifications.put(String.valueOf(media.mediaId), media);
                        }
                    }
                } else {
                    if (media.releaseDateMillis > mostRecentlySentOtherMediaNotificationTime){
                        mostRecentlySentOtherMediaNotificationTime = media.releaseDateMillis;
                    }
                    if (mediaNotifications.get(String.valueOf(media.mediaId)) == null) {
                        mediaNotifications.put(String.valueOf(media.mediaId), media);
                    } else {
                        MediaNotification $media = mediaNotifications.get(String.valueOf(media.mediaId));
                        if ($media != null && $media.releaseDateMillis < media.releaseDateMillis) {
                            mediaNotifications.put(String.valueOf(media.mediaId), media);
                        }
                    }
                }
            } else {
                if (nextMediaNotificationInfo ==null || nextMediaNotificationInfo.releaseDateMillis > media.releaseDateMillis) {
                    nextMediaNotificationInfo = media;
                }
            }
        }

        if (mostRecentlySentMyMediaNotificationTime==0L) {
            mostRecentlySentMyMediaNotificationTime = currentTimeInMillis;
        }

        if (mostRecentlySentOtherMediaNotificationTime==0L) {
            mostRecentlySentOtherMediaNotificationTime = currentTimeInMillis;
        }

        long newMyMediaNotificationCount = 0;
        long newMediaNotificationCount = 0;

        final int maxNotificationCount = 6;

        Notification.MessagingStyle styleMA = new Notification.MessagingStyle(new Person.Builder().setName("").build()).setGroupConversation(true);

        // Put in Descending Order for in Adding items for the Message Style Notification
        List<MediaNotification> descendedMyMediaNotificationsValues = new ArrayList<>(myMediaNotifications.values());
        Collections.sort(descendedMyMediaNotificationsValues, (a1, a2) -> Long.compare(a2.releaseDateMillis, a1.releaseDateMillis));

        // Get the first 6 items in the list to only show what can be seen
        List<MediaNotification> finalMyMediaNotificationsValues = descendedMyMediaNotificationsValues.subList(0, Math.min(maxNotificationCount, descendedMyMediaNotificationsValues.size()));

        for (MediaNotification media : finalMyMediaNotificationsValues) {
            Person.Builder itemBuilder = new Person.Builder()
                    .setName(media.title)
                    .setKey(String.valueOf(media.mediaId))
                    .setBot(true);
            if (media.imageByte != null) {
                Bitmap image = BitmapFactory.decodeByteArray(media.imageByte, 0, media.imageByte.length);
                itemBuilder.setIcon(createRoundIcon(image));
            } else {
                if (dummyImage != null) {
                    Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                    itemBuilder.setIcon(createRoundIcon(image));
                } else {
                    try {
                        byte[] $dummyImage = (byte[]) LocalPersistence.readObjectFromFile(context.getApplicationContext(), "notificationLogoIcon");
                        if ($dummyImage != null && $dummyImage.length != 0) {
                            dummyImage = $dummyImage;
                            Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                            itemBuilder.setIcon(createRoundIcon(image));
                        }
                    } catch (Exception ignored) {}
                }
            }
            Person item = itemBuilder.build();
            boolean justAired = media.releaseDateMillis > sixtySecondsAgoInMillis;
            String addedInfo = " aired.";
            if (justAired) {
                addedInfo = " just aired.";
                ++newMyMediaNotificationCount;
            }
            if (media.maxEpisode < 0) { // No Given Max Episodes
                styleMA.addMessage("Episode " + media.releaseEpisode + addedInfo, media.releaseDateMillis, item);
            } else if (media.releaseEpisode >= media.maxEpisode) {
                styleMA.addMessage("Finished Airing: Episode " + media.releaseEpisode + addedInfo, media.releaseDateMillis, item);
            } else {
                styleMA.addMessage("Episode " + media.releaseEpisode + " / " + media.maxEpisode + addedInfo, media.releaseDateMillis, item);
            }
        }
        String notificationTitleMA;
        if (newMyMediaNotificationCount > 0) {
            notificationTitleMA = "Your Anime Just Aired" + " +" + newMyMediaNotificationCount;
        } else {
            notificationTitleMA = "Your Anime Aired";
        }
        styleMA.setConversationTitle(notificationTitleMA);

        Intent intent = new Intent(context, MediaReleaseActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(context.getApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);
        pendingIntent.cancel();
        pendingIntent = PendingIntent.getActivity(context.getApplicationContext(), 0, intent, PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder notificationMABuilder = new Notification.Builder(context.getApplicationContext(), MEDIA_RELEASES_CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setContentTitle(notificationTitleMA)
                .setStyle(styleMA)
                .setContentIntent(pendingIntent)
                .setGroup(MEDIA_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                .setNumber(0)
                .setOnlyAlertOnce(true)
                .setWhen(mostRecentlySentMyMediaNotificationTime)
                .setShowWhen(true);

        // Other Media Released
        Notification.MessagingStyle styleOA = new Notification.MessagingStyle(new Person.Builder().setName("").build()).setGroupConversation(true);

        // Put in Ascending Order for in Adding items for the Message Style Notification
        List<MediaNotification> descendedMediaNotificationsValues = new ArrayList<>(mediaNotifications.values());
        Collections.sort(descendedMediaNotificationsValues, (a1, a2) -> Long.compare(a2.releaseDateMillis, a1.releaseDateMillis));

        // Get the last 6 items in the list to only show what can be seen
        List<MediaNotification> finalMediaNotificationsValues = descendedMediaNotificationsValues.subList(0, Math.min(maxNotificationCount, descendedMediaNotificationsValues.size()));

        for (MediaNotification media : finalMediaNotificationsValues) {
            Person.Builder itemBuilder = new Person.Builder()
                    .setName(media.title)
                    .setKey(String.valueOf(media.mediaId))
                    .setBot(true);
            if (media.imageByte != null) {
                Bitmap image = BitmapFactory.decodeByteArray(media.imageByte, 0, media.imageByte.length);
                itemBuilder.setIcon(createRoundIcon(image));
            } else {
                if (dummyImage != null) {
                    Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                    itemBuilder.setIcon(createRoundIcon(image));
                } else {
                    try {
                        byte[] $dummyImage = (byte[]) LocalPersistence.readObjectFromFile(context.getApplicationContext(), "notificationLogoIcon");
                        if ($dummyImage != null && $dummyImage.length != 0) {
                            dummyImage = $dummyImage;
                            Bitmap image = BitmapFactory.decodeByteArray(dummyImage, 0, dummyImage.length);
                            itemBuilder.setIcon(createRoundIcon(image));
                        }
                    } catch (Exception ignored) {}
                }
            }
            Person item = itemBuilder.build();
            boolean justAired = media.releaseDateMillis > sixtySecondsAgoInMillis;
            String addedInfo = " aired.";
            if (justAired) {
                addedInfo = " just aired.";
                ++newMediaNotificationCount;
            }
            if (media.maxEpisode < 0) { // No Given Max Episodes
                styleOA.addMessage("Episode " + media.releaseEpisode + addedInfo, media.releaseDateMillis, item);
            } else if (media.releaseEpisode >= media.maxEpisode) {
                styleOA.addMessage("Finished Airing: Episode " + media.releaseEpisode + addedInfo, media.releaseDateMillis, item);
            } else {
                styleOA.addMessage("Episode " + media.releaseEpisode + " / " + media.maxEpisode + addedInfo, media.releaseDateMillis, item);
            }
        }
        String notificationTitleOA;
        if (newMediaNotificationCount > 0) {
            notificationTitleOA = "Other Anime Just Aired" + " +" + newMediaNotificationCount;
        } else {
            notificationTitleOA = "Other Anime Aired";
        }
        styleOA.setConversationTitle(notificationTitleOA);

        Notification.Builder notificationOABuilder = new Notification.Builder(context.getApplicationContext(), MEDIA_RELEASES_CHANNEL)
                .setContentTitle(notificationTitleOA)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .setGroup(MEDIA_RELEASE_NOTIFICATION_GROUP)
                .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
                .setNumber(0)
                .setOnlyAlertOnce(true)
                .setWhen(mostRecentlySentOtherMediaNotificationTime)
                .setShowWhen(true);

        long mostRecentlySentNotificationTime = Math.max(mostRecentlySentMyMediaNotificationTime, mostRecentlySentOtherMediaNotificationTime);

        String notificationTitle = "Anime Aired";
        long mediaReleaseNotificationSize = newMyMediaNotificationCount + newMediaNotificationCount;
        if (mediaReleaseNotificationSize > 0) {
            notificationTitle = notificationTitle + " +" + mediaReleaseNotificationSize;
        }

        Notification.Builder notificationSummaryBuilder = new Notification.Builder(context.getApplicationContext(), MEDIA_RELEASES_CHANNEL)
                .setContentTitle(notificationTitle)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setStyle(styleOA)
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setGroup(MEDIA_RELEASE_NOTIFICATION_GROUP)
                .setGroupSummary(true)
                .setOnlyAlertOnce(true)
                .setWhen(mostRecentlySentNotificationTime)
                .setShowWhen(true);

        boolean hasNewMyMediaNotification = newMyMediaNotificationCount > 0;
        if (hasNewMyMediaNotification) { // Set with vibration
            notificationSummaryBuilder
                    .setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY);
        } else { // Set with no vibration
            notificationSummaryBuilder
                    .setGroupAlertBehavior(Notification.GROUP_ALERT_CHILDREN)
                    .setDefaults(Notification.DEFAULT_ALL)
                    .setVibrate(new long[]{0L});
        }

        boolean shouldNotify = !mediaNotifications.isEmpty() || !myMediaNotifications.isEmpty();
        if (shouldNotify) {
            notificationManager.cancel(NOTIFICATION_MEDIA_RELEASE);
            if (!mediaNotifications.isEmpty()) {
                notificationManager.cancel(NOTIFICATION_OTHER_MEDIA);
                Notification notificationOA = notificationOABuilder.build();
                notificationManager.notify(NOTIFICATION_OTHER_MEDIA, notificationOA);
            }
            if (!myMediaNotifications.isEmpty()) {
                notificationManager.cancel(NOTIFICATION_MY_MEDIA);
                Notification notificationMA = notificationMABuilder.build();
                notificationManager.notify(NOTIFICATION_MY_MEDIA, notificationMA);
            }
            Notification notificationSummary = notificationSummaryBuilder.build();
            notificationManager.notify(NOTIFICATION_MEDIA_RELEASE, notificationSummary);
        }
    }
}