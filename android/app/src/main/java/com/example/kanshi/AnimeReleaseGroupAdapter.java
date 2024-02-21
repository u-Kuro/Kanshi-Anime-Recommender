package com.example.kanshi;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;


import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class AnimeReleaseGroupAdapter extends ArrayAdapter<AnimeReleaseGroup> {
    final Context mContext;
    final int mResource;
    public AnimeReleaseGroupAdapter(@NonNull Context context, int resource, @NonNull ArrayList<AnimeReleaseGroup> objects) {
        super(context, resource, objects);
        this.mContext = context;
        this.mResource = resource;
    }

    final Map<String, Bitmap> imageCache = new HashMap<>();
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
            TextView animeReleaseGroupDate = view.findViewById(R.id.anime_release_group_date);
            LinearLayout animeReleaseGroupDateLayout = view.findViewById(R.id.anime_release_group_layout);
            animeReleaseGroupDateLayout.removeAllViews();

            SimpleDateFormat sdtf = new SimpleDateFormat("MM/dd/yyyy HH:mm:ss", Locale.US);
            SimpleDateFormat shownDateFormat = new SimpleDateFormat("MMMM d yyyy", Locale.US);
            SimpleDateFormat shownTimeFormat = new SimpleDateFormat("h:mm a", Locale.US);
            SimpleDateFormat shownWeekTimeFormat = new SimpleDateFormat("EEEE h:mm a", Locale.US);

            if (animeReleaseGroup.dateString!=null) {
                try {
                    Date date = sdtf.parse(animeReleaseGroup.dateString);
                    Calendar releaseDate = Calendar.getInstance();
                    if (date != null) {
                        releaseDate.setTime(date);

                        // Calculate the difference in days
                        long diffInMillis = System.currentTimeMillis() - releaseDate.getTimeInMillis();
                        long diffInDays = diffInMillis / (24 * 60 * 60 * 1000);
                        long diffInHours = diffInMillis / (60 * 60 * 1000) % 24;
                        long diffInMinutes = diffInMillis / (60 * 1000) % 60;
                        long diffInSeconds = diffInMillis / (1000) % 60;

                        String text;
                        if (diffInDays <= -7) {
                            text = "Airing in " + shownDateFormat.format(date);
                        } else if (diffInDays < -1) {
                            text = "Airing in " + shownWeekTimeFormat.format(date);
                        } else if (diffInDays == -1) {
                            text = "Tomorrow at " + shownTimeFormat.format(date);
                        } else if (diffInDays <= 0) {
                            if (diffInHours <= -1 || diffInMinutes <= -1 || diffInSeconds < -1) {
                                text = "Airing at " + shownTimeFormat.format(date);
                            } else {
                                text = "Today";
                            }
                        } else if (diffInDays < 2) {
                            text = "Yesterday";
                        } else if (diffInDays < 7) {
                            text = diffInDays + " days ago";
                        } else {
                            text = shownDateFormat.format(date);
                        }
                        animeReleaseGroupDate.setText(text);
                    } else {
                        animeReleaseGroupDate.setText(animeReleaseGroup.dateString);
                    }
                } catch (Exception ignored) {}
            } else {
                animeReleaseGroupDate.setText(R.string.na);
            }

            ArrayList<AnimeNotification> animeReleases = animeReleaseGroup.anime;
            for (AnimeNotification anime : animeReleases) {
                View animeCard = View.inflate(mContext, R.layout.anime_release_card, null);
                ImageView animeImage = animeCard.findViewById(R.id.anime_image);
                TextView animeName = animeCard.findViewById(R.id.anime_name);
                ImageView isMyAnimeIcon = animeCard.findViewById(R.id.is_my_anime_status);
                TextView animeReleaseInfo = animeCard.findViewById(R.id.anime_release_info);

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
                        animeImage.setImageBitmap(imageBitmap);
                    }
                    if (anime.title!=null) {
                        animeName.setText(anime.title);
                    } else {
                        animeName.setText(R.string.na);
                    }
                    if (anime.isMyAnime) {
                        isMyAnimeIcon.setVisibility(View.VISIBLE);
                    } else {
                        isMyAnimeIcon.setVisibility(View.GONE);
                    }
                    if (anime.message!=null) {
                        animeReleaseInfo.setText(anime.message);
                    } else {
                        animeReleaseInfo.setText(R.string.na);
                    }
                    animeReleaseGroupDateLayout.addView(animeCard);
                }
            }
        }
        return view;
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
