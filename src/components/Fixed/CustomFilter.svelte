<script>
    import {
        confirmPromise,
        customFilters,
        selectedCustomFilter,
        initData,
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
    } from "../../js/globalValues.js";
    import { onMount, tick } from "svelte";
    import { getLocalStorage } from "../../js/others/helper.js";
    import { animeLoader } from "../../js/workerUtils.js";
    import { element } from "svelte/internal";

    let windowWidth = Math.max(
        document?.documentElement?.getBoundingClientRect?.()?.width,
        window.innerWidth,
    );
    let customFiltersNav;
    let customFiltersNavVisible;
    let animeGridEl;
    let popupContainer;
    let lastScrollTop = 0,
        isScrolledUp,
        isScrolledYMax,
        customFilterClicked;
    $: isScrolledYMax =
        lastScrollTop >=
        document?.documentElement?.scrollHeight - window?.innerHeight - 1;
    $: isFullViewed = $gridFullView ?? getLocalStorage("gridFullView") ?? true;
    $: customFiltersNavVisible =
        !$initData &&
        (!$android ||
            isFullViewed ||
            isScrolledUp ||
            isScrolledYMax ||
            customFilterClicked);

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
                screen.height + 37 + "px";
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
                    $finalAnimeList = data.finalAnimeList;
                    $hiddenEntries = data.hiddenEntries;
                }
                $dataStatus = null;
                return;
            })
            .catch((error) => {
                throw error;
            });
    }

    let unsub = customFilters.subscribe(() => {
        if ($selectedCustomFilter) return;
        scrollToSelectedCustomFilter();
    });
    selectedCustomFilter.subscribe((val) => {
        if (val && unsub) {
            unsub();
            unsub = null;
        }
        scrollToSelectedCustomFilter(val);
    });

    async function scrollToSelectedCustomFilter(val = $selectedCustomFilter) {
        if (!customFiltersNav) return;
        await tick();
        let elementToScroll = Array.from(customFiltersNav?.children || []).find(
            (e) => e?.innerText === val,
        );
        let scrollPosition =
            elementToScroll?.offsetLeft -
            document?.documentElement?.getBoundingClientRect?.()?.width / 2 +
            elementToScroll?.offsetWidth / 2;
        customFiltersNav?.scrollTo?.({
            left: scrollPosition,
            behavior: "smooth",
        });
    }

    async function selectCustomFilter(selectedCustomFilterName) {
        if ($initData) return pleaseWaitAlert();
        customFilterClicked = true;
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
    function goBackGrid(selectedCustomFilterName) {
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
            animeGridEl?.children?.[0]?.scrollIntoView?.({
                behavior: "smooth",
                block: "nearest",
            });
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

    window.addEventListener("wheel", () => {
        customFilterClicked = false;
    });
    window.addEventListener("pointerdown", (event) => {
        if (event?.target?.classList?.contains?.("custom-filter") ?? true) {
            return;
        }
        customFilterClicked = false;
    });
    window.addEventListener("scroll", () => {
        let scrollTop = document.documentElement.scrollTop;
        if (isScrolledUp) {
            isScrolledUp = lastScrollTop >= scrollTop;
        } else {
            isScrolledUp = lastScrollTop - scrollTop > 1;
        }
        lastScrollTop = scrollTop;
    });
    window.addEventListener("resize", () => {
        windowWidth = Math.max(
            document?.documentElement?.getBoundingClientRect?.()?.width,
            window.innerWidth,
        );
    });

    onMount(() => {
        windowWidth = Math.max(
            document?.documentElement?.getBoundingClientRect?.()?.width,
            window.innerWidth,
        );
        customFiltersNav =
            customFiltersNav || document.getElementById("custom-filters-nav");
        animeGridEl = document.getElementById("anime-grid");
        lastScrollTop = document.documentElement.scrollTop;
        popupContainer = document?.getElementById("popup-container");
    });
</script>

<div class={"custom-filters-nav" + (customFiltersNavVisible ? "" : " hide")}>
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
        {#each $customFilters as filterName (filterName || {})}
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <span
                tabindex="0"
                on:click={selectCustomFilter(filterName)}
                on:keydown={(e) => {
                    e.key === "Enter" && selectCustomFilter(filterName);
                }}
                class={"custom-filter" +
                    (filterName === $selectedCustomFilter ? " selected" : "")}
                >{filterName || ""}
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
        transform: translateY(65px) translateZ(0) !important;
        -webkit-transform: translateY(65px) translateZ(0) !important;
        -ms-transform: translateY(65px) translateZ(0) !important;
        -moz-transform: translateY(65px) translateZ(0) !important;
        -o-transform: translateY(65px) translateZ(0) !important;
    }
    .custom-filters-nav {
        z-index: 991;
        position: fixed;
        bottom: 0px;
        width: 100%;
        height: 65px;
        background-color: rgba(21, 31, 46, 0.9);
        color: white;
        transform: translateZ(0) !important;
        -webkit-transform: translateZ(0) !important;
        -ms-transform: translateZ(0) !important;
        -moz-transform: translateZ(0) !important;
        -o-transform: translateZ(0) !important;
        transition: transform 0.3s ease;
    }
    .nav {
        display: flex;
        width: min(calc(100% - 100px), calc(1140px - 100px));
        height: 100%;
        align-items: center;
        -ms-user-select: none;
        -webkit-user-select: none;
        user-select: none;
        max-width: 1140px;
        gap: 2.5em;
        padding: 0 1em;
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
    .custom-filter {
        display: flex;
        align-items: center;
        justify-content: center;
        text-wrap: nowrap;
        background-color: transparent;
        font-size: 1.3rem;
        font-weight: 500;
        height: 100%;
        scroll-snap-align: start;
        margin-bottom: auto;
        border-top: 3px solid transparent;
        padding: 1em;
    }
    .custom-filter.selected {
        color: rgb(150 200 255) !important;
        border-top: 3px solid rgb(150 200 255) !important;
    }
    @media screen and (max-width: 750px) {
        .nav {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
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
