<script>
    import { tick } from "svelte";
    import {
        finalAnimeList,
        searchedAnimeKeyword,
        animeLoaderWorker,
        dataStatus,
        filterOptions,
        popupVisible,
    } from "../../js/globalValues.js";
    import {
        formatNumber,
        ncsCompare,
        isJsonObject,
        jsonIsEmpty,
    } from "../../js/others/helper.js";

    let renderedImgGridLimit = 20;
    let shownAllInList = false;

    let justifyContent =
        window.innerWidth / 180 <= 3.5 ? "space-evenly" : "space-between";

    let observer;
    let observerTimeout;

    function addObserver() {
        observer = new IntersectionObserver(
            (entries, self) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        self.unobserve(entry.target);
                        if (observerTimeout) clearTimeout(observerTimeout);
                        observerTimeout = setTimeout(() => {
                            $animeLoaderWorker.postMessage({
                                loadMore: true,
                                shownAnimeLen: $finalAnimeList.length,
                            });
                        }, 300);
                    }
                });
            },
            {
                root: null,
                rootMargin: "100%",
                threshold: 0,
            }
        );
    }

    animeLoaderWorker.subscribe((val) => {
        if (val instanceof Worker) {
            val.onmessage = ({ data }) => {
                if (data?.status !== undefined) $dataStatus = data.status;
                else if (
                    data.finalAnimeList instanceof Array &&
                    $finalAnimeList instanceof Array
                ) {
                    if (data.isNew) {
                        $finalAnimeList = data.finalAnimeList;
                    } else {
                        $finalAnimeList = $finalAnimeList.concat(
                            data.finalAnimeList
                        );
                        if (data.isLast) {
                            shownAllInList = true;
                            if (observer) {
                                observer.disconnect();
                                observer = null;
                            }
                        }
                    }
                }
            };
            val.onerror = (error) => {
                console.error(error);
            };
        }
    });

    finalAnimeList.subscribe((val) => {
        if (val instanceof Array && val.length) {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            if ($finalAnimeList.length && !shownAllInList) {
                (async () => {
                    addObserver();
                    await tick();
                    // Grid Observed
                    observer.observe(
                        $finalAnimeList[$finalAnimeList.length - 1].gridElement
                    );
                    // Popup Observed
                    observer.observe(
                        $finalAnimeList[$finalAnimeList.length - 1].popupElement
                    );
                })();
            }
        } else {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
        }
        if (val?.length <= 2) {
            justifyContent = "space-evenly";
        } else if (val) {
            justifyContent = "space-between";
        }
    });

    searchedAnimeKeyword.subscribe(async (val) => {
        if (typeof val === "string" && $animeLoaderWorker instanceof Worker) {
            shownAllInList = false;
            $animeLoaderWorker.postMessage({
                filterKeyword: val,
            });
        }
    });

    window.addEventListener("resize", () => {
        if ($finalAnimeList?.length < 3 || window.innerWidth / 180 <= 3.75) {
            justifyContent = "space-evenly";
        } else {
            justifyContent = "space-between";
        }
    });

    function getBriefInfo({
        contentWarning,
        favoriteContents,
        meanScoreAll,
        meanScoreAbove,
        score,
    }) {
        let _favoriteContents = [];
        favoriteContents?.forEach((e) => {
            if (isJsonObject(e)) {
                _favoriteContents.push(Object.keys(e)[0]);
            } else if (typeof e === "string") {
                _favoriteContents.push(e);
            }
        });

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
        let briefInfo = "";
        if (_favoriteContents.length) {
            briefInfo +=
                "Favorite Contents: " + _favoriteContents.join(", ") || "";
        }
        if (_contentWarning.length) {
            briefInfo += "\n\nContent Warnings: " + _contentWarning.join(", ");
        }
        return briefInfo;
    }

    function getShownScore({ weightedScore, score, averageScore, userScore }) {
        let sortName = $filterOptions?.sortFilter.filter(
            ({ sortType }) => sortType !== "none"
        )?.[0]?.sortName;
        if (sortName === "score") {
            return formatNumber(score);
        } else if (sortName === "user score") {
            return userScore;
        } else if (sortName === "average score") {
            return averageScore;
        } else {
            return formatNumber(weightedScore);
        }
    }

    function getWarningColor({
        contentWarning,
        meanScoreAll,
        meanScoreAbove,
        score,
    }) {
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

    function getUserStatusColor(userStatus) {
        if (ncsCompare(userStatus, "completed")) {
            return "green";
        } else if (
            ncsCompare(userStatus, "current") ||
            ncsCompare(userStatus, "repeating")
        ) {
            return "blue";
        } else if (ncsCompare(userStatus, "planning")) {
            return "orange";
        } else if (ncsCompare(userStatus, "paused")) {
            return "peach";
        } else if (ncsCompare(userStatus, "dropped")) {
            return "red";
        } else {
            return "lightgrey"; // Default Unwatched Icon Color
        }
    }
</script>

<main>
    <div
        id="anime-grid"
        class="image-grid"
        style:justify-content={justifyContent}
    >
        {#if $finalAnimeList?.length}
            {#each $finalAnimeList || [] as anime (anime.id)}
                <div
                    class="image-grid__card"
                    bind:this={anime.gridElement}
                    title={getBriefInfo(anime)}
                >
                    <div class="shimmer">
                        <img
                            style:opacity="0"
                            class="image-grid__card-thumb"
                            alt="anime-cover"
                            src={anime.coverImageUrl}
                            on:load={(e) => (e.target.style.opacity = 1)}
                            on:click={() => ($popupVisible = true)}
                            on:keydown={() => ($popupVisible = true)}
                        />
                    </div>
                    <span class="image-grid__card-title">
                        <span class="title">{anime.title || "N/A"}</span>
                        <span class="brief-info">
                            <div class="brief-info">
                                <i
                                    class={`${getUserStatusColor(
                                        anime.userStatus
                                    )}-color fa-solid fa-circle`}
                                />
                                {`${anime.format || "N/A"}${
                                    anime.episodes
                                        ? " [" + anime.episodes + "]"
                                        : ""
                                }`}
                            </div>
                            <div class="brief-info">
                                <i
                                    class={`${getWarningColor(
                                        anime
                                    )}-color fa-solid fa-star`}
                                />
                                {#if $filterOptions}
                                    {getShownScore(anime) || "N/A"}
                                {:else}
                                    {formatNumber(anime.weightedScore) || "N/A"}
                                {/if}
                            </div>
                        </span>
                    </span>
                </div>
            {/each}
            {#if $finalAnimeList?.length && !shownAllInList}
                {#each Array(1) as _}
                    <div class="image-grid__card skeleton">
                        <div class="shimmer">
                            <img
                                style:opacity="0"
                                class="image-grid__card-thumb skeleton"
                                alt=""
                            />
                        </div>
                    </div>
                {/each}
            {/if}
        {:else if !$finalAnimeList}
            {#each Array(renderedImgGridLimit) as _}
                <div class="image-grid__card skeleton">
                    <div class="shimmer">
                        <img
                            style:opacity="0"
                            class="image-grid__card-thumb skeleton"
                            alt=""
                        />
                    </div>
                </div>
            {/each}
        {:else}
            {"Empty Data"}
        {/if}
    </div>
</main>

<style>
    main {
        width: 100%;
        height: 100%;
    }

    .skeleton {
        border-radius: 6px !important;
        background-color: rgba(30, 42, 56, 0.8) !important;
    }

    .image-grid__card.skeleton {
        background-color: rgba(30, 42, 56, 0.8) !important;
    }
    .image-grid__card > div.shimmer {
        height: 240px !important;
    }

    .image-grid {
        display: grid;
        /* flex-wrap: wrap; */
        justify-content: space-between;
        align-items: flex-start;
        grid-gap: 0.8rem;
        margin: 1.5em 0;
        grid-template-columns: repeat(
            auto-fit,
            minmax(min(100%/2 - 0.8rem, 180px), 0)
        );
    }

    .image-grid__card {
        animation: svelte-1g3ymol-fadeIn var(--transDur) ease-in;
        width: 100%;
        margin: 0 auto;
    }

    .image-grid__card .image-grid__card-thumb {
        background: #0003;
        border-radius: 0.25em;
        display: block;
        overflow: hidden;
        position: relative;
        height: 240px;
        box-shadow: 0 0 0.375em #0b1622;
        will-change: transform;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    .image-grid__card:not(.skeleton):focus .image-grid__card-thumb,
    .image-grid__card:not(.skeleton):hover .image-grid__card-thumb {
        opacity: 0.5 !important;
        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25),
            0 10px 10px rgba(0, 0, 0, 0.22);
    }

    .image-grid__card-thumb {
        object-fit: cover;
        width: 100%;
        height: 100%;
        transition: all 125ms linear;
        user-select: none;
    }

    .image-grid__card-thumb-portrait {
        width: 100%;
        height: auto;
    }

    .image-grid__card-title {
        display: flex;
        flex-wrap: wrap;
        padding: clamp(0.1em, 0.3em, 0.5em);
        font-size: clamp(1.2rem, 1.3rem, 1.4rem);
        background-color: transparent;
    }

    .image-grid__card-title span {
        flex: 1;
        min-width: 100%;
        margin: 0;
        padding: 0;
        display: flex;
        gap: 0.5ch;
        flex-flow: wrap;
        background-color: transparent;
    }

    .image-grid__card-title span.title {
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        text-overflow: unset;
    }

    .image-grid__card-title span.title::-webkit-scrollbar {
        display: none;
    }

    .image-grid__card-title span.brief-info div {
        width: fit-content;
    }

    .image-grid__status {
        justify-content: center;
        display: flex;
        align-items: center;
        flex-direction: column;
        gap: 1em;
        animation: fadeIn var(--transDur) linear;
        text-align: center;
        width: 100%;
        grid-column: 1/-1;
    }

    .empty-img {
        flex: 1;
        width: clamp(6rem, 6.5rem, 7rem);
    }

    .pl,
    .pl:after,
    .pl:before {
        animation-duration: 2s;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
    }

    .pl {
        margin: 0 auto 1.5em auto;
        position: relative;
        width: 3em;
        height: 3em;
        content: "";
        display: inline-block;
        border: 0.25em solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation-name: spin;
    }

    .pl:after,
    .pl:before {
        background: 0 0;
        content: "";
    }

    .pl:before {
        top: -0.25em;
        left: -0.25em;
        width: 2.5em;
        height: 2.5em;
        border-radius: 50%;
        border-bottom-color: currentColor;
    }

    .pl:after {
        top: -0.25em;
        left: -0.25em;
        width: 2.5em;
        height: 2.5em;
        border-radius: 50%;
        border-bottom-color: currentColor;
    }

    @keyframes spin {
        0% {
            transform: rotate(0);
        }

        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }

        to {
            opacity: 1;
        }
    }

    .shimmer {
        position: relative;
        overflow: hidden;
    }

    .shimmer::before {
        animation: loadingShimmer 2s linear infinite;
        position: absolute;
        background: linear-gradient(
            90deg,
            rgba(30, 42, 56, 0) 0,
            rgba(8, 143, 214, 0.06) 40%,
            rgba(8, 143, 214, 0.06) 60%,
            rgba(30, 42, 56, 0)
        );
        content: "";
        display: block;
        height: 100%;
        transform: translateX(0);
        width: 200%;
    }
    @keyframes loadingShimmer {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(100%);
        }
    }
</style>
