package com.example.kanshi;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
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


import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
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
    final Map<String, Bitmap> imageCache = new HashMap<>();

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
                    Calendar releaseDate = Calendar.getInstance();
                    if (date != null) {
                        releaseDate.setTime(date);

                        long nowInMillis = System.currentTimeMillis();
                        long diffInMillis = nowInMillis - releaseDate.getTimeInMillis();
                        long diffInDays = diffInMillis / (24 * 60 * 60 * 1000);

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
                            if (date.getTime() > nowInMillis) {
                                dateStr = "Airing at " + shownTimeFormat.format(date);
                            } else {
                                dateStr = "Today at " + shownTimeFormat.format(date);
                            }
                        } else if (localDate.isEqual(today.minusDays(1))) {
                            dateStr = "Yesterday";
                        } else if (localDate.isAfter(today.minusWeeks(1))) {
                            dateStr = diffInDays + " days ago";
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
                    ImageView animeImage = finalAnimeCard.findViewById(R.id.anime_image);
                    TextView animeName = finalAnimeCard.findViewById(R.id.anime_name);
                    ImageView isMyAnimeIcon = finalAnimeCard.findViewById(R.id.is_my_anime_status);
                    TextView animeReleaseInfo = finalAnimeCard.findViewById(R.id.anime_release_info);
                    if (anime != null) {
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
                        if (anime.title!=null) {
                            runOnUi(() -> {
                                String title = anime.title;
                                animeName.setText(title);
                                finalAnimeCard.setOnLongClickListener(view1 -> {
                                    if (!title.equals("")) {
                                        ClipboardManager clipboard = (ClipboardManager) mContext.getSystemService(Context.CLIPBOARD_SERVICE);
                                        ClipData clip = ClipData.newPlainText("Copied Text", title);
                                        clipboard.setPrimaryClip(clip);
                                        return true;
                                    }
                                    return false;
                                });
                            });
                        } else {
                            runOnUi(() -> animeName.setText(R.string.na));
                        }
                        if (anime.isMyAnime) {
                            runOnUi(() -> isMyAnimeIcon.setVisibility(View.VISIBLE));
                        } else {
                            runOnUi(() -> isMyAnimeIcon.setVisibility(View.GONE));
                        }
                        if (anime.message!=null) {
                            runOnUi(() -> animeReleaseInfo.setText(anime.message));
                        } else {
                            runOnUi(() -> animeReleaseInfo.setText(R.string.na));
                        }
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
