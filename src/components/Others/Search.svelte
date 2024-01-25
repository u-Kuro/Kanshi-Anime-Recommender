<script>
    import { onMount, tick } from "svelte";
    import { fade } from "svelte/transition";
    import { sineOut } from "svelte/easing";
    import { retrieveJSON, saveJSON } from "../../js/indexedDB.js";
    import {
        animeLoader,
        getExtraInfo,
        processRecommendedAnimeList,
    } from "../../js/workerUtils.js";
    import {
        addClass,
        changeInputValue,
        dragScroll,
        removeClass,
        getLocalStorage,
        trimAllEmptyChar,
        isJsonObject,
        jsonIsEmpty,
        setLocalStorage,
        removeLocalStorage,
        formatNumber,
    } from "../../js/others/helper.js";
    import {
        android,
        finalAnimeList,
        animeLoaderWorker,
        filterOptions,
        selectedCustomFilter,
        activeTagFilters,
        searchedAnimeKeyword,
        dataStatus,
        loadingDataStatus,
        initData,
        confirmPromise,
        checkAnimeLoaderStatus,
        gridFullView,
        hasWheel,
        isImporting,
        hiddenEntries,
        extraInfo,
        loadingFilterOptions,
        customFilters,
        showFilterOptions,
        dropdownIsVisible,
        popupVisible,
        showStatus,
        newFinalAnime,
        isLoadingAnime,
        isProcessingList,
        currentExtraInfo,
        isBackgroundUpdateKey,
        menuVisible,
    } from "../../js/globalValues.js";

    let Init = true;

    let windowWidth = Math.max(
        document?.documentElement?.getBoundingClientRect?.()?.width,
        window.visualViewport.width,
        window.innerWidth,
    );
    let windowHeight = Math.max(
        window.visualViewport.height,
        window.innerHeight,
    );
    let maxFilterSelectionHeight = windowHeight * 0.3;

    let animeGridEl;
    let popupContainer;

    let selectedCustomFilterElement;
    let selectedFilterTypeElement;
    let selectedFilterElement;
    let selectedSortElement;
    let highlightedEl;

    let filterScrollTimeout;
    let filterIsScrolling;

    let tagCategoryInfo = {};

    let nameChangeUpdateProcessedList = ["Algorithm Filter"];
    let nameChangeUpdateFinalList = ["sort", "Anime Filter", "Content Caution"];
    let conditionalInputNumberList = [
        "weighted score",
        "score",
        "average score",
        "user score",
        "popularity",
        "year",
    ];

    let scrollingToTop,
        activeTagFiltersArrays,
        selectedFilterSelectionIdx,
        selectedFilterSelectionName,
        selectedSortIdx,
        selectedSort,
        selectedSortName,
        selectedSortType;
    let sortFilterContents = [
        {
            sortName: "weighted score",
            sortType: "desc",
        },
        {
            sortName: "date",
            sortType: "none",
        },
        {
            sortName: "user score",
            sortType: "none",
        },
        {
            sortName: "average score",
            sortType: "none",
        },
        {
            sortName: "score",
            sortType: "none",
        },
        {
            sortName: "popularity",
            sortType: "none",
        },
        {
            sortName: "trending",
            sortType: "none",
        },
        {
            sortName: "favorites",
            sortType: "none",
        },
        {
            sortName: "date added",
            sortType: "none",
        },
        {
            sortName: "date updated",
            sortType: "none",
        },
    ];
    $: selectedFilterSelectionIdx =
        $filterOptions?.filterSelection?.findIndex?.(
            ({ isSelected }) => isSelected,
        );
    $: selectedFilterSelectionName =
        $filterOptions?.filterSelection?.[selectedFilterSelectionIdx]
            ?.filterSelectionName;
    $: activeTagFiltersArrays =
        $activeTagFilters?.[$selectedCustomFilter]?.[
            selectedFilterSelectionName
        ] || [];
    $: selectedSortIdx =
        $filterOptions?.sortFilter?.[$selectedCustomFilter]?.findIndex?.(
            ({ sortType }) => sortType !== "none",
        ) || 0;
    $: selectedSort = $filterOptions?.sortFilter?.[$selectedCustomFilter]?.[
        selectedSortIdx
    ] || { sortName: "weighted score", sortType: "desc" };
    $: selectedSortName = selectedSort?.sortName;
    $: selectedSortType = selectedSort?.sortType;

    activeTagFilters.subscribe((val) => {
        $customFilters = Object.keys(val || {}).sort();
    });

    async function saveFilters(changeName) {
        if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter)
            return pleaseWaitAlert();
        if (nameChangeUpdateProcessedList.includes(changeName)) {
            $isProcessingList = true;
            $dataStatus = "Updating List";
            _processRecommendedAnimeList();
        } else if (nameChangeUpdateFinalList.includes(changeName)) {
            $isLoadingAnime = true;
            $dataStatus = "Updating List";
            _loadAnime(true);
        } else if (!$isLoadingAnime && !$isProcessingList && !$isImporting) {
            let selectedFilterSelectionName =
                $filterOptions?.filterSelection?.[
                    $filterOptions?.filterSelection?.findIndex?.(
                        ({ isSelected }) => isSelected,
                    )
                ]?.filterSelectionName;
            if (selectedFilterSelectionName) {
                await saveJSON(
                    selectedFilterSelectionName,
                    "selectedFilterSelectionName",
                );
            }
        }
    }

    async function _loadAnime(hasPassedFilters = true) {
        if (
            $android &&
            $isBackgroundUpdateKey &&
            window?.[$isBackgroundUpdateKey] === true
        )
            return;
        $animeLoaderWorker?.terminate?.();
        $animeLoaderWorker = null;
        animeLoader({
            filterOptions: $filterOptions,
            activeTagFilters: $activeTagFilters,
            selectedCustomFilter: $selectedCustomFilter,
            hasPassedFilters,
        })
            .then(async (data) => {
                $animeLoaderWorker = data.animeLoaderWorker;
                if (data.isNew) {
                    if ($finalAnimeList?.length > data?.finalAnimeListCount) {
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
                    $hiddenEntries = data.hiddenEntries || $hiddenEntries;
                }
                $dataStatus = null;
                return;
            })
            .catch((error) => {
                console.error(error);
            });
    }

    async function _processRecommendedAnimeList() {
        await saveJSON(true, "shouldProcessRecommendation");
        processRecommendedAnimeList({
            filterOptions: $filterOptions,
            activeTagFilters: $activeTagFilters,
            selectedCustomFilter: $selectedCustomFilter,
        })
            .catch((error) => {
                console.error(error);
            })
            .finally(() => {
                _loadAnime(true);
            });
    }

    async function scrollToFirstTagFilter() {
        let parentEl = document.getElementById("tagFilters");
        await tick();
        if (parentEl instanceof Element) {
            parentEl.scrollTop = 0;
        }
    }

    async function scrollToFirstFilter() {
        let parentEl = document.getElementById("filters");
        await tick();
        if (parentEl instanceof Element) {
            parentEl.scrollLeft = 0;
        }
    }

    function windowResized() {
        windowHeight = Math.max(
            window.visualViewport.height,
            window.innerHeight,
        );
        maxFilterSelectionHeight = windowHeight * 0.3;
        windowWidth = Math.max(
            document?.documentElement?.getBoundingClientRect?.()?.width,
            window.visualViewport.width,
            window.innerWidth,
        );
    }
    async function handleFilterTypes(event, newFilterTypeName) {
        if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter)
            return pleaseWaitAlert();
        event?.stopPropagation?.();
        let idxTypeSelected = selectedFilterSelectionIdx;
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                ?.filterSelectionName;
        if (
            nameTypeSelected !== newFilterTypeName &&
            isJsonObject($filterOptions?.filterSelection?.[idxTypeSelected])
        ) {
            // Close Filter Dropdown
            selectedSortElement = false;
            // Reload Anime for Async Animation
            if ($finalAnimeList?.length > 36 && !$gridFullView) {
                callAsyncAnimeReload(windowWidth <= 425);
            }
            // Close Filter Selection Dropdown
            $filterOptions?.filterSelection?.[
                idxTypeSelected
            ]?.filters?.Dropdown?.forEach?.((e) => {
                e.selected = false;
            });
            $filterOptions.filterSelection[idxTypeSelected] =
                $filterOptions?.filterSelection?.[idxTypeSelected];
            selectedFilterElement = null;
            // Change Filter Type
            $filterOptions.filterSelection[idxTypeSelected].isSelected = false;
            let newIdxFilterTypeSelected =
                $filterOptions?.filterSelection?.findIndex?.(
                    ({ filterSelectionName }) =>
                        filterSelectionName === newFilterTypeName,
                );
            if (
                isJsonObject(
                    $filterOptions?.filterSelection?.[newIdxFilterTypeSelected],
                )
            ) {
                $filterOptions.filterSelection[
                    newIdxFilterTypeSelected
                ].isSelected = true;
            }
            scrollToFirstFilter();
            scrollToFirstTagFilter();
            saveFilters();
        }
        if (
            highlightedEl instanceof Element &&
            highlightedEl.closest(".filterType")
        ) {
            removeClass(highlightedEl, "highlight");
            highlightedEl = null;
        }
        selectedFilterTypeElement = false;
    }
    function handleShowFilterTypes(event) {
        if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter)
            return pleaseWaitAlert();
        let element = event.target;
        let classList = element?.classList || [];
        let filterTypEl = element?.closest?.(".filterType");
        let optionsWrap = element?.closest?.(".options-wrap");
        if (
            (classList.contains("filterType") || filterTypEl) &&
            !selectedFilterTypeElement &&
            !(classList.contains("closing-x") || element.closest(".closing-x"))
        ) {
            selectedFilterTypeElement = filterTypEl || element || true;
        } else if (
            (!optionsWrap ||
                classList.contains("closing-x") ||
                element.closest(".closing-x")) &&
            !classList.contains("options-wrap")
        ) {
            let optionsWrapToClose =
                selectedFilterTypeElement?.querySelector?.(".options-wrap");
            if (optionsWrapToClose) {
                addClass(optionsWrapToClose, "hide");
                setTimeout(() => {
                    removeClass(optionsWrapToClose, "hide");
                    if (
                        highlightedEl instanceof Element &&
                        highlightedEl.closest(".filterType")
                    ) {
                        removeClass(highlightedEl, "highlight");
                        highlightedEl = null;
                    }
                    selectedFilterTypeElement = false;
                }, 200);
            } else {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".filterType")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedFilterTypeElement = false;
            }
        }
    }
    function handleTouchFilterTypes(event) {
        let element = event.target;
        let classList = element.classList;
        if (
            classList?.contains?.("options-wrap-filter-info") ||
            element?.closest?.(".options-wrap-filter-info")
        ) {
            return;
        }
        let optionsWrapToClose =
            selectedFilterTypeElement?.querySelector?.(".options-wrap");
        if (optionsWrapToClose) {
            addClass(optionsWrapToClose, "hide");
            setTimeout(() => {
                removeClass(optionsWrapToClose, "hide");
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".filterType")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedFilterTypeElement = false;
            }, 200);
        } else {
            if (
                highlightedEl instanceof Element &&
                highlightedEl.closest(".filterType")
            ) {
                removeClass(highlightedEl, "highlight");
                highlightedEl = null;
            }
            selectedFilterTypeElement = false;
        }
    }
    function handleFilterScroll() {
        if (filterScrollTimeout) clearTimeout(filterScrollTimeout);
        filterIsScrolling = true;
        filterScrollTimeout = setTimeout(() => {
            filterIsScrolling = false;
        }, 300);
    }

    function filterSelect(event, dropdownIdx) {
        if (filterIsScrolling && event.pointerType === "mouse") return;
        let element = event.target;
        let filSelectEl = element?.closest?.(".filter-select");
        if (filSelectEl === selectedFilterElement) return;
        let idxTypeSelected = selectedFilterSelectionIdx;
        if (Init) Init = false;
        if (selectedFilterElement instanceof Element) {
            let filterSelectChildrenArray = Array.from(
                selectedFilterElement?.parentElement?.children || [],
            ).filter((el) => {
                return !el?.classList?.contains?.("display-none");
            });
            let selectedIndex = filterSelectChildrenArray?.indexOf?.(
                selectedFilterElement,
            );
            if (
                isJsonObject(
                    $filterOptions?.filterSelection?.[idxTypeSelected]?.filters
                        ?.Dropdown?.[selectedIndex],
                )
            ) {
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown[selectedIndex].selected = false;
            }
        }
        if (
            highlightedEl instanceof Element &&
            highlightedEl.closest(".filter-select")
        ) {
            removeClass(highlightedEl, "highlight");
            highlightedEl = null;
        }
        if (
            isJsonObject(
                $filterOptions.filterSelection[idxTypeSelected].filters
                    .Dropdown[dropdownIdx],
            )
        ) {
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                dropdownIdx
            ].selected = true;
        }
        selectedFilterElement = filSelectEl || element || true;
    }

    function closeFilterSelect(dropDownIdx) {
        let idxTypeSelected = selectedFilterSelectionIdx;
        if (
            !isJsonObject(
                $filterOptions?.filterSelection?.[idxTypeSelected]?.filters
                    ?.Dropdown?.[dropDownIdx],
            )
        )
            return;
        let optionsWrapToClose =
            selectedFilterElement?.querySelector?.(".options-wrap");
        if (optionsWrapToClose) {
            addClass(optionsWrapToClose, "hide");
            setTimeout(() => {
                removeClass(optionsWrapToClose, "hide");
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown[dropDownIdx].selected = false;
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".filter-select")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedFilterElement = null;
            }, 200);
        } else {
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                dropDownIdx
            ].selected = false;
            if (
                highlightedEl instanceof Element &&
                highlightedEl.closest(".filter-select")
            ) {
                removeClass(highlightedEl, "highlight");
                highlightedEl = null;
            }
            selectedFilterElement = null;
        }
    }
    function handleTouchFilterSelect(event, dropDownIdx) {
        let element = event.target;
        let classList = element.classList;
        if (
            classList?.contains?.("options-wrap-filter-info") ||
            element?.closest?.(".options-wrap-filter-info")
        ) {
            return;
        }
        let idxTypeSelected = selectedFilterSelectionIdx;
        let optionsWrapToClose =
            selectedFilterElement?.querySelector?.(".options-wrap");
        if (optionsWrapToClose) {
            addClass(optionsWrapToClose, "hide");
            setTimeout(() => {
                removeClass(optionsWrapToClose, "hide");
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown[dropDownIdx].selected = false;
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".filter-select")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedFilterElement = null;
            }, 200);
        } else {
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                dropDownIdx
            ].selected = false;
            if (
                highlightedEl instanceof Element &&
                highlightedEl.closest(".filter-select")
            ) {
                removeClass(highlightedEl, "highlight");
                highlightedEl = null;
            }
            selectedFilterElement = null;
        }
    }
    async function clickOutsideListener(event) {
        if ($filterOptions?.filterSelection?.length < 1 || !$filterOptions)
            return;
        let element = event?.target;
        let classList = element?.classList || [];
        if (
            classList.contains("options-wrap") &&
            getComputedStyle(element).position === "fixed"
        ) {
            // Small Screen Width
            let openedDropdown =
                selectedCustomFilterElement ||
                selectedFilterTypeElement ||
                selectedSortElement ||
                selectedFilterElement;
            let optionsWrapToClose =
                openedDropdown?.querySelector?.(".options-wrap");
            if (optionsWrapToClose) {
                addClass(optionsWrapToClose, "hide");
                setTimeout(() => {
                    removeClass(optionsWrapToClose, "hide");
                    if (highlightedEl instanceof Element) {
                        removeClass(highlightedEl, "highlight");
                        highlightedEl = null;
                    }
                    // CLose Custom Filter Dropdown
                    selectedCustomFilterElement = false;
                    // Close Filter Type Dropdown
                    selectedFilterTypeElement = false;
                    // Close Sort Filter Dropdown
                    selectedSortElement = false;
                    // Close Filter Selection Dropdown
                    let idxTypeSelected = selectedFilterSelectionIdx;
                    $filterOptions?.filterSelection?.[
                        idxTypeSelected
                    ]?.filters?.Dropdown?.forEach?.((e) => {
                        e.selected = false;
                    });
                    if ($filterOptions?.filterSelection?.[idxTypeSelected]) {
                        $filterOptions.filterSelection[idxTypeSelected] =
                            $filterOptions?.filterSelection?.[idxTypeSelected];
                    }
                    selectedFilterElement = null;
                }, 200);
            } else {
                if (highlightedEl instanceof Element) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                // CLose Custom Filter Dropdown
                selectedCustomFilterElement = false;
                // Close Filter Type Dropdown
                selectedFilterTypeElement = false;
                // Close Sort Filter Dropdown
                selectedSortElement = false;
                // Close Filter Selection Dropdown
                let idxTypeSelected = selectedFilterSelectionIdx;
                $filterOptions?.filterSelection?.[
                    idxTypeSelected
                ]?.filters?.Dropdown?.forEach?.((e) => {
                    e.selected = false;
                });
                if ($filterOptions?.filterSelection?.[idxTypeSelected]) {
                    $filterOptions.filterSelection[idxTypeSelected] =
                        $filterOptions?.filterSelection?.[idxTypeSelected];
                }
                selectedFilterElement = null;
            }
        } else if (
            !classList.contains("options-wrap") &&
            !element?.closest?.(".options-wrap") &&
            !classList.contains("fullPopupWrapper") &&
            !element?.closest?.(".fullPopupWrapper") &&
            !classList.contains("item-info") &&
            !classList.contains("extra-item-info") &&
            !classList.contains("item-info-path") &&
            !element?.closest?.(".item-info") &&
            !element?.closest?.(".extra-item-info")
        ) {
            // Large Screen Width
            // Custom Filter Dropdown
            let customFilterEl = element?.closest?.(".custom-filter-wrap");
            if (!classList.contains("custom-filter-wrap") && !customFilterEl) {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".custom-filter-wrap")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedCustomFilterElement = false;
            }

            // Filter Type Dropdown
            let filterTypeEl = element?.closest(".filterType");
            if (!classList.contains("filterType") && !filterTypeEl) {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".filterType")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedFilterTypeElement = false;
            }

            // Sort Filter Dropdown
            let sortSelectEl = element?.closest(".sortFilter");
            if (!classList.contains("sortFilter") && !sortSelectEl) {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".sortFilter")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedSortElement = false;
            }

            // Filter Selection Dropdown
            let inputDropdownSelectEl = element?.closest(".select");
            let inputDropdownAngleDown = element?.closest(".angle-down");
            if (
                !classList.contains("select") &&
                !classList.contains("angle-down") &&
                !inputDropdownAngleDown &&
                !inputDropdownSelectEl
            ) {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".filter-select")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                let idxTypeSelected = selectedFilterSelectionIdx;

                $filterOptions?.filterSelection?.[
                    idxTypeSelected
                ]?.filters?.Dropdown?.forEach?.((e) => {
                    e.selected = false;
                });
                if ($filterOptions?.filterSelection?.[idxTypeSelected]) {
                    $filterOptions.filterSelection[idxTypeSelected] =
                        $filterOptions?.filterSelection?.[idxTypeSelected];
                }
                selectedFilterElement = null;
            }
        }
    }

    let filterDropdownOptionsLoaded = false;
    $: {
        if (!(selectedFilterElement instanceof Element)) {
            filterDropdownOptionsLoaded = false;
        }
    }

    async function handleFilterSelectOptionChange(
        optionName,
        optionType,
        optionIdx,
        dropdownIdx,
        changeType,
        filterSelectionName,
    ) {
        if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter)
            return pleaseWaitAlert();
        let idxTypeSelected = selectedFilterSelectionIdx;
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                ?.filterSelectionName;
        let currentValue =
            $filterOptions?.filterSelection?.[idxTypeSelected]?.filters
                ?.Dropdown?.[dropdownIdx]?.options?.[optionIdx]?.selected;
        if (
            (currentValue === "none" || currentValue === true) &&
            $activeTagFilters?.[$selectedCustomFilter]?.[
                nameTypeSelected
            ] instanceof Array
        ) {
            // true is default value of selections
            filterDropdownOptionsLoaded = true;
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                dropdownIdx
            ].options[optionIdx].selected = "included";
            let hasActiveFilter = false;
            $activeTagFilters[$selectedCustomFilter][nameTypeSelected] =
                $activeTagFilters?.[$selectedCustomFilter]?.[
                    nameTypeSelected
                ]?.map?.((e) => {
                    if (
                        e.optionName + e.optionIdx + e.optionType ===
                        optionName + optionIdx + optionType
                    ) {
                        hasActiveFilter = true;
                        e.selected = "included";
                    }
                    return e;
                });
            if (!hasActiveFilter) {
                $activeTagFilters?.[$selectedCustomFilter]?.[
                    nameTypeSelected
                ]?.unshift?.({
                    optionName: optionName,
                    optionType: optionType,
                    optionIdx: optionIdx,
                    categIdx: dropdownIdx,
                    selected: "included",
                    changeType: changeType,
                    filterType: "dropdown",
                });
                $activeTagFilters[$selectedCustomFilter][nameTypeSelected] =
                    $activeTagFilters?.[$selectedCustomFilter]?.[
                        nameTypeSelected
                    ];
            }
        } else if (
            currentValue === "included" &&
            changeType === "write" &&
            isJsonObject(
                $filterOptions?.filterSelection?.[idxTypeSelected]?.filters
                    ?.Dropdown?.[dropdownIdx]?.options?.[optionIdx],
            ) &&
            $activeTagFilters?.[$selectedCustomFilter]?.[
                nameTypeSelected
            ] instanceof Array
        ) {
            filterDropdownOptionsLoaded = true;
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                dropdownIdx
            ].options[optionIdx].selected = "excluded";
            $activeTagFilters[$selectedCustomFilter][nameTypeSelected] =
                $activeTagFilters?.[$selectedCustomFilter]?.[
                    nameTypeSelected
                ].map((e) => {
                    if (
                        e.optionIdx === optionIdx &&
                        e.optionName === optionName &&
                        e.filterType === "dropdown" &&
                        e.categIdx === dropdownIdx &&
                        e.selected === "included" &&
                        e.optionType === optionType
                    ) {
                        e.selected = "excluded";
                    }
                    return e;
                });
        } else if (
            isJsonObject(
                $filterOptions?.filterSelection?.[idxTypeSelected]?.filters
                    ?.Dropdown?.[dropdownIdx]?.options?.[optionIdx],
            ) &&
            $activeTagFilters?.[$selectedCustomFilter]?.[
                nameTypeSelected
            ] instanceof Array
        ) {
            filterDropdownOptionsLoaded = true;
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                dropdownIdx
            ].options[optionIdx].selected = "none";
            $activeTagFilters[$selectedCustomFilter][nameTypeSelected] =
                $activeTagFilters?.[$selectedCustomFilter]?.[
                    nameTypeSelected
                ].filter(
                    (e) =>
                        !(
                            e.optionIdx === optionIdx &&
                            e.optionName === optionName &&
                            e.filterType === "dropdown" &&
                            e.categIdx === dropdownIdx &&
                            e.optionType === optionType
                        ),
                );
        }
        saveFilters(filterSelectionName);
    }
    function handleCheckboxChange(
        event,
        checkBoxName,
        checkboxIdx,
        filterSelectionName,
    ) {
        let element = event.target;
        let classList = element?.classList || [];
        let keyCode = event.which || event.keyCode || 0;
        if (
            (classList.contains("checkbox") && event.type === "click") ||
            (classList.contains("checkbox") &&
                keyCode !== 13 &&
                event.type === "keyup") ||
            (filterIsScrolling && event.pointerType === "mouse")
        ) {
            return;
        }
        if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) {
            if (!classList.contains("checkbox")) {
                pleaseWaitAlert();
            }
            return;
        }
        // Prevent Default
        let idxTypeSelected = selectedFilterSelectionIdx;
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                ?.filterSelectionName;
        let isChecked =
            $filterOptions?.filterSelection?.[idxTypeSelected]?.filters
                ?.Checkbox?.[checkboxIdx]?.isSelected;
        if (
            isChecked &&
            $activeTagFilters?.[$selectedCustomFilter]?.[
                nameTypeSelected
            ] instanceof Array
        ) {
            $activeTagFilters[$selectedCustomFilter][nameTypeSelected] =
                $activeTagFilters?.[$selectedCustomFilter]?.[
                    nameTypeSelected
                ].filter(
                    (e) =>
                        !(
                            e.optionIdx === checkboxIdx &&
                            e.optionName === checkBoxName &&
                            e.filterType === "checkbox" &&
                            e.selected === "included"
                        ),
                );
        } else if (
            $activeTagFilters?.[$selectedCustomFilter]?.[
                nameTypeSelected
            ] instanceof Array
        ) {
            let hasActiveFilter = false;
            $activeTagFilters[$selectedCustomFilter][nameTypeSelected] =
                $activeTagFilters?.[$selectedCustomFilter]?.[
                    nameTypeSelected
                ].map((e) => {
                    if (
                        e.optionName + e.optionIdx ===
                        checkBoxName + checkboxIdx
                    ) {
                        hasActiveFilter = true;
                        e.selected = "included";
                    }
                    return e;
                });
            if (!hasActiveFilter) {
                $activeTagFilters?.[$selectedCustomFilter]?.[
                    nameTypeSelected
                ]?.unshift?.({
                    optionName: checkBoxName,
                    optionIdx: checkboxIdx,
                    filterType: "checkbox",
                    selected: "included",
                    changeType: "read",
                });
                $activeTagFilters[$selectedCustomFilter][nameTypeSelected] =
                    $activeTagFilters?.[$selectedCustomFilter]?.[
                        nameTypeSelected
                    ];
            }
        }
        if (
            isJsonObject(
                $filterOptions?.filterSelection?.[idxTypeSelected]?.filters
                    ?.Checkbox?.[checkboxIdx],
            )
        )
            $filterOptions.filterSelection[idxTypeSelected].filters.Checkbox[
                checkboxIdx
            ].isSelected =
                !$filterOptions?.filterSelection?.[idxTypeSelected].filters
                    .Checkbox[checkboxIdx].isSelected;
        saveFilters(filterSelectionName);
    }
    function handleInputNumber(
        event,
        newValue,
        inputNumIdx,
        inputNumberName,
        maxValue,
        minValue,
        filterSelectionName,
    ) {
        if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter)
            return pleaseWaitAlert();
        let idxTypeSelected = selectedFilterSelectionIdx;
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                ?.filterSelectionName;
        let currentValue =
            $filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.[
                "Input Number"
            ]?.[inputNumIdx]?.numberValue;
        if (
            conditionalInputNumberList.includes(inputNumberName) &&
            /^(>=|<=|<|>).*($)/.test(newValue) // Check if it starts or ends with comparison operators
        ) {
            let newSplitValue = newValue
                ?.split(/(<=|>=|<|>)/)
                ?.filter?.((e) => e); // Remove White Space
            if (newValue !== currentValue && newSplitValue.length <= 2) {
                let currentSplitValue = newValue
                    .split(/(<=|>=|<|>)/)
                    .filter((e) => e); // Remove White Space
                let currentCMPOperator, currentCMPNumber;
                let newCMPOperator, newCMPNumber;
                if (
                    newSplitValue[0].includes(">") ||
                    newSplitValue[0].includes("<")
                ) {
                    newCMPOperator = newSplitValue[0];
                    newCMPNumber = newSplitValue[1];
                } else {
                    newCMPOperator = newSplitValue[1];
                    newCMPNumber = newSplitValue[0];
                }
                if (
                    currentSplitValue[0].includes(">") ||
                    currentSplitValue[0].includes("<")
                ) {
                    currentCMPOperator = currentSplitValue[0];
                    currentCMPNumber = currentSplitValue[1];
                } else {
                    currentCMPOperator = currentSplitValue[1];
                    currentCMPNumber = currentSplitValue[0];
                }
                if (
                    newValue !== currentValue &&
                    ((!isNaN(newCMPNumber) &&
                        (parseFloat(newCMPNumber) >= minValue ||
                            typeof minValue !== "number") &&
                        (parseFloat(newCMPNumber) <= maxValue ||
                            typeof maxValue !== "number")) ||
                        !newCMPNumber) &&
                    isJsonObject(
                        $filterOptions?.filterSelection?.[idxTypeSelected]
                            ?.filters?.["Input Number"]?.[inputNumIdx],
                    )
                ) {
                    let shouldReload = false;
                    if (
                        !newCMPNumber &&
                        $activeTagFilters?.[$selectedCustomFilter]?.[
                            nameTypeSelected
                        ] instanceof Array
                    ) {
                        shouldReload = true;
                        $activeTagFilters[$selectedCustomFilter][
                            nameTypeSelected
                        ] = $activeTagFilters?.[$selectedCustomFilter]?.[
                            nameTypeSelected
                        ].filter(
                            (e) =>
                                !(
                                    e.optionIdx === inputNumIdx &&
                                    e.optionName === inputNumberName &&
                                    e.filterType === "input number"
                                ),
                        );
                    } else if (
                        $activeTagFilters?.[$selectedCustomFilter]?.[
                            nameTypeSelected
                        ] instanceof Array
                    ) {
                        let hasActiveFilter = false;
                        $activeTagFilters[$selectedCustomFilter][
                            nameTypeSelected
                        ] = $activeTagFilters?.[$selectedCustomFilter]?.[
                            nameTypeSelected
                        ].map((e) => {
                            if (
                                e.optionName + e.optionIdx ===
                                inputNumberName + inputNumIdx
                            ) {
                                shouldReload = e.selected !== "none";
                                hasActiveFilter = true;
                                e.optionValue = newValue;
                                e.CMPoperator = newCMPOperator;
                                e.CMPNumber = newCMPNumber;
                            }
                            return e;
                        });
                        if (!hasActiveFilter) {
                            shouldReload = true;
                            $activeTagFilters?.[$selectedCustomFilter]?.[
                                nameTypeSelected
                            ].unshift({
                                optionName: inputNumberName,
                                optionValue: newValue,
                                CMPoperator: newCMPOperator,
                                CMPNumber: newCMPNumber,
                                optionIdx: inputNumIdx,
                                filterType: "input number",
                                selected: "included",
                                changeType: "read",
                            });
                            $activeTagFilters = $activeTagFilters;
                        }
                    }
                    $filterOptions.filterSelection[idxTypeSelected].filters[
                        "Input Number"
                    ][inputNumIdx].numberValue = newValue;
                    if (shouldReload) {
                        saveFilters(filterSelectionName);
                    }
                } else {
                    changeInputValue(event.target, currentValue);
                }
            } else {
                changeInputValue(event.target, currentValue);
            }
        } else if (
            $activeTagFilters?.[$selectedCustomFilter]?.[
                nameTypeSelected
            ] instanceof Array &&
            isJsonObject(
                $filterOptions.filterSelection[idxTypeSelected].filters[
                    "Input Number"
                ][inputNumIdx],
            )
        ) {
            if (
                newValue !== currentValue &&
                ((!isNaN(newValue) &&
                    (parseFloat(newValue) >= minValue ||
                        typeof minValue !== "number") &&
                    (parseFloat(newValue) <= maxValue ||
                        typeof maxValue !== "number")) ||
                    newValue === "")
            ) {
                let shouldReload = false;
                if (newValue === "") {
                    shouldReload = true;
                    $activeTagFilters[$selectedCustomFilter][nameTypeSelected] =
                        $activeTagFilters?.[$selectedCustomFilter]?.[
                            nameTypeSelected
                        ].filter(
                            (e) =>
                                !(
                                    e.optionIdx === inputNumIdx &&
                                    e.optionName === inputNumberName &&
                                    e.optionValue === currentValue &&
                                    e.filterType === "input number"
                                ),
                        );
                } else {
                    let hasActiveFilter = false;
                    $activeTagFilters[$selectedCustomFilter][nameTypeSelected] =
                        $activeTagFilters?.[$selectedCustomFilter]?.[
                            nameTypeSelected
                        ].map((e) => {
                            if (
                                e.optionName + e.optionIdx ===
                                inputNumberName + inputNumIdx
                            ) {
                                shouldReload = e.selected !== "none";
                                hasActiveFilter = true;
                                delete e.CMPoperator;
                                delete e.CMPNumber;
                                e.optionValue = newValue;
                            }
                            return e;
                        });
                    if (!hasActiveFilter) {
                        shouldReload = true;
                        $activeTagFilters?.[$selectedCustomFilter]?.[
                            nameTypeSelected
                        ].unshift({
                            optionName: inputNumberName,
                            optionValue: newValue,
                            optionIdx: inputNumIdx,
                            filterType: "input number",
                            selected: "included",
                            changeType: "read",
                        });
                        $activeTagFilters = $activeTagFilters;
                    }
                }
                $filterOptions.filterSelection[idxTypeSelected].filters[
                    "Input Number"
                ][inputNumIdx].numberValue = newValue;
                if (shouldReload) {
                    saveFilters(filterSelectionName);
                }
            } else {
                changeInputValue(event.target, currentValue);
            }
        }
    }
    function changeActiveSelect(
        event,
        optionIdx,
        optionName,
        filterType,
        categIdx,
        changeType,
        optionType,
        optionValue,
    ) {
        if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter)
            return pleaseWaitAlert();
        let element = event?.target;
        let classList = element?.classList;
        if (
            classList?.contains?.("removeActiveTag") ||
            element?.closest?.(".removeActiveTag")
        )
            return;
        let idxTypeSelected = selectedFilterSelectionIdx;
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                ?.filterSelectionName;
        if (filterType === "input number") {
            let elementIdx = $activeTagFilters?.[$selectedCustomFilter]?.[
                nameTypeSelected
            ]?.findIndex?.(
                (item) =>
                    item.optionName === optionName &&
                    item.optionValue === optionValue &&
                    item.optionIdx === optionIdx &&
                    item.filterType === "input number",
            );
            if (elementIdx >= 0) {
                let currentSelect =
                    $activeTagFilters?.[$selectedCustomFilter]?.[
                        nameTypeSelected
                    ]?.[elementIdx]?.selected;
                if (
                    !isJsonObject(
                        $activeTagFilters[$selectedCustomFilter][
                            nameTypeSelected
                        ][elementIdx],
                    )
                )
                    return;
                if (currentSelect === "included") {
                    $activeTagFilters[$selectedCustomFilter][nameTypeSelected][
                        elementIdx
                    ].selected = "none";
                } else if (currentSelect != null) {
                    $activeTagFilters[$selectedCustomFilter][nameTypeSelected][
                        elementIdx
                    ].selected = "included";
                }
            }
        } else if (filterType === "checkbox") {
            let tagFilterIdx = $activeTagFilters?.[$selectedCustomFilter]?.[
                nameTypeSelected
            ]?.findIndex?.(
                (e) =>
                    e.optionIdx === optionIdx &&
                    e.optionName === optionName &&
                    e.filterType === filterType,
            );
            if (
                !isJsonObject(
                    $activeTagFilters[$selectedCustomFilter][nameTypeSelected][
                        tagFilterIdx
                    ],
                )
            )
                return;
            let checkboxSelection =
                $activeTagFilters?.[$selectedCustomFilter]?.[
                    nameTypeSelected
                ]?.[tagFilterIdx]?.selected;
            if (checkboxSelection === "included") {
                $activeTagFilters[$selectedCustomFilter][nameTypeSelected][
                    tagFilterIdx
                ].selected = "none";
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Checkbox[optionIdx].isSelected = false;
            } else if (checkboxSelection != null) {
                $activeTagFilters[$selectedCustomFilter][nameTypeSelected][
                    tagFilterIdx
                ].selected = "included";
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Checkbox[optionIdx].isSelected = true;
            }
        } else if (filterType === "dropdown") {
            let currentSelect =
                $filterOptions?.filterSelection?.[idxTypeSelected]?.filters
                    ?.Dropdown?.[categIdx]?.options?.[optionIdx]?.selected;
            if (currentSelect === "included" && changeType === "write") {
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown[categIdx].options[optionIdx].selected =
                    "excluded";
                $activeTagFilters[$selectedCustomFilter][nameTypeSelected] =
                    $activeTagFilters?.[$selectedCustomFilter]?.[
                        nameTypeSelected
                    ].map((e) => {
                        if (
                            e.optionIdx === optionIdx &&
                            e.optionName === optionName &&
                            e.selected === "included" &&
                            (e.optionType ? e.optionType === optionType : true)
                        ) {
                            e.selected = "excluded";
                        }
                        return e;
                    });
            } else if (currentSelect === "none") {
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown[categIdx].options[optionIdx].selected =
                    "included";
                $activeTagFilters[$selectedCustomFilter][nameTypeSelected] =
                    $activeTagFilters?.[$selectedCustomFilter]?.[
                        nameTypeSelected
                    ].map((e) => {
                        if (
                            e.optionIdx === optionIdx &&
                            e.optionName === optionName &&
                            e.selected === "none" &&
                            (e.optionType ? e.optionType === optionType : true)
                        ) {
                            e.selected = "included";
                        }
                        return e;
                    });
            } else if (
                isJsonObject(
                    $filterOptions.filterSelection[idxTypeSelected].filters
                        .Dropdown[categIdx].options[optionIdx],
                ) &&
                $activeTagFilters[$selectedCustomFilter][
                    nameTypeSelected
                ] instanceof Array
            ) {
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown[categIdx].options[optionIdx].selected =
                    "none";
                $activeTagFilters[$selectedCustomFilter][nameTypeSelected] =
                    $activeTagFilters?.[$selectedCustomFilter]?.[
                        nameTypeSelected
                    ].map((e) => {
                        if (
                            e.optionIdx === optionIdx &&
                            e.optionName === optionName &&
                            (e.optionType ? e.optionType === optionType : true)
                        ) {
                            e.selected = "none";
                        }
                        return e;
                    });
            }
        }
        saveFilters(nameTypeSelected);
    }
    function removeActiveTag(
        event,
        optionIdx,
        optionName,
        filterType,
        categIdx,
        optionType,
    ) {
        if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter)
            return pleaseWaitAlert();
        let idxTypeSelected = selectedFilterSelectionIdx;
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                ?.filterSelectionName;
        let toChangeIsJson =
            $filterOptions?.filterSelection?.[idxTypeSelected]?.filters;
        if (filterType === "checkbox") {
            // Is Checkbox
            toChangeIsJson = isJsonObject(
                toChangeIsJson?.Checkbox?.[optionIdx],
            );
        } else if (filterType === "input number") {
            toChangeIsJson = isJsonObject(
                toChangeIsJson?.["Input Number"]?.[optionIdx],
            );
        } else {
            toChangeIsJson = isJsonObject(
                toChangeIsJson?.Dropdown?.[categIdx]?.options?.[optionIdx],
            );
        }
        if (
            !toChangeIsJson ||
            !(
                $activeTagFilters?.[$selectedCustomFilter]?.[
                    nameTypeSelected
                ] instanceof Array
            )
        )
            return;
        if (filterType === "checkbox") {
            // Is Checkbox
            $filterOptions.filterSelection[idxTypeSelected].filters.Checkbox[
                optionIdx
            ].isSelected = false;
        } else if (filterType === "input number") {
            // Is Input Number
            $filterOptions.filterSelection[idxTypeSelected].filters[
                "Input Number"
            ][optionIdx].numberValue = "";
        } else {
            // Is Only Read optionName
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                categIdx
            ].options[optionIdx].selected = "none";
        }
        $activeTagFilters[$selectedCustomFilter][nameTypeSelected] =
            $activeTagFilters?.[$selectedCustomFilter]?.[
                nameTypeSelected
            ].filter(
                (e) =>
                    !(
                        e.optionName === optionName &&
                        e.optionIdx === optionIdx &&
                        e.filterType === filterType &&
                        (e.optionType ? e.optionType === optionType : true)
                    ),
            );
        saveFilters(nameTypeSelected);
    }
    async function removeAllActiveTag(event) {
        if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter)
            return pleaseWaitAlert();
        let idxTypeSelected = selectedFilterSelectionIdx;
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                ?.filterSelectionName;
        let hasActiveFilter =
            $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected]
                ?.length;
        if (
            hasActiveFilter &&
            $filterOptions?.filterSelection?.[idxTypeSelected] &&
            $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected] &&
            (await $confirmPromise("Do you want to remove all filters?"))
        ) {
            // Remove Active Number Input
            $filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.[
                "Input Number"
            ]?.forEach?.((e) => {
                e.numberValue = "";
            });
            // Remove Checkbox
            $filterOptions?.filterSelection?.[
                idxTypeSelected
            ]?.filters?.Checkbox?.forEach?.((e) => {
                e.isSelected = false;
            });
            // Remove Dropdown
            $filterOptions?.filterSelection?.[
                idxTypeSelected
            ]?.filters?.Dropdown?.forEach?.(({ options }, dropdownIdx) => {
                options?.forEach?.(({ selected }, optionsIdx) => {
                    selected = "none";
                    if (
                        isJsonObject(
                            $filterOptions.filterSelection[idxTypeSelected]
                                .filters.Dropdown[dropdownIdx].options[
                                optionsIdx
                            ],
                        )
                    ) {
                        $filterOptions.filterSelection[
                            idxTypeSelected
                        ].filters.Dropdown[dropdownIdx].options[
                            optionsIdx
                        ].selected = selected;
                    }
                });
            });
            $filterOptions.filterSelection[idxTypeSelected] =
                $filterOptions?.filterSelection?.[idxTypeSelected];
            $activeTagFilters[$selectedCustomFilter][nameTypeSelected] = [];
            saveFilters(nameTypeSelected);
        }
    }
    function handleSortFilterPopup(event) {
        let element = event.target;
        let classList = element.classList;
        let sortSelectEl = element.closest(".sortFilter");
        let optionsWrap = element.closest(".options-wrap");
        if (
            (classList.contains("sortFilter") || sortSelectEl) &&
            !selectedSortElement
        ) {
            selectedSortElement = sortSelectEl || element || true;
        } else if (
            (!optionsWrap ||
                classList.contains("closing-x") ||
                element.closest(".closing-x")) &&
            !classList.contains("options-wrap")
        ) {
            let optionsWrapToClose =
                selectedSortElement?.querySelector?.(".options-wrap");
            if (optionsWrapToClose) {
                addClass(optionsWrapToClose, "hide");
                setTimeout(() => {
                    removeClass(optionsWrapToClose, "hide");
                    if (
                        highlightedEl instanceof Element &&
                        highlightedEl.closest(".sortFilter")
                    ) {
                        removeClass(highlightedEl, "highlight");
                        highlightedEl = null;
                    }
                    selectedSortElement = false;
                }, 200);
            } else {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".sortFilter")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedSortElement = false;
            }
        }
    }

    function handleTouchSortFilterPopup(event) {
        let element = event.target;
        let classList = element.classList;
        if (
            classList?.contains?.("options-wrap-filter-info") ||
            element?.closest?.(".options-wrap-filter-info")
        ) {
            return;
        }
        let optionsWrapToClose =
            selectedSortElement?.querySelector?.(".options-wrap");
        if (optionsWrapToClose) {
            addClass(optionsWrapToClose, "hide");
            setTimeout(() => {
                removeClass(optionsWrapToClose, "hide");
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".custom-filter-wrap")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedSortElement = false;
            }, 200);
        } else {
            if (
                highlightedEl instanceof Element &&
                highlightedEl.closest(".custom-filter-wrap")
            ) {
                removeClass(highlightedEl, "highlight");
                highlightedEl = null;
            }
            selectedSortElement = false;
        }
    }

    function changeSort(newSortName) {
        if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter)
            return pleaseWaitAlert();
        let idxSortSelected = selectedSortIdx;
        let selectedSortFilter = $filterOptions?.sortFilter?.[
            $selectedCustomFilter
        ]?.[idxSortSelected] || {
            sortName: "weighted score",
            sortType: "desc",
        };
        let sortName = selectedSortFilter?.sortName;
        let sortType = selectedSortFilter?.sortType;
        if (
            isJsonObject(
                $filterOptions?.sortFilter?.[$selectedCustomFilter]?.[
                    idxSortSelected
                ],
            )
        ) {
            if (sortName === newSortName) {
                let newSortType = sortType === "desc" ? "asc" : "desc";
                $filterOptions.sortFilter[$selectedCustomFilter][
                    idxSortSelected
                ].sortType = newSortType;
            } else if (sortName !== newSortName) {
                $filterOptions.sortFilter[$selectedCustomFilter][
                    idxSortSelected
                ].sortType = "none";
                let idxNewSortSelected = $filterOptions?.sortFilter?.[
                    $selectedCustomFilter
                ]?.findIndex?.(({ sortName }) => sortName === newSortName);
                if (
                    isJsonObject(
                        $filterOptions.sortFilter[$selectedCustomFilter][
                            idxNewSortSelected
                        ],
                    )
                ) {
                    $filterOptions.sortFilter[$selectedCustomFilter][
                        idxNewSortSelected
                    ].sortType = "desc";
                }
            }
        }
        saveFilters("sort");
        if (
            highlightedEl instanceof Element &&
            highlightedEl.closest(".sortFilter")
        ) {
            removeClass(highlightedEl, "highlight");
            highlightedEl = null;
        }
        selectedSortElement = false;
    }
    function changeSortType() {
        if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter)
            return pleaseWaitAlert();
        let idxSortSelected = selectedSortIdx;
        let sortType =
            $filterOptions?.sortFilter?.[$selectedCustomFilter]?.[
                idxSortSelected
            ]?.sortType || "desc";
        if (
            isJsonObject(
                $filterOptions?.sortFilter?.[$selectedCustomFilter]?.[
                    idxSortSelected
                ],
            )
        ) {
            if (sortType === "desc") {
                $filterOptions.sortFilter[$selectedCustomFilter][
                    idxSortSelected
                ].sortType = "asc";
            } else {
                $filterOptions.sortFilter[$selectedCustomFilter][
                    idxSortSelected
                ].sortType = "desc";
            }
        }
        saveFilters("sort");
    }
    async function handleDropdownKeyDown(event) {
        let keyCode = event.which || event.keyCode || 0;
        // 38up 40down 13enter
        if (keyCode == 38 || keyCode == 40) {
            let element = Array.from(
                document?.getElementsByClassName?.("options-wrap") || [],
            )?.find?.((el) => {
                return !el?.classList?.contains?.("display-none");
            });
            if (
                element?.closest?.(".filterType") ||
                element?.closest?.(".sortFilter") ||
                element?.closest?.(".filter-select") ||
                element?.closest?.(".custom-filter-wrap")
            ) {
                event.preventDefault();
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl?.closest?.(".options")?.children?.length
                ) {
                    let parent = highlightedEl.closest(".options");
                    if (
                        keyCode === 38 &&
                        selectedFilterElement &&
                        !highlightedEl?.previousElementSibling
                    ) {
                        filterDropdownOptionsLoaded = true;
                        await tick();
                    }
                    let options = Array.from(
                        parent.querySelectorAll(".option"),
                    );
                    let currentidx = options.indexOf(highlightedEl);
                    let nextEl, iteratedEl, firstEl, lastEl;
                    for (let idx = 0; idx < options.length; idx++) {
                        if (!options[idx].classList.contains("display-none")) {
                            if (keyCode === 38) {
                                // Prev
                                lastEl = options[idx];
                                if (idx < currentidx) {
                                    iteratedEl = options[idx];
                                } else if (iteratedEl) {
                                    nextEl = iteratedEl;
                                    break;
                                }
                            } else {
                                // next
                                if (!firstEl) {
                                    firstEl = options[idx];
                                }
                                if (idx > currentidx) {
                                    nextEl = options[idx];
                                    break;
                                }
                            }
                        }
                    }
                    let isFirstOrLast = false;
                    if (!(nextEl instanceof Element)) {
                        if (firstEl instanceof Element) {
                            nextEl = firstEl;
                            isFirstOrLast = true;
                        } else if (lastEl instanceof Element) {
                            nextEl = lastEl;
                            isFirstOrLast = true;
                        }
                    }
                    if (nextEl instanceof Element) {
                        removeClass(highlightedEl, "highlight");
                        highlightedEl = nextEl;
                        addClass(highlightedEl, "highlight");
                        highlightedEl.scrollIntoView({
                            behavior: isFirstOrLast ? "auto" : "smooth",
                            block: "nearest",
                        });
                    }
                } else {
                    let options = element.querySelectorAll(
                        ".option:not(.display-none)",
                    );
                    highlightedEl = options[0];
                    if (highlightedEl instanceof Element) {
                        addClass(highlightedEl, "highlight");
                        highlightedEl.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                        });
                    }
                }
            }
        } else if (keyCode === 13) {
            if (highlightedEl instanceof Element) {
                let keyupEvent = new KeyboardEvent("keyup", {
                    key: "Enter",
                });
                highlightedEl.dispatchEvent(keyupEvent);
            }
        } else {
            let element = Array.from(
                document.getElementsByClassName("options-wrap") || [],
            ).find((el) => !el.classList.contains("display-none"));
            if (
                (element?.closest?.(".filter-select") && keyCode !== 9) ||
                (element instanceof Element &&
                    getComputedStyle(element).position === "fixed")
            )
                return;
            let idxTypeSelected = selectedFilterSelectionIdx;
            selectedCustomFilterElement = null;
            selectedFilterTypeElement = null;
            selectedSortElement = null;
            if ($filterOptions?.filterSelection?.length > 0) {
                $filterOptions?.filterSelection?.[
                    idxTypeSelected
                ].filters.Dropdown.forEach((e) => {
                    e.selected = false;
                });
                $filterOptions.filterSelection[idxTypeSelected] =
                    $filterOptions?.filterSelection?.[idxTypeSelected];
            }
            selectedFilterElement = null;
            if (highlightedEl instanceof Element) {
                removeClass(highlightedEl, "highlight");
                highlightedEl = null;
            }
        }
    }

    async function handleGridView() {
        $gridFullView = !$gridFullView;
        setLocalStorage("gridFullView", $gridFullView)
            .catch(() => {
                removeLocalStorage("gridFullView");
            })
            .finally(() => {
                saveJSON($gridFullView, "gridFullView");
            });
    }

    async function handleShowFilterOptions(event, val = null) {
        selectedCustomFilterElement = false;
        if ($finalAnimeList?.length > 36 && !$gridFullView) {
            callAsyncAnimeReload();
        }
        customFilterName = $selectedCustomFilter;
        editCustomFilterName = false;
        if (typeof val === "boolean") {
            $showFilterOptions = val;
        } else {
            $showFilterOptions = !$showFilterOptions;
        }
        setLocalStorage("showFilterOptions", $showFilterOptions).catch(() => {
            removeLocalStorage("showFilterOptions");
        });
    }

    function callAsyncAnimeReload(checkScroll = false) {
        if ($animeLoaderWorker instanceof Worker) {
            if (checkScroll) {
                scrollUpAsyncLoad();
            }
            $checkAnimeLoaderStatus()
                .then(() => {
                    $animeLoaderWorker?.postMessage?.({
                        reload: true,
                    });
                })
                .catch(() => {
                    $confirmPromise({
                        isAlert: true,
                        title: "Something went wrong",
                        text: "Action failed, please try again.",
                    });
                });
        }
    }

    function scrollUpAsyncLoad() {
        for (let i = 0; i < $finalAnimeList?.length; i++) {
            let gridElement =
                $finalAnimeList?.[i]?.gridElement || animeGridEl.children?.[i];
            if (
                gridElement?.getBoundingClientRect?.()?.y >= windowHeight &&
                i > 36
            ) {
                let scrollTop;
                if (isFullViewed) {
                    scrollTop = 74;
                } else {
                    scrollTop = 57;
                }
                window.scrollY = document.documentElement.scrollTop = scrollTop;
                break;
            }
        }
    }

    function hasPartialMatch(strings, searchString) {
        if (typeof strings === "string" && typeof searchString === "string") {
            return strings
                .toLowerCase()
                .includes(searchString.trim().toLowerCase());
        }
    }

    $: customFilterName =
        $selectedCustomFilter || getLocalStorage("selectedCustomFilter");
    let previousCustomFilterName;
    $: {
        if ($selectedCustomFilter) {
            if (
                previousCustomFilterName &&
                previousCustomFilterName !== $selectedCustomFilter
            ) {
                $loadingFilterOptions = true;
                let array1 =
                    $activeTagFilters?.[previousCustomFilterName]?.[
                        "Algorithm Filter"
                    ] || [];
                let array2 =
                    $activeTagFilters?.[$selectedCustomFilter]?.[
                        "Algorithm Filter"
                    ] || [];
                if (arraysAreEqual(array1, array2)) {
                    _loadAnime(false);
                } else {
                    _processRecommendedAnimeList();
                }
            }
            previousCustomFilterName = $selectedCustomFilter;
        }
    }
    function arraysAreEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        let sortedArr1 = arr1.map((obj) => JSON.stringify(obj)).sort();
        let sortedArr2 = arr2.map((obj) => JSON.stringify(obj)).sort();
        for (let i = 0; i < sortedArr1.length; i++) {
            if (sortedArr1[i] !== sortedArr2[i]) return false;
        }
        return true;
    }

    function handleCustomFilterPopup(event) {
        let element = event.target;
        let classList = element.classList;
        let iconActions = element.closest(".custom-filter-icon-wrap");
        if (iconActions || classList.contains("custom-filter-icon-wrap"))
            return;
        if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) {
            pleaseWaitAlert();
            if (
                highlightedEl instanceof Element &&
                highlightedEl.closest(".custom-filter-wrap")
            ) {
                removeClass(highlightedEl, "highlight");
                highlightedEl = null;
            }
            selectedCustomFilterElement = false;
            return;
        }
        let option = element.closest(".option");
        if (option || classList.contains("option")) return;
        let sortSelectEl = element.closest(".custom-filter-wrap");
        let optionsWrap = element.closest(".options-wrap");
        if (
            (classList.contains("custom-filter-wrap") || sortSelectEl) &&
            !selectedCustomFilterElement &&
            !(classList.contains("closing-x") || element.closest(".closing-x"))
        ) {
            selectedCustomFilterElement = sortSelectEl || element || true;
        } else if (
            (!optionsWrap ||
                classList.contains("closing-x") ||
                element.closest(".closing-x")) &&
            !classList.contains("options-wrap")
        ) {
            let optionsWrapToClose =
                selectedCustomFilterElement?.querySelector?.(".options-wrap");
            if (optionsWrapToClose) {
                addClass(optionsWrapToClose, "hide");
                setTimeout(() => {
                    removeClass(optionsWrapToClose, "hide");
                    if (
                        highlightedEl instanceof Element &&
                        highlightedEl.closest(".custom-filter-wrap")
                    ) {
                        removeClass(highlightedEl, "highlight");
                        highlightedEl = null;
                    }
                    selectedCustomFilterElement = false;
                }, 200);
            } else {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".custom-filter-wrap")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedCustomFilterElement = false;
            }
        }
    }
    function handleTouchCustomFilterPopup(event) {
        let element = event.target;
        let classList = element.classList;
        if (
            classList?.contains?.("options-wrap-filter-info") ||
            element?.closest?.(".options-wrap-filter-info")
        ) {
            return;
        }
        let optionsWrapToClose =
            selectedCustomFilterElement?.querySelector?.(".options-wrap");
        if (optionsWrapToClose) {
            addClass(optionsWrapToClose, "hide");
            setTimeout(() => {
                removeClass(optionsWrapToClose, "hide");
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".custom-filter-wrap")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedCustomFilterElement = false;
            }, 200);
        } else {
            if (
                highlightedEl instanceof Element &&
                highlightedEl.closest(".custom-filter-wrap")
            ) {
                removeClass(highlightedEl, "highlight");
                highlightedEl = null;
            }
            selectedCustomFilterElement = false;
        }
    }
    async function selectCustomFilter(event, selectedCustomFilterName) {
        if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter)
            return pleaseWaitAlert();
        event?.stopPropagation?.();
        if (
            (!$showFilterOptions || !isFullViewed) &&
            document.documentElement.scrollTop > 57
        ) {
            window.scrollY = document.documentElement.scrollTop = 57;
        }
        if (isFullViewed) {
            animeGridEl.style.overflow = "hidden";
            animeGridEl.style.overflow = "";
            animeGridEl.scroll({ left: 0, behavior: "smooth" });
        }
        if ($popupVisible) {
            popupContainer.scrollTop = 0;
        }
        $selectedCustomFilter = selectedCustomFilterName;
        selectedCustomFilterElement = false;
    }
    async function saveCustomFilterName() {
        if (!$filterOptions || !isJsonObject($activeTagFilters))
            return pleaseWaitAlert();
        let previousCustomFilterIsMissing =
            !isJsonObject($activeTagFilters?.[$selectedCustomFilter]) ||
            jsonIsEmpty($activeTagFilters?.[$selectedCustomFilter]);
        if (
            customFilterName &&
            ($selectedCustomFilter !== customFilterName ||
                previousCustomFilterIsMissing)
        ) {
            let customFilterNameToShow = `<span style="color:hsl(var(--ac-color));">${trimAllEmptyChar(
                customFilterName,
            )}</span>`;
            if (
                await $confirmPromise({
                    title: "Save category",
                    text: `Do you want to change the category name to ${customFilterNameToShow}?`,
                })
            ) {
                if (
                    customFilterName &&
                    ($selectedCustomFilter !== customFilterName ||
                        previousCustomFilterIsMissing)
                ) {
                    await saveJSON(true, "shouldLoadAnime");
                    editCustomFilterName = false;
                    previousCustomFilterName = $selectedCustomFilter;
                    let savedCustomFilterName =
                        customFilterName ||
                        "Custom Filter " + new Date().getTime();
                    if (isJsonObject($filterOptions?.sortFilter)) {
                        $filterOptions.sortFilter[savedCustomFilterName] =
                            JSON.parse(
                                JSON.stringify(
                                    $filterOptions.sortFilter?.[
                                        previousCustomFilterName
                                    ] || sortFilterContents,
                                ),
                            );
                    }
                    $activeTagFilters[savedCustomFilterName] = JSON.parse(
                        JSON.stringify(
                            previousCustomFilterIsMissing
                                ? {
                                      "Anime Filter": [],
                                      "Content Caution": [],
                                      "Algorithm Filter": [],
                                  }
                                : $activeTagFilters?.[previousCustomFilterName],
                        ),
                    );
                    // Add
                    $activeTagFilters = $activeTagFilters;
                    $selectedCustomFilter = savedCustomFilterName;
                    // Delete
                    if (savedCustomFilterName !== previousCustomFilterName) {
                        delete $activeTagFilters?.[previousCustomFilterName];
                        delete $filterOptions?.sortFilter?.[
                            previousCustomFilterName
                        ];
                        $activeTagFilters = $activeTagFilters;
                        $filterOptions = $filterOptions;
                    }
                }
            }
        }
    }
    async function addCustomFilter() {
        if (!$filterOptions || !isJsonObject($activeTagFilters))
            return pleaseWaitAlert();
        let newCustomFilterCanBeReplaced =
            !isJsonObject($activeTagFilters?.[customFilterName]) ||
            jsonIsEmpty($activeTagFilters?.[customFilterName]);
        if (
            customFilterName &&
            $activeTagFilters &&
            newCustomFilterCanBeReplaced
        ) {
            let customFilterNameToShow = `<span style="color:hsl(var(--ac-color));">${trimAllEmptyChar(
                customFilterName,
            )}</span>`;
            if (
                await $confirmPromise({
                    title: "Add custom category",
                    text: `Do you want to add a custom category named ${customFilterNameToShow}?`,
                })
            ) {
                if (
                    customFilterName &&
                    $activeTagFilters &&
                    newCustomFilterCanBeReplaced
                ) {
                    await saveJSON(true, "shouldLoadAnime");
                    editCustomFilterName = false;
                    let previousCustomFilterName = $selectedCustomFilter;
                    let addedCustomFilterName =
                        customFilterName ||
                        "Custom Filter " + new Date().getTime();
                    if (isJsonObject($filterOptions.sortFilter)) {
                        $filterOptions.sortFilter[addedCustomFilterName] =
                            JSON.parse(
                                JSON.stringify(
                                    $filterOptions?.sortFilter?.[
                                        previousCustomFilterName
                                    ] || sortFilterContents,
                                ),
                            );
                        $filterOptions = $filterOptions;
                    }
                    let previousCustomFilterIsMissing =
                        !isJsonObject(
                            $activeTagFilters?.[previousCustomFilterName],
                        ) ||
                        jsonIsEmpty(
                            $activeTagFilters?.[previousCustomFilterName],
                        );
                    $activeTagFilters[addedCustomFilterName] = JSON.parse(
                        JSON.stringify(
                            previousCustomFilterIsMissing
                                ? {
                                      "Anime Filter": [],
                                      "Content Caution": [],
                                      "Algorithm Filter": [],
                                  }
                                : $activeTagFilters?.[previousCustomFilterName],
                        ),
                    );
                    $activeTagFilters = $activeTagFilters;
                    $selectedCustomFilter = addedCustomFilterName;
                }
            }
        }
    }

    async function removeCustomFilter() {
        if (
            !$filterOptions ||
            !isJsonObject($activeTagFilters) ||
            !$selectedCustomFilter
        )
            return pleaseWaitAlert();
        if (
            $selectedCustomFilter &&
            $activeTagFilters &&
            $activeTagFilters?.[$selectedCustomFilter] &&
            Object.keys($activeTagFilters || {}).length > 1
        ) {
            let customFilterNameToShow = `<span style="color:hsl(var(--ac-color));">${trimAllEmptyChar(
                $selectedCustomFilter,
            )}</span>`;
            if (
                await $confirmPromise({
                    title: "Delete category",
                    text: `Do you want to delete the category named ${customFilterNameToShow}?`,
                })
            ) {
                if (
                    $selectedCustomFilter &&
                    $activeTagFilters &&
                    $activeTagFilters?.[$selectedCustomFilter] &&
                    Object.keys($activeTagFilters || {}).length > 1
                ) {
                    let previousCustomFilter = $selectedCustomFilter;
                    await saveJSON(true, "shouldLoadAnime");
                    $loadingFilterOptions = true;
                    editCustomFilterName = false;
                    let newCustomFilterName;
                    for (let key in $activeTagFilters) {
                        if (key !== previousCustomFilter) {
                            newCustomFilterName = key;
                            break;
                        }
                    }
                    delete $activeTagFilters?.[previousCustomFilter];
                    delete $filterOptions?.sortFilter?.[previousCustomFilter];
                    $activeTagFilters = $activeTagFilters;
                    $filterOptions = $filterOptions;
                    $selectedCustomFilter = newCustomFilterName;
                }
            }
        } else {
            $confirmPromise({
                isAlert: true,
                title: "Action failed",
                text: "Requires atleast one category.",
            });
        }
    }

    function getTagCategoryData() {
        fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                query: `{MediaTagCollection{name category description}}`,
            }),
        })
            .then(async (response) => {
                return await response?.json?.();
            })
            .then(async (result) => {
                let mediaTagCollection = result?.data?.MediaTagCollection || [];
                for (let i = 0; i < mediaTagCollection?.length; i++) {
                    let tagCollected = mediaTagCollection?.[i];
                    let category = tagCollected?.category;
                    let tag = tagCollected?.name;
                    let description = tagCollected?.description;
                    if (!tag || !category) continue;
                    category = cleanText(category);
                    tag = cleanText(tag);
                    if (!isJsonObject(tagCategoryInfo?.[category])) {
                        tagCategoryInfo[category] = {};
                    }
                    tagCategoryInfo[category][tag] = description || "";
                }
                setLocalStorage("tagCategoryInfo", tagCategoryInfo);
                await saveJSON(tagCategoryInfo, "tagCategoryInfo");
                let lastTagCategoryInfoUpdateAt = parseInt(
                    new Date().getTime() / 1000,
                );
                setLocalStorage(
                    "lastTagCategoryInfoUpdateAt",
                    lastTagCategoryInfoUpdateAt,
                );
                saveJSON(
                    lastTagCategoryInfoUpdateAt,
                    "lastTagCategoryInfoUpdateAt",
                );
            });
    }

    function getTagFilterInfoText({ tag, category }, infoToGet) {
        if (infoToGet === "tag category" && tag != null) {
            for (let eCategory in tagCategoryInfo) {
                for (let eTag in tagCategoryInfo[eCategory]) {
                    if (eTag === tag) {
                        return eCategory || "";
                    }
                }
            }
        } else if (infoToGet === "category and description" && tag != null) {
            if (category == null) {
                category = getTagFilterInfoText({ tag }, "tag category");
            }
            let description = tagCategoryInfo?.[category]?.[tag];
            if (description) {
                return `Description: ${description}\nCategory: ${category}`;
            }
        } else if (infoToGet === "all tags" && category != null) {
            let categoryInfo = tagCategoryInfo?.[category];
            let categoryTagsArray = Object.keys(categoryInfo || {});
            if (!jsonIsEmpty(categoryInfo)) {
                return categoryTagsArray.join(", ");
            }
        }
        return "";
    }

    function getTagCategoryInfoHTML(tagCategory) {
        let categoryInfo = tagCategoryInfo?.[tagCategory];
        if (
            !tagCategory ||
            !isJsonObject(categoryInfo) ||
            jsonIsEmpty(categoryInfo)
        )
            return "";
        let tagCategoryList = "";
        let tagCategoryListArray =
            Object.keys(tagCategoryInfo?.[tagCategory]) || [];
        for (let i = 0; i < tagCategoryListArray.length; i++) {
            tagCategoryList += `
                <li onclick="window?.showTagInfoHTML?.(event,'${tagCategoryListArray[i]}','${tagCategory}')">
                    ${tagCategoryListArray[i]}
                </li>
            `;
        }
        return `
            <div class="is-custom-table">
                <header class="custom-header">
                    <h1 class="custom-h1">${tagCategory}</h1>
                </header>
                <ul class="custom-table-list">
                    ${tagCategoryList}
                </ul> 
            </div>
        `;
    }

    function getTagInfoHTML(tag, tagCategory) {
        if (tagCategory == null) {
            tagCategory = getTagFilterInfoText({ tag }, "tag category");
        }
        let description = tagCategoryInfo?.[tagCategory]?.[tag];
        if (!tagCategory || !description) return "";
        return `
            <div class="is-custom-table">
                <header class="custom-header">
                    <h1 class="custom-h1">${tag}</h1>
                    <h4 class="custom-extra" onclick="window?.showTagCategoryInfoHTML?.(event,'${tagCategory}')">${tagCategory}</h4>
                </header>
                <div class="custom-description">${description}</div>
            </div>
        `;
    }
    window.getTagInfoHTML = getTagInfoHTML;

    window.showTagInfoHTML = (event, tag, tagCategory) => {
        event.stopPropagation();
        let tagInfoHTML = getTagInfoHTML(tag, tagCategory);
        if (tagInfoHTML) {
            window?.showFullScreenInfo?.(tagInfoHTML);
        }
    };

    window.showTagCategoryInfoHTML = (event, tagCategory) => {
        event.stopPropagation();
        let tagCategoryInfoHTML = getTagCategoryInfoHTML(tagCategory);
        if (tagCategoryInfoHTML) {
            window?.showFullScreenInfo?.(tagCategoryInfoHTML);
        }
    };

    function cleanText(k) {
        k = k !== "_" ? k?.replace?.(/\_/g, " ") : k;
        k = k !== '\\"' ? k?.replace?.(/\\"/g, '"') : k;
        k = k?.replace?.(/\b(tv|ona|ova)\b/gi, (match) =>
            match?.toUpperCase?.(),
        );
        return k?.toLowerCase?.() || "";
    }

    let editCustomFilterName = false;
    $: {
        $dropdownIsVisible =
            selectedCustomFilterElement ||
            selectedFilterElement ||
            selectedFilterTypeElement ||
            selectedSortElement;
    }

    dropdownIsVisible.subscribe((val) => {
        if (val === false && windowWidth <= 425) {
            // Small Screen Width
            let openedDropdown =
                selectedCustomFilterElement ||
                selectedFilterTypeElement ||
                selectedSortElement ||
                selectedFilterElement;
            let optionsWrapToClose =
                openedDropdown?.querySelector?.(".options-wrap");
            if (optionsWrapToClose) {
                addClass(optionsWrapToClose, "hide");
                setTimeout(() => {
                    removeClass(optionsWrapToClose, "hide");
                    if (highlightedEl instanceof Element) {
                        removeClass(highlightedEl, "highlight");
                        highlightedEl = null;
                    }
                    // Close Custom Filter Dropdown
                    selectedCustomFilterElement = false;
                    // Close Filter Type Dropdown
                    selectedFilterTypeElement = false;
                    // Close Sort Filter Dropdown
                    selectedSortElement = false;
                    // Close Filter Selection Dropdown
                    let idxTypeSelected = selectedFilterSelectionIdx;
                    $filterOptions?.filterSelection?.[
                        idxTypeSelected
                    ]?.filters?.Dropdown?.forEach?.((e) => {
                        if (e?.selected != null) {
                            e.selected = false;
                        }
                    });
                    if (
                        idxTypeSelected != null &&
                        $filterOptions?.filterSelection?.[idxTypeSelected]
                    ) {
                        $filterOptions.filterSelection[idxTypeSelected] =
                            $filterOptions?.filterSelection?.[idxTypeSelected];
                    }
                    selectedFilterElement = null;
                }, 200);
            } else {
                if (highlightedEl instanceof Element) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                // Close Custom Filter Dropdown
                selectedCustomFilterElement = false;
                // Close Filter Type Dropdown
                selectedFilterTypeElement = false;
                // Close Sort Filter Dropdown
                selectedSortElement = false;
                // Close Filter Selection Dropdown
                let idxTypeSelected = selectedFilterSelectionIdx;
                $filterOptions?.filterSelection?.[
                    idxTypeSelected
                ]?.filters?.Dropdown?.forEach?.((e) => {
                    if (e?.selected != null) {
                        e.selected = false;
                    }
                });
                if (
                    idxTypeSelected != null &&
                    $filterOptions?.filterSelection?.[idxTypeSelected]
                ) {
                    $filterOptions.filterSelection[idxTypeSelected] =
                        $filterOptions?.filterSelection?.[idxTypeSelected];
                }
                selectedFilterElement = null;
            }
        }
    });

    function hasTagCategoryInfoData() {
        for (let category in tagCategoryInfo) {
            for (let tag in tagCategoryInfo[category]) {
                return typeof tagCategoryInfo[category][tag] === "string";
            }
            return false;
        }
        return false;
    }

    (async () => {
        window?.kanshiInit?.then?.(async () => {
            let tempTagCategoryInfo =
                getLocalStorage("tagCategoryInfo") ||
                (await retrieveJSON("tagCategoryInfo"));
            if (isJsonObject(tempTagCategoryInfo)) {
                tagCategoryInfo = tempTagCategoryInfo;
            }
            let lastTagCategoryInfoUpdateAt =
                getLocalStorage("lastTagCategoryInfoUpdateAt") ||
                (await retrieveJSON("lastTagCategoryInfoUpdateAt"));
            if (lastTagCategoryInfoUpdateAt > 0 && hasTagCategoryInfoData()) {
                let nextSeasonAverageTimestamp = 7884000000;
                let nextSeason = new Date(
                    lastTagCategoryInfoUpdateAt * 1000 +
                        nextSeasonAverageTimestamp,
                );
                if (nextSeason.getTime() < new Date().getTime()) {
                    getTagCategoryData();
                }
            } else {
                getTagCategoryData();
            }
        });
    })();

    onMount(async () => {
        // Init
        let filterEl = document.getElementById("filters");
        filterEl.addEventListener("scroll", handleFilterScroll);
        animeGridEl = document.getElementById("anime-grid");
        popupContainer = document?.getElementById("popup-container");
        dragScroll(filterEl, "x", (event) => {
            let element = event?.target;
            return (
                selectedFilterElement &&
                (element?.classList?.contains?.("options-wrap") ||
                    element?.closest?.(".options-wrap"))
            );
        });

        document.addEventListener("keydown", handleDropdownKeyDown);
        window.addEventListener("resize", windowResized);
        window.addEventListener("click", clickOutsideListener);
    });

    function pleaseWaitAlert() {
        $confirmPromise({
            isAlert: true,
            title: "Initializing resources",
            text: "Please wait a moment...",
        });
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

    let shouldScrollSnap = getLocalStorage("nonScrollSnapFilters") ?? true;
    $: isFullViewed = $gridFullView ?? getLocalStorage("gridFullView") ?? false;

    let meanAverageScore = getLocalStorage("meanAverageScore");
    let meanPopularity = getLocalStorage("meanPopularity");
    window.updateMeanNumberInfos = (newMeanAverageScore, newMeanPopularity) => {
        if (newMeanAverageScore && newMeanAverageScore > 0) {
            meanAverageScore = newMeanAverageScore;
            setLocalStorage("meanAverageScore", meanAverageScore);
        }
        if (newMeanPopularity && newMeanPopularity > 0) {
            meanPopularity = newMeanPopularity;
            setLocalStorage("meanPopularity", meanPopularity);
        }
    };
</script>

<main
    id="main-home"
    style:--filters-space={$showFilterOptions ? "80px" : ""}
    style:--active-tag-filter-space={!$loadingFilterOptions &&
    $showFilterOptions &&
    !$initData
        ? "auto"
        : ""}
    style:--custom-filter-settings-space={$showFilterOptions ? "30px" : ""}
    style:--close-filters-space={$showFilterOptions ? "42px" : ""}
>
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div
        id="custom-filter-wrap"
        class="custom-filter-wrap"
        tabindex={$menuVisible || $popupVisible || selectedCustomFilterElement
            ? ""
            : "0"}
        style:--editcancel-icon={$showFilterOptions ? "25px" : ""}
        style:--save-icon={$showFilterOptions &&
        editCustomFilterName &&
        $selectedCustomFilter &&
        customFilterName &&
        $activeTagFilters &&
        !$activeTagFilters?.[customFilterName]
            ? "25px"
            : ""}
        on:keyup={(e) => e.key === "Enter" && handleCustomFilterPopup(e)}
        on:click={handleCustomFilterPopup}
    >
        <label class="disable-interaction" for="custom-filter-name">
            Search Title
        </label>
        <input
            id="custom-filter-name"
            class="custom-filter"
            type="text"
            autocomplete="off"
            placeholder="Category"
            style:pointer-events={editCustomFilterName ? "" : "none"}
            disabled={!editCustomFilterName}
            bind:value={customFilterName}
            on:focusin={() => window?.setShouldGoBack?.(false)}
        />
        {#if !editCustomFilterName || !$showFilterOptions}
            <div
                class={"options-wrap " +
                    (selectedCustomFilterElement ? "" : "display-none hide")}
                style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                on:touchend|passive={handleTouchCustomFilterPopup}
            >
                {#if $filterOptions}
                    <div
                        class={"options-wrap-filter-info " +
                            (selectedCustomFilterElement ? "" : "hide")}
                    >
                        <div class="header">
                            <div class="filter-title">Category</div>
                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                            <svg
                                viewBox="0 0 24 24"
                                class="closing-x"
                                tabindex={!$menuVisible &&
                                !$popupVisible &&
                                selectedCustomFilterElement &&
                                windowWidth <= 425
                                    ? "0"
                                    : "-1"}
                                on:keyup={(e) =>
                                    e.key === "Enter" &&
                                    handleCustomFilterPopup(e)}
                                on:click={handleCustomFilterPopup}
                                ><path
                                    fill="#fff"
                                    d="m19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z"
                                /></svg
                            >
                        </div>
                        <div class="options">
                            {#each $customFilters || [] as filterName (filterName || {})}
                                <div
                                    class="option"
                                    on:click={(e) =>
                                        selectCustomFilter(e, filterName)}
                                    on:keyup={(e) =>
                                        e.key === "Enter" &&
                                        selectCustomFilter(e, filterName)}
                                >
                                    <h3
                                        style:color={filterName ===
                                        $selectedCustomFilter
                                            ? "hsl(var(--ac-color))"
                                            : "inherit"}
                                    >
                                        {trimAllEmptyChar(filterName) || ""}
                                    </h3>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
        {#if $showFilterOptions}
            {#if editCustomFilterName && customFilterName && $selectedCustomFilter && $activeTagFilters && !$activeTagFilters?.[customFilterName]}
                <div class="custom-filter-icon-wrap">
                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                    <svg
                        class="save-custom-category-name"
                        title="Save Category Name"
                        tabindex={!$menuVisible &&
                        !$popupVisible &&
                        editCustomFilterName
                            ? "0"
                            : "-1"}
                        viewBox="0 0 448 512"
                        on:click={() => {
                            if (
                                !$selectedCustomFilter ||
                                !customFilterName ||
                                !$activeTagFilters ||
                                $activeTagFilters?.[customFilterName]
                            )
                                return;
                            saveCustomFilterName();
                        }}
                        on:keyup={(e) => {
                            if (e.key !== "Enter") return;
                            if (
                                !$selectedCustomFilter ||
                                !customFilterName ||
                                !$activeTagFilters ||
                                $activeTagFilters?.[customFilterName]
                            )
                                return;
                            saveCustomFilterName();
                        }}
                    >
                        <!-- xmark and edit -->
                        <path
                            d="M48 96v320c0 9 7 16 16 16h320c9 0 16-7 16-16V171c0-5-2-9-5-12l34-34c12 12 19 29 19 46v245c0 35-29 64-64 64H64c-35 0-64-29-64-64V96c0-35 29-64 64-64h246c17 0 33 7 45 19l74 74-34 34-74-74-1-1v100c0 13-11 24-24 24H104c-13 0-24-11-24-24V80H64c-9 0-16 7-16 16zm80-16v80h144V80H128zm32 240a64 64 0 1 1 128 0 64 64 0 1 1-128 0z"
                        /></svg
                    >
                </div>
            {/if}
            <div class="custom-filter-icon-wrap">
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <svg
                    class={editCustomFilterName
                        ? "cancel-custom-category-name"
                        : "edit-custom-category-name"}
                    tabindex={!$menuVisible &&
                    !$popupVisible &&
                    $showFilterOptions
                        ? "0"
                        : "-1"}
                    viewBox={"0 0" +
                        (editCustomFilterName ? " 24 24" : " 512 512")}
                    on:click={async () => {
                        editCustomFilterName = !editCustomFilterName;
                        customFilterName = $selectedCustomFilter;
                        selectedCustomFilterElement = false;
                        await tick();
                        document
                            ?.getElementById?.("custom-filter-name")
                            ?.focus?.();
                    }}
                    on:keyup={async (e) => {
                        if (e.key !== "Enter") return;
                        editCustomFilterName = !editCustomFilterName;
                        customFilterName = $selectedCustomFilter;
                        selectedCustomFilterElement = false;
                        await tick();
                        document
                            ?.getElementById?.("custom-filter-name")
                            ?.focus?.();
                    }}
                >
                    <!-- xmark and edit -->
                    <path
                        d={editCustomFilterName
                            ? "m19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z"
                            : "M472 22a56 56 0 0 0-80 0l-30 30 98 98 30-30c22-22 22-58 0-80l-18-18zM172 242c-6 6-10 13-13 22l-30 88a24 24 0 0 0 31 31l89-30c8-3 15-7 21-13l168-168-98-98-168 168zM96 64c-53 0-96 43-96 96v256c0 53 43 96 96 96h256c53 0 96-43 96-96v-96a32 32 0 1 0-64 0v96c0 18-14 32-32 32H96c-18 0-32-14-32-32V160c0-18 14-32 32-32h96a32 32 0 1 0 0-64H96z"}
                    /></svg
                >
            </div>
        {/if}
        <div class="custom-filter-icon-wrap">
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <svg
                class="showFilterOptions"
                tabindex={$menuVisible || $popupVisible ? "" : "0"}
                viewBox="0 0 512 512"
                on:click={handleShowFilterOptions}
                on:keyup={(e) =>
                    e.key === "Enter" && handleShowFilterOptions(e)}
            >
                <!-- slider -->
                <path
                    d="M0 416c0 18 14 32 32 32h55a80 80 0 0 0 146 0h247a32 32 0 1 0 0-64H233a80 80 0 0 0-146 0H32c-18 0-32 14-32 32zm128 0a32 32 0 1 1 64 0 32 32 0 1 1-64 0zm192-160a32 32 0 1 1 64 0 32 32 0 1 1-64 0zm32-80c-33 0-61 20-73 48H32a32 32 0 1 0 0 64h247a80 80 0 0 0 146 0h55a32 32 0 1 0 0-64h-55a80 80 0 0 0-73-48zm-160-48a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm73-64a80 80 0 0 0-146 0H32a32 32 0 1 0 0 64h87a80 80 0 0 0 146 0h215a32 32 0 1 0 0-64H265z"
                /></svg
            >
        </div>
    </div>
    <div
        class={"custom-filter-settings-wrap" +
            ($showFilterOptions ? "" : " display-none")}
        style:--add-icon-size={customFilterName &&
        $activeTagFilters &&
        !$activeTagFilters?.[customFilterName]
            ? "25px"
            : ""}
        style:--remove-icon-size={$customFilters?.length > 1 ? "25px" : ""}
    >
        {#if $filterOptions && !$loadingFilterOptions}
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <span
                class="filterType"
                on:click={handleShowFilterTypes}
                on:keyup={(e) => e.key === "Enter" && handleShowFilterTypes(e)}
            >
                <h2 class="filterType-dropdown">
                    {selectedFilterSelectionName || ""}
                    <svg
                        viewBox="0 140 320 512"
                        tabindex={!$menuVisible &&
                        !$popupVisible &&
                        $showFilterOptions &&
                        !selectedFilterTypeElement
                            ? "0"
                            : ""}
                    >
                        <!-- chevron down -->
                        <path
                            d="M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z"
                        /></svg
                    >
                </h2>
                <div
                    class={"options-wrap " +
                        (selectedFilterTypeElement ? "" : "display-none hide")}
                    style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                    on:touchend|passive={handleTouchFilterTypes}
                >
                    {#if $filterOptions}
                        <div
                            class={"options-wrap-filter-info " +
                                (selectedFilterTypeElement ? "" : "hide")}
                        >
                            <div class="header">
                                <div class="filter-title">Filter</div>
                                <svg
                                    viewBox="0 0 24 24"
                                    class="closing-x"
                                    tabindex={!$menuVisible &&
                                    !$popupVisible &&
                                    selectedFilterTypeElement &&
                                    windowWidth <= 425
                                        ? "0"
                                        : "-1"}
                                    on:keyup={(e) =>
                                        e.key === "Enter" &&
                                        handleShowFilterTypes(e)}
                                    on:click={handleShowFilterTypes}
                                    ><path
                                        fill="#fff"
                                        d="m19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z"
                                    /></svg
                                >
                            </div>
                            <div class="options">
                                {#each $filterOptions?.filterSelection || [] as filterSelection (filterSelection?.filterSelectionName || {})}
                                    <div
                                        class="option"
                                        on:click={(e) =>
                                            handleFilterTypes(
                                                e,
                                                filterSelection?.filterSelectionName,
                                            )}
                                        on:keyup={(e) =>
                                            e.key === "Enter" &&
                                            handleFilterTypes(
                                                e,
                                                filterSelection?.filterSelectionName,
                                            )}
                                    >
                                        <h3
                                            style:color={filterSelection?.isSelected
                                                ? "hsl(var(--ac-color))"
                                                : "inherit"}
                                        >
                                            {filterSelection?.filterSelectionName ||
                                                ""}
                                        </h3>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            </span>
        {:else}
            <div class="skeleton shimmer" />
        {/if}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        {#if $showFilterOptions && $customFilters?.length > 1}
            <div
                tabindex={$menuVisible || $popupVisible ? "" : "0"}
                class="remove-custom-category"
                title="Delete Category"
                style:visibility={$customFilters?.length > 1 ? "" : "hidden"}
                on:click={(e) =>
                    $customFilters?.length > 1 && removeCustomFilter(e)}
                on:keyup={(e) =>
                    $customFilters?.length > 1 &&
                    e.key === "Enter" &&
                    removeCustomFilter(e)}
            >
                <svg class="filterType-wrap-icon" viewBox="0 0 448 512">
                    <!-- minus -->
                    <path
                        d="M432 256c0 18-14 32-32 32H48a32 32 0 1 1 0-64h352c18 0 32 14 32 32z"
                    />
                </svg>
            </div>
        {/if}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        {#if $showFilterOptions && customFilterName && $activeTagFilters && !$activeTagFilters?.[customFilterName]}
            <div
                tabindex={$menuVisible || $popupVisible ? "" : "0"}
                class="add-custom-category"
                title="Add Custom Category"
                on:click={(e) => {
                    if (
                        !customFilterName ||
                        !$activeTagFilters ||
                        $activeTagFilters?.[customFilterName]
                    )
                        return;
                    addCustomFilter(e);
                }}
                on:keyup={(e) => {
                    if (
                        e.key !== "Enter" ||
                        !customFilterName ||
                        !$activeTagFilters ||
                        $activeTagFilters?.[customFilterName]
                    )
                        return;
                    addCustomFilter(e);
                }}
            >
                <svg class="filterType-wrap-icon" viewBox="0 0 448 512">
                    <!-- add -->
                    <path
                        d={"M256 80a32 32 0 1 0-64 0v144H48a32 32 0 1 0 0 64h144v144a32 32 0 1 0 64 0V288h144a32 32 0 1 0 0-64H256V80z"}
                    />
                </svg>
            </div>
        {/if}
    </div>
    <div
        class={"filters" +
            ($showFilterOptions ? "" : " display-none") +
            ($hasWheel ? " hasWheel" : "") +
            (shouldScrollSnap && $android ? " android" : "")}
        id="filters"
        on:wheel={(e) => {
            horizontalWheel(e, "filters");
            if (isFullViewed) {
                if (!scrollingToTop && e.deltaY < 0) {
                    scrollingToTop = true;
                    let newScrollPosition = 0;
                    document.documentElement.scrollTop = newScrollPosition;
                    scrollingToTop = false;
                }
            }
        }}
        style:--maxPaddingHeight={selectedFilterElement
            ? maxFilterSelectionHeight + 65 + "px"
            : "0"}
    >
        {#if $filterOptions}
            {#each $filterOptions?.filterSelection || [] as filterSelection, filSelIdx (filterSelection.filterSelectionName || {})}
                {#each filterSelection.filters.Dropdown || [] as Dropdown, dropdownIdx (filterSelection.filterSelectionName + Dropdown.filName || {})}
                    <div
                        class={"filter-select " +
                            (filterSelection.isSelected &&
                            !$loadingFilterOptions
                                ? ""
                                : "display-none")}
                    >
                        <div class="filter-name">
                            <h2>{Dropdown.filName || ""}</h2>
                        </div>
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <div
                            class="select"
                            tabindex={!$menuVisible &&
                            !$popupVisible &&
                            $showFilterOptions &&
                            windowWidth <= 425 &&
                            filterSelection.isSelected
                                ? "0"
                                : "-1"}
                            on:keyup={(e) =>
                                (e.key === "Enter" ||
                                    e.key === "ArrowDown" ||
                                    e.key === "ArrowUp") &&
                                filterSelect(e, dropdownIdx)}
                            on:click={(e) => {
                                filterSelect(e, dropdownIdx);
                            }}
                        >
                            <div class="value-wrap">
                                <label
                                    class="disable-interaction"
                                    for={filterSelection.filterSelectionName +
                                        Dropdown.filName}
                                >
                                    {filterSelection.filterSelectionName +
                                        " " +
                                        Dropdown.filName}
                                </label>
                                <input
                                    tabindex={!$menuVisible &&
                                    !$popupVisible &&
                                    $showFilterOptions
                                        ? "0"
                                        : "-1"}
                                    id={filterSelection.filterSelectionName +
                                        Dropdown.filName}
                                    placeholder="Any"
                                    type="search"
                                    enterkeyhint="search"
                                    autocomplete="off"
                                    class={"value-input"}
                                    bind:value={$filterOptions.filterSelection[
                                        filSelIdx
                                    ].filters.Dropdown[dropdownIdx].optKeyword}
                                    disabled={!$showFilterOptions ||
                                        windowWidth <= 425 ||
                                        !filterSelection.isSelected}
                                    on:focusin={() =>
                                        window?.setShouldGoBack?.(false)}
                                />
                            </div>
                            {#if Dropdown.selected && Dropdown.options.length && !Init}
                                <svg
                                    class="angle-up"
                                    viewBox="0 0 512 512"
                                    on:keyup={(e) =>
                                        e.key === "Enter" &&
                                        closeFilterSelect(dropdownIdx)}
                                    on:click={closeFilterSelect(dropdownIdx)}
                                >
                                    <!-- angle-up -->
                                    <path
                                        d="M201 137c13-12 33-12 46 0l160 160a32 32 0 0 1-46 46L224 205 87 343a32 32 0 0 1-46-46l160-160z"
                                    />
                                </svg>
                            {:else}
                                <svg class="angle-down" viewBox="0 0 512 512">
                                    <!-- angle-down -->
                                    <path
                                        d="M201 343c13 12 33 12 46 0l160-160a32 32 0 0 0-46-46L224 275 87 137a32 32 0 0 0-46 46l160 160z"
                                    />
                                </svg>
                            {/if}
                        </div>
                        <div
                            class={"options-wrap " +
                                (Dropdown.options.length &&
                                Dropdown.selected === true &&
                                !Init
                                    ? ""
                                    : "display-none hide")}
                            style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                            on:wheel|stopPropagation={() => {}}
                            on:touchend|passive={(e) =>
                                handleTouchFilterSelect(e, dropdownIdx)}
                        >
                            <div
                                class={"options-wrap-filter-info " +
                                    (Dropdown.options.length &&
                                    Dropdown.selected === true &&
                                    !Init
                                        ? ""
                                        : "hide")}
                            >
                                <div class="header">
                                    <div class="filter-title">
                                        {Dropdown.filName}
                                    </div>
                                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                    <svg
                                        viewBox="0 0 24 24"
                                        class="closing-x"
                                        tabindex={!$menuVisible &&
                                        !$popupVisible &&
                                        $showFilterOptions &&
                                        Dropdown.selected
                                            ? "0"
                                            : "-1"}
                                        on:keyup={(e) =>
                                            e.key === "Enter" &&
                                            closeFilterSelect(dropdownIdx)}
                                        on:click={closeFilterSelect(
                                            dropdownIdx,
                                        )}
                                        ><path
                                            fill="#fff"
                                            d="m19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z"
                                        /></svg
                                    >
                                </div>
                                <label
                                    class="disable-interaction"
                                    for={"Search " +
                                        (filterSelection.filterSelectionName +
                                            Dropdown.filName)}
                                >
                                    {"Search " +
                                        filterSelection.filterSelectionName +
                                        " " +
                                        Dropdown.filName}
                                </label>
                                <input
                                    tabindex={!$menuVisible &&
                                    !$popupVisible &&
                                    $showFilterOptions
                                        ? "0"
                                        : "-1"}
                                    id={"Search " +
                                        (filterSelection.filterSelectionName +
                                            Dropdown.filName)}
                                    placeholder="Any"
                                    type="search"
                                    enterkeyhint="search"
                                    autocomplete="off"
                                    bind:value={$filterOptions.filterSelection[
                                        filSelIdx
                                    ].filters.Dropdown[dropdownIdx].optKeyword}
                                    disabled={!$showFilterOptions ||
                                        !filterSelection.isSelected ||
                                        !Dropdown.selected}
                                    on:focusin={() =>
                                        window?.setShouldGoBack?.(false)}
                                />
                                <div
                                    class="options"
                                    on:wheel|stopPropagation={() => {}}
                                >
                                    {#if Dropdown.selected}
                                        {#await filterDropdownOptionsLoaded ? (Dropdown?.optKeyword === "" ? Dropdown?.options?.map?.( (option, idx) => {
                                                          option.filteredOptionIdx = idx;
                                                          return option;
                                                      }, ) : Dropdown?.options?.filter?.( (option, idx) => {
                                                          option.filteredOptionIdx = idx;
                                                          return hasPartialMatch(option.optionName, Dropdown?.optKeyword);
                                                      }, )) : new Promise( (resolve) => resolve(Dropdown?.optKeyword === "" ? Dropdown?.options?.map( (option, idx) => {
                                                                        option.filteredOptionIdx = idx;
                                                                        return option;
                                                                    }, ) : Dropdown?.options?.filter?.( (option, idx) => {
                                                                        option.filteredOptionIdx = idx;
                                                                        return hasPartialMatch(option.optionName, Dropdown?.optKeyword);
                                                                    }, )), )}{""}{:then DropdownOptions}
                                            {#if DropdownOptions?.length}
                                                {#each DropdownOptions || [] as option, optionIdx (filterSelection.filterSelectionName + Dropdown.filName + option.optionName || {})}
                                                    {#await filterDropdownOptionsLoaded ? 1 : new Promise( (resolve) => setTimeout(resolve, Math.min(optionIdx * 16, 2000000000)), )}{""}{:then}
                                                        <div
                                                            title={getTagFilterInfoText(
                                                                Dropdown.filName ===
                                                                    "tag category"
                                                                    ? {
                                                                          category:
                                                                              option?.optionName,
                                                                      }
                                                                    : Dropdown.filName ===
                                                                        "tag"
                                                                      ? {
                                                                            tag: option?.optionName,
                                                                        }
                                                                      : {},
                                                                Dropdown.filName ===
                                                                    "tag category"
                                                                    ? "all tags"
                                                                    : Dropdown.filName ===
                                                                        "tag"
                                                                      ? "category and description"
                                                                      : "",
                                                            ) || ""}
                                                            class="option"
                                                            on:click={handleFilterSelectOptionChange(
                                                                option.optionName,
                                                                Dropdown.filName,
                                                                option.filteredOptionIdx,
                                                                dropdownIdx,
                                                                Dropdown.changeType,
                                                                filterSelection.filterSelectionName,
                                                            )}
                                                            on:keyup={(e) =>
                                                                e.key ===
                                                                    "Enter" &&
                                                                handleFilterSelectOptionChange(
                                                                    option.optionName,
                                                                    Dropdown.filName,
                                                                    option.filteredOptionIdx,
                                                                    dropdownIdx,
                                                                    Dropdown.changeType,
                                                                    filterSelection.filterSelectionName,
                                                                )}
                                                        >
                                                            <h3>
                                                                {option.optionName ||
                                                                    ""}
                                                            </h3>
                                                            {#if option.selected === "included" || (option.selected === "excluded" && Dropdown.changeType !== "read")}
                                                                <svg
                                                                    class="item-info"
                                                                    viewBox="0 0 512 512"
                                                                    style:--optionColor={option.selected ===
                                                                    "included"
                                                                        ? // green
                                                                          "#5f9ea0"
                                                                        : // red
                                                                          "#e85d75"}
                                                                >
                                                                    <path
                                                                        class="item-info-path"
                                                                        d={option.selected ===
                                                                            "excluded" ||
                                                                        filterSelection.filterSelectionName ===
                                                                            "Content Caution"
                                                                            ? // circle-xmark
                                                                              "M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-81-337c-9 9-9 25 0 34l47 47-47 47c-9 9-9 24 0 34s25 9 34 0l47-47 47 47c9 9 24 9 34 0s9-25 0-34l-47-47 47-47c9-10 9-25 0-34s-25-9-34 0l-47 47-47-47c-10-9-25-9-34 0z"
                                                                            : // circle-check
                                                                              "M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm113-303c9-9 9-25 0-34s-25-9-34 0L224 286l-47-47c-9-9-24-9-34 0s-9 25 0 34l64 64c10 9 25 9 34 0l128-128z"}
                                                                    />
                                                                </svg>
                                                            {/if}
                                                            {#if typeof window?.showFullScreenInfo === "function" && ((Dropdown?.filName === "tag" && getTagFilterInfoText({ tag: option?.optionName }, "category and description")) || (Dropdown.filName === "tag category" && !jsonIsEmpty(tagCategoryInfo?.[option?.optionName])))}
                                                                <svg
                                                                    class="extra-item-info"
                                                                    viewBox="0 0 512 512"
                                                                    on:click|stopPropagation={() => {
                                                                        let htmlToShow =
                                                                            "";
                                                                        if (
                                                                            Dropdown.filName ===
                                                                            "tag"
                                                                        ) {
                                                                            htmlToShow =
                                                                                getTagInfoHTML(
                                                                                    option?.optionName,
                                                                                );
                                                                        } else if (
                                                                            Dropdown.filName ===
                                                                            "tag category"
                                                                        ) {
                                                                            htmlToShow =
                                                                                getTagCategoryInfoHTML(
                                                                                    option?.optionName,
                                                                                );
                                                                        }
                                                                        window?.showFullScreenInfo?.(
                                                                            htmlToShow,
                                                                        );
                                                                    }}
                                                                    on:keyup|stopPropagation={(
                                                                        e,
                                                                    ) => {
                                                                        if (
                                                                            e.key ===
                                                                            "Enter"
                                                                        ) {
                                                                            let htmlToShow =
                                                                                "";
                                                                            if (
                                                                                Dropdown.filName ===
                                                                                "tag"
                                                                            ) {
                                                                                htmlToShow =
                                                                                    getTagInfoHTML(
                                                                                        option?.optionName,
                                                                                    );
                                                                            } else if (
                                                                                Dropdown.filName ===
                                                                                "tag category"
                                                                            ) {
                                                                                htmlToShow =
                                                                                    getTagCategoryInfoHTML(
                                                                                        option?.optionName,
                                                                                    );
                                                                            }
                                                                            window?.showFullScreenInfo?.(
                                                                                htmlToShow,
                                                                            );
                                                                        }
                                                                    }}
                                                                    ><path
                                                                        class="item-info-path"
                                                                        d="M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-40-176h24v-64h-24a24 24 0 1 1 0-48h48c13 0 24 11 24 24v88h8a24 24 0 1 1 0 48h-80a24 24 0 1 1 0-48zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"
                                                                    /></svg
                                                                >
                                                            {/if}
                                                        </div>
                                                    {/await}
                                                {/each}
                                            {:else if Dropdown.selected}
                                                <div class="option">
                                                    <h3>No Results</h3>
                                                </div>
                                            {/if}
                                        {/await}
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
                {#each filterSelection.filters.Checkbox || [] as Checkbox, checkboxIdx (filterSelection.filterSelectionName + Checkbox.filName || {})}
                    {#if filterSelection.isSelected}
                        <div
                            class={"filter-checkbox" +
                                ($loadingFilterOptions ? " display-none" : "")}
                        >
                            <div style:visibility="none" />
                            <div
                                class="checkbox-wrap"
                                on:click={(e) =>
                                    handleCheckboxChange(
                                        e,
                                        Checkbox.filName,
                                        checkboxIdx,
                                        filterSelection.filterSelectionName,
                                    )}
                                on:keyup={(e) =>
                                    e.key === "Enter" &&
                                    handleCheckboxChange(
                                        e,
                                        Checkbox.filName,
                                        checkboxIdx,
                                        filterSelection.filterSelectionName,
                                    )}
                            >
                                <label
                                    class="disable-interaction"
                                    for={"Checkbox: " + Checkbox.filName}
                                >
                                    {Checkbox.filName}
                                </label>
                                <input
                                    tabindex={!$menuVisible &&
                                    !$popupVisible &&
                                    $showFilterOptions
                                        ? "0"
                                        : "-1"}
                                    id={"Checkbox: " + Checkbox.filName}
                                    type="checkbox"
                                    class="checkbox"
                                    on:change={async (e) => {
                                        if (
                                            !$filterOptions ||
                                            !$activeTagFilters ||
                                            !$selectedCustomFilter
                                        ) {
                                            return pleaseWaitAlert();
                                        } else {
                                            handleCheckboxChange(
                                                e,
                                                Checkbox.filName,
                                                checkboxIdx,
                                                filterSelection.filterSelectionName,
                                            );
                                        }
                                    }}
                                    bind:checked={Checkbox.isSelected}
                                    disabled={!$showFilterOptions}
                                />
                                <div class="checkbox-label">
                                    {Checkbox.filName || ""}
                                </div>
                            </div>
                        </div>
                    {/if}
                {/each}
                {#each filterSelection.filters["Input Number"] || [] as inputNum, inputNumIdx (filterSelection.filterSelectionName + inputNum.filName || {})}
                    {#if filterSelection.isSelected}
                        <div
                            class={"filter-input-number" +
                                ($loadingFilterOptions ? " display-none" : "")}
                            style:display={filterSelection.isSelected
                                ? ""
                                : "none"}
                        >
                            <div class="filter-input-number-name">
                                <h2>{inputNum.filName || ""}</h2>
                            </div>
                            <div class="value-input-number-wrap">
                                <label
                                    class="disable-interaction"
                                    for={"Number Filter: " + inputNum.filName}
                                >
                                    {"Number Filter: " + inputNum.filName}
                                </label>
                                <input
                                    tabindex={!$menuVisible &&
                                    !$popupVisible &&
                                    $showFilterOptions
                                        ? "0"
                                        : "-1"}
                                    id={"Number Filter: " + inputNum.filName}
                                    class="value-input-number"
                                    type="text"
                                    placeholder={inputNum.filName ===
                                    "scoring system"
                                        ? "Default: User Scoring"
                                        : (inputNum.filName ===
                                                "average score" ||
                                                inputNum.filName ===
                                                    "min average score") &&
                                            typeof meanAverageScore ===
                                                "number" &&
                                            meanAverageScore > 0
                                          ? "Average: " +
                                            formatNumber(meanAverageScore)
                                          : (inputNum.filName ===
                                                  "popularity" ||
                                                  inputNum.filName ===
                                                      "min popularity") &&
                                              typeof meanPopularity ===
                                                  "number" &&
                                              meanPopularity > 0
                                            ? "Average: " +
                                              formatNumber(
                                                  meanPopularity,
                                                  meanPopularity >= 1000
                                                      ? 1
                                                      : 0,
                                              )
                                            : conditionalInputNumberList.includes(
                                                    inputNum.filName,
                                                )
                                              ? ">123 or 123"
                                              : inputNum.defaultValue !== null
                                                ? "Default: " +
                                                  inputNum.defaultValue
                                                : "123"}
                                    value={inputNum.numberValue || ""}
                                    on:input={(e) =>
                                        handleInputNumber(
                                            e,
                                            e.target.value,
                                            inputNumIdx,
                                            inputNum.filName,
                                            inputNum.maxValue,
                                            inputNum.minValue,
                                            filterSelection.filterSelectionName,
                                        )}
                                    disabled={!$showFilterOptions}
                                    on:focusin={() =>
                                        window?.setShouldGoBack?.(false)}
                                />
                            </div>
                        </div>
                    {/if}
                {/each}
            {/each}
        {/if}
        {#if !$filterOptions || $loadingFilterOptions}
            {#each Array(10) as _}
                <div class="filter-select">
                    <div class="filter-name skeleton shimmer" />
                    <div class="select skeleton shimmer" />
                </div>
            {/each}
        {/if}
    </div>
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div
        id="activeFilters"
        class={"activeFilters" +
            (!$loadingFilterOptions && $showFilterOptions && !$initData
                ? ""
                : " display-none")}
    >
        <div id="tagFilters" class="tagFilters">
            <div
                tabindex={!$menuVisible && !$popupVisible && $showFilterOptions
                    ? "0"
                    : "-1"}
                class="empty-tagFilter"
                title="Remove Filters"
                on:click={removeAllActiveTag}
                on:keyup={(e) => e.key === "Enter" && removeAllActiveTag(e)}
            >
                <!-- Ban -->
                <svg viewBox="0 0 512 512">
                    <path
                        d="M367 413 100 145a192 192 0 0 0 268 268zm45-46A192 192 0 0 0 145 99l269 268zM1 256a256 256 0 1 1 512 0 256 256 0 1 1-512 0z"
                    />
                </svg>
            </div>
            {#each activeTagFiltersArrays || [] as activeTagFiltersArray (activeTagFiltersArray?.optionName + activeTagFiltersArray?.optionIdx + (activeTagFiltersArray?.optionType ?? "") || {})}
                <div
                    class="activeTagFilter"
                    tabindex={!$menuVisible &&
                    !$popupVisible &&
                    $showFilterOptions
                        ? "0"
                        : "-1"}
                    style:--activeTagFilterColor={activeTagFiltersArray?.selected ===
                    "included"
                        ? "hsl(185deg, 65%, 50%)"
                        : activeTagFiltersArray?.selected === "excluded"
                          ? "hsl(345deg, 75%, 60%)"
                          : "hsl(0deg, 0%, 50%)"}
                    on:click={(e) =>
                        changeActiveSelect(
                            e,
                            activeTagFiltersArray?.optionIdx,
                            activeTagFiltersArray?.optionName,
                            activeTagFiltersArray?.filterType,
                            activeTagFiltersArray?.categIdx,
                            activeTagFiltersArray?.changeType,
                            activeTagFiltersArray?.optionType,
                            activeTagFiltersArray?.optionValue,
                        )}
                    on:keyup={(e) =>
                        e.key === "Enter" &&
                        changeActiveSelect(
                            e,
                            activeTagFiltersArray?.optionIdx,
                            activeTagFiltersArray?.optionName,
                            activeTagFiltersArray?.filterType,
                            activeTagFiltersArray?.categIdx,
                            activeTagFiltersArray?.changeType,
                            activeTagFiltersArray?.optionType,
                            activeTagFiltersArray?.optionValue,
                        )}
                >
                    <div class="activeFilter">
                        {#if activeTagFiltersArray?.filterType === "input number"}
                            <h3>
                                {activeTagFiltersArray?.optionName +
                                    " : " +
                                    activeTagFiltersArray?.optionValue || ""}
                            </h3>
                        {:else if activeTagFiltersArray?.optionType}
                            <h3>
                                {activeTagFiltersArray?.optionType +
                                    " : " +
                                    activeTagFiltersArray?.optionName || ""}
                            </h3>
                        {:else}
                            <h3>{activeTagFiltersArray?.optionName || ""}</h3>
                        {/if}
                    </div>
                    <!-- xmark -->
                    <svg
                        class="removeActiveTag"
                        viewBox="0 0 24 24"
                        tabindex={!$menuVisible &&
                        !$popupVisible &&
                        $showFilterOptions
                            ? "0"
                            : "-1"}
                        on:click|preventDefault={(e) =>
                            removeActiveTag(
                                e,
                                activeTagFiltersArray?.optionIdx,
                                activeTagFiltersArray?.optionName,
                                activeTagFiltersArray?.filterType,
                                activeTagFiltersArray?.categIdx,
                                activeTagFiltersArray?.optionType,
                            )}
                        on:keyup={(e) =>
                            e.key === "Enter" &&
                            removeActiveTag(
                                e,
                                activeTagFiltersArray?.optionIdx,
                                activeTagFiltersArray?.optionName,
                                activeTagFiltersArray?.filterType,
                                activeTagFiltersArray?.categIdx,
                                activeTagFiltersArray?.optionType,
                            )}
                    >
                        <path
                            d="m19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z"
                        />
                    </svg>
                </div>
            {/each}
        </div>
    </div>
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div
        class={"close-filters" + ($showFilterOptions ? "" : " display-none")}
        on:click={handleShowFilterOptions}
        on:keyup={(e) => e.key === "Enter" && handleShowFilterOptions(e)}
        tabindex={!$menuVisible && !$popupVisible && $showFilterOptions
            ? "0"
            : "-1"}
    >
        <!-- Angle up -->
        <svg viewBox="0 0 512 512"
            ><path
                d="M201 137c13-12 33-12 46 0l160 160a32 32 0 0 1-46 46L224 205 87 343a32 32 0 0 1-46-46l160-160z"
            ></path></svg
        >
    </div>
    <div id="home-status" class="home-status">
        <span out:fade={{ duration: 200, easing: sineOut }} class="data-status">
            <h2
                on:click={(e) => {
                    getExtraInfo();
                }}
                on:keyup={() => {}}
                class={(!$dataStatus || !$showStatus) && $loadingDataStatus
                    ? " loading"
                    : ""}
            >
                {#if $dataStatus && $showStatus}
                    {$dataStatus}
                {:else}
                    {$extraInfo?.[$currentExtraInfo] || "Please Wait"}
                {/if}
            </h2>
        </span>
    </div>
    <div class="input-search-wrap" id="input-search-wrap">
        <label class="disable-interaction" for="input-search">
            Search Title
        </label>
        <input
            id="input-search"
            class="input-search"
            type="search"
            enterkeyhint="search"
            autocomplete="off"
            placeholder="Search"
            tabindex={$menuVisible || $popupVisible ? "-1" : "0"}
            bind:value={$searchedAnimeKeyword}
            on:focusin={() => window?.setShouldGoBack?.(false)}
        />
    </div>

    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div class="last-filter-option">
        <div
            tabindex={$menuVisible || $popupVisible ? "" : "0"}
            class="changeGridView"
            on:click={handleGridView}
            on:keyup={(e) => e.key === "Enter" && handleGridView()}
        >
            <svg viewBox={`0 0 ${isFullViewed ? "312" : "512"} 512`}>
                <path
                    d={isFullViewed
                        ? // arrows-up-down
                          "M183 9a32 32 0 0 0-46 0l-96 96a32 32 0 0 0 46 46l41-42v294l-41-42a32 32 0 0 0-46 46l96 96c13 12 33 12 46 0l96-96a32 32 0 0 0-46-46l-41 42V109l41 42a32 32 0 0 0 46-46L183 9z"
                        : // arrows-left-right
                          "m407 375 96-96c12-13 12-33 0-46l-96-96a32 32 0 0 0-46 46l42 41H109l42-41a32 32 0 0 0-46-46L9 233a32 32 0 0 0 0 46l96 96a32 32 0 0 0 46-46l-42-41h294l-42 41a32 32 0 0 0 46 46z"}
                />
            </svg>
        </div>
        {#if $filterOptions?.sortFilter}
            <div class="sortFilter">
                <svg
                    viewBox={`0 ${
                        selectedSortType === "asc" ? "-" : ""
                    }140 320 512`}
                    on:click={changeSortType}
                    on:keyup={(e) => e.key === "Enter" && changeSortType(e)}
                    tabindex={$menuVisible ||
                    $popupVisible ||
                    selectedSortElement
                        ? ""
                        : "0"}
                >
                    <path
                        d={// sortdown
                        selectedSortType === "asc"
                            ? "M183 41a32 32 0 0 0-46 0L9 169c-9 10-12 23-7 35s17 20 30 20h256a32 32 0 0 0 23-55L183 41z"
                            : // sort up
                              "M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z"}
                    />
                </svg>
                <h2
                    tabindex={$menuVisible ||
                    $popupVisible ||
                    selectedSortElement
                        ? ""
                        : "0"}
                    on:click={handleSortFilterPopup}
                    on:keyup={(e) =>
                        e.key === "Enter" && handleSortFilterPopup(e)}
                >
                    {selectedSortName || ""}
                </h2>
                <div
                    class={"options-wrap " +
                        (selectedSortElement ? "" : "display-none hide")}
                    style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                    on:touchend|passive={handleTouchSortFilterPopup}
                >
                    <div
                        class={"options-wrap-filter-info " +
                            (selectedSortElement ? "" : "hide")}
                    >
                        <div class="header">
                            <div class="filter-title">Sort By</div>
                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                            <svg
                                viewBox="0 0 24 24"
                                class="closing-x"
                                tabindex={!$menuVisible &&
                                !$popupVisible &&
                                selectedSortElement &&
                                windowWidth <= 425
                                    ? "0"
                                    : ""}
                                on:keyup={(e) =>
                                    e.key === "Enter" &&
                                    handleSortFilterPopup(e)}
                                on:click={handleSortFilterPopup}
                                ><path
                                    fill="#fff"
                                    d="m19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z"
                                /></svg
                            >
                        </div>
                        <div class="options">
                            {#each $filterOptions?.sortFilter?.[$selectedCustomFilter] || sortFilterContents as sortFilter (sortFilter?.sortName || {})}
                                <div
                                    class="option"
                                    on:click={changeSort(sortFilter?.sortName)}
                                    on:keyup={(e) =>
                                        e.key === "Enter" &&
                                        changeSort(sortFilter?.sortName)}
                                >
                                    <h3>{sortFilter?.sortName || ""}</h3>
                                    {#if selectedSortName === sortFilter?.sortName}
                                        <svg
                                            viewBox={`0 ${
                                                selectedSortType === "asc"
                                                    ? "-180"
                                                    : "100"
                                            } 320 512`}
                                        >
                                            <path
                                                d={// sortdown
                                                selectedSortType === "asc"
                                                    ? "M183 41a32 32 0 0 0-46 0L9 169c-9 10-12 23-7 35s17 20 30 20h256a32 32 0 0 0 23-55L183 41z"
                                                    : // sort up
                                                      "M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z"}
                                            />
                                        </svg>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
        {:else}
            <div class="sortFilter skeleton shimmer" />
        {/if}
    </div>

    <slot />
</main>

<style>
    ::placeholder {
        opacity: 1 !important;
        color: var(--fg-color) !important;
    }

    :-ms-input-placeholder,
    ::-ms-input-placeholder {
        color: var(--fg-color) !important;
    }

    main {
        --filters-space: ;
        --active-tag-filter-space: ;
        --custom-filter-settings-space: ;
        display: grid;
        grid-template-rows:
            42px var(--custom-filter-settings-space) var(--filters-space)
            var(--active-tag-filter-space) 44px 42px 45px auto;
        padding-top: 15px;
        transition: opacity 0.2s ease-out;
    }

    .skeleton {
        border-radius: 6px !important;
        background-color: hsla(0, 0%, 10%, 0.5) !important;
    }
    .options-wrap {
        box-shadow:
            0 14px 28px rgba(0, 0, 0, 0.25),
            0 10px 10px rgba(0, 0, 0, 0.2) !important;
    }
    .custom-filter-wrap {
        --editcancel-icon: ;
        --save-icon: ;
        display: grid;
        grid-template-columns: auto var(--save-icon) var(--editcancel-icon) 25px;
        align-items: center;
        column-gap: 20px;
        padding: 8px 15px 8px 0px;
        background-color: var(--bg-color);
        border: 1px solid var(--bd-color);
        border-radius: 6px;
        width: 100%;
        height: max-content;
        position: relative;
    }
    .custom-filter-wrap .options-wrap {
        position: absolute;
        left: 0;
        top: 42.5px;
        background-color: var(--bg-color);
        border: 1px solid var(--bd-color);
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        max-height: var(--maxFilterSelectionHeight);
        margin-top: 1px;
        border-radius: 6px;
        padding: 6px;
        z-index: 1;
        cursor: default;
        width: 100%;
    }
    .custom-filter-wrap .options {
        display: flex;
        align-items: start;
        flex-direction: column;
        cursor: default;
        gap: 5px;
        width: 100%;
    }
    .custom-filter-wrap .option {
        color: var(--fg-color);
        display: grid;
        align-items: center;
        padding: 5px;
        width: 100%;
        grid-template-columns: auto 12px;
        grid-column-gap: 8px;
        cursor: pointer;
        user-select: none;
        border-radius: 6px;
    }
    .custom-filter-wrap .option h3 {
        cursor: pointer;
        text-transform: capitalize;
    }
    .input-search-wrap {
        display: grid;
        grid-template-columns: 1fr;
        align-items: center;
        column-gap: 20px;
        padding: 8px 15px;
        background-color: var(--bg-color);
        border: 1px solid var(--bd-color);
        border-radius: 6px;
        width: 100%;
        height: 40px;
        position: relative;
    }
    .custom-filter-selection {
        --edit-icon-width: 0px;
        background-color: var(--bg-color);
        color: var(--fg-color);
        position: absolute;
        opacity: 0;
        width: calc(100% - var(--edit-icon-width) - 35px);
        height: 100%;
    }
    .input-search,
    .custom-filter {
        outline: none;
        border: none;
        background-color: transparent;
        color: var(--fg-color);
        width: 100%;
        cursor: text;
    }
    .custom-filter {
        padding-left: 15px;
    }
    .add-custom-category,
    .remove-custom-category {
        width: 30px;
        height: 30px;
        display: grid;
        justify-content: center;
        align-items: center;
    }
    .filterType-wrap-icon {
        height: 20px;
        width: 20px;
        cursor: pointer;
    }
    .filterType-dropdown {
        display: grid;
        grid-template-columns: auto 15px;
        gap: 2px;
        align-items: center;
    }
    .filterType-dropdown > svg {
        width: 15px;
        height: 15px;
    }
    .filterType .options-wrap {
        position: absolute;
        left: 0;
        top: 27.5px;
        background-color: var(--bg-color);
        border: 1px solid var(--bd-color);
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        max-height: var(--maxFilterSelectionHeight);
        margin-top: 1px;
        border-radius: 6px;
        padding: 6px;
        z-index: 1;
        cursor: default;
    }
    .filterType .options {
        display: flex;
        align-items: start;
        flex-direction: column;
        cursor: default;
        gap: 5px;
        width: max-content;
    }
    .filterType .option {
        color: var(--fg-color);
        display: grid;
        align-items: center;
        padding: 5px;
        width: 100%;
        grid-template-columns: auto 12px;
        grid-column-gap: 8px;
        cursor: pointer;
        user-select: none;
        border-radius: 6px;
    }
    .filterType .option h3 {
        cursor: pointer;
        text-transform: capitalize;
    }

    .custom-filter-icon-wrap {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .showFilterOptions {
        height: 25px;
        width: 25px;
        cursor: pointer;
    }

    .cancel-custom-category-name {
        height: 24px;
        width: 24px;
        stroke: white;
        stroke-width: 1px;
        cursor: pointer;
    }
    .edit-custom-category-name,
    .save-custom-category-name {
        height: 20px;
        width: 20px;
        cursor: pointer;
    }

    .custom-filter-settings-wrap {
        --add-icon-size: ;
        --remove-icon-size: ;
        display: grid;
        grid-template-columns: 1fr var(--remove-icon-size) var(--add-icon-size);
        justify-content: space-between;
        align-items: center;
        width: 100%;
        column-gap: 15px;
        height: max-content;
        min-height: 30px;
        margin-top: 10px;
        padding: 0px 2px;
        position: relative;
    }

    .custom-filter-settings-wrap .skeleton {
        height: 18px;
        width: 100px;
    }

    .filterType {
        overflow-x: auto;
        overflow-y: hidden;
        width: fit-content;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .filterType::-webkit-scrollbar {
        display: none;
    }

    .filterType h2 {
        white-space: nowrap;
        user-select: none;
    }

    .home-status {
        display: grid;
        grid-template-columns: 1fr;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        column-gap: 10px;
        height: 20px;
        margin-top: 10px;
    }

    .home-status .skeleton {
        height: 18px;
        width: 100px;
    }

    .home-status span {
        margin: 0 10px;
        overflow-x: auto;
        overflow-y: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .home-status span::-webkit-scrollbar {
        display: none;
    }

    .home-status span h2 {
        white-space: nowrap;
        user-select: none;
    }

    .data-status h2 {
        margin: auto;
    }

    .data-status h2.loading {
        animation: loadingBlink 1s ease-in-out infinite;
    }

    .filters {
        overflow-x: auto;
        overflow-y: hidden;
        display: flex;
        gap: 10px;
        flex-wrap: nowrap;
        padding-bottom: var(--maxPaddingHeight);
        margin-top: 20px;
        user-select: none;
        -ms-overflow-style: none;
        scrollbar-width: none;
        justify-content: start;
    }
    .filters::-webkit-scrollbar {
        display: none;
    }

    .filter-select {
        position: relative;
    }

    .filter-select,
    .filter-input-number {
        display: grid;
        grid-template-rows: 18px 30px;
        grid-row-gap: 5px;
        width: 165px;
        min-width: 165px;
    }

    .filter-input-number .value-input-number {
        text-align: center;
        background: transparent;
        color: var(--fg-color);
        border: none;
        outline: none;
        width: 100%;
        cursor: text;
    }
    .filter-select .filter-name,
    .filter-input-number .filter-input-number-name {
        font-size: 15px;
        font-weight: 600;
        text-transform: capitalize;
        user-select: none;
    }
    .filter-select .select {
        align-items: center;
        background: var(--bg-color);
        border: 1px solid transparent;
        border-radius: 6px;
        display: grid;
        grid-template-columns: auto 24px;
        height: 36px;
        padding: 10px 5px;
        justify-content: space-between;
    }
    .filter-select .select:not(.skeleton) {
        border: 1px solid var(--bd-color);
    }
    .filter-select .angle-down,
    .filter-select .angle-up {
        height: 14px;
        width: 14px;
        margin: auto;
        cursor: pointer;
    }
    .filter-select .value-wrap {
        width: max-content;
        max-width: 115px;
        margin-left: 10px;
        display: grid;
        align-items: center;
    }
    .filter-select .value-input {
        background: transparent;
        color: var(--fg-color);
        border: none;
        outline: none;
        width: 100%;
        min-width: 40px;
        cursor: text;
    }

    .filter-select .options-wrap {
        position: absolute;
        top: 61px;
        background-color: var(--bg-color);
        border: 1px solid var(--bd-color);
        width: 165px;
        overflow-y: auto;
        overscroll-behavior: contain;
        max-height: var(--maxFilterSelectionHeight);
        margin-top: 1px;
        border-radius: 6px;
        padding: 6px;
        z-index: 1;
    }
    .options-wrap {
        overflow-y: overlay !important;
        scrollbar-gutter: stable !important;
    }
    .options-wrap::-webkit-scrollbar {
        width: 16px;
    }
    .options-wrap::-webkit-scrollbar-track {
        background-color: transparent;
    }
    .options-wrap::-webkit-scrollbar-thumb {
        height: 72px;
        border-radius: 8px;
        border: 5px solid transparent;
        background-clip: content-box;
        background-color: transparent;
    }
    .options-wrap:hover::-webkit-scrollbar-thumb,
    .options-wrap:active::-webkit-scrollbar-thumb,
    .options-wrap:focus::-webkit-scrollbar-thumb {
        background-color: hsl(0, 0%, 50%);
    }

    .options {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .options::-webkit-scrollbar {
        display: none;
    }
    .highlight {
        background-color: var(--ol-color);
        color: hsl(var(--ac-color)) !important;
    }

    .filter-select .options {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .filter-select .option {
        color: var(--fg-color);
        display: grid;
        align-items: center;
        padding: 5px;
        width: 100%;
        grid-template-columns: auto 14px;
        grid-column-gap: 8px;
        cursor: pointer;
        user-select: none;
        border-radius: 6px;
    }

    .extra-item-info {
        fill: #fff !important;
        margin-left: auto !important;
        width: 100% !important;
    }

    .filter-select .option:has(.extra-item-info):has(.item-info) {
        grid-template-columns: auto 14px 14px;
    }

    .filter-select .option h3 {
        cursor: pointer !important;
        text-transform: capitalize;
    }

    .filter-select .option svg {
        fill: var(--optionColor);
        height: 14px;
        width: 14px;
    }
    .filter-checkbox {
        display: grid;
        grid-template-rows: 18px 30px;
        grid-row-gap: 5px;
        width: 165px;
    }
    .filter-checkbox .checkbox-wrap {
        min-width: 165px;
        width: 165px;
        cursor: pointer;
    }
    .filter-checkbox .checkbox-wrap,
    .filter-input-number .value-input-number-wrap {
        background: var(--bg-color);
        border: 1px solid var(--bd-color);
        border-radius: 6px;
        display: flex;
        column-gap: 8px;
        height: 36px;
        padding: 10px 10px;
        align-items: center;
    }
    .filter-checkbox .checkbox {
        width: 14px;
        height: 14px;
        border-radius: 6px;
        accent-color: hsl(185, 65%, 40%);
        cursor: pointer;
    }
    .filter-checkbox .checkbox-label {
        font-weight: 600;
        text-transform: capitalize;
        -webkit-user-select: none;
        -ms-user-select: none;
        user-select: none;
        font-size: 14px;
        cursor: pointer;
    }

    @media (pointer: fine) and (hover: hover) {
        .option:hover h3 {
            color: hsl(var(--ac-color)) !important;
        }
    }

    .activeFilters {
        display: grid;
        align-items: start;
        justify-content: space-between;
        gap: 15px;
        min-height: 28px;
        width: 100%;
        grid-template-columns: 1fr;
        margin-top: 20px;
    }
    .activeFilters.seenMore {
        grid-template-columns: calc(100% - 43px) 28px;
    }

    .activeFilters .empty-tagFilter {
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 6px;
        cursor: pointer;
        width: 30px;
        height: 30px;
    }

    .empty-tagFilter svg {
        width: 20px;
        height: 20px;
    }

    .tagFilters {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        max-height: 200px;
        gap: 15px;
        user-select: none;
        overflow-y: auto;
        scroll-snap-type: y mandatory;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .tagFilters::-webkit-scrollbar {
        display: none;
    }

    .tagFilters > * {
        scroll-snap-align: start;
    }

    .tagFilters.skeleton {
        height: 28px;
        width: 90px;
    }

    .tagFilters:after {
        content: "";
        flex: 1000 0 auto;
    }

    .activeFilters .activeTagFilter {
        animation: fadeIn 0.2s ease-out;
        background-color: var(--bg-color);
        color: var(--activeTagFilterColor);
        border: 1px solid var(--activeTagFilterColor);
        padding: 0 10px;
        display: grid;
        grid-template-columns: calc(100% - 20px) 20px;
        flex: 1;
        justify-content: space-between;
        align-items: center;
        column-gap: 6px;
        border-radius: 6px;
        cursor: pointer;
        height: 30px;
        max-width: 100%;
    }
    .activeFilter {
        height: 100%;
        display: grid;
        align-items: center;
        white-space: nowrap;
        overflow-x: auto;
        width: max-content;
        max-width: 100%;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .activeFilter::-webkit-scrollbar {
        display: none;
    }
    .activeFilter > h3 {
        line-height: 1px;
        min-width: max-content;
        text-transform: capitalize;
        cursor: pointer;
    }
    .activeTagFilter svg {
        width: 20px;
        height: 20px;
        fill: var(--activeTagFilterColor) !important;
    }

    .changeGridView {
        display: flex;
        justify-content: center;
        align-items: center;
        background: var(--bg-color);
        border-radius: 6px;
        cursor: pointer;
        width: 30px;
        height: 30px;
    }
    .changeGridView svg {
        height: 15px;
        width: 15px;
    }

    .showHideActiveFilters {
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 6px;
        cursor: pointer;
        width: 30px;
        height: 30px;
    }

    .showHideActiveFilters svg {
        height: 25px;
        width: 25px;
    }

    .last-filter-option {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        min-height: 30px;
        margin-top: 12px;
    }

    .sortFilter {
        display: flex;
        justify-content: end;
        align-items: center;
        gap: 4px;
        margin-left: auto;
        position: relative;
    }
    .sortFilter.skeleton {
        min-height: 17px;
        min-width: 109px;
    }
    .sortFilter > h2 {
        text-align: end;
    }
    .sortFilter h2,
    .sortFilter h3,
    .sortFilter svg {
        user-select: none;
        cursor: pointer;
        text-transform: capitalize;
    }

    .sortFilter svg {
        height: 15px;
        width: 15px;
    }

    .sortFilter .options-wrap {
        position: absolute;
        display: flex;
        right: 0;
        top: 20px;
        background-color: var(--bg-color);
        border: 1px solid var(--bd-color);
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        max-height: var(--maxFilterSelectionHeight);
        margin-top: 1px;
        border-radius: 6px;
        padding: 6px;
        z-index: 1;
        cursor: default;
    }
    .sortFilter .options {
        display: flex;
        align-items: start;
        flex-direction: column;
        cursor: default;
        gap: 5px;
        width: max-content;
    }
    .sortFilter .option {
        color: var(--fg-color);
        display: grid;
        align-items: center;
        padding: 5px;
        width: 100%;
        grid-template-columns: auto 15px;
        grid-column-gap: 8px;
        cursor: pointer;
        user-select: none;
        border-radius: 6px;
    }

    .options .option:last-child {
        padding-bottom: 8px;
    }

    .sortFilter .options .option:last-child {
        padding-bottom: 15px;
    }

    .sortFilter .option svg {
        margin-left: auto;
        height: 15px;
        width: 15px;
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

    .options-wrap {
        overscroll-behavior: contain;
    }
    .options-wrap-filter-info .header {
        display: none;
    }
    .options-wrap-filter-info input {
        display: none;
    }

    .closing-x {
        width: 24px;
        height: 24px;
    }

    .filters {
        scroll-snap-type: x mandatory;
    }
    .filters.android {
        scroll-snap-type: none !important;
    }
    .filters > * {
        scroll-snap-align: start;
    }
    .filters.hasWheel {
        scroll-snap-type: none !important;
    }
    .filters.hasWheel > * {
        scroll-snap-align: none !important;
    }

    .close-filters {
        margin-top: 12px;
        display: flex;
        justify-content: center;
        align-items: center;
        background: var(--bg-color);
        border-top: 3px solid var(--bd-color);
        cursor: pointer;
        width: 100%;
        height: 30px;
    }

    .close-filters > svg {
        width: 20px;
        height: 20px;
    }

    input[type="search"]:not(:hover):not(:focus):not(:disabled):not(
            :placeholder-shown
        )::-webkit-search-cancel-button {
        opacity: 1 !important;
    }

    input[type="search"]::-webkit-textfield-decoration-container {
        gap: 1ch;
    }

    @supports (-webkit-appearance: none) and (appearance: none) {
        input[type="search"]::-webkit-search-cancel-button {
            -webkit-appearance: none;
            appearance: none;
            height: 15px;
            width: 15px;
            background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgaWQ9IjEyMzEyMyI+PHBhdGggZmlsbD0iI2ZmZiIgZD0ibTE5IDYtMS0xLTYgNi02LTYtMSAxIDYgNi02IDYgMSAxIDYtNiA2IDYgMS0xLTYtNloiLz48L3N2Zz4=);
            background-size: 15px;
        }
        #input-search[type="search"]::-webkit-search-cancel-button {
            -webkit-appearance: none;
            appearance: none;
            height: 20px;
            width: 20px;
            background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgaWQ9IjEyMzEyMyI+PHBhdGggZmlsbD0iI2ZmZiIgZD0ibTE5IDYtMS0xLTYgNi02LTYtMSAxIDYgNi02IDYgMSAxIDYtNiA2IDYgMS0xLTYtNloiLz48L3N2Zz4=);
            background-size: 20px;
        }
    }

    @media screen and (hover: hover) and (pointer: fine) {
        .filters {
            scroll-snap-type: none !important;
        }
    }

    @media screen and (max-height: 445px) {
        .options-wrap-filter-info {
            top: max(25vh, 57px) !important;
        }
    }

    @media screen and (max-width: 425px) {
        .filters {
            padding-bottom: 0;
        }
        .filter-select .select {
            cursor: pointer !important;
        }
        .filter-select .value-input[disabled] {
            pointer-events: none;
        }
        .filterType .options-wrap,
        .filter-select .options-wrap,
        .sortFilter .options-wrap,
        .custom-filter-wrap .options-wrap {
            position: fixed !important;
            display: flex;
            flex-direction: column !important;
            z-index: 996 !important;
            left: -10px !important;
            top: 0px;
            width: calc(100% + 20px) !important;
            height: 100% !important;
            background-color: var(--ol-color) !important;
            justify-content: center !important;
            align-items: center !important;
            overflow-y: auto !important;
            overscroll-behavior: contain !important;
            max-height: initial !important;
            margin: 0 !important;
            border-radius: 0 !important;
            padding: 0 !important;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
            -ms-transform: translateZ(0);
            -moz-transform: translateZ(0);
            -o-transform: translateZ(0);
        }
        .options-wrap {
            opacity: 1;
            transition: opacity 0.2s ease-out;
            animation: fadeIn 0.2s ease-out;
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        .options-wrap.hide {
            opacity: 0;
        }
        .options-wrap::-webkit-scrollbar {
            display: none;
        }
        .options-wrap-filter-info {
            display: flex;
            flex-direction: column;
            width: min(95%, 95vw);
            padding: 14px 0 0 0;
            gap: 14px;
            background-color: var(--bg-color);
            color: var(--fg-color) !important;
            border: 1px solid var(--bd-color);
            border-radius: 6px;
            top: 140px;
            max-height: 65vh !important;
            min-height: 107.1px !important;
            position: absolute;
            opacity: 1 !important;
            transition: opacity 0.2s ease-out !important;
            overflow: hidden !important;
        }
        #filters .options-wrap-filter-info {
            min-height: 170.7px !important;
        }
        .options-wrap-filter-info.hide {
            opacity: 0 !important;
        }
        .options-wrap-filter-info .header {
            display: grid;
            padding: 0 14px;
            grid-template-columns: auto 25px;
        }
        .options-wrap-filter-info .filter-title {
            display: initial;
            font-size: 18px;
            font-weight: bold;
            text-transform: capitalize;
            white-space: nowrap;
            overflow-x: auto;
            overflow-y: hidden;
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        .options-wrap-filter-info .filter-title::-webkit-scrollbar {
            display: none;
        }
        .options-wrap-filter-info input {
            display: initial;
            background: var(--bg-color) !important;
            border: 2px solid var(--bd-color) !important;
            padding: 14px 12px;
            border-radius: 6px;
            font-size: 16px;
            color: var(--fg-color);
            border: none;
            outline: none;
            cursor: text;
            margin: 0 14px;
        }

        .options-wrap .options {
            display: flex;
            flex-direction: column !important;
            border-top: 2px solid var(--bd-color) !important;
            width: 100% !important;
            height: calc(65vh - 112px);
            border-radius: 0px 0px 6px 6px !important;
            padding: 6px 11px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -ms-overflow-style: none;
            scrollbar-width: none;
            gap: 0 !important;
            min-height: 59px !important;
            overscroll-behavior: contain !important;
        }

        .filterType .options,
        .sortFilter .options,
        .custom-filter-wrap .options {
            height: unset !important;
            max-height: calc(65vh - 112px) !important;
        }

        .options-wrap .options::-webkit-scrollbar {
            display: none !important;
        }
        .options .option {
            padding: 14px 12px !important;
        }

        .option h3 {
            font-size: 16px !important;
        }
        .filter-select .option {
            grid-template-columns: auto 18px !important;
        }
        .filter-select .option:has(.extra-item-info) {
            grid-template-columns: auto 40px !important;
        }
        .filter-select .option:has(.extra-item-info):has(.item-info) {
            grid-template-columns: auto 18px 40px !important;
        }
        .option svg {
            height: 18px !important;
            width: 18px !important;
        }
        .closing-x {
            width: 24px !important;
            height: 24px !important;
        }
        .extra-item-info > path {
            translate: 25px !important;
        }
        .option .extra-item-info {
            fill: #fff !important;
            margin-left: auto !important;
            width: 50% !important;
        }

        @supports (-webkit-appearance: none) and (appearance: none) {
            .options-wrap input[type="search"]::-webkit-search-cancel-button {
                -webkit-appearance: none;
                appearance: none;
                height: 20px;
                width: 20px;
                background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgaWQ9IjEyMzEyMyI+PHBhdGggZmlsbD0iI2ZmZiIgZD0ibTE5IDYtMS0xLTYgNi02LTYtMSAxIDYgNi02IDYgMSAxIDYtNiA2IDYgMS0xLTYtNloiLz48L3N2Zz4=);
                background-size: 20px;
            }
        }
    }

    .display-none {
        display: none !important;
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
        opacity: 0 !important;
    }
</style>
