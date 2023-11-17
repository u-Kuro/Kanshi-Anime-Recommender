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
        customFilterVisible,
    } from "../../js/globalValues.js";
    import { onMount } from "svelte";
    import { getLocalStorage } from "../../js/others/helper.js";

    let windowWidth = Math.max(window.visualViewport.width, window.innerWidth);
    let customFiltersNav;
    let animeGridEl;
    let popupContainer;
    $: isFullViewed = $gridFullView ?? getLocalStorage("gridFullView") ?? true;

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

    async function selectCustomFilter(selectedCustomFilterName) {
        if ($initData) {
            return pleaseWaitAlert();
        }
        goBackGrid();
        if (selectedCustomFilterName === $selectedCustomFilter) return;
        $selectedCustomFilter = selectedCustomFilterName;
        $dropdownIsVisible = false;
    }

    function goBackGrid() {
        if (!$showFilterOptions || !isFullViewed) {
            window.scrollY = document.documentElement.scrollTop = 48;
        }
        if (isFullViewed) {
            animeGridEl?.children?.[0]?.scrollIntoView?.({
                behavior: "smooth",
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

    let lastScrollTop;
    window.addEventListener("scroll", () => {
        let scrollTop = document.documentElement.scrollTop;
        lastScrollTop = scrollTop;
    });
    window.addEventListener("resize", () => {
        windowWidth = Math.max(window.visualViewport.width, window.innerWidth);
    });

    onMount(() => {
        windowWidth = Math.max(window.visualViewport.width, window.innerWidth);
        customFiltersNav =
            customFiltersNav || document.getElementById("custom-filters-nav");
        animeGridEl = document.getElementById("anime-grid");
        lastScrollTop = document.documentElement.scrollTop;
        popupContainer = document?.getElementById("popup-container");
    });

    async function pleaseWaitAlert() {
        return await $confirmPromise({
            isAlert: true,
            title: "Initializing resources",
            text: "Please wait a moment...",
        });
    }

    $: {
        $customFilterVisible =
            !$android &&
            window?.matchMedia?.("(pointer:fine)")?.matches &&
            !$initData;
    }
</script>

<div class={"custom-filters-nav" + (!$customFilterVisible ? " hide" : "")}>
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
        transform: translateY(48px) translateZ(0) !important;
        -webkit-transform: translateY(48px) translateZ(0) !important;
        -ms-transform: translateY(48px) translateZ(0) !important;
        -moz-transform: translateY(48px) translateZ(0) !important;
        -o-transform: translateY(48px) translateZ(0) !important;
    }
    .custom-filters-nav {
        z-index: 991;
        position: fixed;
        bottom: 0px;
        width: 100%;
        height: 48px;
        background-color: rgba(21, 31, 46, 0.9);
        color: white;
        transform: translateZ(0) !important;
        -webkit-transform: translateZ(0) !important;
        -ms-transform: translateZ(0) !important;
        -moz-transform: translateZ(0) !important;
        -o-transform: translateZ(0) !important;
        transition: transform 0.3s ease;
    }
    @media screen and (max-width: 750px) {
        .custom-filters-nav {
            border-bottom: 1px solid rgb(35 45 65) !important;
        }
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
        gap: 3em;
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
        height: 80%;
        scroll-snap-align: start;
        margin-bottom: auto;
        border-top: 3px solid transparent;
    }
    .custom-filter.selected {
        color: rgb(150 200 255) !important;
        border-top: 3px solid rgb(150 200 255) !important;
    }
    @media screen and (max-width: 750px) {
        .nav {
            margin: 0px 1em !important;
            width: calc(100% - 20px) !important;
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
