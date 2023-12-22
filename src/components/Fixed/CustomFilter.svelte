<script>
    import {
        confirmPromise,
        customFilters,
        selectedCustomFilter,
        gridFullView,
        android,
        hasWheel,
        showFilterOptions,
        dropdownIsVisible,
        popupVisible,
        listIsUpdating,
        animeLoaderWorker,
        finalAnimeList,
        hiddenEntries,
        dataStatus,
        listUpdateAvailable,
        shownAllInList,
        newFinalAnime,
    } from "../../js/globalValues.js";
    import { onMount, tick } from "svelte";
    import {
        getElementWidth,
        getLocalStorage,
        trimAllEmptyChar,
    } from "../../js/others/helper.js";
    import { animeLoader } from "../../js/workerUtils.js";

    let windowWidth = Math.max(
        document?.documentElement?.getBoundingClientRect?.()?.width,
        window.visualViewport.width,
        window.innerWidth,
    );
    let customFiltersNav;
    let customFiltersNavVisible;
    let animeGridEl;
    let popupContainer;
    let showCustomFilter;
    let lastScrollTop = 0,
        isScrolledYMax,
        isFullViewed,
        customFilNavIsAnimating,
        customFilOpacity;

    let showCustomFilterNavTimeout;
    function customFilterNavVisibility(show) {
        return new Promise((resolve) => {
            clearTimeout(showCustomFilterNavTimeout);
            if (show) {
                showCustomFilter = true;
                customFilOpacity = 1;
                resolve();
            } else {
                customFilOpacity = 0;
                showCustomFilterNavTimeout = setTimeout(() => {
                    showCustomFilter = false;
                    resolve();
                }, 160);
            }
        });
    }

    $: {
        isScrolledYMax =
            lastScrollTop >=
                document?.documentElement?.scrollHeight -
                    window?.innerHeight -
                    1 && $shownAllInList;
        if (isScrolledYMax) {
            customFilOpacity = 1;
        }
    }
    $: {
        isFullViewed =
            $gridFullView ?? getLocalStorage("gridFullView") ?? false;
        if (isFullViewed) {
            customFilOpacity = 1;
        }
    }
    $: {
        customFiltersNavVisible =
            $customFilters?.length && (!$android || showCustomFilter);
    }

    gridFullView.subscribe(() => {
        setMinHeight();
    });

    window.addEventListener("resize", () => {
        setMinHeight();
    });

    function setMinHeight() {
        if ($gridFullView) {
            document.documentElement.style.minHeight = "";
        } else {
            document.documentElement.style.minHeight =
                screen.height + 48 + "px";
        }
    }

    async function updateList() {
        $listIsUpdating = true;
        if ($animeLoaderWorker) {
            $animeLoaderWorker.terminate();
            $animeLoaderWorker = null;
        }
        animeLoader()
            .then(async (data) => {
                $animeLoaderWorker = data.animeLoaderWorker;
                if (data?.isNew) {
                    if ($finalAnimeList instanceof Array) {
                        $finalAnimeList = $finalAnimeList?.slice?.(
                            0,
                            Math.min(
                                window.getLastShownFinalAnimeLength() || 0,
                                data.finalAnimeListCount,
                            ),
                        );
                    }
                    if (data?.finalAnimeList?.length > 0) {
                        data?.finalAnimeList?.forEach?.((anime, idx) => {
                            $newFinalAnime = {
                                idx: data.shownAnimeListCount + idx,
                                finalAnimeList: anime,
                            };
                        });
                    } else {
                        $finalAnimeList = [];
                    }
                    $hiddenEntries = data.hiddenEntries || $hiddenEntries;
                }
                $dataStatus = null;
                return;
            })
            .catch((error) => {
                console.error(error);
            });
    }

    let unsub = customFilters.subscribe((val) => {
        if (val?.length) unsubCustomFilters();
        if ($selectedCustomFilter) return;
        scrollToSelectedCustomFilter();
    });
    function unsubCustomFilters() {
        try {
            if (unsub) {
                unsub?.();
                unsub = null;
                customFilterNavVisibility(true);
                unsubCustomFilters = null;
            }
        } catch (e) {}
    }
    selectedCustomFilter.subscribe((val) => {
        if (typeof val === "string") {
            scrollToSelectedCustomFilter(val);
        }
    });

    let selectedElementIndicatorWidth, selectedElementIndicatorOffsetLeft;
    async function scrollToSelectedCustomFilter(val = $selectedCustomFilter) {
        if (!customFiltersNav) return;
        await tick();
        let elementToScroll = Array.from(customFiltersNav?.children || []).find(
            (e) =>
                e?.getAttribute?.("custom-filter-name") === val &&
                e?.classList?.contains?.("custom-filter"),
        );
        if (elementToScroll instanceof Element) {
            let selectedElementWidth = getElementWidth(elementToScroll) || 26;
            selectedElementIndicatorWidth = selectedElementWidth * 0.9;

            selectedElementIndicatorOffsetLeft =
                elementToScroll?.offsetLeft +
                parseFloat(
                    window?.getComputedStyle?.(elementToScroll, null)
                        ?.paddingLeft,
                ) +
                (selectedElementWidth - selectedElementIndicatorWidth) / 2;
            let scrollPosition =
                elementToScroll?.offsetLeft -
                customFiltersNav?.clientWidth / 2 +
                elementToScroll?.offsetWidth / 2;
            customFiltersNav?.scrollTo?.({
                left: scrollPosition,
                behavior: "smooth",
            });
        } else {
            selectedElementIndicatorOffsetLeft = selectedElementIndicatorWidth =
                -99;
        }
    }

    let goToNextPrevCustomFilterTimeout;
    function goToNextPrevCustomFilter(event, next = true) {
        if (event?.target?.classList?.contains("custom-filter")) return;
        if (!$customFilters?.length) return pleaseWaitAlert();
        clearTimeout(goToNextPrevCustomFilterTimeout);
        goToNextPrevCustomFilterTimeout = setTimeout(() => {
            let selectedCustomFilterIdx = $customFilters.indexOf(
                $selectedCustomFilter,
            );
            if (selectedCustomFilterIdx < 0) return;
            let idxToSelect = selectedCustomFilterIdx + (next ? 1 : -1);
            if (idxToSelect >= 0 && $customFilters?.length > idxToSelect) {
                let selectingCustomFilterName = $customFilters?.[idxToSelect];
                if (selectingCustomFilterName)
                    selectCustomFilter(selectingCustomFilterName);
            }
        }, 8);
    }

    let scrollFullGridTimeout;
    async function selectCustomFilter(selectedCustomFilterName) {
        if (!$customFilters?.length) return pleaseWaitAlert();
        clearTimeout(scrollFullGridTimeout);
        customFilterNavVisibility(true);
        goBackGrid(selectedCustomFilterName);
        if (selectedCustomFilterName === $selectedCustomFilter) {
            if ($listUpdateAvailable) {
                updateList();
            }
            return;
        }
        $selectedCustomFilter = selectedCustomFilterName;
        $dropdownIsVisible = false;
    }

    let lastClicked, lastClickedTimeout, clickedOnce;
    async function goBackGrid(selectedCustomFilterName) {
        let isDoubleClicked;
        if (lastClicked === selectedCustomFilterName) {
            lastClicked = selectedCustomFilterName;
            if (clickedOnce) {
                isDoubleClicked = true;
                clickedOnce = false;
            } else {
                clickedOnce = true;
                lastClickedTimeout = setTimeout(() => {
                    clickedOnce = false;
                }, 500);
            }
        } else {
            lastClicked = selectedCustomFilterName;
            clickedOnce = true;
            clearTimeout(lastClickedTimeout);
        }
        let scrollTop;
        if ($showFilterOptions && isFullViewed) {
            scrollTop = -9999;
        } else {
            if (isFullViewed) {
                scrollTop = 65;
            } else {
                scrollTop = 48;
            }
        }
        if ($android || !matchMedia("(hover:hover)").matches) {
            document.documentElement.style.overflow = "hidden";
            document.documentElement.style.overflow = "";
        }
        if (isDoubleClicked) {
            window.scrollY = document.documentElement.scrollTop = scrollTop;
        } else {
            window.scrollTo({ top: scrollTop, behavior: "smooth" });
        }
        if (isFullViewed) {
            if (matchMedia("(pointer:fine)").matches) {
                scrollFullGridTimeout = setTimeout(() => {
                    animeGridEl.style.overflow = "hidden";
                    animeGridEl.style.overflow = "";
                    animeGridEl.scroll({ left: 0, behavior: "smooth" });
                }, 100);
            } else {
                animeGridEl.style.overflow = "hidden";
                animeGridEl.style.overflow = "";
                animeGridEl.scroll({ left: 0, behavior: "smooth" });
            }
        }
        if ($popupVisible) {
            popupContainer.scrollTop = 0;
        }
    }

    let shouldScrollSnap = getLocalStorage("nonScrollSnapFilters") ?? true;
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

    async function pleaseWaitAlert() {
        return await $confirmPromise({
            isAlert: true,
            title: "Initializing resources",
            text: "Please wait a moment...",
        });
    }
    let touchID,
        startY,
        endY,
        yThreshold = 48;

    window.addEventListener(
        "touchstart",
        (event) => {
            if (
                touchID != null ||
                (event?.target?.classList?.contains?.("custom-filter") ?? true)
            ) {
                return;
            }
            startY = event.touches[0].clientY;
            touchID = event.touches[0].identifier;
        },
        { passive: true },
    );

    window.addEventListener(
        "touchmove",
        (event) => {
            if (touchID == null) return;
            endY = Array.from(event.changedTouches)?.find(
                (touch) => touch.identifier === touchID,
            )?.clientY;
            if (typeof endY === "number") {
                let deltaY = endY - startY;
                let newCustomFilOpacity = Math.min(
                    Math.abs(deltaY / yThreshold),
                    1,
                );
                if (!customFiltersNavVisible && deltaY > 0) {
                    customFilNavIsAnimating = true;
                    customFilOpacity = newCustomFilOpacity;
                } else if (customFiltersNavVisible && deltaY < 0) {
                    customFilNavIsAnimating = true;
                    customFilOpacity = 1 - newCustomFilOpacity;
                }
            }
        },
        { passive: true },
    );
    window.showCustomFilter = () => {
        customFilterNavVisibility(true);
    };
    function touchedUp() {
        touchID = null;
        customFilterNavVisibility(customFilOpacity > 0.5).then(() => {
            if (touchID == null) {
                customFilNavIsAnimating = false;
            }
        });
    }
    window.addEventListener("touchend", touchedUp, { passive: true });
    window.addEventListener("touchcancel", touchedUp, { passive: true });
    window.addEventListener("resize", () => {
        windowWidth = Math.max(
            document?.documentElement?.getBoundingClientRect?.()?.width,
            window.visualViewport.width,
            window.innerWidth,
        );
        scrollToSelectedCustomFilter();
    });
    window.addEventListener("scroll", () => {
        lastScrollTop = document.documentElement.scrollTop;
    });

    onMount(() => {
        windowWidth = Math.max(
            document?.documentElement?.getBoundingClientRect?.()?.width,
            window.visualViewport.width,
            window.innerWidth,
        );
        customFiltersNav =
            customFiltersNav || document.getElementById("custom-filters-nav");
        animeGridEl = document.getElementById("anime-grid");
        lastScrollTop = document.documentElement.scrollTop;
        popupContainer = document?.getElementById("popup-container");
    });
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
    class={"custom-filters-nav" +
        ((!$android || isScrolledYMax || isFullViewed) && $customFilters?.length
            ? " persistent-show"
            : (customFilNavIsAnimating || customFiltersNavVisible) &&
                $customFilters?.length
              ? ""
              : " hide")}
    style:--opacity={$android ? customFilOpacity : ""}
