<script>
    import { onMount, tick } from "svelte";
    import {
        getElementWidth,
        getLocalStorage,
        requestImmediate,
        trimAllEmptyChar,
    } from "../../js/others/helper.js";
    import {
        confirmPromise,
        gridFullView,
        android,
        hasWheel,
        showFilterOptions,
        dropdownIsVisible,
        popupVisible,
        shownAllInList,
        menuVisible,
        selectedCategory,
        categoriesKeys,
        selectedMediaGridEl,
        documentScrollTop,
    } from "../../js/globalValues.js";

    let categoriesNav;
    let showCategoriesNav = true;
    let popupContainer;
    let isScrolledYMax;

    documentScrollTop.subscribe((val) => {
        isScrolledYMax = val >= document?.documentElement?.scrollHeight - window?.innerHeight - 1 
            && $shownAllInList?.[$selectedCategory];
        if (isScrolledYMax) {
            showCategoriesNav = true;
        }
    })

    $: {
        if ($gridFullView) {
            showCategoriesNav = true;
        }
    }

    let selectedElementIndicatorWidth, selectedElementIndicatorOffsetLeft;
    async function scrollToSelectedCategory(val = $selectedCategory) {
        await tick();
        let elementToScroll = Array.from(categoriesNav?.children || []).find(
            (e) =>
                e?.dataset?.category === val &&
                e?.classList?.contains?.("category"),
        );
        if (elementToScroll instanceof Element) {
            let selectedElementWidth = getElementWidth(elementToScroll) || 26;
            selectedElementIndicatorWidth = selectedElementWidth;

            selectedElementIndicatorOffsetLeft =
                elementToScroll?.offsetLeft +
                parseFloat(
                    window?.getComputedStyle?.(elementToScroll, null)
                        ?.paddingLeft,
                ) +
                (selectedElementWidth - selectedElementIndicatorWidth) / 2;
            let scrollPosition =
                elementToScroll?.offsetLeft -
                categoriesNav?.clientWidth / 2 +
                elementToScroll?.offsetWidth / 2;
            categoriesNav?.scrollTo?.({
                left: scrollPosition,
                behavior: "smooth",
            });
        } else {
            selectedElementIndicatorOffsetLeft = selectedElementIndicatorWidth =
                -99;
        }
    }
    window.scrollToSelectedCategory = scrollToSelectedCategory;

    let goToNextPrevCategoryTimeout;
    function goToNextPrevCategory(event, next = true) {
        if (event?.target?.classList?.contains("category")) return;
        if (!$categoriesKeys?.length) return pleaseWaitAlert();
        clearTimeout(goToNextPrevCategoryTimeout);
        goToNextPrevCategoryTimeout = setTimeout(() => {
            let selectedCategoryIdx =
                $categoriesKeys.indexOf($selectedCategory);
            if (selectedCategoryIdx < 0) return;
            let idxToSelect = selectedCategoryIdx + (next ? 1 : -1);
            if (idxToSelect >= 0 && $categoriesKeys?.length > idxToSelect) {
                let selectingCategoryName = $categoriesKeys?.[idxToSelect];
                if (selectingCategoryName) {
                    selectCategory(selectingCategoryName);
                }
            }
        }, 8);
    }

    let scrollFullGridTimeout;
    function selectCategory(selectedCategoryName) {
        if (!$categoriesKeys?.length) return pleaseWaitAlert();
        clearTimeout(scrollFullGridTimeout);
        goBackGrid(selectedCategoryName);
        if (selectedCategoryName === $selectedCategory) {
            return;
        }
        $selectedCategory = selectedCategoryName;
        $dropdownIsVisible = false;
    }

    let lastClicked, lastClickedTimeout, clickedOnce;
    async function goBackGrid(selectedCategoryName) {
        let isDoubleClicked;
        if (lastClicked === selectedCategoryName) {
            lastClicked = selectedCategoryName;
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
            clearTimeout(lastClickedTimeout);
            if (lastClicked === selectedCategoryName) {
                clickedOnce = true;
                lastClickedTimeout = setTimeout(() => {
                    clickedOnce = false;
                }, 500);
            }
            lastClicked = selectedCategoryName;
        }
        let scrollTop;
        if ($showFilterOptions && $gridFullView) {
            scrollTop = -9999;
        } else {
            if ($gridFullView) {
                scrollTop = 74;
            } else {
                scrollTop = 57;
            }
        }
        const documentEl = document.documentElement
        if ($android || !matchMedia("(hover:hover)").matches) {
            documentEl.style.overflow = "hidden";
            documentEl.style.overflow = "";
        }
        if (isDoubleClicked) {
            if ($gridFullView) {
                if ($selectedMediaGridEl) {
                    $selectedMediaGridEl.scrollLeft = 0;
                }
            } else {
                window.scrollY = documentEl.scrollTop = scrollTop;
            }
        } else if (clickedOnce) {
            if ($gridFullView) {
                if ($selectedMediaGridEl) {
                    $selectedMediaGridEl.scrollTo({
                        behavior: "smooth",
                        left: 0,
                    });
                }
            } else {
                window.scrollTo({ top: scrollTop, behavior: "smooth" });
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

    let immediateCustomFilNavChange, immediateShowTimeout;
    window.showCategoriesNav = (show, immediate = false) => {
        if (immediate) {
            immediateCustomFilNavChange = true;
            showCategoriesNav = show;
            immediateShowTimeout?.();
            immediateShowTimeout = requestImmediate(() => {
                immediateCustomFilNavChange = false;
            }, 200);
        } else {
            immediateShowTimeout?.();
            immediateCustomFilNavChange = false;
            showCategoriesNav = show;
        }
    };

    let categoriesNavVisible;
    $: {
        if ($categoriesKeys?.length) {
            categoriesNavVisible =
                !$android || showCategoriesNav || isScrolledYMax;
        } else {
            categoriesNavVisible = false;
        }
    }

    if ($android) {
        let touchID, startY, endY, startX, endX;
        window.addEventListener(
            "touchstart",
            (event) => {
                if (
                    touchID != null ||
                    (event?.target?.classList?.contains?.("category") ?? true)
                ) {
                    return;
                }
                let element = event?.target;
                let closestScrollableElement = element;
                let isMainScrollableElement = true;
                while (
                    closestScrollableElement &&
                    closestScrollableElement !== document.body
                ) {
                    const isScrollableY =
                        closestScrollableElement.scrollHeight >
                        closestScrollableElement.clientHeight;
                    if (isScrollableY) {
                        isMainScrollableElement = false;
                        break;
                    }
                    closestScrollableElement =
                        closestScrollableElement?.parentElement;
                }
                if (!isMainScrollableElement) return;
                let touch = event?.touches?.[0];
                startY = touch?.clientY;
                startX = touch?.clientX;
                touchID = touch?.identifier;
            },
            { passive: true },
        );

        window.addEventListener(
            "touchmove",
            (event) => {
                if (touchID == null || startY == null || !$android) return;
                let touch = Array.from(event.changedTouches)?.find(
                    (t) => t.identifier === touchID,
                );
                endY = touch?.clientY;
                endX = touch?.clientX;
                if (typeof endY === "number" && typeof endX === "number") {
                    let deltaX = endX - startX;
                    let deltaY = endY - startY;
                    if (deltaY !== 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
                        showCategoriesNav = deltaY > 0;
                    }
                }
            },
            { passive: true },
        );

        function touchedUp() {
            touchID = null;
        }
        window.addEventListener("touchend", touchedUp, { passive: true });
        window.addEventListener("touchcancel", touchedUp, { passive: true });
    }

    onMount(() => {
        categoriesNav = categoriesNav || document.getElementById("categories-nav");
        popupContainer = document?.getElementById("popup-container");
    });
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
    class="{'categories-nav' +
        (categoriesNavVisible ? '' : ' hide') +
        (immediateCustomFilNavChange ? ' immediate' : '') +
        ($android ? ' android' : '')}"
>
    <div
        class="prev-category"
        on:click="{(e) => goToNextPrevCategory(e, false)}"
        on:keyup="{(e) => {
            e.key === 'Enter' && goToNextPrevCategory(e, false);
        }}"
    ></div>
    <div
        class="next-category"
        on:click="{(e) => goToNextPrevCategory(e, true)}"
        on:keyup="{(e) => {
            e.key === 'Enter' && goToNextPrevCategory(true);
        }}"
    ></div>
    <nav
        id="categories-nav"
        bind:this="{categoriesNav}"
        class="{'nav' +
            ($hasWheel ? ' hasWheel' : '') +
            (shouldScrollSnap && $android ? ' android' : '')}"
        on:wheel="{(e) => {
            horizontalWheel(e, 'nav');
        }}"
    >
        <div
            class="selected-category-indicator"
            style:--width="{selectedElementIndicatorWidth + "px"}"
            style:--translateY="{selectedElementIndicatorOffsetLeft + "px"}"
        ></div>
        {#each $categoriesKeys || [] as categoryName (categoryName || {})}
            <span
                tabindex="{$menuVisible || $popupVisible ? '' : '0'}"
                on:click="{selectCategory(categoryName)}"
                on:keyup="{(e) => {
                    e.key === 'Enter' && selectCategory(categoryName);
                }}"
                data-category="{categoryName}"
                class="{'category' +
                    (categoryName === $selectedCategory ? ' selected' : '')}"
                >{trimAllEmptyChar(categoryName) || ""}
            </span>
        {/each}
    </nav>
