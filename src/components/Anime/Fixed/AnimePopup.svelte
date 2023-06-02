<script>
    import {
        finalAnimeList,
        animeLoaderWorker,
        dataStatus,
        filterOptions,
        autoPlay,
        popupVisible,
    } from "../../../js/globalValues.js";
    import { isJsonObject, formatNumber } from "../../../js/others/helper.js";

    let popupContent;

    function handlePopupVisibility(e) {
        let target = e.target;
        let classList = target.classList;
        if (
            target.closest(".popup-container") ||
            classList.contains("popup-container")
        )
            return;
        $popupVisible = false;
    }

    let delayedHide;
    popupVisible.subscribe((val) => {
        if (!val) {
            setTimeout(() => {
                delayedHide = val;
            }, 400);
        } else {
            delayedHide = val;
        }
    });

    function handleSeeMore(animeIdx) {
        console.log(animeIdx);
        if ($finalAnimeList[animeIdx]) {
            $finalAnimeList.isSeenMore = !$finalAnimeList.isSeenMore;
        }
        console.log($finalAnimeList.isSeenMore);
    }

    function getContentWarning({
        contentWarning,
        meanScoreAll,
        meanScoreAbove,
        score,
    }) {
        let _contentWarning = (contentWarning?.warning || []).concat(
            contentWarning?.semiWarning || []
        );
        if (score < meanScoreAll) {
            // Very Low Score
            _contentWarning.push(
                `Very Low Score (mean: ${formatNumber(meanScoreAll)})`
            );
        } else if (score < meanScoreAbove) {
            // Low Score
            _contentWarning.push(
                `Low Score (mean: ${formatNumber(meanScoreAbove)})`
            );
        }
        return _contentWarning.join(", ") || "";
    }

    function getWarningColor({
        contentWarning,
        meanScoreAll,
        meanScoreAbove,
        score,
    }) {
        console.log(contentWarning, meanScoreAll, meanScoreAbove, score);
        if (contentWarning?.warning?.length) {
            // Warning
            return "red";
        } else if (score < meanScoreAll) {
            // Very Low Score
            return "purple";
        } else if (score < meanScoreAbove) {
            // Low Score
            return "orange";
        } else if (contentWarning?.semiWarning?.length) {
            // Semi Warning
            return "teal";
        } else {
            return "green";
        }
    }
</script>

<div
    id="popup-wrapper"
    class="popup-wrapper"
    on:click={handlePopupVisibility}
    on:keydown={handlePopupVisibility}
    style:visibility={delayedHide ? "visible" : "hidden"}
    style:pointer-events={delayedHide ? "" : "none"}