>
    <div
        class="prev-custom-filter"
        on:click={(e) => goToNextPrevCustomFilter(e, false)}
        on:keydown={(e) => {
            e.key === "Enter" && goToNextPrevCustomFilter(e, false);
        }}
    ></div>
    <div
        class="next-custom-filter"
        on:click={(e) => goToNextPrevCustomFilter(e, true)}
        on:keydown={(e) => {
            e.key === "Enter" && goToNextPrevCustomFilter(true);
        }}
    ></div>
    <nav
        id="custom-filters-nav"
        bind:this={customFiltersNav}
        class={"nav" +
            ($hasWheel ? " hasWheel" : "") +
            (shouldScrollSnap && $android ? " android" : "")}
        on:wheel={(e) => {
            horizontalWheel(e, "nav");
        }}
    >
        <div
            class="selected-custom-filter-indicator"
            style:--width={selectedElementIndicatorWidth + "px"}
            style:--translateY={selectedElementIndicatorOffsetLeft + "px"}
        ></div>
        {#each $customFilters as filterName (filterName || {})}
            <span
                tabindex="0"
                on:click={selectCustomFilter(filterName)}
                on:keydown={(e) => {
                    e.key === "Enter" && selectCustomFilter(filterName);
                }}
                custom-filter-name={filterName}
                class={"custom-filter" +
                    (filterName === $selectedCustomFilter ? " selected" : "")}
                >{trimAllEmptyChar(filterName) || ""}
            </span>
        {/each}
    </nav>
</div>

<style>
    :global(.html) {
        --min-height: unset;
        min-height: var(--min-height);
    }
    .custom-filters-nav.hide {
        display: block !important;
        opacity: 0 !important;
    }
    .custom-filters-nav.persistent-show {
        display: flex !important;
        opacity: 1 !important;
    }
    .custom-filters-nav {
        z-index: 991;
        position: fixed;
        bottom: 0px;
        width: 100%;
        height: 65px;
        background-color: rgba(11, 22, 34, 0.9);
        color: white;
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
        transition: opacity 0.16s ease;
        opacity: var(--opacity);
    }
    .nav {
        display: flex;
        position: relative;
        width: min(calc(100% - 100px), calc(1140px - 100px));
        height: 100%;
        align-items: center;
        -ms-user-select: none;
        -webkit-user-select: none;
        user-select: none;
        max-width: 1140px;
        gap: 2.5em;
        padding: 0;
        overflow-x: auto !important;
        -ms-overflow-style: none;
        scrollbar-width: none;
        scroll-snap-type: x mandatory;
        margin: auto;
    }
    .nav.hasWheel {
        scroll-snap-type: none !important;
    }
    .nav.android {
        scroll-snap-type: none !important;
    }
    @media screen and (hover: hover) and (pointer: fine) {
        .nav {
            scroll-snap-type: none !important;
        }
    }
    .nav::-webkit-scrollbar {
        display: none;
    }
    .prev-custom-filter,
    .next-custom-filter {
        height: 100%;
        width: 48px;
        position: absolute;
        top: 0;
        opacity: 0 !important;
        z-index: 1 !important;
    }
    .prev-custom-filter {
        left: 0;
    }
    .next-custom-filter {
        right: 0;
    }
    .selected-custom-filter-indicator {
        --width: -999px;
        --translateY: -999px;
        position: absolute;
        top: 0;
        left: 0;
        height: 5px;
        background-color: rgb(61, 180, 242);
        border-radius: 0px 0px 1000px 1000px;
        width: var(--width);
        translate: var(--translateY);
        transition:
            translate 0.15s ease-out,
            width 0.075s ease-out 0.075s;
    }
    .custom-filter {
        display: flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap; 
        background-color: transparent;
        font-size: 1.3rem;
        font-weight: 500;
        height: 100%;
        scroll-snap-align: start;
        margin-bottom: auto;
        padding: 1em;
        z-index: 2 !important;
    }
    .custom-filter.selected {
        color: rgb(61, 180, 242) !important;
    }
    @media screen and (max-width: 750px) {
        .nav {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
        }
    }
    @media screen and (min-width: 750px) {
        .prev-custom-filter,
        .next-custom-filter {
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
