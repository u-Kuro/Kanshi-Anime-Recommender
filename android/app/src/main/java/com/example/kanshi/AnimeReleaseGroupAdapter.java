package com.example.kanshi;

import static com.example.kanshi.Utils.imageCache;

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
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.appcompat.content.res.AppCompatResources;
import androidx.recyclerview.widget.RecyclerView;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Locale;

public class AnimeReleaseGroupAdapter extends RecyclerView.Adapter<AnimeReleaseGroupAdapter.AnimeViewHolder> {
    private final Context mContext;
    private final LayoutInflater mInflater;
    private final RecyclerView recyclerView;
    public ArrayList<AnimeReleaseGroup> mAnimeGroups;

    public AnimeReleaseGroupAdapter(Context context, ArrayList<AnimeReleaseGroup> animeGroups, RecyclerView recyclerView) {
        this.mContext = context;
        this.mInflater = LayoutInflater.from(mContext);
        this.mAnimeGroups = animeGroups;
        this.recyclerView = recyclerView;
    }

    @NonNull
    @Override
    public AnimeViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = mInflater.inflate(R.layout.anime_release_group_card, parent, false);
        return new AnimeViewHolder(view);
    }

    private int maxShownItem = 0;
    @RequiresApi(api = Build.VERSION_CODES.O)
    @Override
    public void onBindViewHolder(@NonNull AnimeViewHolder holder, int position) {
        maxShownItem = Math.max(maxShownItem, position + 1);
        if (recyclerView!=null) {
            recyclerView.setItemViewCacheSize(maxShownItem);
        }

        AnimeReleaseGroup animeReleaseGroup = mAnimeGroups.get(position);

        if (animeReleaseGroup != null) {
            LocalDateTime localDateTime = animeReleaseGroup.date;

            if (localDateTime != null) {
                DateTimeFormatter shownDateFormat = DateTimeFormatter.ofPattern("MMMM d yyyy, EEEE");
                DateTimeFormatter shownWeekDayFormat = DateTimeFormatter.ofPattern("EEEE");

                LocalDate localDate = localDateTime.toLocalDate();
                LocalDate today = LocalDate.now();

                String dateStr;
                if (localDate.isAfter(today.plusDays(6))) { // more than a week
                    dateStr = shownDateFormat.format(localDate);
                } else if (localDate.isAfter(today.plusDays(1))) { // more than a day
                    dateStr = shownWeekDayFormat.format(localDate);
                } else if (localDate.isAfter(today)) {
                    dateStr = "Tomorrow, " + shownWeekDayFormat.format(localDate);
                } else if (localDate.isEqual(today)) {
                    dateStr = "Today, " + shownWeekDayFormat.format(localDate);
                } else if (localDate.isAfter(today.minusWeeks(1))) {
                    long daysDifference = ChronoUnit.DAYS.between(localDate, today);
                    if (daysDifference == 1) {
                        LocalDateTime now = LocalDateTime.now();
                        long minutesDifference = ChronoUnit.MINUTES.between(localDateTime, now);
                        if (minutesDifference == 1) {
                            dateStr = "1 minute ago" + ", " + shownWeekDayFormat.format(localDate);
                        } else if (minutesDifference < 60) {
                            dateStr = minutesDifference + " minutes ago" + ", " + shownWeekDayFormat.format(localDate);
                        } else {
                            dateStr = "Yesterday" + ", " + shownWeekDayFormat.format(localDate);
                        }
                    } else {
                        dateStr = daysDifference + " days ago" + ", " + shownWeekDayFormat.format(localDate);
                    }
                } else {
                    dateStr = shownDateFormat.format(localDate);
                }
                holder.animeReleaseGroupDate.setText(dateStr);
            } else {
                if (animeReleaseGroup.dateString != null) {
                    holder.animeReleaseGroupDate.setText(animeReleaseGroup.dateString);
                } else {
                    holder.animeReleaseGroupDate.setText(R.string.na);
                }
            }

            ArrayList<AnimeNotification> animeReleases = animeReleaseGroup.anime;
            holder.animeReleaseGroupDateLayout.removeAllViews();

            for (int i = 0; i < animeReleases.size(); i++) {
                View animeCard = LayoutInflater.from(mContext).inflate(R.layout.anime_release_card, holder.animeReleaseGroupDateLayout, false);
                holder.animeReleaseGroupDateLayout.addView(animeCard);

                AnimeNotification anime = animeReleases.get(i);

                if (animeCard == null || anime == null) continue;
                ImageView animeImage = animeCard.findViewById(R.id.anime_image);
                TextView animeName = animeCard.findViewById(R.id.anime_name);
                View userStatusIcon = animeCard.findViewById(R.id.user_status_icon);
                TextView animeReleaseInfo = animeCard.findViewById(R.id.anime_release_info);
                TextView animeReleaseTime = animeCard.findViewById(R.id.anime_release_time);
                if (anime.imageByte != null) {
                    String key = String.valueOf(anime.animeId);
                    Bitmap imageBitmap;
                    if (imageCache.containsKey(key)) {
                        imageBitmap = imageCache.get(key);
                    } else {
                        imageBitmap = cropAndRoundCorners(BitmapFactory.decodeByteArray(anime.imageByte, 0, anime.imageByte.length), 24);
                        imageCache.put(key, imageBitmap);
                    }
                    animeImage.setImageBitmap(imageBitmap);
                } else {
                    animeImage.setImageResource(R.drawable.image_placeholder);
                }

                final boolean isWatched = "COMPLETED".equalsIgnoreCase(anime.userStatus) || (anime.episodeProgress > 0 && anime.releaseEpisode <= anime.episodeProgress);
                final int fontColorId;
                if (isWatched) {
                    fontColorId = R.color.grey;
                } else {
                    fontColorId = R.color.white;
                }

                DateTimeFormatter shownTimeFormat = DateTimeFormatter.ofPattern("h:mm a", Locale.US);
                String releaseTime = shownTimeFormat.format(LocalDateTime.ofInstant(Instant.ofEpochMilli(anime.releaseDateMillis), ZoneId.systemDefault()));
                if (releaseTime != null && !releaseTime.isEmpty()) {
                    animeReleaseTime.setTextColor(mContext.getResources().getColor(fontColorId));
                    animeReleaseTime.setText(releaseTime);
                    animeReleaseTime.setVisibility(View.VISIBLE);
                } else {
                    animeReleaseTime.setVisibility(View.GONE);
                }

                final String title = anime.title;
                if (title != null && !title.isEmpty()) {
                    animeName.setTextColor(mContext.getResources().getColor(fontColorId));
                    animeName.setText(title);
                    animeCard.setOnLongClickListener(view1 -> {
                        ClipboardManager clipboard = (ClipboardManager) mContext.getSystemService(Context.CLIPBOARD_SERVICE);
                        ClipData clip = ClipData.newPlainText("Copied Text", title);
                        clipboard.setPrimaryClip(clip);
                        return true;
                    });
                } else {
                    animeName.setTextColor(mContext.getResources().getColor(R.color.grey));
                    animeName.setText(R.string.na);
                }
                final String userStatus = anime.userStatus;
                if (userStatus != null && !userStatus.isEmpty() && !userStatus.equalsIgnoreCase("UNWATCHED")) {
                    final ColorStateList colorStateList;
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
                    userStatusIcon.setVisibility(View.INVISIBLE);
                    userStatusIcon.setBackgroundTintList(colorStateList);
                    if (isWatched) {
                        userStatusIcon.setAlpha(0.5f);
                    } else {
                        userStatusIcon.setAlpha(1f);
                    }
                    userStatusIcon.setVisibility(View.VISIBLE);
                } else {
                    userStatusIcon.setVisibility(View.GONE);
                }
                if (anime.message != null && !anime.message.isEmpty()) {
                    animeReleaseInfo.setTextColor(mContext.getResources().getColor(fontColorId));
                    animeReleaseInfo.setText(anime.message);
                } else {
                    animeReleaseInfo.setTextColor(mContext.getResources().getColor(R.color.grey));
                    animeReleaseInfo.setText(R.string.na);
                }
                final String animeUrl = anime.animeUrl;
                if (animeUrl != null && !animeUrl.isEmpty()) {
                    animeCard.setOnClickListener(view1 -> {
                        AnimeReleaseActivity animeReleaseActivity = AnimeReleaseActivity.getInstanceActivity();
                        if (animeReleaseActivity != null) {
                            animeReleaseActivity.openAnimeInAniList(animeUrl);
                        }
                    });
                }
            }
        }
    }

    @Override
    public int getItemCount() {
        int itemCount = 0;
        if (mAnimeGroups != null) {
            itemCount = mAnimeGroups.size();
        }
        if (itemCount < maxShownItem) {
            maxShownItem = itemCount;
            if (recyclerView!=null) {
                recyclerView.setItemViewCacheSize(maxShownItem);
            }
        }
        return itemCount;
    }

    public static class AnimeViewHolder extends RecyclerView.ViewHolder {
        private final TextView animeReleaseGroupDate;
        private final LinearLayout animeReleaseGroupDateLayout;

        public AnimeViewHolder(@NonNull View itemView) {
            super(itemView);
            animeReleaseGroupDate = itemView.findViewById(R.id.anime_release_group_date);
            animeReleaseGroupDateLayout = itemView.findViewById(R.id.anime_release_group_layout);
        }
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
