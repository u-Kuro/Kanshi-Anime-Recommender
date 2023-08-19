<script>
    import { onMount, tick } from "svelte";
    import {
        android,
        finalAnimeList,
        searchedAnimeKeyword,
        animeLoaderWorker,
        dataStatus,
        filterOptions,
        activeTagFilters,
        animeObserver,
        popupVisible,
        openedAnimePopupIdx,
        animeOptionVisible,
        openedAnimeOptionIdx,
        initData,
        asyncAnimeReloaded,
        animeIdxRemoved,
        shownAllInList,
        importantLoad,
        checkAnimeLoaderStatus,
        gridFullView,
        numberOfNextLoadedGrid,
    } from "../../js/globalValues.js";
    import {
        addClass,
        formatNumber,
        isJsonObject,
        ncsCompare,
        removeClass,
    } from "../../js/others/helper.js";
    import { fly } from "svelte/transition";

    let windowHeight = window.visualViewport.height;
    let date = new Date();
    let animeGridEl;
    let isRunningIntersectEvent;
    let numberOfLoadedGrid = 13;
    let observerDelay = 1000,
        loadingMore = false;

    function addLastAnimeObserver() {
        isRunningIntersectEvent = false;
        $animeObserver = new IntersectionObserver(
            (entries) => {
                if ($shownAllInList) return;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        loadingMore = true;
                        if (isRunningIntersectEvent) return;
                        isRunningIntersectEvent = true;
                        setTimeout(() => {
                            if ($animeLoaderWorker instanceof Worker) {
                                $checkAnimeLoaderStatus().then(() => {
                                    $animeLoaderWorker?.postMessage?.({
                                        loadMore: true,
                                    });
                                });
                            }
                            isRunningIntersectEvent = false;
                        }, observerDelay);
                    }
                });
            },
            {
                root: null,
                rootMargin: "100%",
                threshold: [0, 1],
            }
        );
    }

    onMount(() => {
        windowHeight = window.visualViewport.height;
        animeGridEl = animeGridEl || document.getElementById("anime-grid");
        window.addEventListener("resize", () => {
            windowHeight = window.visualViewport.height;
        });
        setInterval(() => {
            date = new Date();
        }, 1000);
    });

    let animeLoaderIsAlivePromise,
        checkAnimeLoaderStatusTimeout,
        isAsyncLoad = false;

    window.checkAnimeLoaderStatus = $checkAnimeLoaderStatus = async () => {
        if (
            $animeLoaderWorker instanceof Worker &&
            typeof $animeLoaderWorker.onmessage === "function"
        ) {
            return new Promise((resolve, reject) => {
                animeLoaderIsAlivePromise = { resolve, reject };
                $animeLoaderWorker?.postMessage?.({ checkStatus: true });
                clearTimeout(checkAnimeLoaderStatusTimeout);
                checkAnimeLoaderStatusTimeout = setTimeout(() => {
                    reject();
                }, 1000);
            })
                .catch(() => {
                    $animeLoaderWorker = null;
                    $finalAnimeList = null;
                    $importantLoad = !$importantLoad;
                    animeLoaderIsAlivePromise = null;
                })
                .finally(() => {
                    animeLoaderIsAlivePromise = null;
                });
        }
    };

    animeLoaderWorker.subscribe((val) => {
        if (val instanceof Worker) {
            val.onmessage = async ({ data }) => {
                if (animeLoaderIsAlivePromise?.resolve) {
                    if (data?.isAlive) {
                        animeLoaderIsAlivePromise?.resolve?.();
                        animeLoaderIsAlivePromise = null;
                    }
                }
                await tick();
                if (data?.status !== undefined) $dataStatus = data.status;
                else if (data.finalAnimeList instanceof Array) {
                    if (data?.reload === true) {
                        $finalAnimeList = data.finalAnimeList;
                        isAsyncLoad = true;
                        $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid;
                    } else if (data.isNew === true) {
                        $finalAnimeList = data.finalAnimeList;
                        $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid;
                    } else if (data.isNew === false) {
                        if ($finalAnimeList instanceof Array) {
                            $finalAnimeList = $finalAnimeList.concat(
                                data.finalAnimeList
                            );
                            if (data.isLast) {
                                $shownAllInList = true;
                                if (
                                    $animeObserver instanceof
                                    IntersectionObserver
                                ) {
                                    $animeObserver.disconnect();
                                    $animeObserver = null;
                                }
                            }
                        }
                        $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid;
                    }
                } else if (
                    data.isRemoved === true &&
                    typeof data.removedID === "number"
                ) {
                    let maxGridElIdx = Math.max($finalAnimeList.length - 2, 0);
                    let gridElement =
                        $finalAnimeList[maxGridElIdx].gridElement ||
                        animeGridEl.children?.[maxGridElIdx];
                    if (
                        $animeObserver instanceof IntersectionObserver &&
                        gridElement instanceof Element
                    ) {
                        $animeObserver.observe(gridElement);
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
                    $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid;
                }
            };
            val.onerror = (error) => {
                $dataStatus = "Something went wrong...";
                console.error(error);
            };
        }
    });

    finalAnimeList.subscribe(async (val) => {
        if (val instanceof Array && val.length) {
            if ($shownAllInList) {
                $shownAllInList = false;
            }
            if ($animeObserver) {
                $animeObserver.disconnect();
                $animeObserver = null;
            }
            await tick();
            addLastAnimeObserver();
            let gridElementIdx = $finalAnimeList.length - 1;
            let gridElement =
                $finalAnimeList[gridElementIdx].gridElement ||
                animeGridEl.children?.[gridElementIdx];
            if ($animeObserver instanceof IntersectionObserver) {
                if (gridElement instanceof Element) {
                    $animeObserver.observe(gridElement);
                }
                document
                    .querySelectorAll(".anime-loaded-padding")
                    .forEach((item) => {
                        $animeObserver.observe(item);
                    });
            }
            if (isAsyncLoad) {
                $asyncAnimeReloaded = !$asyncAnimeReloaded;
                isAsyncLoad = false;
            }
            loadingMore = false;
        } else {
            $numberOfNextLoadedGrid = null;
            if ($animeObserver) {
                $animeObserver?.disconnect?.();
                $animeObserver = null;
            }
            if (isAsyncLoad) {
                $asyncAnimeReloaded = !$asyncAnimeReloaded;
                isAsyncLoad = false;
            }
            loadingMore = false;
        }
    });

    searchedAnimeKeyword.subscribe(async (val) => {
        if (typeof val === "string") {
            if ($animeLoaderWorker instanceof Worker) {
                $shownAllInList = false;
                $checkAnimeLoaderStatus().then(() => {
                    $animeLoaderWorker?.postMessage?.({
                        filterKeyword: val,
                    });
                });
            }
        }
    });

    function handleOpenPopup(animeIdx) {
        $openedAnimePopupIdx = animeIdx;
        $popupVisible = true;
    }

    let openOptionTimeout;
    function handleOpenOption(event, animeIdx) {
        let element = event.target;
        let classList = element.classList;
        if (classList.contains("copy") || element.closest(".copy")) return;
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
        sortedFavoriteContents,
        meanScoreAll,
        meanScoreAbove,
        score,
    }) {
        let _sortedFavoriteContents = [];
        sortedFavoriteContents?.forEach((e) => {
            if (typeof e === "string") {
                _sortedFavoriteContents.push(e);
            }
        });
        let _contentCaution = [];
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
        _contentCaution = _contentCaution
            .concat(contentCaution?.caution || [])
            .concat(contentCaution?.semiCaution || []);
        let briefInfo = "";
        if (_sortedFavoriteContents.length) {
            briefInfo +=
                "Favorite Contents: " + _sortedFavoriteContents.join(", ") ||
                "";
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
        } else if (contentCaution?.semiCaution?.length) {
            // Semi Caution
            return "teal";
        } else if (score < meanScoreAll) {
            // Very Low Score
            return "purple";
        } else if (score < meanScoreAbove) {
            // Low Score
            return "orange";
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

    function getFinishedEpisode(episodes, nextAiringEpisode) {
        let timeDifMS;
        let nextEpisode;
        if (
            typeof nextAiringEpisode?.episode === "number" &&
            typeof nextAiringEpisode?.airingAt === "number"
        ) {
            let nextAiringDate = new Date(nextAiringEpisode?.airingAt * 1000);
            nextEpisode = nextAiringEpisode?.episode;
            if (nextAiringDate instanceof Date && !isNaN(nextAiringDate)) {
                timeDifMS = nextAiringDate.getTime() - new Date().getTime();
            }
        }
        if (timeDifMS > 0 && nextEpisode > 1 && episodes > nextEpisode) {
            return `(${nextEpisode - 1}/${episodes})`;
        } else if (
            timeDifMS <= 0 &&
            typeof nextEpisode === "number" &&
            episodes > nextEpisode
        ) {
            return `(${nextEpisode}/${episodes})`;
        } else if (typeof episodes === "number") {
            return `(${episodes})`;
        } else if (typeof nextEpisode === "number") {
            if (timeDifMS > 0 && nextEpisode > 1) {
                return `(${nextEpisode - 1}")`;
            } else if (timeDifMS <= 0) {
                return `(${nextEpisode}")`;
            }
        }
        return "";
    }
    function horizontalWheel(event, parentClass) {
        let element = event.target;
        let classList = element.classList;
        if (!classList.contains(parentClass)) {
            element = element.closest("." + parentClass);
        }
        if (element.scrollWidth <= element.clientWidth) return;
        if (event.deltaY !== 0 && event.deltaX === 0) {
            event.preventDefault();
            element.scrollLeft = Math.max(0, element.scrollLeft + event.deltaY);
        }
    }
    function goBackGrid() {
        animeGridEl.style.overflow = "hidden";
        animeGridEl.style.overflow = "";
        animeGridEl?.children?.[0]?.scrollIntoView?.({
            container: animeGridEl,
            behavior: "smooth",
            block: "nearest",
            inline: "start",
        });
    }
    function getTitle(title) {
        return (
            title?.english ||
            title?.userPreferred ||
            title?.romaji ||
            title?.native ||
            ""
        );
    }

    $: gridHeight = (
        $activeTagFilters?.[
            $filterOptions?.filterSelection?.[
                $filterOptions?.filterSelection?.findIndex(
                    ({ isSelected }) => isSelected
                )
            ]?.filterSelectionName
        ] || []
    ).length
        ? windowHeight
        : windowHeight + 50;

    let scrollingToBottom;
</script>

<main class={$gridFullView ?? !$android ? "fullView" : ""}>
    <div
        id="anime-grid"
        class={"image-grid " +
            ($gridFullView ?? !$android ? "fullView" : "") +
            ($finalAnimeList?.length === 0 && !$initData ? "empty" : "")}
        bind:this={animeGridEl}
        on:wheel={(e) => {
            if ($gridFullView ?? !$android) {
                horizontalWheel(e, "image-grid");
                if (!scrollingToBottom) {
                    scrollingToBottom = true;
                    let newScrollPosition =
                        window.scrollMaxY || Number.MAX_SAFE_INTEGER;
                    document.documentElement.scrollTop = newScrollPosition;
                    scrollingToBottom = false;
                }
            }
        }}
        style:--anime-grid-height={gridHeight + "px"}
    >
        {#if $finalAnimeList?.length}
            {#each $finalAnimeList || [] as anime, animeIdx (anime.id)}
                <div
                    class="image-grid__card"
                    bind:this={anime.gridElement}
                    title={getBriefInfo(anime)}
                >
                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                    <div
                        class="shimmer"
                        tabindex={$popupVisible ? "" : "0"}
                        on:click={handleOpenPopup(animeIdx)}
                        on:pointerdown={(e) => handleOpenOption(e, animeIdx)}
                        on:pointerup={cancelOpenOption}
                        on:pointercancel={cancelOpenOption}
                        on:keydown={(e) =>
                            e.key === "Enter" && handleOpenPopup(animeIdx)}
                    >
                        <img
                            loading="lazy"
                            class={"image-grid__card-thumb fade-out"}
                            alt={(getTitle(anime?.title) || "") + " Cover"}
                            src={anime.coverImageUrl || ""}
                            on:load={(e) => {
                                removeClass(e.target, "fade-out");
                                addClass(
                                    e.target?.closest?.(".shimmer"),
                                    "loaded"
                                );
                            }}
                            on:error={(e) => {
                                addClass(e.target, "fade-out");
                                addClass(e.target, "display-none");
                            }}
                        />
                        <span class="image-grid__card-title">
                            <span
                                class="title copy"
                                copy-value={getTitle(anime?.title) || ""}
                                >{getTitle(anime?.title) || "N/A"}</span
                            >
                            <span
                                class="brief-info-wrapper copy"
                                copy-value={getTitle(anime?.title) || ""}
                            >
                                <div
                                    class="brief-info"
                                    date={JSON.stringify(
                                        anime?.nextAiringEpisode
                                    )}
                                >
                                    <span>
                                        <i
                                            class={`${getUserStatusColor(
                                                anime.userStatus
                                            )}-color fa-solid fa-circle`}
                                        />
                                        {#if isJsonObject(anime?.nextAiringEpisode)}
                                            {#key date?.getSeconds?.() || 1}
                                                {`${
                                                    anime.format || "N/A"
                                                }${getFinishedEpisode(
                                                    anime.episodes,
                                                    anime.nextAiringEpisode
                                                )}
                                        `}
                                            {/key}
                                        {:else}
                                            {`${anime.format || "N/A"}${
                                                anime.episodes
                                                    ? "(" + anime.episodes + ")"
                                                    : ""
                                            }`}
                                        {/if}
                                    </span>
                                </div>
                                <div class="brief-info">
                                    <span>
                                        <i
                                            class={`${getCautionColor(
                                                anime
                                            )}-color fa-solid fa-star`}
                                        />
                                        {#if $filterOptions}
                                            {getShownScore(anime) || "N/A"}
                                        {:else}
                                            {formatNumber(
                                                anime.weightedScore
                                            ) || "N/A"}
                                        {/if}
                                    </span>
                                </div>
                            </span>
                        </span>
                    </div>
                </div>
            {/each}
            {#each Array($numberOfNextLoadedGrid ?? numberOfLoadedGrid) as _}
                <div
                    class={"image-grid__card skeleton anime-loaded-padding " +
                        ($finalAnimeList?.length &&
                        !$shownAllInList &&
                        loadingMore
                            ? ""
                            : "disable-interaction")}
                >
                    <div class="shimmer" />
                </div>
            {/each}
            {#each Array($gridFullView ?? !$android ? Math.floor((windowHeight ?? 1100) / 220) : 5) as _}
                <div class="image-grid__card" />
            {/each}
        {:else if !$finalAnimeList || $initData}
            {#each Array(21) as _}
                <div class="image-grid__card skeleton">
                    <div class="shimmer" />
                </div>
            {/each}
            {#each Array(5) as _}
                <div class="image-grid__card" />
            {/each}
        {:else}
            <div class="empty">No Results</div>
        {/if}
    </div>
    {#if !$android && $gridFullView && animeGridEl?.scrollLeft > 500}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div
            class="go-back-grid"
            tabindex="0"
            on:click={goBackGrid}
            on:keydown={(e) => e.key === "Enter" && goBackGrid(e)}
            transition:fly={{ x: -50, duration: 300 }}
        >
            <i class="fa-solid fa-arrow-left" />
        </div>
    {/if}
</main>

<style>
    main {
        width: 100%;
        height: 100%;
        padding: 2em 0;
        position: relative;
        overflow-x: hidden;
    }
    main.fullView {
        padding: 8px 0;
    }

    .skeleton {
        border-radius: 6px !important;
        background-color: rgba(30, 42, 56, 0.8) !important;
    }

    .image-grid__card.hidden {
        content-visibility: auto;
    }

    .image-grid__card.skeleton {
        background-color: transparent !important;
    }

    .title.skeleton {
        height: 10px;
        width: 75%;
        margin-bottom: clamp(0.1em, 0.3em, 0.5em);
    }

    .brief-info.skeleton {
        height: 10px;
        width: 50%;
        margin-bottom: clamp(0.1em, 0.3em, 0.5em);
    }

    .title {
        margin-bottom: clamp(0.1em, 0.3em, 0.5em);
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        display: block;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .title::-webkit-scrollbar {
        display: none;
    }

    .image-grid__card.skeleton
        .brief-info
        .image-grid__card.skeleton
        .brief-info-wrapper {
        height: 10px;
        width: 50%;
    }

    .image-grid {
        display: grid;
        justify-content: space-between;
        align-items: flex-start;
        grid-gap: 1rem;
        grid-template-columns: repeat(
            auto-fill,
            minmax(min(100% / 2 - 1rem, 180px), 180px)
        );
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    @media screen and (max-width: 390px) {
        .image-grid {
            grid-template-columns: repeat(auto-fill, calc(100% / 2 - 1rem));
        }
    }

    @media screen and (max-width: 250px) {
        .image-grid {
            grid-template-columns: repeat(
                auto-fill,
                minmax(min(100%, 180px), 180px)
            );
        }
    }

    .image-grid.fullView {
        display: flex;
        flex-wrap: wrap;
        flex-direction: column;
        justify-content: space-evenly;
        align-content: flex-start;
        height: max(calc(var(--anime-grid-height) - 265px), 210px);
        overflow-y: hidden;
        overflow-x: auto;
    }
    .image-grid.fullView.empty {
        justify-content: start;
        align-content: center;
    }

    .image-grid::-webkit-scrollbar {
        display: none;
    }

    .image-grid__card {
        animation: fadeIn 0.3s ease-in;
        width: 100%;
        height: var(--popup-content-height);
        display: grid;
        grid-template-rows: auto;
        grid-template-columns: 100%;
    }
    .image-grid__card.fullView:empty {
        height: 0px !important;
        /* width: 0px !important; */
    }
    .image-grid__card:not(.fullView):empty {
        /* height: 0px !important; */
        width: 0px !important;
    }
    :global(.image-grid__card.hidden > .shimmer),
    :global(.image-grid__card.hidden > .image-grid__card-title) {
        display: none;
    }

    .image-grid.fullView .image-grid__card {
        width: 150px;
        height: 210px;
    }
    .image-grid__card > .shimmer {
        position: relative;
        padding-bottom: calc(181 / 128 * 100%);
        background-color: rgba(30, 42, 56, 0.8);
        border-radius: 0.25em;
    }

    .image-grid.fullView .image-grid__card > .shimmer {
        padding-bottom: unset !important;
        /* padding-right: 150px; */
    }

    .image-grid__card-thumb {
        position: absolute;
        background: rgba(30, 42, 56, 0.8);
        border-radius: 0.25em;
        display: block;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
        transition: opacity 0.3s ease;
        object-fit: cover;
        -o-object-fit: cover;
        width: 100%;
        height: 100%;
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
        user-select: none;
    }

    .image-grid__card:not(.skeleton):focus-within .image-grid__card-thumb,
    .image-grid__card:not(.skeleton):focus .image-grid__card-thumb,
    .image-grid__card:not(.skeleton):hover .image-grid__card-thumb {
        opacity: 0.5 !important;
        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25),
            0 10px 10px rgba(0, 0, 0, 0.22);
    }

    .image-grid__card-thumb.fade-out {
        opacity: 0;
    }

    .image-grid__card-title {
        padding: 50% 4px 4px;
        font-size: clamp(1.1rem, 1.2rem, 1.4rem);
        position: absolute;
        bottom: 0;
        background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.75),
            rgba(0, 0, 0, 0)
        );
        color: white;
        width: 100%;
        max-height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .image-grid__card-title::-webkit-scrollbar {
        display: none;
    }

    .brief-info,
    .brief-info-wrapper {
        display: flex;
        gap: 2px;
        flex-wrap: wrap;
        align-items: center;
        white-space: nowrap;
        user-select: none;
    }
    .brief-info-wrapper {
        column-gap: 4px;
    }

    .brief-info::-webkit-scrollbar {
        display: none;
    }
    .brief-info {
        overflow-x: auto;
        overflow-y: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .fa-circle::before {
        font-size: 9px;
    }
    .fa-star::before {
        font-size: 10px;
    }

    .go-back-grid {
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        background-color: rgb(21, 31, 46);
        cursor: pointer;
        top: 50%;
        left: 8px;
        transform: translateY(-50%) translateZ(0);
        -webkit-transform: translateY(-50%) translateZ(0);
        -ms-transform: translateY(-50%) translateZ(0);
        -moz-transform: translateY(-50%) translateZ(0);
        -o-transform: translateY(-50%) translateZ(0);
        border-radius: 50%;
        width: 44px;
        height: 44px;
    }

    @media screen and (max-width: 425px) {
        .go-back-grid {
            left: 0;
        }
    }

    .go-back-grid i {
        font-size: 2em;
    }

    .empty {
        font-size: 2rem;
        font-weight: 700;
        opacity: 1;
        padding: 30px;
        text-align: center;
        grid-column: 1 / -1;
        margin: 0 auto;
    }

    .shimmer {
        position: relative;
        overflow: hidden;
    }

    .shimmer.loaded::before {
        content: unset !important;
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
        transform: translateX(0) translateZ(0);
        -webkit-transform: translateX(0) translateZ(0);
        -ms-transform: translateX(0) translateZ(0);
        -moz-transform: translateX(0) translateZ(0);
        -o-transform: translateX(0) translateZ(0);
        width: 200%;
    }
    @keyframes loadingShimmer {
        0% {
            transform: translateX(-100%) translateZ(0);
            -webkit-transform: translateX(-100%) translateZ(0);
            -ms-transform: translateX(-100%) translateZ(0);
            -moz-transform: translateX(-100%) translateZ(0);
            -o-transform: translateX(-100%) translateZ(0);
        }
        100% {
            transform: translateX(100%) translateZ(0);
            -webkit-transform: translateX(100%) translateZ(0);
            -ms-transform: translateX(100%) translateZ(0);
            -moz-transform: translateX(100%) translateZ(0);
            -o-transform: translateX(100%) translateZ(0);
        }
    }

    @media screen and (max-width: 660px) {
        .image-grid {
            justify-content: space-evenly;
        }
    }
    .disable-interaction {
        pointer-events: none !important;
        position: fixed !important;
        transform: translateY(-99999px) translateZ(0) !important;
        -webkit-transform: translateY(-99999px) translateZ(0) !important;
        -ms-transform: translateY(-99999px) translateZ(0) !important;
        -moz-transform: translateY(-99999px) translateZ(0) !important;
        -o-transform: translateY(-99999px) translateZ(0) !important;
        user-select: none !important;
        touch-action: none !important;
        cursor: not-allowed !important;
        -webkit-user-drag: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        height: 0 !important;
        width: 0 !important;
        max-width: 0 !important;
        max-height: 0 !important;
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
    }
</style>
