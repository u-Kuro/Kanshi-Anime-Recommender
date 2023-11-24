<script>
    import { onMount, tick } from "svelte";
    import { saveJSON } from "../../js/indexedDB.js";
    import {
        android,
        finalAnimeList,
        animeLoaderWorker,
        filterOptions,
        selectedCustomFilter,
        activeTagFilters,
        searchedAnimeKeyword,
        dataStatus,
        initData,
        confirmPromise,
        asyncAnimeReloaded,
        checkAnimeLoaderStatus,
        gridFullView,
        hasWheel,
        updateFilters,
        isImporting,
        hiddenEntries,
        extraInfo,
        loadingFilterOptions,
        customFilters,
        showFilterOptions,
        dropdownIsVisible,
        popupVisible,
    } from "../../js/globalValues.js";
    import { fade } from "svelte/transition";
    import {
        addClass,
        changeInputValue,
        dragScroll,
        removeClass,
        getLocalStorage,
        trimAllEmptyChar,
    } from "../../js/others/helper.js";
    import {
        animeLoader,
        getExtraInfo,
        processRecommendedAnimeList,
        saveIDBdata,
    } from "../../js/workerUtils.js";

    let Init = true;

    let windowWidth = Math.max(
        document?.documentElement?.getBoundingClientRect?.()?.width,
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
    let isUpdatingRec = false,
        isLoadingAnime = false;

    let scrollingToTop,
        activeTagFiltersArrays,
        selectedFilterSelectionIdx,
        selectedFilterSelectionName,
        selectedSortIdx,
        selectedSort,
        selectedSortName,
        selectedSortType;
    $: selectedFilterSelectionIdx = $filterOptions?.filterSelection?.findIndex(
        ({ isSelected }) => isSelected,
    );
    $: selectedFilterSelectionName =
        $filterOptions?.filterSelection?.[selectedFilterSelectionIdx]
            ?.filterSelectionName;
    $: activeTagFiltersArrays =
        $activeTagFilters?.[$selectedCustomFilter]?.[
            selectedFilterSelectionName
        ] || [];
    $: selectedSortIdx = $filterOptions?.sortFilter?.findIndex(
        ({ sortType }) => sortType !== "none",
    );
    $: selectedSort = $filterOptions?.sortFilter?.[selectedSortIdx];
    $: selectedSortName = selectedSort?.sortName;
    $: selectedSortType = selectedSort?.sortType;

    activeTagFilters.subscribe((val) => {
        $customFilters = Object.keys(val || {}).sort();
    });

    async function saveFilters(changeName) {
        if ($initData) return;
        if (nameChangeUpdateProcessedList.includes(changeName)) {
            isUpdatingRec = true;
            $dataStatus = "Updating List";
            _processRecommendedAnimeList();
        } else if (nameChangeUpdateFinalList.includes(changeName)) {
            isLoadingAnime = true;
            $dataStatus = "Updating List";
            _loadAnime();
        } else if (!isLoadingAnime && !isUpdatingRec && !$isImporting) {
            await saveJSON($filterOptions, "filterOptions");
            await saveJSON($activeTagFilters, "activeTagFilters");
        }
    }

    function _loadAnime() {
        if ($animeLoaderWorker) {
            $animeLoaderWorker.terminate();
            $animeLoaderWorker = null;
        }
        animeLoader({
            filterOptions: $filterOptions,
            activeTagFilters: $activeTagFilters,
            selectedCustomFilter: $selectedCustomFilter,
        })
            .then(async (data) => {
                isUpdatingRec = isLoadingAnime = false;
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

    async function _processRecommendedAnimeList() {
        await saveJSON(true, "shouldProcessRecommendation");
        processRecommendedAnimeList({
            filterOptions: $filterOptions,
            activeTagFilters: $activeTagFilters,
            selectedCustomFilter: $selectedCustomFilter,
        })
            .then(async () => {
                await saveJSON(false, "shouldProcessRecommendation");
                updateFilters.update((e) => !e);
                _loadAnime();
            })
            .catch((error) => {
                _loadAnime();
                throw error;
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
            window.innerWidth,
        );
    }
    async function handleFilterTypes(event, newFilterTypeName) {
        if ($initData) return pleaseWaitAlert();
        event?.stopPropagation?.();
        let idxTypeSelected = selectedFilterSelectionIdx;
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                .filterSelectionName;
        if (nameTypeSelected !== newFilterTypeName) {
            // Close Filter Dropdown
            selectedSortElement = false;
            // Reload Anime for Async Animation
            if ($finalAnimeList?.length > 36 && !$gridFullView) {
                await callAsyncAnimeReload();
            }
            // Close Filter Selection Dropdown
            $filterOptions?.filterSelection?.[
                idxTypeSelected
            ].filters.Dropdown.forEach((e) => {
                e.selected = false;
            });
            $filterOptions.filterSelection[idxTypeSelected] =
                $filterOptions?.filterSelection?.[idxTypeSelected];
            selectedFilterElement = null;
            // Change Filter Type
            $filterOptions.filterSelection[idxTypeSelected].isSelected = false;
            let newIdxFilterTypeSelected =
                $filterOptions?.filterSelection?.findIndex(
                    ({ filterSelectionName }) =>
                        filterSelectionName === newFilterTypeName,
                );
            $filterOptions.filterSelection[
                newIdxFilterTypeSelected
            ].isSelected = true;
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
        if ($initData || ($filterOptions?.filterSelection?.length ?? 0) < 1) {
            return pleaseWaitAlert();
        }
        let element = event.target;
        let classList = element.classList;
        let filterTypEl = element.closest(".filterType");
        let optionsWrap = element.closest(".options-wrap");
        if (
            (classList.contains("filterType") || filterTypEl) &&
            !selectedFilterTypeElement &&
            !classList.contains("closing-x")
        ) {
            selectedFilterTypeElement = true;
        } else if (
            (!optionsWrap || classList.contains("closing-x")) &&
            !classList.contains("options-wrap")
        ) {
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
        let filSelectEl = element.closest(".filter-select");
        if (filSelectEl === selectedFilterElement) return;
        let idxTypeSelected = selectedFilterSelectionIdx;
        if (selectedFilterElement instanceof Element) {
            let filterSelectChildrenArray = Array.from(
                selectedFilterElement.parentElement.children,
            ).filter((el) => {
                return !el.classList.contains("disable-interaction");
            });
            let selectedIndex = filterSelectChildrenArray.indexOf(
                selectedFilterElement,
            );
            if (
                $filterOptions.filterSelection[idxTypeSelected].filters
                    .Dropdown[selectedIndex]
            ) {
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown[selectedIndex].selected = false;
            }
        }
        if (Init) Init = false;
        if (
            highlightedEl instanceof Element &&
            highlightedEl.closest(".filter-select")
        ) {
            removeClass(highlightedEl, "highlight");
            highlightedEl = null;
        }
        $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
            dropdownIdx
        ].selected = true;
        selectedFilterElement = filSelectEl;
    }
    function closeFilterSelect(dropDownIdx) {
        let idxTypeSelected = selectedFilterSelectionIdx;
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
    async function clickOutsideListener(event) {
        if ($filterOptions?.filterSelection?.length < 1 || !$filterOptions)
            return;
        let element = event.target;
        let classList = element.classList;
        if (
            classList.contains("options-wrap") &&
            getComputedStyle(element).position === "fixed"
        ) {
            // Small Screen Width
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
            ].filters.Dropdown.forEach((e) => {
                e.selected = false;
            });
            $filterOptions.filterSelection[idxTypeSelected] =
                $filterOptions?.filterSelection?.[idxTypeSelected];
            selectedFilterElement = null;
        } else if (
            !classList.contains("options-wrap") &&
            !element.closest(".options-wrap")
        ) {
            // Large Screen Width
            // Custom Filter Dropdown
            let customFilterEl = element.closest(".custom-filter-wrap");
            // let customFilterFloatingIcon = element.closest(
            //     ".custom-filter-floating-icon"
            // );
            if (
                !classList.contains("custom-filter-wrap") &&
                !customFilterEl
                // &&!classList.contains("custom-filter-floating-icon") &&
                // !customFilterFloatingIcon
            ) {
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
            let filterTypeEl = element.closest(".filterType");
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
            let sortSelectEl = element.closest(".sortFilter");
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
            let inputDropdownSelectEl = element.closest(".select");
            let inputDropdownAngleDown = element.closest(".angle-down");
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
                ].filters.Dropdown.forEach((e) => {
                    e.selected = false;
                });
                $filterOptions.filterSelection[idxTypeSelected] =
                    $filterOptions?.filterSelection?.[idxTypeSelected];
                selectedFilterElement = null;
            }
        }
    }
    function handleFilterSelectOptionChange(
        optionName,
        optionType,
        optionIdx,
        dropdownIdx,
        changeType,
        filterSelectionName,
    ) {
        if ($initData) return pleaseWaitAlert();
        let idxTypeSelected = selectedFilterSelectionIdx;
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                .filterSelectionName;
        let currentValue =
            $filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown[
                dropdownIdx
            ].options[optionIdx].selected;
        if (currentValue === "none" || currentValue === true) {
            // true is default value of selections
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                dropdownIdx
            ].options[optionIdx].selected = "included";
            let hasActiveFilter = false;
            $activeTagFilters[$selectedCustomFilter][nameTypeSelected] =
                $activeTagFilters?.[$selectedCustomFilter]?.[
                    nameTypeSelected
                ].map((e) => {
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
                ].unshift({
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
        } else if (currentValue === "included" && changeType === "write") {
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
        } else {
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
        let classList = element.classList;
        let keyCode = event.which || event.keyCode || 0;
        if (
            (classList.contains("checkbox") && event.type === "click") ||
            (classList.contains("checkbox") &&
                keyCode !== 13 &&
                event.type === "keydown") ||
            (filterIsScrolling && event.pointerType === "mouse")
        ) {
            return;
        }
        if ($initData) {
            if (!classList.contains("checkbox")) {
                pleaseWaitAlert();
            }
            return;
        }
        // Prevent Default
        let idxTypeSelected = selectedFilterSelectionIdx;
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                .filterSelectionName;
        let isChecked =
            $filterOptions?.filterSelection?.[idxTypeSelected].filters.Checkbox[
                checkboxIdx
            ].isSelected;
        if (isChecked) {
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
        } else {
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
                ].unshift({
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
        if ($initData) return pleaseWaitAlert();
        let idxTypeSelected = selectedFilterSelectionIdx;
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                .filterSelectionName;
        let currentValue =
            $filterOptions?.filterSelection?.[idxTypeSelected].filters[
                "Input Number"
            ][inputNumIdx].numberValue;
        if (
            conditionalInputNumberList.includes(inputNumberName) &&
            /^(>=|<=|<|>).*($)/.test(newValue) // Check if it starts or ends with comparison operators
        ) {
            let newSplitValue = newValue.split(/(<=|>=|<|>)/).filter((e) => e); // Remove White Space
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
                        !newCMPNumber)
                ) {
                    let shouldReload = false;
                    if (!newCMPNumber) {
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
                    } else {
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
        } else {
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
        if ($initData) return pleaseWaitAlert();
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
                .filterSelectionName;
        if (filterType === "input number") {
            let elementIdx = $activeTagFilters?.[$selectedCustomFilter]?.[
                nameTypeSelected
            ].findIndex(
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
                    ][elementIdx].selected;
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
            ].findIndex(
                (e) =>
                    e.optionIdx === optionIdx &&
                    e.optionName === optionName &&
                    e.filterType === filterType,
            );
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
                $filterOptions?.filterSelection?.[idxTypeSelected].filters
                    .Dropdown[categIdx].options[optionIdx].selected;
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
            } else {
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
        if ($initData) return pleaseWaitAlert();
        let idxTypeSelected = selectedFilterSelectionIdx;
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                .filterSelectionName;
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
        if ($initData) return pleaseWaitAlert();
        let idxTypeSelected = selectedFilterSelectionIdx;
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                .filterSelectionName;
        let hasActiveFilter =
            $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected]
                ?.length;
        if (
            hasActiveFilter &&
            (await $confirmPromise("Do you want to remove all filters?"))
        ) {
            // Remove Active Number Input
            $filterOptions?.filterSelection?.[idxTypeSelected].filters[
                "Input Number"
            ].forEach((e) => {
                e.numberValue = "";
            });
            // Remove Checkbox
            $filterOptions?.filterSelection?.[
                idxTypeSelected
            ].filters.Checkbox.forEach((e) => {
                e.isSelected = false;
            });
            // Remove Dropdown
            $filterOptions?.filterSelection?.[
                idxTypeSelected
            ].filters.Dropdown.forEach(({ options }, dropdownIdx) => {
                options.forEach(({ selected }, optionsIdx) => {
                    selected = "none";
                    $filterOptions.filterSelection[
                        idxTypeSelected
                    ].filters.Dropdown[dropdownIdx].options[
                        optionsIdx
                    ].selected = selected;
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
            selectedSortElement = true;
        } else if (
            (!optionsWrap || classList.contains("closing-x")) &&
            !classList.contains("options-wrap")
        ) {
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
    function changeSort(newSortName) {
        if ($initData) return pleaseWaitAlert();
        let idxSortSelected = selectedSortIdx;
        let selectedSortFilter = $filterOptions?.sortFilter?.[idxSortSelected];
        let sortName = selectedSortFilter?.sortName;
        let sortType = selectedSortFilter?.sortType;
        if (sortName === newSortName) {
            let newSortType = sortType === "desc" ? "asc" : "desc";
            $filterOptions.sortFilter[idxSortSelected].sortType = newSortType;
        } else if (sortName !== newSortName) {
            $filterOptions.sortFilter[idxSortSelected].sortType = "none";
            let idxNewSortSelected = $filterOptions?.sortFilter?.findIndex(
                ({ sortName }) => sortName === newSortName,
            );
            $filterOptions.sortFilter[idxNewSortSelected].sortType = "desc";
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
        if ($initData) return pleaseWaitAlert();
        let idxSortSelected = selectedSortIdx;
        let sortType = $filterOptions?.sortFilter?.[idxSortSelected]?.sortType;
        if (sortType === "desc") {
            $filterOptions.sortFilter[idxSortSelected].sortType = "asc";
        } else {
            $filterOptions.sortFilter[idxSortSelected].sortType = "desc";
        }
        saveFilters("sort");
    }
    function handleDropdownKeyDown(event) {
        let keyCode = event.which || event.keyCode || 0;
        // 38up 40down 13enter
        if (keyCode == 38 || keyCode == 40) {
            var element = Array.from(
                document.getElementsByClassName("options-wrap") || [],
            ).find((el) => {
                return !el.classList.contains("disable-interaction");
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
                    let options = Array.from(
                        parent.querySelectorAll(".option"),
                    );
                    let currentidx = options.indexOf(highlightedEl);
                    let nextEl, iteratedEl, firstEl, lastEl;
                    for (let idx = 0; idx < options.length; idx++) {
                        if (
                            !options[idx].classList.contains(
                                "disable-interaction",
                            )
                        ) {
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
                        ".option:not(.disable-interaction)",
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
                let keydownEvent = new KeyboardEvent("keydown", {
                    key: "Enter",
                });
                highlightedEl.dispatchEvent(keydownEvent);
            }
        } else {
            var element = Array.from(
                document.getElementsByClassName("options-wrap") || [],
            ).find((el) => !el.classList.contains("disable-interaction"));
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
        saveIDBdata($gridFullView, "gridFullView");
    }

    async function handleShowFilterOptions(event, val = null) {
        selectedCustomFilterElement = false;
        if ($finalAnimeList?.length > 36 && !$gridFullView) {
            await callAsyncAnimeReload();
        }
        customFilterName = $selectedCustomFilter;
        editCustomFilterName = false;
        if (typeof val === "boolean") {
            $showFilterOptions = val;
        } else {
            $showFilterOptions = !$showFilterOptions;
        }
    }

    let asyncAnimeReloadPromise;
    function callAsyncAnimeReload() {
        return new Promise((resolve) => {
            if ($animeLoaderWorker instanceof Worker) {
                $checkAnimeLoaderStatus()
                    .then(() => {
                        $finalAnimeList = null;
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
            asyncAnimeReloadPromise = { resolve };
        });
    }
    asyncAnimeReloaded.subscribe((val) => {
        if (typeof val !== "boolean") return;
        asyncAnimeReloadPromise?.resolve?.();
    });
    function hasPartialMatch(strings, searchString) {
        if (typeof strings === "string" && typeof searchString === "string") {
            return strings
                .toLowerCase()
                .includes(searchString.trim().toLowerCase());
        }
    }

    $: customFilterName = $selectedCustomFilter;
    let previousCustomFilterName;
    $: {
        if ($selectedCustomFilter) {
            if (previousCustomFilterName !== $selectedCustomFilter) {
                $loadingFilterOptions = true;
            }
            if (previousCustomFilterName) {
                let array1 =
                    $activeTagFilters?.[previousCustomFilterName]?.[
                        "Algorithm Filter"
                    ] || [];
                let array2 =
                    $activeTagFilters?.[$selectedCustomFilter]?.[
                        "Algorithm Filter"
                    ] || [];
                if (arraysAreEqual(array1, array2)) {
                    _loadAnime();
                } else {
                    _processRecommendedAnimeList();
                }
            } else {
                _processRecommendedAnimeList();
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
        if ($initData) return pleaseWaitAlert();
        let option = element.closest(".option");
        if (option || classList.contains("option")) return;
        let sortSelectEl = element.closest(".custom-filter-wrap");
        let optionsWrap = element.closest(".options-wrap");
        // let customFilterFloatingIcon = element.closest(
        //     ".custom-filter-floating-icon"
        // );
        if (
            (classList.contains("custom-filter-wrap") || sortSelectEl) &&
            !selectedCustomFilterElement &&
            !classList.contains("closing-x")
            // || classList.contains("custom-filter-floating-icon") ||
            // customFilterFloatingIcon
        ) {
            selectedCustomFilterElement = true;
        } else if (
            (!optionsWrap || classList.contains("closing-x")) &&
            !classList.contains("options-wrap")
        ) {
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
        if ($initData) {
            return pleaseWaitAlert();
        }
        event?.stopPropagation?.();
        if (
            (!$showFilterOptions || !isFullViewed) &&
            document.documentElement.scrollTop > 48
        ) {
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
        $selectedCustomFilter = selectedCustomFilterName;
        selectedCustomFilterElement = false;
    }
    async function saveCustomFilterName(event) {
        if (customFilterName && $selectedCustomFilter !== customFilterName) {
            let customFilterNameToShow = `<span style="color:#00cbf9;">${customFilterName}</span>`;
            if (
                await $confirmPromise({
                    title: "Save custom filter",
                    text: `Do you want to change the custom filter name to ${customFilterNameToShow}?`,
                })
            ) {
                if (
                    customFilterName &&
                    $selectedCustomFilter !== customFilterName
                ) {
                    editCustomFilterName = false;
                    previousCustomFilterName = $selectedCustomFilter;
                    let savedCustomFilterName =
                        customFilterName ||
                        "Custom Filter " + new Date().getTime();
                    $activeTagFilters[savedCustomFilterName] = JSON.parse(
                        JSON.stringify(
                            $activeTagFilters?.[previousCustomFilterName],
                        ),
                    );
                    delete $activeTagFilters?.[previousCustomFilterName];
                    $selectedCustomFilter = savedCustomFilterName;
                    $activeTagFilters = $activeTagFilters;
                    await saveJSON($activeTagFilters, "activeTagFilters");
                    await saveJSON(
                        $selectedCustomFilter,
                        "selectedCustomFilter",
                    );
                }
            }
        }
    }
    async function addCustomFilter() {
        if (
            customFilterName &&
            $activeTagFilters &&
            !$activeTagFilters?.[customFilterName]
        ) {
            let customFilterNameToShow = `<span style="color:#00cbf9;">${customFilterName}</span>`;
            if (
                await $confirmPromise({
                    title: "Add custom filter",
                    text: `Do you want to add the custom filter named ${customFilterNameToShow}?`,
                })
            ) {
                if (
                    customFilterName &&
                    $activeTagFilters &&
                    !$activeTagFilters?.[customFilterName]
                ) {
                    editCustomFilterName = false;
                    let previousCustomFilterName = $selectedCustomFilter;
                    let addedCustomFilterName =
                        customFilterName ||
                        "Custom Filter " + new Date().getTime();
                    $activeTagFilters[addedCustomFilterName] = JSON.parse(
                        JSON.stringify(
                            $activeTagFilters?.[previousCustomFilterName],
                        ),
                    );
                    $selectedCustomFilter = addedCustomFilterName;
                    $activeTagFilters = $activeTagFilters;
                    await saveJSON($activeTagFilters, "activeTagFilters");
                    await saveJSON(
                        $selectedCustomFilter,
                        "selectedCustomFilter",
                    );
                }
            }
        }
    }

    async function removeCustomFilter() {
        if (
            $selectedCustomFilter &&
            $activeTagFilters &&
            $activeTagFilters?.[$selectedCustomFilter] &&
            Object.keys($activeTagFilters || {}).length > 1
        ) {
            let customFilterNameToShow = `<span style="color:#00cbf9;">${$selectedCustomFilter}</span>`;
            if (
                await $confirmPromise({
                    title: "Delete custom filter",
                    text: `Do you want to delete the custom filter named ${customFilterNameToShow}?`,
                })
            ) {
                if (
                    $selectedCustomFilter &&
                    $activeTagFilters &&
                    $activeTagFilters?.[$selectedCustomFilter] &&
                    Object.keys($activeTagFilters || {}).length > 1
                ) {
                    $loadingFilterOptions = true;
                    editCustomFilterName = false;
                    let newCustomFilterName;
                    for (let key in $activeTagFilters) {
                        if (key !== $selectedCustomFilter) {
                            newCustomFilterName = key;
                            break;
                        }
                    }
                    delete $activeTagFilters?.[$selectedCustomFilter];
                    $activeTagFilters = $activeTagFilters;
                    $selectedCustomFilter = newCustomFilterName;
                }
            }
        } else {
            $confirmPromise({
                isAlert: true,
                title: "Action failed",
                text: "Requires atleast one custom filter.",
            });
        }
    }

    let editCustomFilterName = false;
    $: {
        $dropdownIsVisible =
            (selectedCustomFilterElement ||
                selectedFilterElement ||
                selectedFilterTypeElement ||
                selectedSortElement) &&
            Math.max(
                document?.documentElement?.getBoundingClientRect?.()?.width,
                window.innerWidth,
            ) <= 425;
    }

    dropdownIsVisible.subscribe((val) => {
        if (val === false) {
            // Small Screen Width
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
    });

    onMount(() => {
        // Init
        let filterEl = document.getElementById("filters");
        filterEl.addEventListener("scroll", handleFilterScroll, {
            passive: true,
        });
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
    $: isFullViewed = $gridFullView ?? getLocalStorage("gridFullView") ?? true;
    let homeStatusClick = 0;
    let showExtraInfo;
</script>

<main
    id="main-home"
    style:--filters-space={$showFilterOptions ? "80px" : ""}
    style:--active-tag-filter-space={!$loadingFilterOptions &&
    $showFilterOptions
        ? "auto"
        : ""}
    style:--custom-filter-settings-space={$showFilterOptions ? "30px" : ""}
>
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div
        id="custom-filter-wrap"
        class="custom-filter-wrap"
        tabindex={selectedCustomFilterElement ? "" : "0"}
        style:--editcancel-icon={!$initData && $showFilterOptions
            ? "2.5em"
            : ""}
        style:--save-icon={!$initData &&
        $showFilterOptions &&
        editCustomFilterName &&
        $selectedCustomFilter &&
        customFilterName &&
        $activeTagFilters &&
        !$activeTagFilters?.[customFilterName]
            ? "2.5em"
            : ""}
        on:keydown={(e) => e.key === "Enter" && handleCustomFilterPopup(e)}
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
            placeholder="Custom Filter"
            style:pointer-events={editCustomFilterName ? "" : "none"}
            disabled={!editCustomFilterName}
            bind:value={customFilterName}
        />
        {#if !$initData && (!editCustomFilterName || !$showFilterOptions)}
            <div
                class={"options-wrap " +
                    (selectedCustomFilterElement
                        ? ""
                        : "disable-interaction hide")}
                style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
            >
                {#if $filterOptions}
                    <div
                        class={"options-wrap-filter-info " +
                            (selectedCustomFilterElement ? "" : "hide")}
                    >
                        <div class="header">
                            <h2>Your Filters</h2>
                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                            <div
                                class="closing-x"
                                tabindex={selectedCustomFilterElement &&
                                windowWidth <= 425
                                    ? "0"
                                    : "-1"}
                                on:keydown={(e) =>
                                    e.key === "Enter" &&
                                    handleCustomFilterPopup(e)}
                                on:click={handleCustomFilterPopup}
                            >
                                ×
                            </div>
                        </div>
                        <div class="options">
                            {#each $customFilters || [] as filterName (filterName || {})}
                                <div
                                    class="option"
                                    on:click={(e) =>
                                        selectCustomFilter(e, filterName)}
                                    on:keydown={(e) =>
                                        e.key === "Enter" &&
                                        selectCustomFilter(e, filterName)}
                                >
                                    <h3
                                        style:color={filterName ===
                                        $selectedCustomFilter
                                            ? "#3db4f2"
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
        {#if $showFilterOptions && !$initData}
            {#if editCustomFilterName && customFilterName && $selectedCustomFilter && $activeTagFilters && !$activeTagFilters?.[customFilterName]}
                <div class="custom-filter-icon-wrap">
                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                    <svg
                        class="save-custom-name"
                        tabindex={editCustomFilterName ? "0" : "-1"}
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
                        on:keydown={(e) => {
                            if (e.key !== "Enter") return;
                            if (
                                !$selectedCustomFilter ||
                                !customFilterName ||
                                !$activeTagFilters ||
                                $activeTagFilters?.[customFilterName]
                            )
                                return;
                            saveCustomFilterName(e);
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
                    class="editcancel-custom-name"
                    tabindex={$showFilterOptions ? "0" : "-1"}
                    viewBox={"0 0" +
                        (editCustomFilterName ? " 384 512" : " 512 512")}
                    on:click={() => {
                        editCustomFilterName = !editCustomFilterName;
                        customFilterName = $selectedCustomFilter;
                        selectedCustomFilterElement = false;
                    }}
                    on:keydown={(e) => {
                        if (e.key !== "Enter") return;
                        editCustomFilterName = !editCustomFilterName;
                        customFilterName = $selectedCustomFilter;
                        selectedCustomFilterElement = false;
                    }}
                >
                    <!-- xmark and edit -->
                    <path
                        d={editCustomFilterName
                            ? "M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"
                            : "M472 22a56 56 0 0 0-80 0l-30 30 98 98 30-30c22-22 22-58 0-80l-18-18zM172 242c-6 6-10 13-13 22l-30 88a24 24 0 0 0 31 31l89-30c8-3 15-7 21-13l168-168-98-98-168 168zM96 64c-53 0-96 43-96 96v256c0 53 43 96 96 96h256c53 0 96-43 96-96v-96a32 32 0 1 0-64 0v96c0 18-14 32-32 32H96c-18 0-32-14-32-32V160c0-18 14-32 32-32h96a32 32 0 1 0 0-64H96z"}
                    /></svg
                >
            </div>
        {/if}
        <div class="custom-filter-icon-wrap">
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <svg
                class="showFilterOptions"
                tabindex="0"
                viewBox="0 0 512 512"
                on:click={handleShowFilterOptions}
                on:keydown={(e) =>
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
            ($showFilterOptions ? "" : " disable-interaction")}
        style:--add-icon-size={customFilterName &&
        $activeTagFilters &&
        !$activeTagFilters?.[customFilterName]
            ? "2.5em"
            : ""}
        style:--remove-icon-size={$customFilters?.length > 1 ? "2.5em" : ""}
    >
        {#if $filterOptions && !$loadingFilterOptions}
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <span
                class="filterType"
                on:click={handleShowFilterTypes}
                on:keydown={(e) =>
                    e.key === "Enter" && handleShowFilterTypes(e)}
            >
                <h2 class="filterType-dropdown">
                    {selectedFilterSelectionName || ""}
                    <svg
                        viewBox="0 140 320 512"
                        tabindex={$showFilterOptions &&
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
                        (selectedFilterTypeElement
                            ? ""
                            : "disable-interaction hide")}
                    style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                >
                    {#if $filterOptions}
                        <div
                            class={"options-wrap-filter-info " +
                                (selectedFilterTypeElement ? "" : "hide")}
                        >
                            <div class="header">
                                <h2>Filters</h2>

                                <div
                                    class="closing-x"
                                    tabindex={selectedFilterTypeElement &&
                                    windowWidth <= 425
                                        ? "0"
                                        : "-1"}
                                    on:keydown={(e) =>
                                        e.key === "Enter" &&
                                        handleShowFilterTypes(e)}
                                    on:click={handleShowFilterTypes}
                                >
                                    ×
                                </div>
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
                                        on:keydown={(e) =>
                                            e.key === "Enter" &&
                                            handleFilterTypes(
                                                e,
                                                filterSelection?.filterSelectionName,
                                            )}
                                    >
                                        <h3
                                            style:color={filterSelection?.isSelected
                                                ? "#3db4f2"
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
        {#if $showFilterOptions && $customFilters?.length > 1 && !$initData}
            <div
                tabindex="0"
                class="remove-custom-filter"
                title="Delete Custom Filter"
                style:visibility={$customFilters?.length > 1 ? "" : "hidden"}
                on:click={(e) =>
                    $customFilters?.length > 1 && removeCustomFilter(e)}
                on:keydown={(e) =>
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
                tabindex="0"
                class="add-custom-filter"
                title="Add Custom Filter"
                on:click={(e) => {
                    if (
                        !customFilterName ||
                        !$activeTagFilters ||
                        $activeTagFilters?.[customFilterName]
                    )
                        return;
                    addCustomFilter(e);
                }}
                on:keydown={(e) => {
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
            ($showFilterOptions ? "" : " disable-interaction") +
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
        {#if $filterOptions && !$loadingFilterOptions}
            {#each $filterOptions?.filterSelection || [] as filterSelection, filSelIdx (filterSelection.filterSelectionName || {})}
                {#each filterSelection.filters.Dropdown || [] as Dropdown, dropdownIdx (filterSelection.filterSelectionName + Dropdown.filName || {})}
                    <div
                        class={"filter-select " +
                            (filterSelection.isSelected
                                ? ""
                                : "disable-interaction")}
                    >
                        <div class="filter-name">
                            <h2>{Dropdown.filName || ""}</h2>
                        </div>
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <div
                            class="select"
                            tabindex={$showFilterOptions &&
                            windowWidth <= 425 &&
                            filterSelection.isSelected
                                ? "0"
                                : "-1"}
                            on:keydown={(e) =>
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
                                    tabindex={$showFilterOptions ? "0" : "-1"}
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
                                />
                            </div>
                            {#if Dropdown.selected && Dropdown.options.length && !Init}
                                <svg
                                    class="angle-up"
                                    viewBox="0 0 512 512"
                                    on:keydown={(e) =>
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
                                    : "disable-interaction hide")}
                            style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                            on:wheel|stopPropagation={() => {}}
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
                                    <h2>{Dropdown.filName}</h2>
                                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                    <div
                                        class="closing-x"
                                        tabindex={$showFilterOptions &&
                                        Dropdown.selected
                                            ? "0"
                                            : "-1"}
                                        on:keydown={(e) =>
                                            e.key === "Enter" &&
                                            closeFilterSelect(dropdownIdx)}
                                        on:click={closeFilterSelect(
                                            dropdownIdx,
                                        )}
                                    >
                                        ×
                                    </div>
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
                                    tabindex={$showFilterOptions ? "0" : "-1"}
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
                                />
                                <div
                                    class="options"
                                    on:wheel|stopPropagation={() => {}}
                                >
                                    {#if Dropdown.options?.filter?.(({ optionName }) => hasPartialMatch(optionName, Dropdown?.optKeyword) || Dropdown?.optKeyword === "")?.length}
                                        {#each Dropdown.options || [] as option, optionIdx (filterSelection.filterSelectionName + Dropdown.filName + option.optionName || {})}
                                            <div
                                                class={"option " +
                                                    (hasPartialMatch(
                                                        option.optionName,
                                                        Dropdown.optKeyword,
                                                    )
                                                        ? ""
                                                        : "disable-interaction")}
                                                on:click={handleFilterSelectOptionChange(
                                                    option.optionName,
                                                    Dropdown.filName,
                                                    optionIdx,
                                                    dropdownIdx,
                                                    Dropdown.changeType,
                                                    filterSelection.filterSelectionName,
                                                )}
                                                on:keydown={(e) =>
                                                    e.key === "Enter" &&
                                                    handleFilterSelectOptionChange(
                                                        option.optionName,
                                                        Dropdown.filName,
                                                        optionIdx,
                                                        dropdownIdx,
                                                        Dropdown.changeType,
                                                        filterSelection.filterSelectionName,
                                                    )}
                                            >
                                                <h3>
                                                    {option.optionName || ""}
                                                </h3>
                                                {#if option.selected === "included" || (option.selected === "excluded" && Dropdown.changeType !== "read")}
                                                    <svg
                                                        viewBox="0 0 512 512"
                                                        style:--optionColor={option.selected ===
                                                        "included"
                                                            ? // green
                                                              "#5f9ea0"
                                                            : // red
                                                              "#e85d75"}
                                                    >
                                                        <path
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
                                            </div>
                                        {/each}
                                    {:else}
                                        <div class="option">
                                            <h3>No Results</h3>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
                {#each filterSelection.filters.Checkbox || [] as Checkbox, checkboxIdx (filterSelection.filterSelectionName + Checkbox.filName || {})}
                    {#if filterSelection.isSelected}
                        <div class="filter-checkbox">
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
                                on:keydown={(e) =>
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
                                    tabindex={$showFilterOptions ? "0" : "-1"}
                                    id={"Checkbox: " + Checkbox.filName}
                                    type="checkbox"
                                    class="checkbox"
                                    on:change={async (e) => {
                                        if ($initData) {
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
                            class="filter-input-number"
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
                                    tabindex={$showFilterOptions ? "0" : "-1"}
                                    id={"Number Filter: " + inputNum.filName}
                                    class="value-input-number"
                                    type="text"
                                    placeholder={inputNum.filName ===
                                    "scoring system"
                                        ? "Default: User Scoring"
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
                                />
                            </div>
                        </div>
                    {/if}
                {/each}
            {/each}
        {:else}
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
            (!$initData && !$loadingFilterOptions && $showFilterOptions
                ? ""
                : " disable-interaction")}
    >
        <div id="tagFilters" class="tagFilters">
            <div
                tabindex={$showFilterOptions ? "0" : "-1"}
                class="empty-tagFilter"
                title="Remove Filters"
                on:click={removeAllActiveTag}
                on:keydown={(e) => e.key === "Enter" && removeAllActiveTag(e)}
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
                    tabindex={$showFilterOptions ? "0" : "-1"}
                    out:fade={{ duration: 200 }}
                    style:--activeTagFilterColor={activeTagFiltersArray?.selected ===
                    "included"
                        ? "#5f9ea0"
                        : activeTagFiltersArray?.selected === "excluded"
                          ? "#e85d75"
                          : "#000"}
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
                    on:keydown={(e) =>
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
                                    ": " +
                                    activeTagFiltersArray?.optionValue || ""}
                            </h3>
                        {:else if activeTagFiltersArray?.optionType}
                            <h3>
                                {activeTagFiltersArray?.optionType +
                                    ": " +
                                    activeTagFiltersArray?.optionName || ""}
                            </h3>
                        {:else}
                            <h3>{activeTagFiltersArray?.optionName || ""}</h3>
                        {/if}
                    </div>
                    <!-- xmark -->
                    <svg
                        class="removeActiveTag"
                        viewBox="0 0 400 512"
                        tabindex={$showFilterOptions ? "0" : "-1"}
                        on:click|preventDefault={(e) =>
                            removeActiveTag(
                                e,
                                activeTagFiltersArray?.optionIdx,
                                activeTagFiltersArray?.optionName,
                                activeTagFiltersArray?.filterType,
                                activeTagFiltersArray?.categIdx,
                                activeTagFiltersArray?.optionType,
                            )}
                        on:keydown={(e) =>
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
                            d="M343 151a32 32 0 0 0-46-46L192 211 87 105a32 32 0 0 0-46 46l106 105L41 361a32 32 0 0 0 46 46l105-106 105 106a32 32 0 0 0 46-46L237 256l106-105z"
                        />
                    </svg>
                </div>
            {/each}
        </div>
    </div>
    <div id="home-status" class="home-status">
        <span out:fade={{ duration: 200 }} class="data-status">
            <h2
                on:click={async (e) => {
                    await getExtraInfo();
                    if (homeStatusClick < 6 && !$initData) {
                        showExtraInfo = true;
                        ++homeStatusClick;
                    } else {
                        showExtraInfo = false;
                        homeStatusClick = 0;
                    }
                }}
                on:keydown={() => {}}
            >
                {#if $dataStatus && !showExtraInfo}
                    {$dataStatus}
                {:else}
                    {$extraInfo || "Browse an anime to watch"}
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
            bind:value={$searchedAnimeKeyword}
        />
    </div>
    {#if $filterOptions}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div class="last-filter-option">
            <div
                tabindex="0"
                class="changeGridView"
                on:click={handleGridView}
                on:keydown={(e) => e.key === "Enter" && handleGridView()}
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
            <div class="sortFilter">
                <svg
                    viewBox={`0 ${
                        selectedSortType === "asc" ? "-" : ""
                    }140 320 512`}
                    on:click={changeSortType}
                    on:keydown={(e) => e.key === "Enter" && changeSortType(e)}
                    tabindex={selectedSortElement ? "" : "0"}
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
                    tabindex={selectedSortElement ? "" : "0"}
                    on:click={handleSortFilterPopup}
                    on:keydown={(e) =>
                        e.key === "Enter" && handleSortFilterPopup(e)}
                >
                    {selectedSortName || ""}
                </h2>
                <div
                    class={"options-wrap " +
                        (selectedSortElement ? "" : "disable-interaction hide")}
                    style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                >
                    <div
                        class={"options-wrap-filter-info " +
                            (selectedSortElement ? "" : "hide")}
                    >
                        <div class="header">
                            <h2>Sort By</h2>
                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                            <div
                                class="closing-x"
                                tabindex={selectedSortElement &&
                                windowWidth <= 425
                                    ? "0"
                                    : ""}
                                on:keydown={(e) =>
                                    e.key === "Enter" &&
                                    handleSortFilterPopup(e)}
                                on:click={handleSortFilterPopup}
                            >
                                ×
                            </div>
                        </div>
                        <div class="options">
                            {#each $filterOptions?.sortFilter || [] as sortFilter (sortFilter?.sortName || {})}
                                <div
                                    class="option"
                                    on:click={changeSort(sortFilter?.sortName)}
                                    on:keydown={(e) =>
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
        </div>
    {:else}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div class="last-filter-option">
            <div
                tabindex="0"
                class="changeGridView"
                on:click={handleGridView}
                on:keydown={(e) => e.key === "Enter" && handleGridView()}
            />
            <div class="sortFilter skeleton shimmer" />
        </div>
    {/if}
    <slot />
</main>

<style>
    ::placeholder {
        opacity: 1 !important;
        color: #8390a0 !important;
    }

    :-ms-input-placeholder,
    ::-ms-input-placeholder {
        color: #8390a0 !important;
    }

    main {
        --filters-space: ;
        --active-tag-filter-space: ;
        --custom-filter-settings-space: ;
        display: grid;
        grid-template-rows:
            42px var(--custom-filter-settings-space) var(--filters-space)
            var(--active-tag-filter-space) 44px 42px 45px auto;
        padding-top: 1.5em;
        transition: opacity 0.2s ease;
    }

    .skeleton {
        border-radius: 6px !important;
        background-color: rgba(30, 42, 56, 0.8) !important;
    }
    .options-wrap {
        box-shadow:
            0 14px 28px rgba(0, 0, 0, 0.25),
            0 10px 10px rgba(0, 0, 0, 0.22) !important;
    }
    .custom-filter-wrap {
        --editcancel-icon: ;
        --save-icon: ;
        display: grid;
        grid-template-columns: auto var(--save-icon) var(--editcancel-icon) 2.5em;
        align-items: center;
        column-gap: 2em;
        padding: 8px 15px 8px 0px;
        background-color: rgb(21, 31, 46);
        border-radius: 6px;
        width: 100%;
        height: max-content;
        position: relative;
    }
    .custom-filter-wrap .options-wrap {
        position: absolute;
        left: 0;
        top: 4.25em;
        background-color: rgb(21, 31, 46);
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
        color: inherit;
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
        column-gap: 2em;
        padding: 8px 15px;
        background-color: rgb(21, 31, 46);
        border-radius: 6px;
        width: 100%;
        height: 4em;
        position: relative;
    }
    .custom-filter-selection {
        --edit-icon-width: 0px;
        background-color: inherit;
        color: inherit;
        position: absolute;
        opacity: 0;
        width: calc(100% - var(--edit-icon-width) - 3.5em);
        height: 100%;
    }
    .input-search,
    .custom-filter {
        outline: none;
        border: none;
        background-color: rgb(21, 31, 46);
        color: white;
        width: 100%;
        cursor: text;
    }
    .custom-filter {
        padding-left: 15px;
    }
    .add-custom-filter,
    .remove-custom-filter {
        width: 3em;
        height: 3em;
        display: grid;
        justify-content: center;
        align-items: center;
    }
    .filterType-wrap-icon {
        height: 2em;
        width: 2em;
        cursor: pointer;
    }
    .filterType-dropdown {
        display: grid;
        grid-template-columns: auto 1em;
        gap: 0.2em;
        align-items: center;
    }
    .filterType-dropdown > svg {
        width: 1em;
        height: 1em;
    }
    .filterType .options-wrap {
        position: absolute;
        left: 0;
        top: 2.75em;
        background-color: rgb(21, 31, 46);
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
        color: inherit;
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
        height: 2.5em;
        width: 2.5em;
        cursor: pointer;
    }

    .editcancel-custom-name,
    .save-custom-name {
        height: 2em;
        width: 2em;
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
        margin-top: 1em;
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
        margin-top: 1em;
    }

    .home-status .skeleton {
        height: 18px;
        width: 100px;
    }

    .home-status span {
        margin: 0 1em;
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

    .home-status .data-status h2 {
        margin: auto;
    }

    .filters {
        overflow-x: auto;
        overflow-y: hidden;
        display: flex;
        gap: 1em;
        flex-wrap: nowrap;
        padding-bottom: var(--maxPaddingHeight);
        margin-top: 2em;
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
        color: inherit;
        border: none;
        outline: none;
        width: 100%;
        cursor: text;
    }
    .filter-select .filter-name,
    .filter-input-number .filter-input-number-name {
        font-size: 1.5rem;
        font-weight: 600;
        text-transform: capitalize;
        user-select: none;
    }
    .filter-select .select {
        align-items: center;
        background: rgb(21, 31, 46);
        border-radius: 6px;
        display: grid;
        grid-template-columns: auto 24px;
        height: 36px;
        padding: 10px 5px;
        justify-content: space-between;
    }
    .filter-select .angle-down,
    .filter-select .angle-up {
        height: 1.4em;
        width: min-content;
        margin: auto;
        cursor: pointer;
    }
    .filter-select .value-wrap {
        width: max-content;
        max-width: 115px;
        margin-left: 10px;
    }
    .filter-select .value-input {
        background: transparent;
        color: inherit;
        border: none;
        outline: none;
        width: 100%;
        min-width: 40px;
        cursor: text;
    }

    .filter-select .options-wrap {
        position: absolute;
        top: 61px;
        background-color: rgb(21, 31, 46);
        width: 165px;
        overflow-y: auto;
        overscroll-behavior: contain;
        max-height: var(--maxFilterSelectionHeight);
        margin-top: 1px;
        border-radius: 6px;
        padding: 6px;
        z-index: 1;
    }
    .options-wrap::-webkit-scrollbar {
        width: 7px !important;
    }
    .options-wrap::-webkit-scrollbar-track {
        background-color: transparent;
    }
    .options-wrap::-webkit-scrollbar-thumb {
        background-color: #b9cadd;
        border-radius: 5px;
    }

    .options {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .options::-webkit-scrollbar {
        display: none;
    }
    .highlight {
        background-color: rgba(0, 0, 0, 0.25);
        color: rgb(61, 180, 242) !important;
    }

    .filter-select .options {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .filter-select .option {
        color: inherit;
        display: grid;
        align-items: center;
        padding: 5px;
        width: 100%;
        grid-template-columns: auto 1.4em;
        grid-column-gap: 8px;
        cursor: pointer;
        user-select: none;
        border-radius: 6px;
    }

    .filter-select .option h3 {
        cursor: pointer !important;
        text-transform: capitalize;
    }

    .filter-select .option svg {
        fill: var(--optionColor);
        height: 1.4em;
        width: 1.4em;
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
        background: rgb(21, 31, 46);
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
        border-radius: 4px;
        border: 2px solid gray;
        accent-color: #5f9ea0;
        cursor: pointer;
    }
    .filter-checkbox .checkbox-label {
        font-weight: 600;
        text-transform: capitalize;
        -webkit-user-select: none;
        -ms-user-select: none;
        user-select: none;
        font-size: 1.4rem;
        cursor: pointer;
    }

    @media screen and (hover: hover) {
        .option:hover h3 {
            color: rgb(61, 180, 242) !important;
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
        margin-top: 2em;
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
        width: 3em;
        height: 3em;
    }

    .empty-tagFilter svg {
        width: 2em;
        height: 2em;
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
        animation: fadeIn 0.2s ease;
        background-color: var(--activeTagFilterColor);
        padding: 0em 10px;
        display: grid;
        grid-template-columns: calc(100% - 2em) 2em;
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
        text-wrap: nowrap;
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
        color: white !important;
    }
    .activeTagFilter svg {
        width: 1.5rem;
        height: 1.5rem;
        fill: white !important;
    }

    .changeGridView {
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgb(21, 31, 46);
        border-radius: 6px;
        cursor: pointer;
        width: 3em;
        height: 3em;
    }
    .changeGridView svg {
        height: 1.5em;
        width: 1.5em;
    }

    .showHideActiveFilters {
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 6px;
        cursor: pointer;
        width: 3em;
        height: 3em;
    }

    .showHideActiveFilters svg {
        height: 2.5em;
        width: 2.5em;
    }

    .last-filter-option {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        min-height: 3em;
        margin-top: 1.2em;
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
    .sortFilter h2,
    .sortFilter h3,
    .sortFilter svg {
        user-select: none;
        cursor: pointer;
        text-transform: capitalize;
    }

    .sortFilter svg {
        height: 1.5em;
        width: 1.5em;
    }

    .sortFilter .options-wrap {
        position: absolute;
        display: flex;
        right: 0;
        top: 20px;
        background-color: rgb(21, 31, 46);
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
        color: inherit;
        display: grid;
        align-items: center;
        padding: 5px;
        width: 100%;
        grid-template-columns: auto 1.5em;
        grid-column-gap: 8px;
        cursor: pointer;
        user-select: none;
        border-radius: 6px;
    }
    .sortFilter .option svg {
        margin-left: auto;
        height: 1.5em;
        width: 1.5em;
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
        font-size: 25px;
        width: 25px;
        height: 25px;
        text-align: center;
        position: absolute;
        right: 10px;
        top: 10px;
        vertical-align: middle;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        cursor: pointer;
        border-radius: 50%;
        z-index: 2;
        user-select: none;
        background-color: transparent;
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

    /* .custom-filter-floating-icon {
        position: fixed !important;
        bottom: 4.5em !important;
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
        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25),
            0 10px 10px rgba(0, 0, 0, 0.22);
        z-index: 994 !important;
    } */
    /* .custom-filter-floating-icon.popup-visible {
        z-index: 996 !important;
    }

    .custom-filter-floating-icon svg {
        width: 3em;
        height: 3em;
    } */

    /* @media screen and (pointer: fine) or (min-width: 750px) {
        .custom-filter-floating-icon {
            display: none;
        }
    } */

    @media screen and (hover: hover) and (pointer: fine) {
        .filters {
            scroll-snap-type: none !important;
        }
    }

    @media screen and (max-height: 445px) {
        .options-wrap-filter-info {
            top: max(25vh, 48px) !important;
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
            display: flex !important;
            flex-direction: column !important;
            z-index: 996 !important;
            left: -1em !important;
            top: 0px;
            width: calc(100% + 2em) !important;
            height: 100% !important;
            background-color: rgba(0, 0, 0, 0.4) !important;
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
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        .options-wrap::-webkit-scrollbar {
            display: none;
        }
        .options-wrap.hide {
            transition: transform 0s ease 0.2s;
        }
        .options-wrap-filter-info {
            display: flex !important;
            flex-direction: column;
            width: 95vw;
            padding: 14px 0 0 0;
            gap: 14px;
            background-color: #0b1622;
            color: white !important;
            border-radius: 6px 6px 0px 0px;
            top: 140px;
            max-height: 65vh !important;
            position: absolute;
            opacity: 1 !important;
            transition: opacity 0.2s ease !important;
        }
        .options-wrap-filter-info.hide {
            opacity: 0 !important;
        }
        .options-wrap-filter-info .header {
            display: flex !important;
            padding: 0 14px;
        }
        .options-wrap-filter-info h2 {
            display: initial !important;
            font-size: 1.8rem;
            font-weight: bold;
            text-transform: capitalize;
        }
        .options-wrap-filter-info input {
            display: initial !important;
            background: #151f2e;
            padding: 14px 12px;
            border-radius: 6px;
            font-size: 1.6rem;
            color: inherit;
            border: none;
            outline: none;
            cursor: text;
            margin: 0 14px;
        }

        .options-wrap .options {
            display: flex !important;
            flex-direction: column !important;
            background-color: #151f2e !important;
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
            font-size: 1.6rem !important;
        }
        .filter-select .option {
            grid-template-columns: auto 1.8em !important;
        }
        .option svg {
            height: 1.8em !important;
            width: 1.8em !important;
        }
    }
</style>
