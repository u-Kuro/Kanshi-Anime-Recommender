<script>
    import { onMount, tick } from "svelte";
    import {
        android,
        finalAnimeList,
        searchedAnimeKeyword,
        animeLoaderWorker,
        dataStatus,
        animeObserver,
        popupVisible,
        openedAnimePopupIdx,
        animeOptionVisible,
        openedAnimeOptionIdx,
        initData,
        animeIdxRemoved,
        shownAllInList,
        importantLoad,
        checkAnimeLoaderStatus,
        gridFullView,
        mostRecentAiringDateTimeout,
        earlisetReleaseDate,
        showFilterOptions,
        newFinalAnime,
        progress,
        mobile,
        menuVisible,
    } from "../../js/globalValues.js";
    import {
        addClass,
        isJsonObject,
        removeClass,
        getLocalStorage,
        setLocalStorage,
        removeLocalStorage,
    } from "../../js/others/helper.js";
    import { fade } from "svelte/transition";
    import { cacheImage } from "../../js/caching.js";

    const emptyImage =
        "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    let windowHeight = Math.max(
        window.visualViewport.height,
        window.innerHeight,
    );
    let originalWindowHeight = screen?.height
        ? Math.min(screen.height, windowHeight)
        : windowHeight;
    let windowWidth = Math.max(
        document?.documentElement?.getBoundingClientRect?.()?.width,
        window.visualViewport.width,
        window.innerWidth,
    );

    let shownFinalAnimeListCount = 0;
    let animeGridEl;
    let isRunningIntersectEvent;
    let numberOfPageLoadedGrid = Math.max(
        5,
        ((windowHeight - 239) / 250.525) * 5,
    );

    function addLastAnimeObserver() {
        $animeObserver?.disconnect?.();
        $animeObserver = null;
        isRunningIntersectEvent = false;
        $animeObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        if (isRunningIntersectEvent) return;
                        isRunningIntersectEvent = true;
                        requestAnimationFrame(() => {
                            if ($animeLoaderWorker instanceof Worker) {
                                $checkAnimeLoaderStatus().then(() => {
                                    $animeLoaderWorker?.postMessage?.({
                                        loadMore: true,
                                    });
                                });
                            }
                            isRunningIntersectEvent = false;
                        });
                    }
                });
            },
            {
                root: null,
                rootMargin: "100%",
                threshold: [0, 1],
            },
        );
    }

    let errorCountMult = 5;
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
                checkAnimeLoaderStatusTimeout = setTimeout(
                    () => {
                        reject();
                    },
                    Math.min(1000 * errorCountMult, 2000000000),
                );
            })
                .catch(() => {
                    if (!$initData) {
                        ++errorCountMult;
                        $animeLoaderWorker?.terminate?.();
                        $animeLoaderWorker = null;
                        importantLoad.update((e) => !e);
                        animeLoaderIsAlivePromise = null;
                    }
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
                if (data?.hasOwnProperty?.("progress")) {
                    if (data?.progress >= 0 && data?.progress <= 100) {
                        progress.set(data.progress);
                    }
                }
                if (data?.hasOwnProperty?.("status")) {
                    $dataStatus = data.status;
                } else if (data.getEarlisetReleaseDate === true) {
                    if (
                        data.earliestReleaseDate &&
                        data?.timeBeforeEarliestReleaseDate > 0 &&
                        (data.earliestReleaseDate < $earlisetReleaseDate ||
                            new Date($earlisetReleaseDate) < new Date() ||
                            !$earlisetReleaseDate)
                    ) {
                        $earlisetReleaseDate = data.earliestReleaseDate;
                        clearTimeout($mostRecentAiringDateTimeout);
                        $mostRecentAiringDateTimeout = setTimeout(
                            () => {
                                if ($animeLoaderWorker instanceof Worker) {
                                    $checkAnimeLoaderStatus().then(() => {
                                        $animeLoaderWorker?.postMessage?.({
                                            getEarlisetReleaseDate: true,
                                        });
                                    });
                                }
                            },
                            Math.min(
                                data.timeBeforeEarliestReleaseDate,
                                2000000000,
                            ),
                        );
                    }
                } else if (data.finalAnimeList instanceof Array) {
                    if (data?.reload === true) {
                        isAsyncLoad = true;
                        if (
                            $finalAnimeList?.length > data?.finalAnimeListCount
                        ) {
                            $finalAnimeList = $finalAnimeList?.slice?.(
                                0,
                                data.finalAnimeListCount,
                            );
                        }
                        if (data?.finalAnimeList?.length > 0) {
                            data?.finalAnimeList?.forEach?.((anime, idx) => {
                                $newFinalAnime = {
                                    idx: data.lastShownAnimeListIndex + idx,
                                    finalAnimeList: anime,
                                };
                            });
                        } else {
                            $finalAnimeList = [];
                        }
                    } else if (data.isNew === true) {
                        if (
                            $finalAnimeList?.length > data?.finalAnimeListCount
                        ) {
                            $finalAnimeList = $finalAnimeList?.slice?.(
                                0,
                                data.finalAnimeListCount,
                            );
                        }
                        if (data?.finalAnimeList?.length > 0) {
                            data?.finalAnimeList?.forEach?.((anime, idx) => {
                                $newFinalAnime = {
                                    idx: data.lastShownAnimeListIndex + idx,
                                    finalAnimeList: anime,
                                };
                            });
                        } else {
                            $finalAnimeList = [];
                        }
                    } else if (data.isNew === false) {
                        if ($finalAnimeList instanceof Array) {
                            if (data?.finalAnimeList?.length > 0) {
                                data?.finalAnimeList?.forEach?.(
                                    (anime, idx) => {
                                        $newFinalAnime = {
                                            idx:
                                                data.lastShownAnimeListIndex +
                                                idx,
                                            finalAnimeList: anime,
                                        };
                                    },
                                );
                            }
                        }
                        if (data.isLast) {
                            $shownAllInList = true;
                        }
                    }
                    val?.postMessage?.({
                        getEarlisetReleaseDate: true,
                    });
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
                        ({ id }) => id === data.removedID,
                    );
                    $finalAnimeList = $finalAnimeList.filter(
                        ({ id }) => id !== data.removedID,
                    );
                    if (removedIdx >= 0) {
                        $animeIdxRemoved = null;
                        $animeIdxRemoved = removedIdx;
                    }
                    val?.postMessage?.({
                        getEarlisetReleaseDate: true,
                    });
                }
            };
            val.onerror = (error) => {
                $dataStatus = "Something went wrong";
                console.error(error);
            };
            val?.postMessage?.({
                getEarlisetReleaseDate: true,
            });
        }
    });

    newFinalAnime.subscribe(async (val) => {
        if (
            typeof val?.finalAnimeList?.id === "number" &&
            typeof val?.idx === "number"
        ) {
            if ($shownAllInList && val.idx === 0) {
                $shownAllInList = false;
            }
            if ($finalAnimeList instanceof Array) {
                if (isAsyncLoad) {
                    lessenShownGrid();
                }
                if (
                    $finalAnimeList?.[val.idx] &&
                    Math.abs($finalAnimeList?.[val.idx]?.id) ===
                        val?.finalAnimeList?.id
                ) {
                    $finalAnimeList = $finalAnimeList?.filter?.(
                        (anime, idx) => {
                            if (idx === val.idx) return true;
                            return anime.id !== val?.finalAnimeList?.id;
                        },
                    );
                    $finalAnimeList[val.idx] = val.finalAnimeList;
                } else {
                    $finalAnimeList = $finalAnimeList?.map?.((anime) => {
                        if (Math.abs(anime.id) === val?.finalAnimeList?.id) {
                            anime.id = -anime.id;
                        }
                        return anime;
                    });
                    $finalAnimeList = $finalAnimeList?.filter?.((anime) => {
                        return anime.id !== val?.finalAnimeList?.id;
                    });
                    if (val.idx < $finalAnimeList?.length) {
                        $finalAnimeList[val.idx] = val.finalAnimeList;
                    } else {
                        $finalAnimeList.push(val.finalAnimeList);
                    }
                }
                $finalAnimeList = $finalAnimeList;
            } else {
                $finalAnimeList = [val.finalAnimeList];
            }
            if (
                val?.idx < shownFinalAnimeListCount - 1 ||
                shownFinalAnimeListCount <= 1
            ) {
                if (isRunningIntersectEvent) return;
                $progress = Math.min(
                    (val?.idx / (shownFinalAnimeListCount - 1)) * 100,
                    100,
                );
                isRunningIntersectEvent = true;
                requestAnimationFrame(() => {
                    $checkAnimeLoaderStatus().then(() => {
                        $animeLoaderWorker?.postMessage?.({
                            loadMore: true,
                        });
                        isRunningIntersectEvent = false;
                    });
                });
            } else {
                $progress = 100;
            }
        }
    });

    function lessenShownGrid() {
        for (let i = 0; i < $finalAnimeList?.length; i++) {
            let gridElement =
                $finalAnimeList?.[i]?.gridElement || animeGridEl.children?.[i];
            if (gridElement?.getBoundingClientRect?.()?.y >= windowHeight) {
                $finalAnimeList = $finalAnimeList.slice(0, Math.min(i + 5, 36));
                shownFinalAnimeListCount =
                    $finalAnimeList?.length ?? shownFinalAnimeListCount;
                isAsyncLoad = false;
                break;
            }
        }
    }

    finalAnimeList.subscribe(async (val) => {
        if (val instanceof Array && val.length) {
            shownFinalAnimeListCount = val.length;
            addLastAnimeObserver();
            let lastGridElementIdx = $finalAnimeList.length - 1;
            let lastGridElement =
                $finalAnimeList[lastGridElementIdx].gridElement ||
                animeGridEl.children?.[lastGridElementIdx];
            if ($animeObserver instanceof IntersectionObserver) {
                if (!$initData && $finalAnimeList.length >= 11) {
                    let prevGridElementIdx = $finalAnimeList.length - 11;
                    let prevGridElement =
                        $finalAnimeList[prevGridElementIdx].gridElement ||
                        animeGridEl.children?.[prevGridElementIdx];
                    if (prevGridElement instanceof Element) {
                        $animeObserver.observe(prevGridElement);
                    }
                }
                if (lastGridElement instanceof Element) {
                    $animeObserver.observe(lastGridElement);
                }
            }
            if (isAsyncLoad) {
                isAsyncLoad = false;
            }
        } else {
            shownFinalAnimeListCount = 0;
            if (isAsyncLoad) {
                isAsyncLoad = false;
            }
        }
    });

    searchedAnimeKeyword.subscribe(async (val) => {
        if (typeof val === "string") {
            try {
                setLocalStorage("searchedAnimeKeyword", val).catch(() => {
                    removeLocalStorage("searchedAnimeKeyword");
                });
                $animeLoaderWorker.postMessage({
                    filterKeyword: val,
                });
            } catch (e) {
                if (!$initData) {
                    $animeLoaderWorker?.terminate?.();
                    $animeLoaderWorker = null;
                    importantLoad.update((e) => !e);
                }
            }
        }
    });

    function handleOpenPopup(animeIdx) {
        $openedAnimePopupIdx = animeIdx;
        $popupVisible = true;
    }

    let openOptionTimeout, isOpeningAnimeOption;
    window.oncontextmenu = () => {
        if (isOpeningAnimeOption) {
            isOpeningAnimeOption = false;
            return false;
        }
    };
    function handleOpenOption(event, animeIdx) {
        isOpeningAnimeOption = true;
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
        isOpeningAnimeOption = false;
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
        if (timeDifMS > 0 && episodes >= 1 && episodes >= nextEpisode) {
            return `(${Math.max(nextEpisode - 1, 0)}/${episodes})`;
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
            event.stopPropagation();
            element.scrollLeft = Math.max(0, element.scrollLeft + event.deltaY);
        }
    }

    let isFullViewed;
    let lastLeftScroll, currentLeftScroll;
    let belowGrid;
    let afterFullGrid;
    let isWholeGridSeen,
        isOnVeryLeftOfAnimeGrid = true;
    let isOnVeryLeftOfAnimeGridTimeout;
    $: {
        isFullViewed =
            $gridFullView ?? getLocalStorage("gridFullView") ?? false;

        isWholeGridSeen =
            isFullViewed &&
            windowHeight >
                animeGridEl?.getBoundingClientRect?.()?.bottom + 10 + 57;

        clearTimeout(isOnVeryLeftOfAnimeGridTimeout);
        if (isFullViewed && animeGridEl?.scrollLeft < 1) {
            isOnVeryLeftOfAnimeGridTimeout = setTimeout(() => {
                isOnVeryLeftOfAnimeGrid =
                    isFullViewed && animeGridEl?.scrollLeft < 1;
            }, 1000);
        } else {
            isOnVeryLeftOfAnimeGrid = false;
        }
    }
    $: shouldShowGoBackInFullView =
        isFullViewed &&
        afterFullGrid &&
        (currentLeftScroll < lastLeftScroll || windowWidth > 596.5);

    window.addEventListener("scroll", () => {
        isWholeGridSeen =
            isFullViewed &&
            windowHeight >
                animeGridEl?.getBoundingClientRect?.()?.bottom + 10 + 57;
        if (animeGridEl?.getBoundingClientRect?.()?.top < 0) {
            belowGrid = true;
        } else {
            belowGrid = false;
        }
    });

    let filterOptiChangeTimeout;
    showFilterOptions.subscribe(() => {
        clearTimeout(filterOptiChangeTimeout);
        filterOptiChangeTimeout = setTimeout(() => {
            isWholeGridSeen =
                isFullViewed &&
                windowHeight >
                    animeGridEl?.getBoundingClientRect?.()?.bottom + 10 + 57;
        }, 16);
    });

    function goBackGrid() {
        if (isFullViewed) {
            animeGridEl.style.overflow = "hidden";
            animeGridEl.style.overflow = "";
            animeGridEl.scroll({ left: 0, behavior: "smooth" });
        } else {
            if ($android || !matchMedia("(hover:hover)").matches) {
                document.documentElement.style.overflow = "hidden";
                document.documentElement.style.overflow = "";
            }
            window.scrollTo({ top: -9999, behavior: "smooth" });
        }
    }

    async function addImage(node, imageUrl) {
        if (imageUrl && imageUrl !== emptyImage) {
            node.src = imageUrl;
            let newImageUrl = await cacheImage(imageUrl);
            if (newImageUrl) {
                node.src = newImageUrl;
            }
        } else {
            node.src = emptyImage;
        }
    }

    onMount(() => {
        let newWindowHeight = Math.max(
            window.visualViewport.height,
            window.innerHeight,
        );
        if (newWindowHeight > windowHeight) {
            originalWindowHeight = screen?.height
                ? Math.min(screen.height, newWindowHeight)
                : newWindowHeight;
        }
        windowHeight = newWindowHeight;
        windowWidth = Math.max(
            document?.documentElement?.getBoundingClientRect?.()?.width,
            window.visualViewport.width,
            window.innerWidth,
        );
        animeGridEl = animeGridEl || document.getElementById("anime-grid");
        window.addEventListener("resize", () => {
            let newWindowHeight = Math.max(
                window.visualViewport.height,
                window.innerHeight,
            );
            if (newWindowHeight > windowHeight) {
                originalWindowHeight = screen?.height
                    ? Math.min(screen.height, newWindowHeight)
                    : newWindowHeight;
            }
            windowHeight = newWindowHeight;
            windowWidth = Math.max(
                document?.documentElement?.getBoundingClientRect?.()?.width,
                window.visualViewport.width,
                window.innerWidth,
            );
        });
        let waitForOnVeryLeft;
        animeGridEl.addEventListener("scroll", () => {
            if (!waitForOnVeryLeft) {
                clearTimeout(isOnVeryLeftOfAnimeGridTimeout);
            }
            if (isFullViewed && animeGridEl?.scrollLeft < 1) {
                if (!waitForOnVeryLeft) {
                    waitForOnVeryLeft = true;
                    isOnVeryLeftOfAnimeGridTimeout = setTimeout(() => {
                        isOnVeryLeftOfAnimeGrid =
                            isFullViewed && animeGridEl?.scrollLeft < 1;
                        waitForOnVeryLeft = false;
                    }, 8);
                }
            } else {
                clearTimeout(isOnVeryLeftOfAnimeGridTimeout);
                waitForOnVeryLeft = false;
                isOnVeryLeftOfAnimeGrid = false;
            }
        });
    });
