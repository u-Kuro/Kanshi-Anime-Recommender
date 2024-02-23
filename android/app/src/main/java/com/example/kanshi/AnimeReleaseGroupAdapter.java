package com.example.kanshi;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.content.res.AppCompatResources;


import java.text.SimpleDateFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AnimeReleaseGroupAdapter extends ArrayAdapter<AnimeReleaseGroup> {
    final Context mContext;
    final int mResource;
    public AnimeReleaseGroupAdapter(@NonNull Context context, int resource, @NonNull ArrayList<AnimeReleaseGroup> objects) {
        super(context, resource, objects);
        this.mContext = context;
        this.mResource = resource;
    }

    private final ExecutorService getViewExecutorService = Executors.newFixedThreadPool(1);
    final Map<String, Bitmap> imageCache = new ConcurrentHashMap<>();

    @RequiresApi(api = Build.VERSION_CODES.O)
    @NonNull
    @Override
    public View getView(int position, @Nullable View convertView, @NonNull ViewGroup parent) {
        View view;
        if (convertView != null) {
            view = convertView;
        } else {
            LayoutInflater layoutInflater = LayoutInflater.from(mContext);
            view = layoutInflater.inflate(mResource, parent, false);
        }
        AnimeReleaseGroup animeReleaseGroup = getItem(position);

        if (animeReleaseGroup != null) {

            SimpleDateFormat shownDateFormat = new SimpleDateFormat("MMMM d yyyy", Locale.US);
            SimpleDateFormat shownTimeFormat = new SimpleDateFormat("h:mm a", Locale.US);
            SimpleDateFormat shownWeekTimeFormat = new SimpleDateFormat("EEEE h:mm a", Locale.US);

            TextView animeReleaseGroupDate = view.findViewById(R.id.anime_release_group_date);

            if (animeReleaseGroup.dateString!=null) {
                try {
                    Date date = animeReleaseGroup.date;
                    if (date != null) {

                        LocalDate localDate = date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                        LocalDate today = LocalDate.now();

                        String dateStr;
                        if (localDate.isAfter(today.plusDays(6))) { // more than a week
                            dateStr = "Airing in " + shownDateFormat.format(date);
                        } else if (localDate.isAfter(today.plusDays(1))) { // more than a day
                            dateStr = "Airing in " + shownWeekTimeFormat.format(date);
                        } else if (localDate.isAfter(today)) {
                            dateStr = "Tomorrow at " + shownTimeFormat.format(date);
                        } else if (localDate.isEqual(today)) {
                            if (date.getTime() > System.currentTimeMillis()) {
                                dateStr = "Airing at " + shownTimeFormat.format(date);
                            } else {
                                dateStr = "Today at " + shownTimeFormat.format(date);
                            }
                        } else if (localDate.isEqual(today.minusDays(1))) {
                            Instant dateInstant = date.toInstant();
                            Instant now = Instant.now();
                            long minutesDifference = ChronoUnit.MINUTES.between(dateInstant, now);
                            if (minutesDifference==1) {
                                dateStr = "1 minute ago";
                            } else if (minutesDifference < 60) {
                                dateStr = minutesDifference+" minutes ago";
                            } else {
                                dateStr = "Yesterday";
                            }
                        } else if (localDate.isAfter(today.minusWeeks(1))) {
                            Instant dateInstant = date.toInstant();
                            Instant now = Instant.now();
                            long daysDifference = ChronoUnit.DAYS.between(dateInstant, now);
                            if (daysDifference==1) {
                                dateStr = "1 day ago";
                            } else {
                                dateStr = daysDifference + " days ago";
                            }
                        } else {
                            dateStr = shownDateFormat.format(date);
                        }
                        animeReleaseGroupDate.setText(dateStr);
                    } else {
                        animeReleaseGroupDate.setText(animeReleaseGroup.dateString);
                    }
                } catch (Exception ignored) {}
            } else {
                animeReleaseGroupDate.setText(R.string.na);
            }

            ArrayList<AnimeNotification> animeReleases = animeReleaseGroup.anime;
            LinearLayout animeReleaseGroupDateLayout = view.findViewById(R.id.anime_release_group_layout);
            for (int i = animeReleaseGroupDateLayout.getChildCount() - 1; i >= animeReleases.size(); i--) {
                animeReleaseGroupDateLayout.removeViewAt(i);
            }

            for (int i =  0; i < animeReleases.size(); i++) {
                View animeCard = animeReleaseGroupDateLayout.getChildAt(i);
                if (animeCard==null) {
                    animeCard = View.inflate(mContext, R.layout.anime_release_card, null);
                    animeReleaseGroupDateLayout.addView(animeCard);
                }
                AnimeNotification anime = animeReleases.get(i);

                View finalAnimeCard = animeCard;
                getViewExecutorService.submit(() -> {
                    if (finalAnimeCard==null || anime==null) return;
                    ImageView animeImage = finalAnimeCard.findViewById(R.id.anime_image);
                    TextView animeName = finalAnimeCard.findViewById(R.id.anime_name);
                    View userStatusIcon = finalAnimeCard.findViewById(R.id.user_status_icon);
                    TextView animeReleaseInfo = finalAnimeCard.findViewById(R.id.anime_release_info);
                    if (anime.imageByte!=null) {
                        String key = String.valueOf(anime.animeId);
                        Bitmap imageBitmap;
                        if (imageCache.containsKey(key)) {
                            imageBitmap = imageCache.get(key);
                        } else {
                            imageBitmap = cropAndRoundCorners(BitmapFactory.decodeByteArray(anime.imageByte, 0, anime.imageByte.length), 24);
                            imageCache.put(key, imageBitmap);
                        }
                        runOnUi(() -> animeImage.setImageBitmap(imageBitmap));
                    }
                    final String title = anime.title;
                    if (title!=null && !title.equals("")) {
                        runOnUi(() -> {
                            animeName.setText(title);
                            finalAnimeCard.setOnLongClickListener(view1 -> {
                                ClipboardManager clipboard = (ClipboardManager) mContext.getSystemService(Context.CLIPBOARD_SERVICE);
                                ClipData clip = ClipData.newPlainText("Copied Text", title);
                                clipboard.setPrimaryClip(clip);
                                return true;
                            });
                        });
                    } else {
                        runOnUi(() -> animeName.setText(R.string.na));
                    }
                    final String userStatus = anime.userStatus;
                    if (userStatus != null && !userStatus.equals("") && !userStatus.equalsIgnoreCase("UNWATCHED")) {
                        runOnUi(() -> {
                            ColorStateList colorStateList;
                            if (userStatus.equalsIgnoreCase("COMPLETED")) {
                                colorStateList = AppCompatResources.getColorStateList(mContext, R.color.web_green);
                            } else if (
                                userStatus.equalsIgnoreCase("CURRENT")
                                || userStatus.equalsIgnoreCase("REPEATING")
                            ) {
                                colorStateList = AppCompatResources.getColorStateList(mContext, R.color.web_blue);
                            } else if (userStatus.equalsIgnoreCase("PLANNING")) {
                                colorStateList = AppCompatResources.getColorStateList(mContext, R.color.web_orange);
                            } else if (userStatus.equalsIgnoreCase("PAUSED")) {
                                colorStateList = AppCompatResources.getColorStateList(mContext, R.color.web_peach);
                            } else if (userStatus.equalsIgnoreCase("DROPPED")) {
                                colorStateList = AppCompatResources.getColorStateList(mContext, R.color.web_red);
                            } else {
                                colorStateList = AppCompatResources.getColorStateList(mContext, R.color.web_light_grey);
                            }
                            userStatusIcon.setBackgroundTintList(colorStateList);
                            userStatusIcon.setVisibility(View.VISIBLE);
                        });
                    } else {
                        runOnUi(() -> userStatusIcon.setVisibility(View.GONE));
                    }
                    if (anime.message!=null) {
                        runOnUi(() -> animeReleaseInfo.setText(anime.message));
                    } else {
                        runOnUi(() -> animeReleaseInfo.setText(R.string.na));
                    }
                    final String animeUrl = anime.animeUrl;
                    if (animeUrl!=null && !animeUrl.equals("")) {
                        runOnUi(() -> finalAnimeCard.setOnClickListener(view1 -> {
                            AnimeReleaseActivity animeReleaseActivity = AnimeReleaseActivity.getInstanceActivity();
                            if (animeReleaseActivity!=null) {
                                animeReleaseActivity.openAnimeInAniList(animeUrl);
                            }
                        }));
                    }
                });
            }
        }
        return view;
    }

    public void runOnUi(Runnable r) {
        new Handler(Looper.getMainLooper()).post(r);
    }
    public Bitmap cropAndRoundCorners(Bitmap original, int cornerRadius) {
        // Crop the bitmap to a square
        int minDimension = Math.min(original.getWidth(), original.getHeight());
        int cropX = (original.getWidth() - minDimension) /  2;
        int cropY = (original.getHeight() - minDimension) /  2;
        Bitmap cropped = Bitmap.createBitmap(original, cropX, cropY, minDimension, minDimension);

        // Create a new bitmap for the rounded corners
        Bitmap rounded = Bitmap.createBitmap(minDimension, minDimension, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(rounded);

        // Draw the cropped bitmap with rounded corners
        Paint paint = new Paint();
        paint.setAntiAlias(true);
        paint.setShader(new BitmapShader(cropped, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP));
        RectF rectF = new RectF(0,  0, minDimension, minDimension);
        canvas.drawRoundRect(rectF, cornerRadius, cornerRadius, paint);

        // Recycle the original and cropped bitmaps to free up memory
        original.recycle();
        cropped.recycle();

        return rounded;
    }
}