</div>

<style>
    :global(.html) {
        --min-height: unset;
        min-height: var(--min-height);
    }
    .categories-nav.hide {
        opacity: 0 !important;
    }
    .categories-nav {
        z-index: 991;
        position: fixed;
        bottom: 0px;
        width: 100%;
        height: 65px;
        background-color: var(--bg-color);
        color: var(--fg-color);
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
        opacity: 1;
        transition: opacity 0.2s ease-out;
    }
    .categories-nav.immediate {
        transition: unset !important;
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
        gap: 25px;
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
    .prev-category,
    .next-category {
        height: 100%;
        width: 48px;
        position: absolute;
        top: 0;
        opacity: 0 !important;
        z-index: 1 !important;
        cursor: pointer !important;
    }
    .prev-category {
        left: 0;
    }
    .next-category {
        right: 0;
    }
    .selected-category-indicator {
        --width: -999px;
        --translateY: -999px;
        position: absolute;
        top: 0;
        left: 0;
        height: 2px;
        background-color: var(--fg-color);
        width: var(--width);
        translate: var(--translateY);
        transition: translate 0.15s ease-out, width 0.075s ease-out 0.075s;
    }
    .category {
        display: flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        background-color: transparent;
        font-size: 13.5px;
        font-weight: 500;
        height: 90%;
        scroll-snap-align: center;
        margin-bottom: auto;
        padding: 10px;
        z-index: 2 !important;
        text-transform: uppercase;
        letter-spacing: 0.2ch;
        cursor: pointer;
    }
    .categories-nav .category {
        font-size: 12px !important;
        letter-spacing: unset !important;
    }
    .category.selected {
        color: var(--fg-color) !important;
    }
    @media screen and (max-width: 750px) {
        .nav {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
        }
    }
    @media screen and (min-width: 750px) {
        .prev-category,
        .next-category {
            pointer-events: none !important;
            position: fixed !important;
            transform: translateY(-99999px) translateZ(0) !important;
            -webkit-transform: translateY(-99999px) translateZ(0) !important;
            -ms-transform: translateY(-99999px) translateZ(0) !important;
            -moz-transform: translateY(-99999px) translateZ(0) !important;
            -o-transform: translateY(-99999px) translateZ(0) !important;
            user-select: none !important;
            touch-action: none !important;
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
</style>
