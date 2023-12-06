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
        asyncAnimeReloaded,
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
        filterOptions,
        loadingFilterOptions,
        selectedCustomFilter,
    } from "../../js/globalValues.js";
    import {
        addClass,
        isJsonObject,
        removeClass,
        getLocalStorage,
        setLocalStorage,
        removeLocalStorage,
        getLastVisibleElement,
        getChildIndex,
    } from "../../js/others/helper.js";
    import { fade } from "svelte/transition";
    import { cacheImage } from "../../js/caching.js";

    const emptyImage =
        "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    let windowHeight = Math.max(
        window.visualViewport.height,
        window.innerHeight,
    );
    let windowWidth = Math.max(
        document?.documentElement?.getBoundingClientRect?.()?.width,
        window.visualViewport.width,
        window.innerWidth,
    );

    let shownFinalAnimeListCount = 0;
    let animeGridEl;
    let isRunningIntersectEvent;
    let numberOfLoadedGrid = 1;
    // let observerDelay = 0;

    function addLastAnimeObserver() {
        $animeObserver?.disconnect?.();
        $animeObserver = null;
        isRunningIntersectEvent = false;
        $animeObserver = new IntersectionObserver(
            (entries) => {
                if ($shownAllInList) return;
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
        Array.from(
            document.querySelectorAll(".image-grid__card.dummy") || [],
        ).forEach((entry) => {
            $animeObserver.observe(entry);
        });
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
                checkAnimeLoaderStatusTimeout = setTimeout(() => {
                    reject();
                }, 1000 * errorCountMult);
            })
                .catch(() => {
                    ++errorCountMult;
                    $animeLoaderWorker?.terminate?.();
                    $animeLoaderWorker = null;
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
                if (data?.hasOwnProperty?.("progress")) {
                    if (data?.progress >= 0 && data?.progress <= 100) {
                        progress.set(data.progress);
                    }
                }
                if (data?.hasOwnProperty?.("status")) {
                    $dataStatus = data.status;
                } else if (
                    data?.filterOptions &&
                    typeof data?.selectedCustomFilter === "string"
                ) {
                    setLocalStorage(
                        "selectedCustomFilter",
                        data?.selectedCustomFilter,
                    ).catch(() => {
                        removeLocalStorage("selectedCustomFilter");
                    });
                    $filterOptions = data.filterOptions;
                    $loadingFilterOptions = false;
                } else if (
                    typeof data?.changedCustomFilter === "string" &&
                    data?.changedCustomFilter
                ) {
                    $selectedCustomFilter = data.changedCustomFilter;
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
                        if ($finalAnimeList instanceof Array) {
                            $finalAnimeList = $finalAnimeList?.slice?.(
                                0,
                                Math.min(
                                    window.getLastShownFinalAnimeLength() || 0,
                                    data.finalAnimeListCount,
                                ),
                            );
                        }
                        data?.finalAnimeList?.forEach?.((anime, idx) => {
                            $newFinalAnime = {
                                id: anime.id,
                                idx: data.shownAnimeListCount + idx,
                                finalAnimeList: anime,
                            };
                        });
                        isAsyncLoad = true;
                    } else if (data.isNew === true) {
                        if ($finalAnimeList instanceof Array) {
                            $finalAnimeList = $finalAnimeList?.slice?.(
                                0,
                                Math.min(
                                    window.getLastShownFinalAnimeLength() || 0,
                                    data.finalAnimeListCount,
                                ),
                            );
                        }
                        data?.finalAnimeList?.forEach?.((anime, idx) => {
                            $newFinalAnime = {
                                idx: data.shownAnimeListCount + idx,
                                finalAnimeList: anime,
                            };
                        });
                    } else if (data.isNew === false) {
                        if ($finalAnimeList instanceof Array) {
                            data?.finalAnimeList?.forEach?.((anime, idx) => {
                                $newFinalAnime = {
                                    idx: data.shownAnimeListCount + idx,
                                    finalAnimeList: anime,
                                };
                            });
                            if (data.isLast) {
                                $shownAllInList = true;
                                $animeObserver?.disconnect?.();
                                $animeObserver = null;
                            }
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

    window.getLastShownFinalAnimeLength = () => {
        animeGridEl = animeGridEl || document.getElementById("anime-grid");
        let popupContainerEl = document.getElementById("popup-container");
        let lastVisiblePopup = getLastVisibleElement(
            ".popup-content",
            popupContainerEl,
        );
        let lastVisibleGrid = getLastVisibleElement(
            ".image-grid__card",
            animeGridEl,
        );
        let lastVisiblePopupIdx = getChildIndex(lastVisiblePopup);
        let lastVisibleGridIdx = getChildIndex(lastVisibleGrid);
        if (lastVisibleGridIdx == null && lastVisiblePopupIdx == null) {
            return $finalAnimeList.length || 0;
        } else {
            return Math.max(
                lastVisiblePopupIdx ? lastVisiblePopupIdx + 1 : 0,
                lastVisibleGridIdx ? lastVisibleGridIdx + 1 : 0,
            );
        }
    };

    let lessenItemTimeout;
    newFinalAnime.subscribe(async (val) => {
        if (
            typeof val?.finalAnimeList?.id === "number" &&
            typeof val?.idx === "number"
        ) {
            if ($finalAnimeList instanceof Array) {
                if (
                    $finalAnimeList?.[val.idx] &&
                    Math.abs($finalAnimeList?.[val.idx]?.id) ===
                        val?.finalAnimeList?.id
                ) {
                    $finalAnimeList[val.idx] = val.finalAnimeList;
                } else {
                    $finalAnimeList = $finalAnimeList?.map?.((anime) => {
                        if (Math.abs(anime.id) === val?.finalAnimeList?.id) {
                            anime.id = -anime.id;
                        }
                        return anime;
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
            if (val?.idx < shownFinalAnimeListCount - 1) {
                cancelAnimationFrame(lessenItemTimeout);
                lessenItemTimeout = requestAnimationFrame(() => {
                    $finalAnimeList = $finalAnimeList?.slice?.(
                        0,
                        window.getLastShownFinalAnimeLength() || 0,
                    );
                });
                if (isRunningIntersectEvent) return;
                $progress = (val?.idx / (shownFinalAnimeListCount - 1)) * 100;
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
            } else {
                $progress = 100;
            }
        }
    });

    finalAnimeList.subscribe(async (val) => {
        if (val instanceof Array && val.length) {
            shownFinalAnimeListCount = val.length;
            if ($shownAllInList) {
                $shownAllInList = false;
            }
            await tick();
            addLastAnimeObserver();
            let lastGridElementIdx = $finalAnimeList.length - 1;
            let lastGridElement =
                $finalAnimeList[lastGridElementIdx].gridElement ||
                animeGridEl.children?.[lastGridElementIdx];
            if ($animeObserver instanceof IntersectionObserver) {
                if ($finalAnimeList.length >= 11) {
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
                $asyncAnimeReloaded = !$asyncAnimeReloaded;
                isAsyncLoad = false;
            }
        } else {
            shownFinalAnimeListCount = 0;
            if ($animeObserver) {
                $animeObserver?.disconnect?.();
                $animeObserver = null;
            }
            if (isAsyncLoad) {
                $asyncAnimeReloaded = !$asyncAnimeReloaded;
                isAsyncLoad = false;
            }
        }
    });

    searchedAnimeKeyword.subscribe(async (val) => {
        if (typeof val === "string") {
            if ($animeLoaderWorker instanceof Worker) {
                setLocalStorage("searchedAnimeKeyword", val).catch(() => {
                    removeLocalStorage("searchedAnimeKeyword");
                });
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

    window.addEventListener(
        "scroll",
        () => {
            isWholeGridSeen =
                isFullViewed &&
                windowHeight >
                    animeGridEl?.getBoundingClientRect?.()?.bottom + 10 + 57;
            if (animeGridEl?.getBoundingClientRect?.()?.top < 0) {
                belowGrid = true;
            } else {
                belowGrid = false;
            }
        },
        { passive: true },
    );

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
        windowHeight = Math.max(
            window.visualViewport.height,
            window.innerHeight,
        );
        windowWidth = Math.max(
            document?.documentElement?.getBoundingClientRect?.()?.width,
            window.visualViewport.width,
            window.innerWidth,
        );
        animeGridEl = animeGridEl || document.getElementById("anime-grid");
        window.addEventListener("resize", () => {
            windowHeight = Math.max(
                window.visualViewport.height,
                window.innerHeight,
            );
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
        style:--anime-grid-height={windowHeight + "px"}
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
                        tabindex={$popupVisible ? "" : "0"}
                        on:click={handleOpenPopup(animeIdx)}
                        on:pointerdown={(e) => handleOpenOption(e, animeIdx)}
                        on:pointerup={cancelOpenOption}
                        on:pointercancel={cancelOpenOption}
                        on:keydown={(e) =>
                            e.key === "Enter" && handleOpenPopup(animeIdx)}
                    >
                        {#if anime?.coverImageUrl || anime?.bannerImageUrl || anime?.trailerThumbnailUrl}
                            <img
                                use:addImage={anime?.coverImageUrl ||
                                    anime?.bannerImageUrl ||
                                    anime?.trailerThumbnailUrl ||
                                    emptyImage}
                                fetchpriority={animeIdx > numberOfLoadedGrid
                                    ? ""
                                    : "high"}
                                loading={animeIdx > numberOfLoadedGrid
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
                        {/if}
                        <span class="image-grid__card-title">
                            <span
                                class="title copy"
                                copy-value={anime?.copiedTitle || ""}
                                copy-value-2={anime?.shownTitle || ""}
                                >{anime?.shownTitle || "N/A"}</span
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
                                            {`${anime.format || "N/A"}`}
                                            {#key $earlisetReleaseDate || 1}
                                                {getFinishedEpisode(
                                                    anime.episodes,
                                                    anime.nextAiringEpisode,
                                                )}
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
                                        {#if anime?.shownScore != null}
                                            <!-- star -->
                                            <svg
                                                viewBox="0 0 576 512"
                                                class={`${anime?.contentCautionColor}-fill score`}
                                                ><path
                                                    d="M317 18a32 32 0 0 0-58 0l-64 132-144 22a32 32 0 0 0-17 54l104 103-25 146a32 32 0 0 0 47 33l128-68 129 68a32 32 0 0 0 46-33l-24-146 104-103a32 32 0 0 0-18-54l-144-22-64-132z"
                                                /></svg
                                            >
                                            {anime?.shownScore ?? "N/A"}
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
                                            {anime?.shownCount ?? "N/A"}
                                        {:else if anime?.shownFavorites != null}
                                            <svg
                                                viewBox="0 0 512 512"
                                                class={`${anime?.contentCautionColor}-fill score`}
                                            >
                                                <path
                                                    d="m48 300 180 169a41 41 0 0 0 56 0l180-169c31-28 48-68 48-109v-6A143 143 0 0 0 268 84l-12 12-12-12A143 143 0 0 0 0 185v6c0 41 17 81 48 109z"
                                                /></svg
                                            >
                                            {anime?.shownFavorites ?? "N/A"}
                                        {:else if anime?.shownActivity != null}
                                            <svg
                                                viewBox="0 0 512 512"
                                                class={`${anime?.contentCautionColor}-fill score`}
                                            >
                                                <path
                                                    d="M64 64a32 32 0 1 0-64 0v336c0 44 36 80 80 80h400a32 32 0 1 0 0-64H80c-9 0-16-7-16-16V64zm407 87a32 32 0 0 0-46-46L320 211l-57-58a32 32 0 0 0-46 0L105 265a32 32 0 0 0 46 46l89-90 57 58c13 12 33 12 46 0l128-128z"
                                                /></svg
                                            >
                                            {anime?.shownActivity ?? "N/A"}
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
            tabindex="0"
            on:click={goBackGrid}
            on:keydown={(e) => e.key === "Enter" && goBackGrid(e)}
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
        background-color: rgba(30, 42, 56, 0.8) !important;
    }

    .image-grid__card.loading {
        animation: loadingImage 1.5s ease-in-out infinite;
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
        background-color: rgba(30, 42, 56, 0.8);
        border-radius: 0.25em;
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
        background: rgba(30, 42, 56, 0.8);
        border-radius: 0.25em;
        display: block;
        cursor: pointer;
        box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.12),
            0 1px 2px rgba(0, 0, 0, 0.24);
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
        color: white;
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
        background-color: rgba(102, 102, 102, 0.6);
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

    @keyframes loadingImage {
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
</style>
