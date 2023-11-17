<script>
    import {
        confirmPromise,
        customFilters,
        selectedCustomFilter,
        initData,
        gridFullView,
        android,
        mobileKeyIsUp,
        customFilNavIsShown,
        hasWheel,
        activeTagFilters,
        menuVisible,
        showFilterOptions,
        dropdownIsVisible,
    } from "../../js/globalValues.js";
    import { onMount } from "svelte";
    import { getLocalStorage } from "../../js/others/helper.js";

    let windowWidth = Math.max(window.visualViewport.width, window.innerWidth);
    let windowHeight = Math.max(
        window.visualViewport.height,
        window.innerHeight
    );
    let belowHomeCustomFilEl = false;
    let homeCustomFilterEl;
    let animeGridEl;
    let activeFiltersEl;
    let checkedOriginalSizeForGridView =
        windowWidth > 750 && windowHeight > 695;
    $: isFullViewed =
        $gridFullView ??
        getLocalStorage("gridFullView") ??
        (!$android && checkedOriginalSizeForGridView);

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

    let isScrolledUp;

    $: {
        $customFilNavIsShown =
            !isFullViewed &&
            !$mobileKeyIsUp &&
            $customFilters?.length > 1 &&
            belowHomeCustomFilEl &&
            !$initData &&
            isScrolledUp;
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
        if (isFullViewed) {
            animeGridEl.style.overflow = "hidden";
            animeGridEl.style.overflow = "";
            animeGridEl?.children?.[0]?.scrollIntoView?.({
                container: animeGridEl,
                behavior: "smooth",
                block: "nearest",
                inline: "start",
            });
        } else {
            if ($android || !matchMedia("(hover:hover)").matches) {
                document.documentElement.style.overflow = "hidden";
                document.documentElement.style.overflow = "";
            }
            let scrollTop =
                ($showFilterOptions
                    ? activeFiltersEl?.offsetTop - 48 - 20 || 167
                    : 58) + 1;
            document.documentElement.scrollTop = window.scrollY = scrollTop;
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

    activeTagFilters.subscribe(() => {
        $customFilNavIsShown =
            !isFullViewed &&
            !$mobileKeyIsUp &&
            $customFilters?.length > 1 &&
            belowHomeCustomFilEl &&
            !$initData &&
            isScrolledUp;
    });

    let lastScrollTop;
    window.addEventListener("scroll", () => {
        let scrollTop = document.documentElement.scrollTop;
        isScrolledUp = scrollTop < lastScrollTop;
        lastScrollTop = scrollTop;
        checkBelowCurtomFilterEl();
    });

    showFilterOptions.subscribe(() => {
        checkBelowCurtomFilterEl();
    });

    function checkBelowCurtomFilterEl() {
        if ($showFilterOptions && activeFiltersEl) {
            belowHomeCustomFilEl =
                document.documentElement.scrollTop >=
                activeFiltersEl.offsetTop - 48 - 20;
        } else if (homeCustomFilterEl) {
            let rect = homeCustomFilterEl?.getBoundingClientRect?.();
            belowHomeCustomFilEl = rect && rect?.top - 18 <= 0;
        }
    }

    function handleMenuVisibility(event) {
        if (matchMedia("(pointer:fine)").matches) {
            let element = event.target;
            let classList = element.classList;
            if (
                !(
                    classList.contains("nav") ||
                    classList.contains("custom-filters-nav")
                )
            )
                return;
            $menuVisible = !$menuVisible;
        }
    }

    onMount(() => {
        homeCustomFilterEl = document.getElementById("custom-filter-name");
        animeGridEl = document.getElementById("anime-grid");
        activeFiltersEl = document.getElementById("activeFilters");
        lastScrollTop = document.documentElement.scrollTop;
    });

    async function pleaseWaitAlert() {
        return await $confirmPromise({
            isAlert: true,
            title: "Initializing resources",
            text: "Please wait a moment...",
        });
    }
</script>

<div
    class={"custom-filters-nav" + ($customFilNavIsShown ? " show" : "")}
    on:click={handleMenuVisibility}
    on:keydown={(e) => e.key === "Enter" && handleMenuVisibility(e)}
>
    <nav
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
    .custom-filters-nav.show {
        transform: translateZ(0) !important;
        -webkit-transform: translateZ(0) !important;
        -ms-transform: translateZ(0) !important;
        -moz-transform: translateZ(0) !important;
        -o-transform: translateZ(0) !important;
    }
    .custom-filters-nav {
        z-index: 991;
        position: fixed;
        top: 0px;
        width: 100%;
        height: 48px;
        background-color: #0b1622;
        color: white;
        transform: translateY(-48px) translateZ(0);
        -webkit-transform: translateY(-48px) translateZ(0);
        -ms-transform: translateY(-48px) translateZ(0);
        -moz-transform: translateY(-48px) translateZ(0);
        -o-transform: translateY(-48px) translateZ(0);
        transition: transform 0.2s linear;
    }
    @media screen and (max-width: 750px) {
        .custom-filters-nav {
            z-index: 994 !important;
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
        gap: 1.5em;
        padding: 0.5em 0px;
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
        background-color: #151f2e;
        font-size: 1.2rem;
        border-radius: 5px;
        height: 90%;
        padding: 0.5em 1em;
        scroll-snap-align: start;
    }
    .custom-filter.selected {
        background-color: rgb(24 62 104) !important;
    }
    @media screen and (max-width: 750px) {
        .nav {
            padding: 0.5em 0px !important;
            margin: 0px 1em !important;
            width: calc(100% - 20px) !important;
        }
    }
</style>
