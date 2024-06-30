package com.example.kanshi;

import static com.example.kanshi.Configs.imageCache;
import static com.example.kanshi.GroupedListItem.HEADER;
import static com.example.kanshi.GroupedListItem.ITEM;
import static com.example.kanshi.Utils.cropAndRoundCorners;

import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AnimationUtils;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.appcompat.content.res.AppCompatResources;
import androidx.recyclerview.widget.RecyclerView;

import com.example.kanshi.utils.BackgroundTask;
import com.example.kanshi.utils.UITask;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Locale;

public class AnimeReleaseGroupAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
    private final Context context;
    private final LayoutInflater inflater;
    private final ProgressBar progressCircular;
    @NonNull
    public final ArrayList<GroupedListItem> items;
    private final BackgroundTask backgroundTask;
    private final UITask uiTask;
    public AnimeReleaseGroupAdapter(
        Context context,
        @NonNull ArrayList<GroupedListItem> items,
        ProgressBar progressCircular
    ) {
        this.context = context;
        this.inflater = LayoutInflater.from(context);
        this.backgroundTask = new BackgroundTask(context);
        this.uiTask = new UITask(context);
        this.progressCircular = progressCircular;
        this.items = items;
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        switch (viewType) {
            case HEADER: {
                View itemView = inflater.inflate(R.layout.anime_release_date, parent, false);
                return new HeaderViewHolder(itemView);
            }
            case ITEM: {
                View itemView = inflater.inflate(R.layout.anime_release_card, parent, false);
                return new ItemViewHolder(itemView);
            }
            default: {
                IllegalStateException e = new IllegalStateException("Unsupported item type");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Utils.handleUncaughtException(this.context.getApplicationContext(), e, "onCreateViewHolder");
                }
                throw e;
            }
        }
    }

    int latestShownPosition = 0;
    @RequiresApi(api = Build.VERSION_CODES.P)
    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder viewHolder, int position) {
        latestShownPosition = Math.max(position, latestShownPosition);
        final ArrayList<GroupedListItem> finalItems = items;
        final String taskId = String.valueOf(position);
        backgroundTask.cancel(taskId);
        uiTask.cancel(taskId);
        backgroundTask.execute(taskId, () -> {
            int viewType = getItemViewType(position);
            if (viewType == -1) return;
            switch (viewType) {
                case HEADER: {
                    AnimeReleaseGroup header = (AnimeReleaseGroup) finalItems.get(position);
                    HeaderViewHolder holder = (HeaderViewHolder) viewHolder;
                    uiTask.post(() -> holder.animeReleaseGroupDate.setVisibility(View.INVISIBLE), taskId);
                    if (header.dateString != null) {
                        uiTask.post(() -> holder.animeReleaseGroupDate.setText(header.dateString), taskId);
                    } else {
                        uiTask.post(() -> holder.animeReleaseGroupDate.setText(R.string.na), taskId);
                    }
                    uiTask.post(() -> {
                        setAnimation(holder.animeReleaseGroupDate);
                        holder.animeReleaseGroupDate.setVisibility(View.VISIBLE);
                    }, taskId);
                    break;
                }
                case ITEM: {
                    AnimeNotification anime = (AnimeNotification) finalItems.get(position);
                    ItemViewHolder holder = (ItemViewHolder) viewHolder;
                    holder.itemView.setVisibility(View.INVISIBLE);

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
                            colorStateList = AppCompatResources.getColorStateList(context, R.color.web_green);
                        } else if (
                            userStatus.equalsIgnoreCase("CURRENT")
                            || userStatus.equalsIgnoreCase("REPEATING")
                        ) {
                            colorStateList = AppCompatResources.getColorStateList(context, R.color.web_blue);
                        } else if (userStatus.equalsIgnoreCase("PLANNING")) {
                            colorStateList = AppCompatResources.getColorStateList(context, R.color.web_orange);
                        } else if (userStatus.equalsIgnoreCase("PAUSED")) {
                            colorStateList = AppCompatResources.getColorStateList(context, R.color.web_peach);
                        } else if (userStatus.equalsIgnoreCase("DROPPED")) {
                            colorStateList = AppCompatResources.getColorStateList(context, R.color.web_red);
                        } else {
                            colorStateList = AppCompatResources.getColorStateList(context, R.color.web_light_grey);
                        }
                    } else {
                        colorStateList = null;
                    }

                    // Load Release Info
                    final boolean hasMessage = anime.message != null && !anime.message.isEmpty();

                    // Load Image
                    Bitmap imageBitmap = null;
                    final String animeKey = String.valueOf(anime.animeId);
                    if (anime.imageByte != null) {
                        if (imageCache.containsKey(animeKey)) {
                            imageBitmap = imageCache.get(animeKey);
                        }
                    }

                    final Bitmap finalImageBitmap = imageBitmap;
                    uiTask.post(() -> {
                        // Set Time
                        if (hasReleaseTime) {
                            holder.animeReleaseTime.setTextColor(context.getResources().getColor(fontColorId));
                            holder.animeReleaseTime.setText(releaseTime);
                            holder.animeReleaseTime.setVisibility(View.VISIBLE);
                        } else {
                            holder.animeReleaseTime.setVisibility(View.GONE);
                        }

                        // Set Title
                        if (hasTitle) {
                            holder.animeName.setTextColor(context.getResources().getColor(fontColorId));
                            holder.animeName.setText(title);
                        } else {
                            holder.animeName.setTextColor(context.getResources().getColor(R.color.grey));
                            holder.animeName.setText(R.string.na);
                        }

                        // Set User Status Icon
                        if (colorStateList != null) {
                            holder.userStatusIcon.setVisibility(View.INVISIBLE);
                            holder.userStatusIcon.setBackgroundTintList(colorStateList);
                            if (isWatched) {
                                holder.userStatusIcon.setAlpha(0.5f);
                            } else {
                                holder.userStatusIcon.setAlpha(1f);
                            }
                            holder.userStatusIcon.setVisibility(View.VISIBLE);
                        } else {
                            holder.userStatusIcon.setVisibility(View.GONE);
                        }

                        // Set Release Info
                        if (hasMessage) {
                            holder.animeReleaseInfo.setTextColor(context.getResources().getColor(fontColorId));
                            holder.animeReleaseInfo.setText(anime.message);
                        } else {
                            holder.animeReleaseInfo.setTextColor(context.getResources().getColor(R.color.grey));
                            holder.animeReleaseInfo.setText(R.string.na);
                        }
                    }, taskId);

                    if (finalImageBitmap != null) {
                        uiTask.post(() -> holder.animeImage.setImageBitmap(finalImageBitmap), taskId);
                    } else {
                        // Generate and Set Image
                        imageBitmap = cropAndRoundCorners(BitmapFactory.decodeByteArray(anime.imageByte, 0, anime.imageByte.length), 24);
                        imageCache.put(animeKey, imageBitmap);
                        final Bitmap generatedImageBitmap = imageBitmap;
                        uiTask.post(() -> holder.animeImage.setImageBitmap(generatedImageBitmap), taskId);
                    }
                    if (progressCircular.getVisibility() == View.VISIBLE) {
                        uiTask.post(() -> progressCircular.setVisibility(View.GONE), taskId);
                    }
                    uiTask.post(() -> {
                        setAnimation(holder.itemView);
                        holder.itemView.setVisibility(View.VISIBLE);
                    }, taskId);
                    break;
                }
                default: {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        Utils.handleUncaughtException(this.context.getApplicationContext(), new IllegalStateException("Unsupported item type"), "onBindViewHolder");
                    }
                }
            }
        });
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    public void add(int position, GroupedListItem item) {
        if (position == items.size()) {
            items.add(position, item);
            notifyItemInserted(position);
        }
    }
    @RequiresApi(api = Build.VERSION_CODES.N)
    public void set(int position, GroupedListItem item) {
        if (position < items.size()) {
            items.set(position, item);
            notifyItemChanged(position);
        }
    }
    @RequiresApi(api = Build.VERSION_CODES.N)
    public void remove(int position) {
        if (position < items.size()) {
            items.remove(position);
            notifyItemRemoved(position);
        }
    }
    @RequiresApi(api = Build.VERSION_CODES.N)
    @Override
    public int getItemCount() {
        return items.size();
    }
    @Override
    public int getItemViewType(int position) {
        if (position < items.size()) {
            return items.get(position).getType();
        }
        return -1;
    }
    private void setAnimation(View view) {
        view.startAnimation(AnimationUtils.loadAnimation(context, R.anim.fade_in));
    }
    @Override
    public void onViewDetachedFromWindow(@NonNull final RecyclerView.ViewHolder holder) {
        holder.itemView.clearAnimation();
    }
    private static class HeaderViewHolder extends RecyclerView.ViewHolder {
        @NonNull final TextView animeReleaseGroupDate;
        HeaderViewHolder(@NonNull View view) {
            super(view);
            this.animeReleaseGroupDate = (TextView) view;
        }
    }
    private static class ItemViewHolder extends RecyclerView.ViewHolder {
        @NonNull final ImageView animeImage;
        @NonNull final TextView animeName;
        @NonNull final View userStatusIcon;
        @NonNull final TextView animeReleaseInfo;
        @NonNull final TextView animeReleaseTime;
        ItemViewHolder(@NonNull View view) {
            super(view);
            this.animeImage = view.findViewById(R.id.anime_image);
            this.animeName = view.findViewById(R.id.anime_name);
            this.userStatusIcon = view.findViewById(R.id.user_status_icon);
            this.animeReleaseInfo = view.findViewById(R.id.anime_release_info);
            this.animeReleaseTime = view.findViewById(R.id.anime_release_time);
        }
    }
    @RequiresApi(api = Build.VERSION_CODES.N)
    @Override
    public void onDetachedFromRecyclerView(@NonNull RecyclerView recyclerView) {
        backgroundTask.shutDownNow();
        uiTask.shutDownNow();
        super.onDetachedFromRecyclerView(recyclerView);
    }
}