</script>

<main class={isFullViewed ? "fullView" : ""}>
    <div
        id="anime-grid"
        class={"image-grid " +
            (isFullViewed ? " fullView" : "") +
            ($finalAnimeList?.length === 0 && !$initData ? " empty" : "")}
        bind:this={animeGridEl}
        on:wheel={(e) => {
            if (
                isFullViewed &&
                animeGridEl.scrollWidth > animeGridEl.clientWidth &&
                Math.abs(e?.deltaY) > Math.abs(e?.deltaX)
            ) {
                // If its not scrolled at the very bottom of the screen and see next
                if (!isWholeGridSeen && e?.deltaY > 0) return;
                // If its scrolled to very left and see previous
                if (isOnVeryLeftOfAnimeGrid && e?.deltaY < 0) return;
                horizontalWheel(e, "image-grid");
            }
        }}
        on:scroll={(e) => {
            let element = e?.target;
            lastLeftScroll = currentLeftScroll;
            currentLeftScroll = element?.scrollLeft;
            if (currentLeftScroll > 500) {
                afterFullGrid = true;
            } else {
                afterFullGrid = false;
            }
        }}
        style:--anime-grid-height={($mobile && !$android
            ? originalWindowHeight
            : windowHeight) + "px"}
    >
        {#if $finalAnimeList?.length}
            {#each $finalAnimeList || [] as anime, animeIdx (anime?.id ?? {})}
                <div
                    class={"image-grid__card" +
                        (anime?.isLoading ? " loading" : "")}
                    bind:this={anime.gridElement}
                    title={anime?.briefInfo || ""}
                >
                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                    <div
                        class="shimmer"
                        tabindex={$menuVisible || $popupVisible ? "" : "0"}
                        on:click={handleOpenPopup(animeIdx)}
                        on:pointerdown={(e) => handleOpenOption(e, animeIdx)}
                        on:pointerup={cancelOpenOption}
                        on:pointercancel={cancelOpenOption}
                        on:keyup={(e) =>
                            e.key === "Enter" && handleOpenPopup(animeIdx)}
                    >
                        {#if anime?.coverImageUrl || anime?.bannerImageUrl || anime?.trailerThumbnailUrl}
                            {#key anime?.coverImageUrl || anime?.bannerImageUrl || anime?.trailerThumbnailUrl}
                                <img
                                    use:addImage={anime?.coverImageUrl ||
                                        anime?.bannerImageUrl ||
                                        anime?.trailerThumbnailUrl ||
                                        emptyImage}
                                    fetchpriority={animeIdx >
                                    numberOfPageLoadedGrid
                                        ? ""
                                        : "high"}
                                    loading={animeIdx > numberOfPageLoadedGrid
                                        ? "lazy"
                                        : "eager"}
                                    class={"image-grid__card-thumb  fade-out"}
                                    alt={(anime?.shownTitle || "") + " Cover"}
                                    width="180px"
                                    height="254.531px"
                                    on:load={(e) => {
                                        removeClass(e.target, "fade-out");
                                        addClass(
                                            e.target?.closest?.(".shimmer"),
                                            "loaded",
                                        );
                                    }}
                                    on:error={(e) => {
                                        addClass(e.target, "fade-out");
                                        addClass(e.target, "display-none");
                                    }}
                                />
                            {/key}
                        {/if}
                        <span class="image-grid__card-title">
                            <span
                                class="title copy"
                                copy-value={anime?.copiedTitle || ""}
                                copy-value-2={anime?.shownTitle || ""}
                                >{anime?.shownTitle || "NA"}</span
                            >
                            <span
                                class="brief-info-wrapper copy"
                                copy-value={anime?.copiedTitle || ""}
                                copy-value-2={anime?.shownTitle || ""}
                            >
                                <div class="brief-info">
                                    <span>
                                        <!-- circle -->
                                        <svg
                                            viewBox="0 0 512 512"
                                            class={`${anime?.userStatusColor}-fill circle`}
                                            ><path
                                                d="M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512z"
                                            /></svg
                                        >
                                        {#if isJsonObject(anime?.nextAiringEpisode)}
                                            {@const finishedEpisodes =
                                                getFinishedEpisode(
                                                    anime.episodes,
                                                    anime.nextAiringEpisode,
                                                )}
                                            {`${anime.format || "NA"}`}
                                            {#if finishedEpisodes}
                                                {#key $earlisetReleaseDate || 1}
                                                    {finishedEpisodes}
                                                {/key}
                                            {:else}
                                                {`${
                                                    anime.episodes
                                                        ? "(" +
                                                          anime.episodes +
                                                          ")"
                                                        : ""
                                                }`}
                                            {/if}
                                        {:else}
                                            {`${anime.format || "NA"}${
                                                anime.episodes
                                                    ? "(" + anime.episodes + ")"
                                                    : ""
                                            }`}
                                        {/if}
                                    </span>
                                </div>
                                <div class="brief-info">
                                    <span>
                                        {#if anime?.shownScore != null}
                                            <!-- star -->
                                            <svg
                                                viewBox="0 0 576 512"
                                                class={`${anime?.contentCautionColor}-fill score`}
                                                ><path
                                                    d="M317 18a32 32 0 0 0-58 0l-64 132-144 22a32 32 0 0 0-17 54l104 103-25 146a32 32 0 0 0 47 33l128-68 129 68a32 32 0 0 0 46-33l-24-146 104-103a32 32 0 0 0-18-54l-144-22-64-132z"
                                                /></svg
                                            >
                                            {anime?.shownScore ?? "NA"}
                                        {:else if anime?.shownCount != null}
                                            <!-- people -->
                                            <svg
                                                viewBox="0 0 640 512"
                                                class={`${anime?.contentCautionColor}-fill score`}
                                            >
                                                <path
                                                    d="M96 128a128 128 0 1 1 256 0 128 128 0 1 1-256 0zM0 482c0-98 80-178 178-178h92c98 0 178 80 178 178 0 17-13 30-30 30H30c-17 0-30-13-30-30zm609 30H471c6-9 9-20 9-32v-8c0-61-27-115-70-152h69c89 0 161 72 161 161 0 17-14 31-31 31zM432 256c-31 0-59-13-79-33a159 159 0 0 0 13-169 112 112 0 1 1 66 202z"
                                                /></svg
                                            >
                                            {anime?.shownCount ?? "NA"}
                                        {:else if anime?.shownFavorites != null}
                                            <svg
                                                viewBox="0 0 512 512"
                                                class={`${anime?.contentCautionColor}-fill score`}
                                            >
                                                <path
                                                    d="m48 300 180 169a41 41 0 0 0 56 0l180-169c31-28 48-68 48-109v-6A143 143 0 0 0 268 84l-12 12-12-12A143 143 0 0 0 0 185v6c0 41 17 81 48 109z"
                                                /></svg
                                            >
                                            {anime?.shownFavorites ?? "NA"}
                                        {:else if anime?.shownActivity != null}
                                            <svg
                                                viewBox="0 0 512 512"
                                                class={`${anime?.contentCautionColor}-fill score`}
                                            >
                                                <path
                                                    d="M64 64a32 32 0 1 0-64 0v336c0 44 36 80 80 80h400a32 32 0 1 0 0-64H80c-9 0-16-7-16-16V64zm407 87a32 32 0 0 0-46-46L320 211l-57-58a32 32 0 0 0-46 0L105 265a32 32 0 0 0 46 46l89-90 57 58c13 12 33 12 46 0l128-128z"
                                                /></svg
                                            >
                                            {anime?.shownActivity ?? "NA"}
                                        {/if}
                                    </span>
                                </div>
                            </span>
                        </span>
                    </div>
                </div>
            {/each}
            {#each Array($shownAllInList ? 0 : 1) as _}
                <div class="image-grid__card skeleton dummy">
                    <div class="shimmer" />
                </div>
            {/each}
            {#each Array(isFullViewed ? Math.floor((windowHeight ?? 1100) / 220) : 5) as _}
                <div class="image-grid__card dummy" />
            {/each}
        {:else if !$finalAnimeList || $initData}
            {#each Array(21) as _}
                <div class="image-grid__card skeleton dummy">
                    <div class="shimmer" />
                </div>
            {/each}
            {#each Array(5) as _}
                <div class="image-grid__card dummy" />
            {/each}
        {:else}
            <div class="empty">No Results</div>
        {/if}
    </div>
    {#if !$android && shouldShowGoBackInFullView && $finalAnimeList?.length}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div
            class={"go-back-grid" +
                (shouldShowGoBackInFullView ? " fullView" : "")}
            tabindex={$menuVisible || $popupVisible ? "" : "0"}
            on:click={goBackGrid}
            on:keyup={(e) => e.key === "Enter" && goBackGrid(e)}
            out:fade={{ duration: 200 }}
        >
            <svg
                viewBox={`0 0 ${
                    shouldShowGoBackInFullView ? "320" : "448"
                } 512`}
            >
                <path
                    d={// angle left
                    shouldShowGoBackInFullView
                        ? "M41 233a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L109 256l138-137a32 32 0 0 0-46-46L41 233z"
                        : // angle up
                          "M201 137c13-12 33-12 46 0l160 160a32 32 0 0 1-46 46L224 205 87 343a32 32 0 0 1-46-46l160-160z"}
                />
            </svg>
        </div>
    {/if}
</main>

<style>
    main {
        width: 100%;
        height: 100%;
        padding: 2em 0px 5em 0px;
        position: relative;
        overflow-x: hidden;
    }

    main.fullView {
        padding: 12px 0;
        margin-bottom: 57px;
    }

    .skeleton {
        border-radius: 6px !important;
        background-color: hsla(0, 0%, 10%, 0.5) !important;
    }

    .image-grid__card.loading {
        animation: loadingBlink 1.5s ease-in-out infinite;
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
        cursor: text;
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
        overflow-anchor: visible;
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
        height: max(calc(var(--anime-grid-height) - 260px), 210px);
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
        animation: fadeIn 0.2s ease;
        width: 100%;
        height: var(--popup-content-height);
        display: grid;
        grid-template-rows: auto;
        grid-template-columns: 100%;
    }
    .image-grid__card.fullView:empty {
        height: 0px !important;
    }
    .image-grid__card:not(.fullView):empty {
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
        padding-bottom: min(calc(181 / 128 * 100%), 209px);
        background-color: hsla(0, 0%, 10%, 0.5);
        border-radius: 6px;
    }
    @media screen and (min-width: 580px) {
        .image-grid__card > .shimmer {
            padding-bottom: calc(181 / 128 * 100%);
        }
    }

    .image-grid.fullView .image-grid__card > .shimmer {
        padding-bottom: unset !important;
    }

    .image-grid__card-thumb {
        position: absolute;
        background: hsla(0, 0%, 10%, 0.5);
        border-radius: 6px;
        display: block;
        cursor: pointer;
        box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.15),
            0 1px 2px rgba(0, 0, 0, 0.25);
        transition: opacity 0.2s ease;
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
        box-shadow:
            0 14px 28px rgba(0, 0, 0, 0.25),
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
        color: var(--fg-color);
        width: 100%;
        max-height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
        cursor: pointer;
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
    .brief-info > span {
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 3px;
    }
    .brief-info .circle {
        height: 0.75em;
        width: 0.75em;
    }
    .brief-info .score {
        height: 1em;
        width: 1em;
    }

    .go-back-grid {
        position: fixed !important;
        top: unset !important;
        bottom: 4.8em !important;
        right: 3em !important;
        transform: translateZ(0) !important;
        -webkit-transform: translateZ(0) !important;
        -ms-transform: translateZ(0) !important;
        -moz-transform: translateZ(0) !important;
        -o-transform: translateZ(0) !important;
        animation: fadeIn 0.2s ease;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        background-color: var(--ol-color);
        border: 1px solid var(--bd-color);
        cursor: pointer;
        border-radius: 50%;
        width: 60px;
        height: 60px;
        box-shadow:
            0 14px 28px rgba(0, 0, 0, 0.25),
            0 10px 10px rgba(0, 0, 0, 0.22);
    }

    .go-back-grid.fullView {
        position: absolute !important;
        right: unset !important;
        bottom: unset !important;
        top: 50% !important;
        left: 8px !important;
        transform: translateY(-100%) translateZ(0) !important;
        -webkit-transform: translateY(-100%) translateZ(0) !important;
        -ms-transform: translateY(-100%) translateZ(0) !important;
        -moz-transform: translateY(-100%) translateZ(0) !important;
        -o-transform: translateY(-100%) translateZ(0) !important;
        width: 44px !important;
        height: 44px !important;
    }

    @media screen and (max-width: 425px) {
        .go-back-grid.fullView {
            left: 0;
        }
    }

    .go-back-grid.fullView svg {
        width: 2em !important;
        height: 2em !important;
    }
    .go-back-grid svg {
        width: 3em;
        height: 3em;
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
            hsla(0, 0%, 10%, 0) 0,
            hsla(0, 0%, 100%, 0.06) 40%,
            hsla(0, 0%, 100%, 0.06) 60%,
            hsla(0, 0%, 10%, 0)
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

    @keyframes loadingBlink {
        0% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
        100% {
            opacity: 1;
        }
    }

    @media screen and (max-width: 660px) {
        .image-grid {
            justify-content: space-evenly;
        }
    }

    .display-none {
        display: none !important;
    }
</style>
