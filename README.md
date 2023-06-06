# Kanshi Anime Recommendation

This app is designed to provide anime recommendations based on your personal ratings of anime shows on Anilist. It uses an algorithm to analyze your ratings and suggest other anime shows that you may enjoy. If you're having trouble deciding what to watch next, this app can help you discover new anime that match your preferences.

## Android App

- [Kanshi App (Android)](https://github.com/u-Kuro/Kanshi-Android/raw/master/Kanshi.VI.apk)
## Website Links

- [Kanshi Web](https://kanshi.vercel.app/)
- [Kanshi Alternative 1](https://u-kuro.github.io/Kanshi.Anime-Recommendation/)

## Website Preview

![Website Preview 1](https://i.imgur.com/CQ9IdDn.png)
![Website Preview 2](https://i.imgur.com/xgkFlKr.png)

## Android Preview
<div style="display: flex; flex-wrap:nowrap;">
  <img src="https://i.imgur.com/ustd6E1.png" style="flex:1;width: 24%;">
  <img src="https://i.imgur.com/o8DouOw.png" style="flex:1;width: 24%;">
  <img src="https://i.imgur.com/Cl7X2kF.png" style="flex:1;width: 24%;">
  <img src="https://i.imgur.com/mLC9hYQ.png" style="flex:1;width: 24%;">
</div>


## User Guide: How to Use the Tool

1. Click an anime to show more information (includes endless scrolling of all anime in the list for convenience, Ctrl + X). 
2. Click the top bar to access the settings.
3. Auto-update and export options available in settings.
4. Update recommendations with the update button or shortcut (Ctrl + S).
5. Import/export your user data recommendations.
6. Use the hide unwatched sequel button to show only the first season or next unwatched sequel.
7. Pay attention to the warning icons:
   - Green icon: Anime doesn't include contents you dislike and has a great score given by the tool.
   - Teal icon: Anime has things you may dislike but not significant.
   - Orange icon: Low score given by the tool.
   - Purple icon: Very low score given by the tool.
   - Red icon: Explicit content.
   Consider these indicators before deciding to watch a particular anime. You can also sort the list by score to find underrated or underwatched anime that might be to your taste. However, be sure to check out the trailer or information on Anilist (linked by clicking the title in the popup) to make an informed decision.
8. The Anime Filter allows you to narrow down your recommendations and apply various filters and sorting options.
9. You can hide or unhide an anime in the app's list by clicking the "Show" or "Hide" button in the anime popup.
10. The Content Warning setting lets you choose to see warnings for certain types of anime content by clicking the Warning Icon.
11. The Filtering Algorithm Contents option in the settings lets you include or exclude specific types of content in calculating recommendations.
12. Other Features:
   - Trailer auto-play (can be turned on/off by switching or Ctrl + K).
   - Long click/press an anime in the main list view to allow fast interaction (includes Open Popup, Go to Anilist, Copy Title, Hide/Show Anime).
   - In PC you can hover over an anime in the main menu to immediately see what its content cautions, and contents in that anime that you may like.

## Recommendation Algorithm for Anime Selection

1. Averaging Variables: Variables such as genre, studio, and staff are averaged from the scores of each anime in your list that corresponds to them. If two or more anime have the same user score, the algorithm selects the one with the highest average score.

2. Linear Algorithm Model: For numeric contents such as year and average score, a linear algorithm model is built to predict a score.

3. Variable Clustering: Variables are clustered into three categories: anime content, anime production, and general trend. Each category is then further divided into types.

4. Likability/Score Calculation: The tool calculates the likability/score for each anime based on the available information. The contents associated with each anime are averaged by type, and each cluster is also averaged.

5. Score Calculation: The score for each cluster is calculated using a probability-based formula to avoid low scores. The final score is calculated by multiplying the scores of each cluster.

6. Weighted Score Calculation: The score for each cluster is calculated using a probability-based formula to avoid low scores in each cluster. In order to reduce high scores in anime with few variables, a weight is added for non-popular and low-average-scored anime. The weights are calculated based on the popularity and average score of each anime.

## How Anime Ratings are Calculated on Anilist

1. Anilist calculates a Wscore to prevent high likability scores for low-average scored and unpopular anime.

2. The likability score for anime is calculated equally, irrespective of its popularity and average score.

3. Anilist shows the top similarities that highly affected the likability scores based on your ratings. You can also see their own calculated averages, such as [Comedy (Here)].
