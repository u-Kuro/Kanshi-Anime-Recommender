package com.example.kanshi;

import static com.example.kanshi.Configs.imageCache;

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

import com.example.kanshi.utils.BackgroundTaskQueue;
import com.example.kanshi.utils.UITaskQueue;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

public class AnimeReleaseGroupAdapter extends RecyclerView.Adapter<AnimeReleaseGroupAdapter.AnimeViewHolder> {
    private final BackgroundTaskQueue backgroundTaskQueue;
    private final UITaskQueue uiTaskQueue;
    private final Context mContext;
    private final LayoutInflater mInflater;
    private final RecyclerView recyclerView;
    public final AtomicReference<ArrayList<AnimeReleaseGroup>> mAnimeGroups = new AtomicReference<>();

    public AnimeReleaseGroupAdapter(
        Context context,
        ArrayList<AnimeReleaseGroup> animeGroups,
        RecyclerView recyclerView
    ) {
        this.mContext = context;
        this.mInflater = LayoutInflater.from(mContext);
        this.mAnimeGroups.set(animeGroups);
        this.recyclerView = recyclerView;
        this.backgroundTaskQueue = new BackgroundTaskQueue();
        this.uiTaskQueue = new UITaskQueue();
    }

    @NonNull
    @Override
    public AnimeViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = mInflater.inflate(R.layout.anime_release_group_card, parent, false);
        return new AnimeViewHolder(view);
    }

    public final AtomicInteger maxShownItem = new AtomicInteger();

    @RequiresApi(api = Build.VERSION_CODES.O)
    @Override
    public void onBindViewHolder(@NonNull final AnimeViewHolder holder, final int position) {
        if (backgroundTaskQueue==null || uiTaskQueue==null) return;

        final String handlerId = "updateGroup"+position;
        backgroundTaskQueue.replaceTask(handlerId, () -> {
            try {
                uiTaskQueue.cancelTasks(handlerId);

                final int newItemPosition = position + 1;

                if (newItemPosition > maxShownItem.get()) {
                    uiTaskQueue.replaceTask(handlerId,"setItemViewCacheSize",()->{
                        recyclerView.setItemViewCacheSize(maxShownItem.get());
                        maxShownItem.getAndUpdate(e -> Math.max(e, newItemPosition));
                    });
                }

                final AnimeReleaseGroup animeReleaseGroup = mAnimeGroups.get().get(position);

                final LocalDateTime localDateTime = animeReleaseGroup.date;
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
                    uiTaskQueue.replaceTask(handlerId,"setGroupDate", () -> holder.animeReleaseGroupDate.setText(dateStr));
                } else {
                    if (animeReleaseGroup.dateString != null) {
                        uiTaskQueue.replaceTask(handlerId,"setGroupDate", () -> holder.animeReleaseGroupDate.setText(animeReleaseGroup.dateString));
                    } else {
                        uiTaskQueue.replaceTask(handlerId,"setGroupDate", () -> holder.animeReleaseGroupDate.setText(R.string.na));
                    }
                }


                final ArrayList<AnimeNotification> animeReleases = animeReleaseGroup.anime;
                final int animeReleasesSize = animeReleases.size();

                final int existingLayoutChildCount = holder.animeReleaseGroupDateLayout.getChildCount();
                for (int i = existingLayoutChildCount - 1; i >= animeReleasesSize; i--) {
                    int finalI = i;
                    uiTaskQueue.replaceTask(handlerId,"remove"+finalI, () -> {
                        if (finalI < holder.animeReleaseGroupDateLayout.getChildCount()) {
                            holder.animeReleaseGroupDateLayout.removeViewAt(finalI);
                        }
                    });
                }

                for (int i = 0; i < animeReleasesSize; i++) {
                    final AnimeNotification anime = animeReleases.get(i);
                    if (anime == null) continue;
                    View animeCard = holder.animeReleaseGroupDateLayout.getChildAt(i);
                    if (animeCard == null) {
                        animeCard = View.inflate(mContext, R.layout.anime_release_card, null);
                        View finalAnimeCard = animeCard;
                        uiTaskQueue.replaceTask(handlerId,"add"+i,()-> holder.animeReleaseGroupDateLayout.addView(finalAnimeCard));
                    }

                    if (animeCard == null) return;

                    ImageView animeImage = animeCard.findViewById(R.id.anime_image);
                    TextView animeName = animeCard.findViewById(R.id.anime_name);
                    View userStatusIcon = animeCard.findViewById(R.id.user_status_icon);
                    TextView animeReleaseInfo = animeCard.findViewById(R.id.anime_release_info);
                    TextView animeReleaseTime = animeCard.findViewById(R.id.anime_release_time);

                    // Load Text Color Fade
                    final boolean isWatched = "COMPLETED".equalsIgnoreCase(anime.userStatus) || (anime.episodeProgress > 0 && anime.releaseEpisode <= anime.episodeProgress);
                    final int fontColorId;
                    if (isWatched) {
                        fontColorId = R.color.grey;
                    } else {
                        fontColorId = R.color.white;
                    }

                    // Load Time
                    final DateTimeFormatter shownTimeFormat = DateTimeFormatter.ofPattern("h:mm a", Locale.US);
                    String releaseTime = shownTimeFormat.format(LocalDateTime.ofInstant(Instant.ofEpochMilli(anime.releaseDateMillis), ZoneId.systemDefault()));
                    final boolean hasReleaseTime = releaseTime != null && !releaseTime.isEmpty();

                    // Load Title
                    final String title = anime.title;
                    final boolean hasTitle = title != null && !title.isEmpty();

                    // Load User Status Icon
                    final String userStatus = anime.userStatus;
                    final ColorStateList colorStateList;
                    if (userStatus != null && !userStatus.isEmpty() && !userStatus.equalsIgnoreCase("UNWATCHED")) {
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
                    } else {
                        colorStateList = null;
                    }

                    // Load Release Info
                    final boolean hasMessage = anime.message != null && !anime.message.isEmpty();

                    // Load URL Opener
                    final String animeUrl = anime.animeUrl;
                    final boolean hasAnimeUrl = animeUrl != null && !animeUrl.isEmpty();

                    // Load Image
                    Bitmap imageBitmap = null;
                    final String animeKey = String.valueOf(anime.animeId);
                    if (anime.imageByte != null) {
                        if (imageCache.containsKey(animeKey)) {
                            imageBitmap = imageCache.get(animeKey);
                        }
                    }

                    final Bitmap finalImageBitmap = imageBitmap;
                    final View finalAnimeCard = animeCard;
                    uiTaskQueue.replaceTask(handlerId,"add-info"+i,() -> {
                        // Set Time
                        if (hasReleaseTime) {
                            animeReleaseTime.setTextColor(mContext.getResources().getColor(fontColorId));
                            animeReleaseTime.setText(releaseTime);
                            animeReleaseTime.setVisibility(View.VISIBLE);
                        } else {
                            animeReleaseTime.setVisibility(View.GONE);
                        }

                        // Set Title
                        if (hasTitle) {
                            animeName.setTextColor(mContext.getResources().getColor(fontColorId));
                            animeName.setText(title);
                            finalAnimeCard.setOnLongClickListener(e -> {
                                ClipboardManager clipboard = (ClipboardManager) mContext.getSystemService(Context.CLIPBOARD_SERVICE);
                                ClipData clip = ClipData.newPlainText("Copied Text", title);
                                clipboard.setPrimaryClip(clip);
                                return true;
                            });
                        } else {
                            animeName.setTextColor(mContext.getResources().getColor(R.color.grey));
                            animeName.setText(R.string.na);
                        }

                        // Set User Status Icon
                        if (colorStateList != null) {
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

                        // Set Release Info
                        if (hasMessage) {
                            animeReleaseInfo.setTextColor(mContext.getResources().getColor(fontColorId));
                            animeReleaseInfo.setText(anime.message);
                        } else {
                            animeReleaseInfo.setTextColor(mContext.getResources().getColor(R.color.grey));
                            animeReleaseInfo.setText(R.string.na);
                        }

                        // Set Anime URL Opener
                        if (hasAnimeUrl) {
                            finalAnimeCard.setOnClickListener(e -> {
                                AnimeReleaseActivity animeReleaseActivity = AnimeReleaseActivity.getInstanceActivity();
                                if (animeReleaseActivity != null) {
                                    animeReleaseActivity.openAnimeInAniList(animeUrl);
                                }
                            });
                        }

                        if (finalImageBitmap != null) {
                            animeImage.setImageBitmap(finalImageBitmap);
                        } else {
                            animeImage.setImageResource(R.drawable.image_placeholder);
                        }
                    });

                    // Generate and Set Image
                    if (finalImageBitmap==null) {
                        imageBitmap = cropAndRoundCorners(BitmapFactory.decodeByteArray(anime.imageByte, 0, anime.imageByte.length), 24);
                        imageCache.put(animeKey, imageBitmap);
                        final Bitmap generatedImageBitmap = imageBitmap;
                        uiTaskQueue.replaceTask(handlerId,"add-image"+i,()-> animeImage.setImageBitmap(generatedImageBitmap));
                    }
                }
            } catch (Exception e) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(mContext.getApplicationContext(), e, "AnimeReleaseGroupAdapter");
                }
            }
        });
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    public void add(int position, AnimeReleaseGroup animeReleaseGroup) {
        AtomicBoolean hasChanged = new AtomicBoolean();
        mAnimeGroups.getAndUpdate(animeReleaseGroups -> {
            if (position == animeReleaseGroups.size()) {
                animeReleaseGroups.add(position, animeReleaseGroup);
                hasChanged.set(true);
            }
            return animeReleaseGroups;
        });
        if (hasChanged.get()) {
            notifyItemInserted(position);
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    public void set(int position, AnimeReleaseGroup animeReleaseGroup) {
        AtomicBoolean hasChanged = new AtomicBoolean();
        mAnimeGroups.getAndUpdate(animeReleaseGroups -> {
            if (position < animeReleaseGroups.size()) {
                animeReleaseGroups.set(position, animeReleaseGroup);
                hasChanged.set(true);
            }
            return animeReleaseGroups;
        });
        if (hasChanged.get()) {
            notifyItemChanged(position);
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    public void remove(int position) {
        AtomicBoolean hasChanged = new AtomicBoolean();
        mAnimeGroups.getAndUpdate(animeReleaseGroups -> {
            if (position < animeReleaseGroups.size()) {
                animeReleaseGroups.remove(position);
                hasChanged.set(true);
            }
            return animeReleaseGroups;
        });
//        if (hasChanged.get()) {
            notifyItemRemoved(position);
//        }
    }

    @Override
    public int getItemCount() {
        int itemCount;
        ArrayList<AnimeReleaseGroup> animeGroups = mAnimeGroups.get();
        if (animeGroups != null) {
            itemCount = animeGroups.size();
        } else {
            itemCount = 0;
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
