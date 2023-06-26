<script>
    import { tick } from "svelte";
    import {
        finalAnimeList,
        searchedAnimeKeyword,
        animeLoaderWorker,
        dataStatus,
        filterOptions,
        animeObserver,
        popupVisible,
        openedAnimePopupIdx,
        animeOptionVisible,
        openedAnimeOptionIdx,
        initData,
        asyncAnimeReloaded,
        animeIdxRemoved,
        shownAllInList,
    } from "../../js/globalValues.js";
    import {
        formatNumber,
        ncsCompare,
        isJsonObject,
    } from "../../js/others/helper.js";

    let observerTimeout;
    let observerDelay = 1000;

    function addObserver() {
        $animeObserver = new IntersectionObserver(
            (entries, self) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        self.unobserve(entry.target);
                        if (observerTimeout) clearTimeout(observerTimeout);
                        observerTimeout = setTimeout(() => {
                            if ($animeLoaderWorker instanceof Worker) {
                                $animeLoaderWorker.postMessage({
                                    loadMore: true,
                                });
                            }
                        }, observerDelay);
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
            val.onmessage = async ({ data }) => {
                await tick();
                if (data?.status !== undefined) $dataStatus = data.status;
                else if (
                    data.finalAnimeList instanceof Array &&
                    $finalAnimeList instanceof Array
                ) {
                    if (data?.reload === true) {
                        $finalAnimeList = data.finalAnimeList;
                        $asyncAnimeReloaded = !$asyncAnimeReloaded;
                    } else if (data.isNew === true) {
                        $finalAnimeList = data.finalAnimeList;
                    } else if (data.isNew === false) {
                        $finalAnimeList = $finalAnimeList.concat(
                            data.finalAnimeList
                        );
                        if (data.isLast) {
                            $shownAllInList = true;
                            if (
                                $animeObserver instanceof IntersectionObserver
                            ) {
                                $animeObserver.disconnect();
                                $animeObserver = null;
                            }
                        }
                    }
                } else if (
                    data.isRemoved === true &&
                    typeof data.removedID === "number"
                ) {
                    if (
                        $animeObserver instanceof IntersectionObserver &&
                        $finalAnimeList[Math.max($finalAnimeList.length - 2, 0)]
                            .gridElement instanceof Element
                    ) {
                        $animeObserver.observe(
                            $finalAnimeList[
                                Math.max($finalAnimeList.length - 2, 0)
                            ].gridElement
                        );
                    }
                    let removedIdx = $finalAnimeList.findIndex(
                        ({ id }) => id === data.removedID
                    );
                    $finalAnimeList = $finalAnimeList.filter(
                        ({ id }) => id !== data.removedID
                    );
                    if (removedIdx >= 0) {
                        $animeIdxRemoved = removedIdx;
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
            if ($shownAllInList) {
                $shownAllInList = false;
            }
            if ($animeObserver) {
                $animeObserver.disconnect();
                $animeObserver = null;
            }
            (async () => {
                await tick();
                addObserver();
                if (
                    $animeObserver instanceof IntersectionObserver &&
                    $finalAnimeList[$finalAnimeList.length - 1]
                        .gridElement instanceof Element
                ) {
                    $animeObserver.observe(
                        $finalAnimeList[$finalAnimeList.length - 1].gridElement
                    );
                }
            })();
        } else {
            if ($animeObserver) {
                $animeObserver?.disconnect?.();
                $animeObserver = null;
            }
        }
    });

    searchedAnimeKeyword.subscribe(async (val) => {
        if (typeof val === "string" && $animeLoaderWorker instanceof Worker) {
            $shownAllInList = false;
            $animeLoaderWorker.postMessage({
                filterKeyword: val,
            });
        }
    });

    function handleOpenPopup(animeIdx) {
        $openedAnimePopupIdx = animeIdx;
        $popupVisible = true;
    }

    let openOptionTimeout;
    function handleOpenOption(animeIdx) {
        if (openOptionTimeout) clearTimeout(openOptionTimeout);
        openOptionTimeout = setTimeout(() => {
            $openedAnimeOptionIdx = animeIdx;
            $animeOptionVisible = true;
        }, 500);
    }
    function cancelOpenOption() {
        if (openOptionTimeout) clearTimeout(openOptionTimeout);
    }

    function getBriefInfo({
        contentCaution,
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

        let _contentCaution = (contentCaution?.caution || []).concat(
            contentCaution?.semiCaution || []
        );
        if (score < meanScoreAll) {
            // Very Low Score
            _contentCaution.push(
                `Very Low Score (mean: ${formatNumber(meanScoreAll)})`
            );
        } else if (score < meanScoreAbove) {
            // Low Score
            _contentCaution.push(
                `Low Score (mean: ${formatNumber(meanScoreAbove)})`
            );
        }
        let briefInfo = "";
        if (_favoriteContents.length) {
            briefInfo +=
                "Favorite Contents: " + _favoriteContents.join(", ") || "";
        }
        if (_contentCaution.length) {
            briefInfo += "\n\nContent Cautions: " + _contentCaution.join(", ");
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

    function getCautionColor({
        contentCaution,
        meanScoreAll,
        meanScoreAbove,
        score,
    }) {
        if (contentCaution?.caution?.length) {
            // Caution
            return "red";
        } else if (score < meanScoreAll) {
            // Very Low Score
            return "purple";
        } else if (score < meanScoreAbove) {
            // Low Score
            return "orange";
        } else if (contentCaution?.semiCaution?.length) {
            // Semi Caution
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

    let gridContentVisibility = "auto";
    window.addEventListener("scroll", () => {
        if (window.scrollY >= 265) {
            gridContentVisibility = "visible";
        } else {
            gridContentVisibility = "auto";
        }
    });
</script>

<main>
    <div id="anime-grid" class="image-grid">
        {#if $finalAnimeList?.length}
            {#each $finalAnimeList || [] as anime, animeIdx (anime.id)}
                <div
                    class="image-grid__card"
                    bind:this={anime.gridElement}
                    title={getBriefInfo(anime)}
                    style:--content-visibility={gridContentVisibility ||
                        "visible"}
                >
                    <div class="shimmer">
                        <img
                            loading="lazy"
                            style:opacity="0"
                            class="image-grid__card-thumb"
                            alt="anime-cover"
                            src={anime.coverImageUrl || ""}
                            on:load={(e) => (e.target.style.opacity = 1)}
                            on:click={handleOpenPopup(animeIdx)}
                            on:pointerdown={handleOpenOption(animeIdx)}
                            on:pointerup={cancelOpenOption}
                            on:pointercancel={cancelOpenOption}
                            on:keydown={(e) =>
                                e.key === "Enter" && handleOpenPopup(animeIdx)}
                        />
                    </div>
                    <span
                        class="image-grid__card-title copy"
                        copy-value={anime.title || ""}
                    >
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
                                    class={`${getCautionColor(
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
            {#if $finalAnimeList?.length && !$shownAllInList}
                {#each Array(6) as _}
                    <div class="image-grid__card skeleton">
                        <div class="shimmer" />
                        <span class="image-grid__card-title">
                            <span class="title skeleton shimmer" />
                            <span class="brief-info skeleton shimmer" />
                        </span>
                    </div>
                {/each}
            {/if}
        {:else if !$finalAnimeList || $initData}
            {#each Array(10) as _}
                <div class="image-grid__card skeleton">
                    <div class="shimmer" />
                    <span class="image-grid__card-title">
                        <span class="title skeleton shimmer" />
                        <span class="brief-info skeleton shimmer" />
                    </span>
                </div>
            {/each}
        {:else}
            <div class="empty">No Results</div>
        {/if}
    </div>
</main>

<style>
    main {
        width: 100%;
        height: 100%;
        margin: 2em 0;
    }

    .skeleton {
        border-radius: 6px !important;
        background-color: rgba(30, 42, 56, 0.8) !important;
    }

    .image-grid__card.skeleton {
        background-color: transparent !important;
    }

    .image-grid__card.skeleton .title {
        height: 10px;
        width: 75%;
        margin-bottom: clamp(0.1em, 0.3em, 0.5em);
    }

    .image-grid__card.skeleton .brief-info {
        height: 10px;
        width: 50%;
    }

    .image-grid {
        display: grid;
        justify-content: space-between;
        align-items: flex-start;
        grid-column-gap: 0.8rem;
        grid-row-gap: 1em;
        grid-template-columns: repeat(
            auto-fit,
            minmax(min(100%/2 - 0.8rem, 180px), 0)
        );
    }

    .image-grid__card {
        animation: fadeIn 0.3s ease-in;
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-rows: auto 57px;
        grid-template-columns: 100%;
        content-visibility: var(--content-visibility);
    }

    .image-grid__card > .shimmer {
        position: relative;
        padding-bottom: calc(181 / 128 * 100%);
        background-color: rgba(30, 42, 56, 0.8);
        border-radius: 0.25em;
    }

    .image-grid__card .image-grid__card-thumb {
        position: absolute;
        background: rgba(30, 42, 56, 0.8);
        border-radius: 0.25em;
        display: block;
        will-change: transform, opacity;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
        transition: transform opacity 0.3s ease;
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
        user-select: none;
    }

    .image-grid__card-thumb-portrait {
        width: 100%;
        height: auto;
    }

    .image-grid__card-title {
        padding: clamp(0.1em, 0.3em, 0.5em);
        font-size: clamp(1.2rem, 1.3rem, 1.4rem);
        background-color: transparent;
        height: 57px;
    }

    .image-grid__card-title span.brief-info {
        display: flex;
        gap: 0.5ch;
        flex-wrap: wrap;
    }

    .image-grid__card-title span.title {
        display: block;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
    }

    .image-grid__card-title span.title::-webkit-scrollbar {
        display: none;
    }

    .image-grid__card-title span.brief-info div {
        display: flex;
        align-items: center;
        white-space: nowrap;
        column-gap: 2px;
        user-select: none;
    }

    .brief-info i.fa-circle::before {
        font-size: 9px;
    }
    .brief-info i.fa-star::before {
        font-size: 10px;
    }

    .empty {
        font-size: 2rem;
        font-weight: 700;
        opacity: 1;
        padding: 30px;
        text-align: center;
        grid-column: 1 / -1;
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

    @media screen and (max-width: 656px) {
        .image-grid {
            justify-content: space-evenly;
        }
    }
</style>