>
    <div
        id="popup-container"
        class="popup-container"
        bind:this={popupContent}
        style:--translateY={window.innerHeight + "px"}
        class:hide={!$popupVisible}
    >
        {#each $finalAnimeList || [] as anime, animeIdx (anime.id)}
            <div class="popup-content" bind:this={anime.popupElement}>
                <div class="popup-main">
                    <div class="popup-trailer" style:display="none">
                        <div class="trailer" />
                    </div>
                    <div class="popup-img">
                        <div class="youtubeDirect">
                            <img
                                src={anime.bannerImageUrl}
                                alt="bannerImg"
                                style:opacity="0"
                                class="bannerImg"
                                on:load={(e) => (e.target.style.opacity = 0.75)}
                            />
                            <img
                                src={anime.coverImageUrl}
                                alt="coverImg"
                                style:opacity="0"
                                class="coverImg"
                                on:load={(e) => (e.target.style.opacity = 1)}
                            />
                        </div>
                    </div>
                    <div class="button-container">
                        <label class="switch">
                            <input
                                type="checkbox"
                                class="autoplayToggle"
                                bind:checked={$autoPlay}
                            />
                            <span class="slider round" />
                        </label>
                    </div>
                    <div class="popup-body">
                        <div class="anime-title-container">
                            <a
                                rel="noopener noreferrer"
                                target="_blank"
                                href={anime.animeUrl || ""}
                                class={getWarningColor(anime) +
                                    "-color anime-title"}
                                >{anime?.title || "N/A"}</a
                            >
                        </div>
                        <div
                            class="info-list"
                            style:max-height={anime.isSeenMore ? "none" : ""}
                        >
                            <div>
                                <div class="info-categ">Format</div>
                                <div class="format-popup info">
                                    {anime.format || "N/A"}
                                </div>
                            </div>
                            <div>
                                <div class="info-categ">Studio</div>
                                <div class="studio-popup info">
                                    {#if Object.entries(anime?.studios || {}).length}
                                        {#each Object.entries(anime.studios || {}) as [studio, studioUrl] (studio)}
                                            <a
                                                rel="noopener noreferrer"
                                                target="_blank"
                                                href={studioUrl || ""}
                                                >{studio || "N/A"}</a
                                            >
                                        {/each}
                                    {:else}
                                        N/A
                                    {/if}
                                </div>
                            </div>
                            <div>
                                <div class="info-categ">Genres</div>
                                <div class="genres-popup info">
                                    {#if anime.genres.length}
                                        {#each anime.genres as genre, idx (genre)}
                                            {idx < anime.genres.length - 1
                                                ? genre + ", "
                                                : genre}
                                        {/each}
                                    {:else}
                                        N/A
                                    {/if}
                                </div>
                            </div>
                            <div>
                                <div class="info-categ">Score</div>
                                <div class="score-popup info">
                                    {anime.score || "N/A"}
                                </div>
                            </div>
                            <div>
                                <div class="info-categ">Favourite Contents</div>
                                <div class="top-similarities-popup info">
                                    {#each anime.favoriteContents || [] as favoriteContent, idx (favoriteContent)}
                                        {#if isJsonObject(favoriteContent)}
                                            {#each Object.entries(favoriteContent) || [] as [studio, studioUrl] (studio)}
                                                <a
                                                    rel="noopener noreferrer"
                                                    target="_blank"
                                                    href={studioUrl}>{studio}</a
                                                >{idx <
                                                anime.favoriteContents.length -
                                                    1
                                                    ? ", "
                                                    : ""}
                                            {/each}
                                        {:else if typeof favoriteContent === "string"}
                                            {favoriteContent +
                                                (idx <
                                                anime.favoriteContents.length -
                                                    1
                                                    ? ", "
                                                    : "")}
                                        {/if}
                                    {/each}
                                </div>
                            </div>
                            <div>
                                <div class="info-categ">Content Cautions</div>
                                <div class="content-warning-popup info">
                                    {getContentWarning(anime) || "N/A"}
                                </div>
                            </div>
                            <div>
                                <div class="info-categ">User Status</div>
                                <div class="user-status-popup info">
                                    {anime.userStatus || "N/A"}
                                </div>
                            </div>
                            <div>
                                <div class="info-categ">Status</div>
                                <div class="status-popup info">
                                    {anime.status || "N/A"}
                                </div>
                            </div>
                            <div>
                                <div class="info-categ">Tags</div>
                                <div class="tags-popup info">
                                    {#if anime.tags.length}
                                        {#each anime.tags as tag, idx (tag)}
                                            {idx < anime.tags.length - 1
                                                ? tag + ", "
                                                : tag}
                                        {/each}
                                    {:else}
                                        N/A
                                    {/if}
                                </div>
                            </div>
                            <div>
                                <div class="info-categ">Average Score</div>
                                <div class="average-score-popup info">
                                    {anime.averageScore || "N/A"}
                                </div>
                            </div>
                            <div>
                                <div class="info-categ">Season Year</div>
                                <div class="season-year-popup info">
                                    {`${anime?.season || ""}${
                                        anime?.year ? " " + anime.year : ""
                                    }` || "N/A"}
                                </div>
                            </div>
                            <div>
                                <div class="info-categ">User Score</div>
                                <div class="user-score-popup info">
                                    {anime.userScore || "N/A"}
                                </div>
                            </div>
                            <div>
                                <div class="info-categ">Popularity</div>
                                <div class="popularity-popup info">
                                    {anime.popularity || "N/A"}
                                </div>
                            </div>
                            <div>
                                <div class="info-categ">Wscore</div>
                                <div class="wscore-popup info">
                                    {anime.weightedScore || "N/A"}
                                </div>
                            </div>
                        </div>
                        <div class="footer">
                            <button
                                class="seemoreless"
                                on:click={handleSeeMore(animeIdx)}
                                on:keydown={handleSeeMore(animeIdx)}
                                >See More</button
                            >
                            <button class="hideshowbtn">---</button>
                        </div>
                    </div>
                </div>
            </div>
        {/each}
    </div>
    <div
        id="closing-x"
        class="closing-x"
        on:click={handlePopupVisibility}
        on:keydown={handlePopupVisibility}
    >
        &#215;
    </div>
</div>

<style>
    .popup-wrapper {
        position: fixed;
        z-index: 995;
        left: 0;
        top: 0;
        width: 100%;
        max-height: 100%;
        min-height: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        overflow: hidden;
        align-items: center;
    }

    .popup-container {
        display: flex;
        width: 100%;
        max-width: 600px;
        max-height: 100%;
        min-height: 100%;
        height: 100%;
        flex-direction: column;
        overflow: auto;
        transition: 0.3s ease transform;
    }

    .popup-container.hide {
        transform: translateY(var(--translateY));
    }

    .popup-container::-webkit-scrollbar {
        display: none;
    }

    .popup-content {
        display: flex;
        flex-direction: column;
        color: #909cb8;
        background-color: #151f2e;
        width: 100%;
        max-width: 600px;
        position: relative;
    }

    .popup-main {
        display: initial;
        /* visibility: hidden; */
    }

    .popup-trailer {
        width: 100%;
        position: relative;
        padding-bottom: 56.25%;
        background: #000;
    }

    iframe.trailer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }

    .popup-img {
        width: 100%;
        position: relative;
        padding-bottom: 56.25%;
        background-color: #000 !important;
    }

    .popup-img .bannerImg {
        height: 100%;
        width: 100%;
        position: absolute;
        object-fit: cover;
        object-position: revert;
    }

    .popup-img .bannerImg::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .popup-img .coverImg {
        height: 100%;
        max-height: clamp(1px, 70%, 20em);
        width: auto;
        object-fit: cover;
        position: absolute;
        left: 50%;
        bottom: 0;
        transform: translateX(-50%);
        border-radius: 2px 2px 0 0;
        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25),
            0 10px 10px rgba(0, 0, 0, 0.22);
    }

    .close-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 20px;
        background-color: transparent;
        border: none;
        cursor: pointer;
        color: #000;
    }

    .close-btn:hover {
        color: #999;
    }

    .popup-body {
        overflow: auto;
        min-height: 11em;
        flex: 0 1 auto;
        touch-action: pan-y;
        margin: 2.4em;
    }

    .popup-body a {
        color: #0055c8;
        text-decoration: none;
    }

    .popup-body .anime-title-container {
        width: 100%;
        overflow-x: auto;
        white-space: nowrap;
        align-items: center;
        display: flex;
        position: relative;
    }

    .anime-title-container .anime-title {
        padding: 0.5em;
        border-radius: 0.1em;
        width: max-content;
        cursor: pointer;
        font-size: clamp(1.6309rem, 1.76545rem, 1.9rem);
        font-weight: 400;
    }

    .anime-title-container .anime-title:hover {
        background-color: rgba(0, 0, 0, 0.5);
    }

    .anime-title-container a.anime-title {
        text-decoration: none;
    }

    .popup-body .footer {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 1em;
    }

    .popup-body .footer button {
        padding: 0.5em 1.5em 0.5em 1.5em;
        border-radius: 0.1em;
        outline: 0;
        border: 0;
        background-color: #0b1622 !important;
        cursor: pointer;
        color: #798695 !important;
        white-space: nowrap;
        max-width: 95px;
        flex: 1;
    }

    .popup-body .footer button.show {
        background-color: rgb(40 69 102) !important;
        color: #b8bfd1 !important;
    }

    .popup-body .footer button.hide:focus,
    .popup-body .footer button.hide:hover {
        background-color: #d75a72 !important;
        color: #fff !important;
    }

    .info-list {
        max-height: 235px;
        overflow: hidden;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-gap: 0.8em;
        padding: 0 0.8em !important;
        margin: 0.5em 0 1.6em 0;
    }

    @media screen and (orientation: portrait) {
        .info-list {
            max-height: 410px;
            grid-template-columns: repeat(1, 1fr);
        }

        .image-grid__card {
            animation: fadeIn var(--transDur) ease-in;
            width: 47%;
        }

        .image-grid__card-title {
            display: flex;
            flex-wrap: wrap;
            padding: clamp(0.1em, 0.3em, 0.5em);
            font-size: clamp(1.2rem, 1.3rem, 1.4rem);
            background-color: transparent;
        }

        .image-grid__card-title i {
            font-size: 0.9rem;
        }

        .image-grid__card .image-grid__card-thumb {
            height: 210px !important;
        }
    }

    .image-grid__card-title i {
        font-size: 1rem;
    }

    .info-list div {
        margin-bottom: 0.8em;
    }

    .info-list .info-categ {
        font-size: clamp(1.0631rem, 1.15155rem, 1.24rem);
        font-weight: 500;
        max-width: fit-content;
    }

    .info-list .info {
        font-size: clamp(1.018rem, 1.099rem, 1.18rem);
        line-height: 1.3;
        max-width: fit-content;
    }

    .popup-body a.darkMode {
        color: #0055c8;
    }

    .popup-content .button-container {
        background-color: #000 !important;
        display: flex;
        justify-content: center;
        padding: 5px;
        align-items: center;
        z-index: 1;
        position: relative;
        user-select: none;
    }

    .popup-content .button-next,
    .popup-content .button-prev {
        background-color: #000 !important;
        color: #909cb8 !important;
        padding: 0.5em 1.5em 0.5em 1.5em;
        border-radius: 0.1em;
        outline: 0;
        border: 0;
        cursor: pointer;
    }

    .popup-content .button-left:hover,
    .popup-content .button-right:hover {
        background-color: #ccc;
    }

    .closing-x {
        font-size: 25px;
        width: 25px;
        height: 25px;
        text-align: center;
        position: fixed;
        right: 10px;
        top: 10px;
        vertical-align: middle;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        cursor: pointer;
        border-radius: 50%;
        z-index: 2;
        user-select: none;
        background-color: transparent;
    }

    .closing-x:focus,
    .closing-x:hover {
        background-color: rgba(0, 0, 0, 0.75);
    }

    .switch {
        position: relative;
        display: inline-block;
        width: 43px;
        height: 20px;
    }

    .switch input {
        display: none;
    }

    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #767284;
        -webkit-transition: 0.4s transform;
        transition: 0.4s transform;
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 2px;
        bottom: 2px;
        background-color: #fff;
        -webkit-transition: 0.4s transform;
        transition: 0.4s transform;
    }

    input:checked + .slider {
        background-color: rgb(40 69 102);
    }

    input:focus + .slider {
        box-shadow: 0 0 1px #2196f3;
    }

    input:checked + .slider:before {
        -webkit-transform: translateX(22px);
        -ms-transform: translateX(22px);
        transform: translateX(22px);
    }

    .slider.round {
        border-radius: 34px;
    }

    .slider.round:before {
        border-radius: 50%;
    }
</style>
