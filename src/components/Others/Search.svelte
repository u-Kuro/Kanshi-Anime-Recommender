<script>
    import { onMount, tick } from "svelte";
    import {
        mediaLoader,
        mediaManager,
        getExtraInfo,
        processRecommendedMediaList,
        saveIDBdata,
        getIDBdata
    } from "../../js/workerUtils.js";
    import {
        addClass,
        changeInputValue,
        removeClass,
        getLocalStorage,
        trimAllEmptyChar,
        isJsonObject,
        jsonIsEmpty,
        setLocalStorage,
        removeLocalStorage,
        formatNumber,
        requestImmediate,
        showToast,
    } from "../../js/others/helper.js";
    import {
        android,
        dataStatus,
        loadingDataStatus,
        initData,
        confirmPromise,
        gridFullView,
        hasWheel,
        extraInfo,
        showFilterOptions,
        dropdownIsVisible,
        popupVisible,
        showStatus,
        isProcessingList,
        currentExtraInfo,
        isBackgroundUpdateKey,
        menuVisible,
        tagInfo,
        filterConfig,
        orderedFilters,
        categories,
        selectedCategory,
        loadedMediaLists,
        algorithmFilters,
        nonOrderedFilters,
        mediaCautions,
        searchedWord,
        categoriesKeys,
        selectedMediaGridEl,
        resetProgress,
        windowHeight,
        windowWidth,
        documentScrollTop,
        loadingCategory,
        currentMediaFilters,
        currentMediaSortBy,
        currentAlgorithmFilters,
        currentMediaCautions,
        isImporting,
        isExporting,
        listUpdateAvailable,
        initComplete,
        toast,
    } from "../../js/globalValues.js";

    const COOs = {
        JP: "Japan",
        KR: "South Korea",
        CN: "China",
        TW: "Taiwan",
    }
    let selectedCategoryMediaFilters,
        selectedSortName,
        selectedSortType,
        filterCategoriesSelections,
        filterCategories;

    let selectedFilterCategoryName = getLocalStorage(
        "selectedFilterCategoryName",
    );

    $: {
        let category = $loadedMediaLists?.[$selectedCategory];
        selectedCategoryMediaFilters = category?.mediaFilters;
        if ($currentMediaFilters[$selectedCategory] == null) {
            $currentMediaFilters[$selectedCategory] = selectedCategoryMediaFilters
        }
        let sortBy = category?.sortBy;
        if ($currentMediaSortBy[$selectedCategory] == null) {
            $currentMediaSortBy[$selectedCategory] = sortBy
        }
        selectedSortName = sortBy?.sortName;
        selectedSortType = sortBy?.sortType;
    }

    let currentAlgorithmFiltersListener = algorithmFilters.subscribe((val) => {
        if (val) {
            $currentAlgorithmFilters = val
            currentAlgorithmFiltersListener?.()
            currentAlgorithmFiltersListener = null
        }
    })

    let currentMediaCautionsListener = mediaCautions.subscribe((val) => {
        if (val) {
            $currentMediaCautions = val 
            currentMediaCautionsListener?.()
            currentMediaCautionsListener = null
        }
    })

    let activeFilters;
    $: if (selectedFilterCategoryName === "Media Filter") {
        activeFilters = selectedCategoryMediaFilters;
    } else if (selectedFilterCategoryName === "Algorithm Filter") {
        activeFilters = $algorithmFilters;
    } else if (selectedFilterCategoryName === "Content Caution") {
        activeFilters = $mediaCautions;
    } else {
        activeFilters = null;
    }

    $: {
        filterCategoriesSelections = $filterConfig?.selection;
        filterCategories = Object.keys(filterCategoriesSelections || {});
    }

    let filterSelectionsSearch = {};
    let numberFiltersValues = {};
    let boolFilterIsChecked = {};
    $: {
        if (isJsonObject($nonOrderedFilters)) {
            let allCategoriesBoolFilter = {
                "Media Filter": $nonOrderedFilters?.["Media Filter"]?.bool,
                "Algorithm Filter":
                    $nonOrderedFilters?.["Algorithm Filter"]?.bool,
            };
            let activeMediaBoolFilters =
                selectedCategoryMediaFilters?.filter?.(
                    (filter) => filter?.filterType === "bool",
                ) || [];
            let activeAlgorithmBoolFilters =
                $algorithmFilters?.filter?.(
                    (filter) => filter?.filterType === "bool",
                ) || [];
            boolFilterIsChecked = Object.entries(
                allCategoriesBoolFilter,
            ).reduce((acc, [filterCategoryName, boolFilterCategoryArray]) => {
                let activeBoolFilters =
                    filterCategoryName === "Media Filter"
                        ? activeMediaBoolFilters
                        : activeAlgorithmBoolFilters;
                for (
                    let i = 0, l = boolFilterCategoryArray?.length;
                    i < l;
                    i++
                ) {
                    let boolFilterName = boolFilterCategoryArray[i];
                    let activeBoolFilter = activeBoolFilters?.find?.(
                        (boolFilter) => {
                            return boolFilter?.optionName === boolFilterName;
                        },
                    );
                    let status = activeBoolFilter?.status;
                    let isBoolChecked = status === "included";
                    acc[filterCategoryName + boolFilterName] = isBoolChecked;
                }
                return acc;
            }, {});
        }
    }

    let maxFilterSelectionHeight = $windowHeight * 0.3;

    let popupContainer;

    let selectedCategoryElement;
    let selectedFilterCategoryElement;
    let selectedFilterElement;
    let selectedSortElement;
    let highlightedEl;

    let conditionalInputNumberList = [
        "weighted score",
        "score",
        "average score",
        "user score",
        "popularity",
        "year",
    ];

    let scrollingToTop;
    
    async function updateFilters(name, data) {
        if (!filterCategories || !($orderedFilters || $nonOrderedFilters)) {
            return pleaseWaitAlert();
        }
        if (!isJsonObject(data)) return;

        const categoryToUpdate = data?.selectedCategory
        if (categoryToUpdate) {
            $loadingCategory[categoryToUpdate] = new Date()
        }
        resetProgress.update((e) => !e);
        if (name === "Media Filter") {
            try {
                data.updateMediaFilter = true;
                await loadMedia(data);
            } catch {
                if ($loadedMediaLists?.[categoryToUpdate] && $currentMediaFilters[categoryToUpdate]) {
                    $loadedMediaLists[categoryToUpdate].mediaFilters = $currentMediaFilters[categoryToUpdate]
                }
            }
        } else if (name === "sortBy") {
            try {
                data.updateMediaFilter = true;
                await loadMedia(data);
            } catch {
                if ($loadedMediaLists?.[categoryToUpdate] && $currentMediaSortBy[categoryToUpdate]) {
                    $loadedMediaLists[categoryToUpdate].sortBy = $currentMediaSortBy[categoryToUpdate]
                }
            }
        } else if (name === "Algorithm Filter") {
            try {
                $loadingCategory[""] = new Date()
                await processRecMediaList(data);
                $currentAlgorithmFilters = data.algorithmFilters
                try {
                    await loadMedia({ updateRecommendedMediaList: true });
                } catch {}
            } catch {
                if ($currentAlgorithmFilters) {
                    $algorithmFilters = $currentAlgorithmFilters
                }
            }
        } else if (name === "Content Caution") {
            try {
                $loadingCategory[""] = new Date()
                await loadMedia(data);
                $currentMediaCautions = data.mediaCautions
            } catch {
                if ($currentMediaCautions) {
                    $mediaCautions = $currentMediaCautions
                }
            }
        }
    }

    async function loadMedia(data) {
        if ($android && window[$isBackgroundUpdateKey] === true) {
            throw new Error("Something went wrong...");
        }
        await mediaManager(data)
    }

    async function processRecMediaList(data) {
        if ($android && window[$isBackgroundUpdateKey] === true) {
            throw new Error("Something went wrong...");
        }
        await processRecommendedMediaList(data)
    }

    windowHeight.subscribe((val) => {
        maxFilterSelectionHeight = val * 0.3;
    })

    function handleFilterCategory(event, newFilterCategoryName) {
        if (!filterCategories) return pleaseWaitAlert();
        event.stopPropagation();
        selectedFilterCategoryName = newFilterCategoryName;
        setLocalStorage(
            "selectedFilterCategoryName",
            selectedFilterCategoryName,
        ).catch(() => {
            saveIDBdata(selectedFilterCategoryName, "selectedFilterCategoryName");
        });
        if (
            highlightedEl instanceof Element &&
            highlightedEl.closest(".filter-category")
        ) {
            removeClass(highlightedEl, "highlight");
            highlightedEl = null;
        }
        selectedFilterCategoryElement = false;
    }
    function handleShowFilterCategories(event) {
        if (!filterCategories) return pleaseWaitAlert();
        let element = event.target;
        let classList = element?.classList || [];
        let filterCategoriesEl = element?.closest?.(".filter-category");
        let optionsWrap = element?.closest?.(".options-wrap");
        if (
            (classList.contains("filter-category") || filterCategoriesEl) &&
            !selectedFilterCategoryElement &&
            !(classList.contains("closing-x") || element.closest(".closing-x"))
        ) {
            selectedFilterCategoryElement =
                filterCategoriesEl || element || true;
        } else if (
            (!optionsWrap ||
                classList.contains("closing-x") ||
                element.closest(".closing-x")) &&
            !classList.contains("options-wrap")
        ) {
            let optionsWrapToClose =
                selectedFilterCategoryElement?.querySelector?.(".options-wrap");
            if (optionsWrapToClose) {
                addClass(optionsWrapToClose, "hide");
                requestImmediate(() => {
                    removeClass(optionsWrapToClose, "hide");
                    if (
                        highlightedEl instanceof Element &&
                        highlightedEl.closest(".filter-category")
                    ) {
                        removeClass(highlightedEl, "highlight");
                        highlightedEl = null;
                    }
                    selectedFilterCategoryElement = false;
                }, 200);
            } else {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".filter-category")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedFilterCategoryElement = false;
            }
        }
    }

    let openedFilterSelectionName;
    function filterCategorySelect(event, filterSelectionName) {
        if ($initData || !filterCategories || !$orderedFilters) {
            return pleaseWaitAlert();
        }

        let element = event.target;
        let filSelectEl = element?.closest?.(".filter-select");
        if (filSelectEl === selectedFilterElement) return;
        if (selectedFilterElement instanceof Element) {
            openedFilterSelectionName = null;
        }
        if (
            highlightedEl instanceof Element &&
            highlightedEl.closest(".filter-select")
        ) {
            removeClass(highlightedEl, "highlight");
            highlightedEl = null;
        }
        openedFilterSelectionName = filterSelectionName;
        selectedFilterElement = filSelectEl || element || true;
    }

    function closeFilterSelect() {
        let optionsWrapToClose =
            selectedFilterElement?.querySelector?.(".options-wrap");
        if (optionsWrapToClose) {
            addClass(optionsWrapToClose, "hide");
            requestImmediate(() => {
                removeClass(optionsWrapToClose, "hide");
                openedFilterSelectionName = null;
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".filter-select")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                openedFilterSelectionName = selectedFilterElement = null;
            }, 200);
        } else {
            openedFilterSelectionName = null;
            if (
                highlightedEl instanceof Element &&
                highlightedEl.closest(".filter-select")
            ) {
                removeClass(highlightedEl, "highlight");
                highlightedEl = null;
            }
            openedFilterSelectionName = selectedFilterElement = null;
        }
    }
    async function clickOutsideListener(event) {
        let element = event?.target;
        let classList = element?.classList || [];
        if (
            classList.contains("options-wrap") &&
            getComputedStyle(element).position === "fixed"
        ) {
            // Small Screen Width
            let openedDropdown =
                selectedCategoryElement ||
                selectedFilterCategoryElement ||
                selectedSortElement ||
                selectedFilterElement;
            let optionsWrapToClose =
                openedDropdown?.querySelector?.(".options-wrap");
            if (optionsWrapToClose) {
                addClass(optionsWrapToClose, "hide");
                requestImmediate(() => {
                    removeClass(optionsWrapToClose, "hide");
                    if (highlightedEl instanceof Element) {
                        removeClass(highlightedEl, "highlight");
                        highlightedEl = null;
                    }
                    // Close Category Dropdown
                    selectedCategoryElement = false;
                    // Close Filter Category Dropdown
                    selectedFilterCategoryElement = false;
                    // Close Sort Filter Dropdown
                    selectedSortElement = false;
                    // Close Filter Selection Dropdown
                    openedFilterSelectionName = selectedFilterElement = null;
                }, 200);
            } else {
                if (highlightedEl instanceof Element) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                // Close Category Dropdown
                selectedCategoryElement = false;
                // Close Filter Category Dropdown
                selectedFilterCategoryElement = false;
                // Close Sort Filter Dropdown
                selectedSortElement = false;
                // Close Filter Selection Dropdown
                openedFilterSelectionName = selectedFilterElement = null;
            }
        } else if (
            !classList.contains("options-wrap") &&
            !element?.closest?.(".options-wrap") &&
            !classList.contains("full-popup-wrapper") &&
            !element?.closest?.(".full-popup-wrapper") &&
            !classList.contains("item-info") &&
            !classList.contains("extra-item-info") &&
            !classList.contains("item-info-path") &&
            !element?.closest?.(".item-info") &&
            !element?.closest?.(".extra-item-info")
        ) {
            // Large Screen Width
            // Category Dropdown
            let categoryEl = element?.closest?.(".category-wrap");
            if (!classList.contains("category-wrap") && !categoryEl) {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".category-wrap")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedCategoryElement = false;
            }

            // Filter Category Dropdown
            let filterCategoryEl = element?.closest(".filter-category");
            if (!classList.contains("filter-category") && !filterCategoryEl) {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".filter-category")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedFilterCategoryElement = false;
            }

            // Sort Filter Dropdown
            let sortSelectEl = element?.closest(".sort-filter");
            if (!classList.contains("sort-filter") && !sortSelectEl) {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".sort-filter")
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
                openedFilterSelectionName = selectedFilterElement = null;
            }
        }
    }

    function handleOptionsWrapVisibility(event) {
        if ($windowWidth > 425) return;
        let target = event.target;
        let classList = target.classList;
        if (
            target.closest(".options-wrap-filter-info") ||
            classList.contains("options-wrap-filter-info")
        )
            return;
        let optionsWrapToClose = this
        if (!(optionsWrapToClose instanceof Element)) {
            let openedDropdown =
                selectedCategoryElement ||
                selectedFilterCategoryElement ||
                selectedSortElement ||
                selectedFilterElement;
            optionsWrapToClose = openedDropdown?.querySelector?.(".options-wrap");
        }
        if (
            optionsWrapToClose instanceof Element
            && getComputedStyle(optionsWrapToClose).position === "fixed"
        ) {
            addClass(optionsWrapToClose, "hide");
            requestImmediate(() => {
                removeClass(optionsWrapToClose, "hide");
                if (highlightedEl instanceof Element) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                // Close Category Dropdown
                selectedCategoryElement = false;
                // Close Filter Category Dropdown
                selectedFilterCategoryElement = false;
                // Close Sort Filter Dropdown
                selectedSortElement = false;
                // Close Filter Selection Dropdown
                openedFilterSelectionName = selectedFilterElement = null;
            }, 200);
        }
    }

    let filterSelectionOptionsLoaded = false;
    $: {
        if (!(selectedFilterElement instanceof Element)) {
            filterSelectionOptionsLoaded = false;
        }
    }

    function handleFilterSelectionOptionChange(
        optionName,
        optionCategory,
        filterCategoryName,
        isReadOnly,
    ) {
        if ($initData || !filterCategories || !$orderedFilters) {
            return pleaseWaitAlert();
        }

        if ($categories?.[$selectedCategory] === true) {
            if ($android) {
                showToast("Please wait a moment")
            } else {
                $toast = "Please wait a moment"
            }
            return
        }

        let array;
        if (filterCategoryName === "Media Filter") {
            array = $loadedMediaLists?.[$selectedCategory]?.mediaFilters;
        } else if (filterCategoryName === "Algorithm Filter") {
            array = $algorithmFilters;
        } else if (filterCategoryName === "Content Caution") {
            array = $mediaCautions;
        }
        if (!(array instanceof Array)) return;

        let filterType = "selection";
        let idx =
            array.findIndex(
                (e) =>
                    e?.optionName === optionName &&
                    e?.optionCategory === optionCategory &&
                    e?.filterType === filterType,
            ) ?? -1;
        let filter = array[idx];

        let status = filter?.status,
            newStatus;
        if (status === "none" || !status) {
            newStatus = "included";
        } else if (status === "included" && !isReadOnly) {
            newStatus = "excluded";
        } // else delete dito pero sa active fil set sa none? para di mabura

        if (newStatus) {
            if (isJsonObject(filter)) {
                array[idx].status = newStatus;
            } else {
                array = array.filter(
                    (e) =>
                        !(
                            e?.optionName === optionName &&
                            e?.optionCategory === optionCategory &&
                            e?.filterType === filterType
                        ),
                );
                array.unshift({
                    optionName,
                    optionCategory,
                    filterType,
                    status: "included",
                });
            }
        } else if (idx >= 0) {
            array.splice(idx, 1);
        }

        filterSelectionOptionsLoaded = true;

        let data;
        if (filterCategoryName === "Media Filter") {
            data = {
                selectedCategory: $selectedCategory,
                mediaFilters: ($loadedMediaLists[
                    $selectedCategory
                ].mediaFilters = array),
            };
        } else if (filterCategoryName === "Algorithm Filter") {
            data = {
                algorithmFilters: ($algorithmFilters = array),
            };
        } else if (filterCategoryName === "Content Caution") {
            data = {
                mediaCautions: ($mediaCautions = array),
            };
        }

        updateFilters(filterCategoryName, data);
    }
    function handleCheckboxChange(event, optionName, filterCategoryName) {
        if ($initData) {
            return pleaseWaitAlert();
        }
        let element = event.target;
        let classList = element?.classList || [];
        let key = event.key;
        if (
            (classList.contains("filter-bool") && event.type === "click") ||
            (classList.contains("filter-bool") &&
                key !== "Enter" &&
                event.type === "keyup")
        ) {
            return;
        }
        if (!filterCategories || !$nonOrderedFilters) {
            if (!classList.contains("filter-bool")) {
                pleaseWaitAlert();
            }
            return;
        }

        if ($categories?.[$selectedCategory] === true) {
            if ($android) {
                showToast("Please wait a moment")
            } else {
                $toast = "Please wait a moment"
            }
            return
        }

        let array;
        if (filterCategoryName === "Media Filter") {
            array = $loadedMediaLists?.[$selectedCategory]?.mediaFilters;
        } else if (filterCategoryName === "Algorithm Filter") {
            array = $algorithmFilters;
        } else if (filterCategoryName === "Content Caution") {
            array = $mediaCautions;
        }
        if (!(array instanceof Array)) return;

        let filterType = "bool";
        let idx =
            array.findIndex(
                (e) =>
                    e?.optionName === optionName &&
                    e?.filterType === filterType,
            ) ?? -1;
        let filter = array[idx];

        let status = filter?.status,
            newStatus;

        if (status === "none" || !status) {
            newStatus = "included";
        }

        if (newStatus) {
            if (isJsonObject(filter)) {
                array[idx].status = newStatus;
            } else {
                array = array.filter(
                    (e) =>
                        !(
                            e?.optionName === optionName &&
                            e?.filterType === filterType
                        ),
                );
                array.unshift({
                    optionName,
                    filterType,
                    status: "included",
                });
            }
        } else if (idx >= 0) {
            array.splice(idx, 1);
        }

        let data;
        if (filterCategoryName === "Media Filter") {
            data = {
                selectedCategory: $selectedCategory,
                mediaFilters: ($loadedMediaLists[
                    $selectedCategory
                ].mediaFilters = array),
            };
        } else if (filterCategoryName === "Algorithm Filter") {
            data = {
                algorithmFilters: ($algorithmFilters = array),
            };
        } else if (filterCategoryName === "Content Caution") {
            data = {
                mediaCautions: ($mediaCautions = array),
            };
        }

        updateFilters(filterCategoryName, data);
    }

    function handleInputNumber(
        event,
        optionName,
        oldValue,
        optionValue,
        maxValue,
        minValue,
        filterCategoryName,
    ) {
        let numberFilterKey = filterCategoryName + optionName;

        if (!filterCategories || !$nonOrderedFilters || $initData) {
            changeInputValue(event.target, oldValue);
            numberFiltersValues[numberFilterKey] = oldValue;

            return pleaseWaitAlert();
        }

        if ($categories?.[$selectedCategory] === true) {
            changeInputValue(event.target, oldValue);
            numberFiltersValues[numberFilterKey] = oldValue;

            if ($android) {
                showToast("Please wait a moment")
            } else {
                $toast = "Please wait a moment"
            }
            return
        }

        let array;
        if (filterCategoryName === "Media Filter") {
            array = $loadedMediaLists?.[$selectedCategory]?.mediaFilters;
        } else if (filterCategoryName === "Algorithm Filter") {
            array = $algorithmFilters;
        } else if (filterCategoryName === "Content Caution") {
            array = $mediaCautions;
        }

        if (!(array instanceof Array)) {
            changeInputValue(event.target, oldValue);
            numberFiltersValues[numberFilterKey] = oldValue;

            return;
        }

        let filterType = "number";
        let idx =
            array.findIndex(
                (e) =>
                    e?.optionName === optionName &&
                    e?.filterType === filterType,
            ) ?? -1;

        let shouldReload = false;
        if (
            conditionalInputNumberList.includes(optionName) &&
            /^(>=|<=|<|>).*($)/.test(optionValue) // Check if it starts or ends with comparison operators
        ) {
            const newSplitValue = optionValue
                ?.split(/(<=|>=|<|>)/)
                ?.filter?.((e) => e); // Remove White Space
            if (optionValue !== oldValue && newSplitValue.length <= 2) {
                const CMPOperator = newSplitValue[0].trim(), 
                    CMPNumber = newSplitValue[1];
                if (
                    optionValue !== oldValue &&
                    ((!isNaN(CMPNumber) &&
                        (parseFloat(CMPNumber) >= minValue ||
                            typeof minValue !== "number") &&
                        (parseFloat(CMPNumber) <= maxValue ||
                            typeof maxValue !== "number")) ||
                        !CMPNumber)
                ) {
                    shouldReload = true;
                    if (!CMPNumber) {
                        if (idx >= 0) {
                            array.splice(idx, 1);
                        }
                    } else {
                        let hasActiveFilter = idx >= 0;
                        if (hasActiveFilter) {
                            array[idx].optionValue = optionValue;
                            array[idx].CMPOperator = CMPOperator;
                            array[idx].CMPNumber = CMPNumber;
                            array[idx].status = "included";
                        } else {
                            array = array.filter(
                                (e) =>
                                    !(
                                        e?.optionName === optionName &&
                                        e?.filterType === filterType
                                    ),
                            );
                            array.unshift({
                                optionName,
                                filterType,
                                optionValue,
                                CMPOperator,
                                CMPNumber,
                                status: "included",
                            });
                        }
                    }
                } else {
                    changeInputValue(event.target, oldValue);
                    numberFiltersValues[numberFilterKey] = oldValue;
                }
            } else {
                changeInputValue(event.target, oldValue);
                numberFiltersValues[numberFilterKey] = oldValue;
            }
        } else {
            if (optionValue === "=") {
                return;
            } else if (optionValue?.[0] === "=") {
                optionValue = optionValue.replace("=", "");
            }
            if (
                optionValue !== oldValue &&
                ((!isNaN(optionValue) &&
                    (parseFloat(optionValue) >= minValue ||
                        typeof minValue !== "number") &&
                    (parseFloat(optionValue) <= maxValue ||
                        typeof maxValue !== "number")) ||
                    optionValue === "")
            ) {
                shouldReload = true;
                if (optionValue === "") {
                    if (idx >= 0) {
                        array.splice(idx, 1);
                    }
                } else {
                    let hasActiveFilter = idx >= 0;
                    if (hasActiveFilter) {
                        delete array[idx].CMPOperator;
                        delete array[idx].CMPNumber;
                        array[idx].optionValue = optionValue;
                        array[idx].status = "included";
                    } else {
                        array = array.filter(
                            (e) =>
                                !(
                                    e?.optionName === optionName &&
                                    e?.filterType === filterType
                                ),
                        );
                        array.unshift({
                            optionName,
                            filterType,
                            optionValue,
                            status: "included",
                        });
                    }
                }
            } else {
                changeInputValue(event.target, oldValue);
                numberFiltersValues[numberFilterKey] = oldValue;
            }
        }

        if (!shouldReload) return;

        let data;
        if (filterCategoryName === "Media Filter") {
            data = {
                selectedCategory: $selectedCategory,
                mediaFilters: ($loadedMediaLists[
                    $selectedCategory
                ].mediaFilters = array),
            };
        } else if (filterCategoryName === "Algorithm Filter") {
            data = {
                algorithmFilters: ($algorithmFilters = array),
            };
        } else if (filterCategoryName === "Content Caution") {
            data = {
                mediaCautions: ($mediaCautions = array),
            };
        }

        updateFilters(filterCategoryName, data);
    }

    function setDefaultInputNumberValue(node, lastOptionValue) {
        try {
            if (typeof lastOptionValue === "string") {
                node.value = lastOptionValue;
            }
        } catch (e) {}
    }

    function changeActiveStatus(
        event,
        filterType,
        optionName,
        activeFilterIdx,
        status,
        readOnly,
    ) {
        if ($initData) return pleaseWaitAlert();

        if ($categories?.[$selectedCategory] === true) {
            if ($android) {
                showToast("Please wait a moment")
            } else {
                $toast = "Please wait a moment"
            }
            return
        }

        if (
            !(activeFilters instanceof Array) ||
            !activeFilters[activeFilterIdx]
        )
            return;

        let element = event?.target;
        let classList = element?.classList;
        if (
            classList?.contains?.("remove-active-filter") ||
            element?.closest?.(".remove-active-filter")
        )
            return;

        let currentFilterCategoryName = selectedFilterCategoryName;
        if (filterType === "number") {
            if (activeFilterIdx >= 0) {
                if (status === "included") {
                    activeFilters[activeFilterIdx].status = "none";
                } else if (status != null) {
                    activeFilters[activeFilterIdx].status = "included";
                }
            }
        } else if (filterType === "bool") {
            if (status === "included") {
                boolFilterIsChecked[currentFilterCategoryName + optionName] =
                    false;
                activeFilters[activeFilterIdx].status = "none";
            } else if (status != null) {
                boolFilterIsChecked[currentFilterCategoryName + optionName] =
                    true;
                activeFilters[activeFilterIdx].status = "included";
            }
        } else if (filterType === "selection") {
            if (status === "included" && !readOnly) {
                activeFilters[activeFilterIdx].status = "excluded";
            } else if (status === "none") {
                activeFilters[activeFilterIdx].status = "included";
            } else {
                activeFilters[activeFilterIdx].status = "none";
            }
        }

        let data;
        if (currentFilterCategoryName === "Media Filter") {
            data = {
                selectedCategory: $selectedCategory,
                mediaFilters: ($loadedMediaLists[
                    $selectedCategory
                ].mediaFilters = activeFilters),
            };
        } else if (currentFilterCategoryName === "Algorithm Filter") {
            data = {
                algorithmFilters: ($algorithmFilters = activeFilters),
            };
        } else if (currentFilterCategoryName === "Content Caution") {
            data = {
                mediaCautions: ($mediaCautions = activeFilters),
            };
        }

        updateFilters(currentFilterCategoryName, data);
    }
    function removeActiveFilter(activeFilterIdx) {
        if ($initData) return pleaseWaitAlert();

        if ($categories?.[$selectedCategory] === true) {
            if ($android) {
                showToast("Please wait a moment")
            } else {
                $toast = "Please wait a moment"
            }
            return
        }

        if (
            !(activeFilters instanceof Array) ||
            !activeFilters[activeFilterIdx]
        )
            return;

        activeFilters.splice(activeFilterIdx, 1);

        let currentFilterCategoryName = selectedFilterCategoryName;
        let data;
        if (currentFilterCategoryName === "Media Filter") {
            data = {
                selectedCategory: $selectedCategory,
                mediaFilters: ($loadedMediaLists[
                    $selectedCategory
                ].mediaFilters = activeFilters),
            };
        } else if (currentFilterCategoryName === "Algorithm Filter") {
            data = {
                algorithmFilters: ($algorithmFilters = activeFilters),
            };
        } else if (currentFilterCategoryName === "Content Caution") {
            data = {
                mediaCautions: ($mediaCautions = activeFilters),
            };
        }

        updateFilters(currentFilterCategoryName, data);
    }
    async function removeAllActiveFilters() {
        if ($initData) {
            return pleaseWaitAlert();
        }

        let currentCategory = $selectedCategory;
        if ($categories?.[currentCategory] === true) {
            if ($android) {
                showToast("Please wait a moment")
            } else {
                $toast = "Please wait a moment"
            }
            return
        }

        let currentFilterCategoryName = selectedFilterCategoryName;
        if (
            await $confirmPromise("Do you want to remove all the active tags?")
        ) {
            if ($initData) {
                return pleaseWaitAlert();
            }
            if ($categories?.[currentCategory] === true) {
                if ($android) {
                    showToast("Please wait a moment")
                } else {
                    $toast = "Please wait a moment"
                }
                return
            }

            let data;
            if (currentFilterCategoryName === "Media Filter") {
                data = {
                    selectedCategory: currentCategory,
                    mediaFilters: ($loadedMediaLists[
                        currentCategory
                    ].mediaFilters = []),
                };
            } else if (currentFilterCategoryName === "Algorithm Filter") {
                data = {
                    algorithmFilters: ($algorithmFilters = []),
                };
            } else if (currentFilterCategoryName === "Content Caution") {
                data = {
                    mediaCautions: ($mediaCautions = []),
                };
            }

            updateFilters(currentFilterCategoryName, data);
        }
    }
    function handleSortFilterPopup(event) {
        if ($initData || !$orderedFilters) {
            return pleaseWaitAlert();
        }

        let element = event.target;
        let classList = element.classList;
        let sortSelectEl = element.closest(".sort-filter");
        let optionsWrap = element.closest(".options-wrap");
        if (
            (classList.contains("sort-filter") || sortSelectEl) &&
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
                requestImmediate(() => {
                    removeClass(optionsWrapToClose, "hide");
                    if (
                        highlightedEl instanceof Element &&
                        highlightedEl.closest(".sort-filter")
                    ) {
                        removeClass(highlightedEl, "highlight");
                        highlightedEl = null;
                    }
                    selectedSortElement = false;
                }, 200);
            } else {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".sort-filter")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedSortElement = false;
            }
        }
    }

    function changeSort(newSortName) {
        if ($initData || !$orderedFilters) {
            return pleaseWaitAlert();
        }

        if (
            $categories?.[$selectedCategory] === true ||
            !$loadedMediaLists?.[$selectedCategory]?.sortBy
        ) {
            if ($android) {
                showToast("Please wait a moment")
            } else {
                $toast = "Please wait a moment"
            }
            return
        }

        let data;
        if (selectedSortName !== newSortName) {
            $loadedMediaLists[$selectedCategory].sortBy = {
                sortName: newSortName,
                sortType: "desc",
            };
            data = {
                selectedCategory: $selectedCategory,
                sortBy: $loadedMediaLists[$selectedCategory].sortBy,
            };
        } else {
            if (selectedSortType === "desc") {
                $loadedMediaLists[$selectedCategory].sortBy.sortType = "asc";
                data = {
                    selectedCategory: $selectedCategory,
                    sortBy: $loadedMediaLists[$selectedCategory].sortBy,
                };
            } else if (selectedSortType === "asc") {
                $loadedMediaLists[$selectedCategory].sortBy.sortType = "desc";
                data = {
                    selectedCategory: $selectedCategory,
                    sortBy: $loadedMediaLists[$selectedCategory].sortBy,
                };
            }
        }

        updateFilters("Media Filter", data);

        if (
            highlightedEl instanceof Element &&
            highlightedEl.closest(".sort-filter")
        ) {
            removeClass(highlightedEl, "highlight");
            highlightedEl = null;
        }

        selectedSortElement = false;
    }
    function changeSortType() {
        if ($initData || !$orderedFilters) {
            return pleaseWaitAlert();
        }

        if (
            $categories?.[$selectedCategory] === true ||
            !$loadedMediaLists?.[$selectedCategory]?.sortBy
        ) {
            if ($android) {
                showToast("Please wait a moment")
            } else {
                $toast = "Please wait a moment"
            }
            return
        }

        let data;
        if (selectedSortType === "desc") {
            $loadedMediaLists[$selectedCategory].sortBy.sortType = "asc";
            data = {
                selectedCategory: $selectedCategory,
                sortBy: $loadedMediaLists[$selectedCategory].sortBy,
            };
        } else if (selectedSortType === "asc") {
            $loadedMediaLists[$selectedCategory].sortBy.sortType = "desc";
            data = {
                selectedCategory: $selectedCategory,
                sortBy: $loadedMediaLists[$selectedCategory].sortBy,
            };
        }

        updateFilters("Media Filter", data);
    }

    let customCategoryName
    async function handleShowFilterOptions() {
        selectedCategoryElement = false;

        customCategoryName = $selectedCategory;
        editCategoryName = false;

        $showFilterOptions = !$showFilterOptions;
        setLocalStorage("showFilterOptions", $showFilterOptions).catch(() => {
            removeLocalStorage("showFilterOptions");
        });
    }

    function hasPartialMatch(strings, query) {
        if (typeof strings !== "string" || typeof query !== "string") return
        return strings.trim().replace(/[\uFF01-\uFF60\uFFE0-\uFFE6\u3000]/g, (ch) => {
            if (ch === '\u3000') return '';
            return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
        }).normalize('NFD').replace(/[^a-zA-Z0-9\p{Lo}]/gu, '').toLowerCase().includes(query)
    }

    let previousCategoryName;
    selectedCategory.subscribe((val) => {
        if (val) {
            if (previousCategoryName && previousCategoryName !== val) {
                mediaLoader({ categorySelected: val });
                customCategoryName = val
                setLocalStorage("selectedCategory", val)
                .catch(() => removeLocalStorage("selectedCategory"))
                .finally(() => saveIDBdata(val, "selectedCategory"));
            } else if (customCategoryName == null) {
                customCategoryName = val
            }
            previousCategoryName = val;
        }
    });

    function handleCategoryPopup(event) {
        let element = event.target;
        let classList = element.classList;
        let iconActions = element.closest(".category-icon-wrap");
        if (iconActions || classList.contains("category-icon-wrap")) return;
        if (!$categories) {
            pleaseWaitAlert();
            if (
                highlightedEl instanceof Element &&
                highlightedEl.closest(".category-wrap")
            ) {
                removeClass(highlightedEl, "highlight");
                highlightedEl = null;
            }
            selectedCategoryElement = false;
            return;
        }
        let option = element.closest(".option");
        if (option || classList.contains("option")) return;
        let sortSelectEl = element.closest(".category-wrap");
        let optionsWrap = element.closest(".options-wrap");
        if (
            (classList.contains("category-wrap") || sortSelectEl) &&
            !selectedCategoryElement &&
            !(classList.contains("closing-x") || element.closest(".closing-x"))
        ) {
            selectedCategoryElement = sortSelectEl || element || true;
        } else if (
            (!optionsWrap ||
                classList.contains("closing-x") ||
                element.closest(".closing-x")) &&
            !classList.contains("options-wrap")
        ) {
            let optionsWrapToClose =
                selectedCategoryElement?.querySelector?.(".options-wrap");
            if (optionsWrapToClose) {
                addClass(optionsWrapToClose, "hide");
                requestImmediate(() => {
                    removeClass(optionsWrapToClose, "hide");
                    if (
                        highlightedEl instanceof Element &&
                        highlightedEl.closest(".category-wrap")
                    ) {
                        removeClass(highlightedEl, "highlight");
                        highlightedEl = null;
                    }
                    selectedCategoryElement = false;
                }, 200);
            } else {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".category-wrap")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                selectedCategoryElement = false;
            }
        }
    }
    async function selectCategory(categoryName) {
        if (!$categories) {
            return pleaseWaitAlert();
        }
        if (
            (!$showFilterOptions || !$gridFullView) &&
            $documentScrollTop > 57
        ) {
            window.scrollY = document.documentElement.scrollTop = 57;
        }
        if ($gridFullView && $selectedMediaGridEl) {
            $selectedMediaGridEl.style.overflow = "hidden";
            $selectedMediaGridEl.style.overflow = "";
            $selectedMediaGridEl.scroll({ left: 0, behavior: "smooth" });
        }
        if ($popupVisible) {
            popupContainer.scrollTop = 0;
        }
        $selectedCategory = categoryName;
        selectedCategoryElement = false;
    }
    async function saveCategoryName() {
        if (!$categories) {
            return pleaseWaitAlert();
        }

        let previousCategoryName = $selectedCategory;
        if ($categories?.[previousCategoryName] === true) {
            if ($android) {
                showToast("Please wait a moment")
            } else {
                $toast = "Please wait a moment"
            }
            return
        }

        let newCategoryName = customCategoryName;
        if (
            newCategoryName &&
            previousCategoryName !== newCategoryName &&
            $categories?.[previousCategoryName]
        ) {
            let categoryNameToShow = `<span style="color:hsl(var(--ac-color));">${trimAllEmptyChar(
                newCategoryName,
            )}</span>`;
            if (
                await $confirmPromise({
                    title: "Save category",
                    text: `Do you want to change the category name to ${categoryNameToShow}?`,
                })
            ) {
                if ($categories?.[previousCategoryName] === true) {
                    if ($android) {
                        showToast("Please wait a moment")
                    } else {
                        $toast = "Please wait a moment"
                    }
                    return
                }

                if (
                    $categories &&
                    newCategoryName &&
                    previousCategoryName !== newCategoryName &&
                    $categories?.[previousCategoryName]
                ) {
                    window.deletedCategory?.(previousCategoryName)

                    delete $categories?.[previousCategoryName];
                    $categories[newCategoryName] = true;
                    
                    $selectedCategory = newCategoryName;

                    editCategoryName = false;

                    loadMedia({
                        renamedCategoryKey: newCategoryName,
                        replacedCategoryKey: previousCategoryName,
                    });
                }
            }
        }
    }
    async function addCategory() {
        if (!$categories) {
            return pleaseWaitAlert();
        }

        let previousCategoryName = $selectedCategory;
        if ($categories?.[previousCategoryName] === true) {
            if ($android) {
                showToast("Please wait a moment")
            } else {
                $toast = "Please wait a moment"
            }
            return
        }

        let newCategoryName = customCategoryName;
        if (newCategoryName && !$categories?.[newCategoryName]) {
            let categoryNameToShow = `<span style="color:hsl(var(--ac-color));">${trimAllEmptyChar(
                newCategoryName,
            )}</span>`;
            if (
                await $confirmPromise({
                    title: "Add custom category",
                    text: `Do you want to add a custom category named ${categoryNameToShow}?`,
                })
            ) {
                if ($categories?.[previousCategoryName] === true) {
                    if ($android) {
                        showToast("Please wait a moment")
                    } else {
                        $toast = "Please wait a moment"
                    }
                    return
                }

                if (
                    $categories &&
                    newCategoryName &&
                    !$categories?.[newCategoryName]
                ) {
                    $categories[newCategoryName] = true;
                    $selectedCategory = newCategoryName;
                    
                    editCategoryName = false;
                    loadMedia({
                        addedCategoryKey: newCategoryName,
                        copiedCategoryKey: previousCategoryName,
                    });
                }
            }
        }
    }

    async function removeCategory() {
        let previousCategoryName = $selectedCategory;
        if (!$categories || !previousCategoryName) {
            return pleaseWaitAlert();
        }

        if ($categories?.[previousCategoryName] === true) {
            if ($android) {
                showToast("Please wait a moment")
            } else {
                $toast = "Please wait a moment"
            }
            return
        }

        if (
            $categories?.[previousCategoryName] &&
            Object.values($categories || {}).length > 1
        ) {
            let categoryNameToShow = `<span style="color:hsl(var(--ac-color));">${trimAllEmptyChar(
                previousCategoryName,
            )}</span>`;
            if (
                await $confirmPromise({
                    title: "Delete category",
                    text: `Do you want to delete the category named ${categoryNameToShow}?`,
                })
            ) {
                if ($categories?.[previousCategoryName] === true) {
                    if ($android) {
                        showToast("Please wait a moment")
                    } else {
                        $toast = "Please wait a moment"
                    }
                    return
                }

                if (
                    previousCategoryName &&
                    $categories &&
                    $categories?.[previousCategoryName] &&
                    Object.values($categories || {}).length > 1
                ) {
                    editCategoryName = false;
                    let previousCategoryIdx = $categoriesKeys?.findIndex?.(
                        (name) => name === previousCategoryName,
                    );
                    let newCategoryName;
                    if (previousCategoryIdx > 0) {
                        newCategoryName =
                            $categoriesKeys[previousCategoryIdx - 1];
                    } else if (
                        previousCategoryIdx === 0 &&
                        $categoriesKeys?.length > 1
                    ) {
                        newCategoryName = $categoriesKeys[1];
                    } else {
                        for (let key in $categories) {
                            if (key !== previousCategoryName) {
                                newCategoryName = key;
                                break;
                            }
                        }
                    }

                    window.deletedCategory?.(previousCategoryName)

                    delete $categories?.[previousCategoryName];
                    delete $loadedMediaLists?.[previousCategoryName];
                    
                    $categories = $categories;
                    $loadedMediaLists = $loadedMediaLists;
                    $selectedCategory = newCategoryName;
                    loadMedia({
                        deletedCategoryKey: previousCategoryName,
                    });
                }
            }
        } else {
            if ($android) {
                showToast("Requires atleast one category")
            } else {
                $toast = "Requires atleast one category"
            }
        }
    }

    function getTagFilterInfoText({ tag, category }, infoToGet) {
        if (infoToGet === "tag category" && tag != null) {
            for (let eCategory in $tagInfo) {
                for (let eTag in $tagInfo[eCategory]) {
                    if (eTag === tag) {
                        return eCategory || "";
                    }
                }
            }
        } else if (infoToGet === "category and description" && tag != null) {
            if (category == null) {
                category = getTagFilterInfoText({ tag }, "tag category");
            }
            let description = $tagInfo?.[category]?.[tag];
            if (description) {
                return `Description: ${description}\n\nCategory: ${category}`;
            }
        } else if (infoToGet === "all tags" && category != null) {
            let categoryInfo = $tagInfo?.[category];
            let categoryTagsArray = Object.keys(categoryInfo || {});
            if (!jsonIsEmpty(categoryInfo)) {
                return categoryTagsArray.join(", ");
            }
        }
        return "";
    }

    function getTagCategoryInfoHTML(tagCategory) {
        let categoryInfo = $tagInfo?.[tagCategory];
        if (
            !tagCategory ||
            !isJsonObject(categoryInfo) ||
            jsonIsEmpty(categoryInfo)
        )
            return "";
        let tagCategoryList = "";
        let tagCategoryListArray = Object.keys($tagInfo?.[tagCategory]) || [];
        for (let i = 0, l = tagCategoryListArray.length; i < l; i++) {
            tagCategoryList += `
                <li onclick="window.showTagInfoHTML?.(event,'${tagCategoryListArray[i]}','${tagCategory}')">
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
        let description = $tagInfo?.[tagCategory]?.[tag];
        if (!tagCategory || !description) return "";
        return `
            <div class="is-custom-table">
                <header class="custom-header">
                    <h1 class="custom-h1">${tag}</h1>
                    <h4 class="custom-extra" onclick="window.showTagCategoryInfoHTML?.(event,'${tagCategory}')">${tagCategory}</h4>
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
            window.showFullScreenInfo?.(tagInfoHTML);
        }
    };

    window.showTagCategoryInfoHTML = (event, tagCategory) => {
        event.stopPropagation();
        let tagCategoryInfoHTML = getTagCategoryInfoHTML(tagCategory);
        if (tagCategoryInfoHTML) {
            window.showFullScreenInfo?.(tagCategoryInfoHTML);
        }
    };

    let editCategoryName = false;
    $: {
        $dropdownIsVisible =
            selectedCategoryElement ||
            selectedFilterElement ||
            selectedFilterCategoryElement ||
            selectedSortElement;
    }

    dropdownIsVisible.subscribe((val) => {
        if (val) {
            window.addHistory?.();
        } else if (val === false && $windowWidth <= 425) {
            // Small Screen Width
            let openedDropdown =
                selectedCategoryElement ||
                selectedFilterCategoryElement ||
                selectedSortElement ||
                selectedFilterElement;
            let optionsWrapToClose =
                openedDropdown?.querySelector?.(".options-wrap");
            if (optionsWrapToClose) {
                addClass(optionsWrapToClose, "hide");
                requestImmediate(() => {
                    removeClass(optionsWrapToClose, "hide");
                    if (highlightedEl instanceof Element) {
                        removeClass(highlightedEl, "highlight");
                        highlightedEl = null;
                    }
                    // Close Category Dropdown
                    selectedCategoryElement = false;
                    // Close Filter Category Dropdown
                    selectedFilterCategoryElement = false;
                    // Close Sort Filter Dropdown
                    selectedSortElement = false;
                    // Close Filter Selection Dropdown
                    openedFilterSelectionName = selectedFilterElement = null;
                }, 200);
            } else {
                if (highlightedEl instanceof Element) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                // Close Category Dropdown
                selectedCategoryElement = false;
                // Close Filter Category Dropdown
                selectedFilterCategoryElement = false;
                // Close Sort Filter Dropdown
                selectedSortElement = false;
                // Close Filter Selection Dropdown
                openedFilterSelectionName = selectedFilterElement = null;
            }
        }
    });

    function pleaseWaitAlert() {
        if ($android) {
            showToast("Please wait a moment")
        } else {
            $toast = "Please wait a moment"
        }
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

    let meanAverageScore = getLocalStorage("meanAverageScore");
    let meanAnimePopularity = getLocalStorage("meanAnimePopularity");
    let meanMangaPopularity = getLocalStorage("meanMangaPopularity");
    let meanNovelPopularity = getLocalStorage("meanNovelPopularity");
    window.updateMeanNumberInfos = (
        newMeanAverageScore,
        newMeanAnimePopularity,
        newMeanMangaPopularity,
        newMeanNovelPopularity
    ) => {
        if (newMeanAverageScore && newMeanAverageScore > 0) {
            meanAverageScore = newMeanAverageScore;
            setLocalStorage("meanAverageScore", meanAverageScore);
        }
        if (newMeanAnimePopularity && newMeanAnimePopularity > 0) {
            meanAnimePopularity = newMeanAnimePopularity;
            setLocalStorage("meanAnimePopularity", meanAnimePopularity);
        }
        if (newMeanMangaPopularity && newMeanMangaPopularity > 0) {
            meanMangaPopularity = newMeanMangaPopularity;
            setLocalStorage("meanMangaPopularity", meanMangaPopularity);
        }
        if (newMeanNovelPopularity && newMeanNovelPopularity > 0) {
            meanNovelPopularity = newMeanNovelPopularity;
            setLocalStorage("meanNovelPopularity", meanNovelPopularity);
        }
    };
    let recListMAPE, recListMAPEIncreased;
    (async () => {
        recListMAPE = await getIDBdata("recListMAPE");
    })();
    window.updateRecListMAPE = (newRecListMAPE) => {
        if (recListMAPE > 0 && recListMAPE !== newRecListMAPE) {
            if (newRecListMAPE < recListMAPE) {
                recListMAPEIncreased = true;
            } else if (newRecListMAPE > recListMAPE) {
                recListMAPEIncreased = false;
            } else {
                recListMAPEIncreased = null;
            }
            recListMAPE = newRecListMAPE;
        } else if (newRecListMAPE > 0) {
            recListMAPE = newRecListMAPE;
        } else {
            recListMAPEIncreased = recListMAPE = null;
        }
    };

    async function handleGridView() {
        $gridFullView = !$gridFullView;
        setLocalStorage("gridFullView", $gridFullView)
            .catch(() => {
                removeLocalStorage("gridFullView");
            })
            .finally(() => {
                saveIDBdata($gridFullView, "gridFullView");
            });
    }

    async function updateList() {
        if ($android && window[$isBackgroundUpdateKey] === true) return;
        if ((await $confirmPromise({
                title: "Reload List",
                text: "Do you want to refresh your list to sync changes?",
            }))
        ) {
            $listUpdateAvailable = false;
            mediaManager({ updateRecommendedMediaList: true });
        }
    }

    onMount(async () => {
        selectedFilterCategoryName = selectedFilterCategoryName || (await getIDBdata("selectedFilterCategoryName")) || "Media Filter";
        popupContainer = document?.getElementById("popup-container");

        window.addEventListener("click", clickOutsideListener);

        document.addEventListener("keydown", async (event) => {
            let key = event.key;
            // 38up 40down 13enter
            if (key === "ArrowUp" || key === "ArrowDown") {
                let element = Array.from(
                    document?.getElementsByClassName?.("options-wrap") || [],
                )?.find?.((el) => {
                    return !el?.classList?.contains?.("display-none");
                });
                if (
                    element?.closest?.(".filter-category") ||
                    element?.closest?.(".sort-filter") ||
                    element?.closest?.(".filter-select") ||
                    element?.closest?.(".category-wrap")
                ) {
                    event.preventDefault();
                    if (
                        highlightedEl instanceof Element &&
                        highlightedEl?.closest?.(".options")?.children?.length
                    ) {
                        let parent = highlightedEl.closest(".options");
                        if (
                            key === "ArrowUp" &&
                            selectedFilterElement &&
                            !highlightedEl?.previousElementSibling
                        ) {
                            filterSelectionOptionsLoaded = true;
                            await tick();
                        }
                        let options = Array.from(
                            parent.querySelectorAll(".option"),
                        );
                        let currentidx = options.indexOf(highlightedEl);
                        let nextEl, iteratedEl, firstEl, lastEl;
                        for (let idx = 0, l = options.length; idx < l; idx++) {
                            if (
                                !options[idx].classList.contains("display-none")
                            ) {
                                if (key === "ArrowUp") {
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
            } else if (key === "Enter") {
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
                    (element?.closest?.(".filter-select") && key !== "Tab") ||
                    (element instanceof Element &&
                        getComputedStyle(element).position === "fixed")
                )
                    return;

                selectedCategoryElement = null;
                selectedFilterCategoryElement = null;
                selectedSortElement = null;
                openedFilterSelectionName = selectedFilterElement = null;

                if (highlightedEl instanceof Element) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
            }
        });

        $gridFullView = $gridFullView ?? (await getIDBdata("gridFullView"));
        if ($gridFullView == null) {
            setLocalStorage("gridFullView", $gridFullView = false)
            .catch((ex) => {
                removeLocalStorage("gridFullView")
                console.error(ex)
            }).finally(() => saveIDBdata(false, "gridFullView"))
        }
    });
</script>

<main
    id="main-home"
    style:--filters-space="{$showFilterOptions ? "80px" : ""}"
    style:--active-tag-filter-space="{$showFilterOptions ? "auto" : ""}"
    style:--category-settings-space="{$showFilterOptions ? "30px" : ""}"
    style:--close-filters-space="{$showFilterOptions ? "42px" : ""}"
    style:--max-filter-selection-height="{maxFilterSelectionHeight}px"
>
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div
        id="category-wrap"
        class={"category-wrap" + (editCategoryName ? ' editing' : '')}
        tabindex="{editCategoryName || $menuVisible || $popupVisible || selectedCategoryElement
            ? ''
            : '0'}"
        style:--edit-cancel-icon="{$showFilterOptions ? "25px" : ""}"
        style:--save-icon="{editCategoryName &&
        customCategoryName &&
        $categories &&
        !$categories?.[customCategoryName] &&
        selectedCategoryMediaFilters
            ? "25px"
            : ""}"
        on:keyup="{(e) => e.key === 'Enter' && handleCategoryPopup(e)}"
        on:click="{handleCategoryPopup}"
    >
        <label class="disable-interaction" for="category-name">
            Search Title
        </label>
        <input
            id="category-name"
            class="category"
            type="text"
            autocomplete="off"
            placeholder="Category"
            style:pointer-events="{editCategoryName ? "" : "none"}"
            disabled="{!editCategoryName}"
            bind:value="{customCategoryName}"
            on:focusin="{() => window.addHistory?.()}"
        />
        {#if !editCategoryName || !$showFilterOptions}
            <div
                class="{'options-wrap ' +
                    (selectedCategoryElement ? '' : 'display-none hide')}"
                on:touchend|passive="{handleOptionsWrapVisibility}"
            >
                {#if $categories}
                    <div
                        class="{'options-wrap-filter-info ' +
                            (selectedCategoryElement ? '' : 'hide')}"
                    >
                        <div class="header">
                            <div class="filter-title">Category</div>
                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                            <svg
                                viewBox="0 0 24 24"
                                class="closing-x"
                                tabindex="{!$menuVisible &&
                                !$popupVisible &&
                                selectedCategoryElement &&
                                $windowWidth <= 425
                                    ? '0'
                                    : '-1'}"
                                on:keyup="{(e) =>
                                    e.key === 'Enter' &&
                                    handleCategoryPopup(e)}"
                                on:click="{handleCategoryPopup}"
                                ><path
                                    fill="#fff"
                                    d="m19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z"
                                ></path></svg
                            >
                        </div>
                        <div class="options">
                            {#each $categoriesKeys || [] as categoryName (categoryName || {})}
                                <div
                                    class="option"
                                    on:click="{() =>
                                        selectCategory(categoryName)}"
                                    on:keyup="{(e) =>
                                        e.key === 'Enter' &&
                                        selectCategory(categoryName)}"
                                >
                                    <h3
                                        style:color="{categoryName ===
                                        $selectedCategory
                                            ? "hsl(var(--ac-color))"
                                            : "inherit"}"
                                    >
                                        {trimAllEmptyChar(categoryName) || ""}
                                    </h3>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
        {#if $showFilterOptions}
            {#if editCategoryName && customCategoryName && $categories && !$categories?.[customCategoryName] && $categories?.[$selectedCategory] !== true}
                <div class="category-icon-wrap">
                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                    <svg
                        class="save-custom-category-name"
                        title="Save Category Name"
                        tabindex="{!$menuVisible &&
                        !$popupVisible &&
                        editCategoryName
                            ? '0'
                            : '-1'}"
                        viewBox="0 0 448 512"
                        on:click="{() => {
                            if (
                                !$selectedCategory ||
                                !customCategoryName ||
                                !selectedCategoryMediaFilters
                            )
                                return;
                            saveCategoryName();
                        }}"
                        on:keyup="{(e) => {
                            if (e.key !== 'Enter') return;
                            if (
                                !$selectedCategory ||
                                !customCategoryName ||
                                !selectedCategoryMediaFilters
                            )
                                return;
                            saveCategoryName();
                        }}"
                    >
                        <!-- xmark and edit -->
                        <path
                            d="M48 96v320c0 9 7 16 16 16h320c9 0 16-7 16-16V171c0-5-2-9-5-12l34-34c12 12 19 29 19 46v245c0 35-29 64-64 64H64c-35 0-64-29-64-64V96c0-35 29-64 64-64h246c17 0 33 7 45 19l74 74-34 34-74-74-1-1v100c0 13-11 24-24 24H104c-13 0-24-11-24-24V80H64c-9 0-16 7-16 16zm80-16v80h144V80H128zm32 240a64 64 0 1 1 128 0 64 64 0 1 1-128 0z"
                        ></path></svg
                    >
                </div>
            {/if}
            <div class="category-icon-wrap">
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <svg
                    class="{editCategoryName
                        ? 'cancel-custom-category-name'
                        : 'edit-custom-category-name'}"
                    tabindex="{!$menuVisible &&
                    !$popupVisible &&
                    $showFilterOptions
                        ? '0'
                        : '-1'}"
                    viewBox="{'0 0' +
                        (editCategoryName ? ' 24 24' : ' 512 512')}"
                    on:click="{async () => {
                        editCategoryName = !editCategoryName;
                        customCategoryName = $selectedCategory;
                        selectedCategoryElement = false;
                        await tick();
                        document?.getElementById?.('category-name')?.focus?.();
                    }}"
                    on:keyup="{async (e) => {
                        if (e.key !== 'Enter') return;
                        editCategoryName = !editCategoryName;
                        customCategoryName = $selectedCategory;
                        selectedCategoryElement = false;
                        await tick();
                        document?.getElementById?.('category-name')?.focus?.();
                    }}"
                >
                    <!-- xmark and edit -->
                    <path
                        d="{editCategoryName
                            ? 'm19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z'
                            : 'M472 22a56 56 0 0 0-80 0l-30 30 98 98 30-30c22-22 22-58 0-80l-18-18zM172 242c-6 6-10 13-13 22l-30 88a24 24 0 0 0 31 31l89-30c8-3 15-7 21-13l168-168-98-98-168 168zM96 64c-53 0-96 43-96 96v256c0 53 43 96 96 96h256c53 0 96-43 96-96v-96a32 32 0 1 0-64 0v96c0 18-14 32-32 32H96c-18 0-32-14-32-32V160c0-18 14-32 32-32h96a32 32 0 1 0 0-64H96z'}"
                    ></path></svg
                >
            </div>
        {/if}
        <div class="category-icon-wrap">
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <svg
                class="show-filter-options"
                tabindex="{$menuVisible || $popupVisible ? '' : '0'}"
                viewBox="0 0 512 512"
                on:click="{() => handleShowFilterOptions()}"
                on:keyup="{(e) =>
                    e.key === 'Enter' && handleShowFilterOptions()}"
            >
                <!-- slider -->
                <path
                    d="M0 416c0 18 14 32 32 32h55a80 80 0 0 0 146 0h247a32 32 0 1 0 0-64H233a80 80 0 0 0-146 0H32c-18 0-32 14-32 32zm128 0a32 32 0 1 1 64 0 32 32 0 1 1-64 0zm192-160a32 32 0 1 1 64 0 32 32 0 1 1-64 0zm32-80c-33 0-61 20-73 48H32a32 32 0 1 0 0 64h247a80 80 0 0 0 146 0h55a32 32 0 1 0 0-64h-55a80 80 0 0 0-73-48zm-160-48a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm73-64a80 80 0 0 0-146 0H32a32 32 0 1 0 0 64h87a80 80 0 0 0 146 0h215a32 32 0 1 0 0-64H265z"
                ></path></svg
            >
        </div>
    </div>
    <div
        class="{'category-settings-wrap' +
            ($showFilterOptions ? '' : ' display-none')}"
        style:--add-icon-size="{$showFilterOptions &&
        customCategoryName &&
        $categories &&
        !$categories?.[customCategoryName] &&
        selectedCategoryMediaFilters &&
        $categories?.[$selectedCategory] !== true
            ? "25px"
            : ""}"
        style:--remove-icon-size="{$categoriesKeys?.length > 1
            ? recListMAPE > 0
                ? "25px"
                : "1fr"
            : ""}"
        style:--mape-size="{recListMAPE > 0 ? "1fr" : ""}"
    >
        {#if filterCategories?.length}
            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
            <span
                class="filter-category"
                on:click="{handleShowFilterCategories}"
                on:keyup="{(e) =>
                    e.key === 'Enter' && handleShowFilterCategories(e)}"
            >
                <h2 class="filter-category-dropdown">
                    {selectedFilterCategoryName || ""}
                    <svg
                        viewBox="0 140 320 512"
                        tabindex="{!$menuVisible &&
                        !$popupVisible &&
                        $showFilterOptions &&
                        !selectedFilterCategoryElement
                            ? '0'
                            : ''}"
                    >
                        <!-- chevron down -->
                        <path
                            d="M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z"
                        ></path></svg
                    >
                </h2>
                <div
                    class="{'options-wrap' +
                        (selectedFilterCategoryElement
                            ? ''
                            : ' display-none hide')}"
                    on:touchend|passive="{handleOptionsWrapVisibility}"
                >
                    <div
                        class="{'options-wrap-filter-info' +
                            (selectedFilterCategoryElement ? '' : ' hide')}"
                    >
                        <div class="header">
                            <div class="filter-title">Filter</div>
                            <svg
                                viewBox="0 0 24 24"
                                class="closing-x"
                                tabindex="{!$menuVisible &&
                                !$popupVisible &&
                                selectedFilterCategoryElement &&
                                $windowWidth <= 425
                                    ? '0'
                                    : '-1'}"
                                on:keyup="{(e) =>
                                    e.key === 'Enter' &&
                                    handleShowFilterCategories(e)}"
                                on:click="{handleShowFilterCategories}"
                                ><path
                                    fill="#fff"
                                    d="m19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z"
                                ></path></svg
                            >
                        </div>
                        <div class="options">
                            {#each filterCategories || [] as filterCategoryName (filterCategoryName || {})}
                                {@const filterCategoryIsSelected = filterCategoryName === selectedFilterCategoryName}
                                <div
                                    class="option"
                                    on:click="{(e) =>
                                        handleFilterCategory(
                                            e,
                                            filterCategoryName,
                                        )}"
                                    on:keyup="{(e) =>
                                        e.key === 'Enter' &&
                                        handleFilterCategory(
                                            e,
                                            filterCategoryName,
                                        )}"
                                >
                                    <h3
                                        style:color="{filterCategoryIsSelected
                                            ? "hsl(var(--ac-color))"
                                            : "inherit"}"
                                    >
                                        {filterCategoryName || ""}
                                    </h3>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </span>
        {:else}
            <div class="skeleton shimmer"></div>
        {/if}
        {#if recListMAPE > 0}
            <div
                class="{'mean-error' + ($isProcessingList ? ' loading' : '')}"
                style:--mean-error-color="{recListMAPEIncreased === true
                    ? "hsl(185deg,65%,50%)"
                    : recListMAPEIncreased === false
                      ? "hsl(345deg,75%,60%)"
                      : ""}"
            >
                {($windowWidth >= 300
                    ? "Error: "
                    : $windowWidth >= 275
                      ? "E: "
                      : "") + formatNumber(recListMAPE) + "%"}
            </div>
        {/if}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        {#if $showFilterOptions && $categoriesKeys?.length > 1}
            <div
                tabindex="{$menuVisible || $popupVisible ? '' : '0'}"
                class="remove-custom-category"
                title="Delete Category"
                style:visibility="{$categoriesKeys?.length > 1 ? "" : "hidden"}"
                on:click="{(e) =>
                    $categoriesKeys?.length > 1 && removeCategory(e)}"
                on:keyup="{(e) =>
                    $categoriesKeys?.length > 1 &&
                    e.key === 'Enter' &&
                    removeCategory(e)}"
            >
                <svg class="filter-category-wrap-icon" viewBox="0 0 448 512">
                    <!-- minus -->
                    <path
                        d="M432 256c0 18-14 32-32 32H48a32 32 0 1 1 0-64h352c18 0 32 14 32 32z"
                    ></path>
                </svg>
            </div>
        {/if}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        {#if $showFilterOptions && customCategoryName && $categories && !$categories?.[customCategoryName] && selectedCategoryMediaFilters && $categories?.[$selectedCategory] !== true}
            <div
                tabindex="{$menuVisible || $popupVisible ? '' : '0'}"
                class="add-custom-category"
                title="Add Custom Category"
                on:click="{(e) => {
                    if (!customCategoryName || !selectedCategoryMediaFilters)
                        return;
                    addCategory(e);
                }}"
                on:keyup="{(e) => {
                    if (
                        e.key !== 'Enter' ||
                        !customCategoryName ||
                        !selectedCategoryMediaFilters
                    )
                        return;
                    addCategory(e);
                }}"
            >
                <svg class="filter-category-wrap-icon" viewBox="0 0 448 512">
                    <!-- add -->
                    <path
                        d="{'M256 80a32 32 0 1 0-64 0v144H48a32 32 0 1 0 0 64h144v144a32 32 0 1 0 64 0V288h144a32 32 0 1 0 0-64H256V80z'}"
                    ></path>
                </svg>
            </div>
        {/if}
    </div>
    <div
        class="{'filters' +
            ($showFilterOptions ? '' : ' display-none') +
            ($hasWheel ? ' has-wheel' : '') +
            (shouldScrollSnap && $android ? ' android' : '')}"
        id="filters"
        on:wheel="{(e) => {
            horizontalWheel(e, 'filters');
            if ($gridFullView) {
                if (!scrollingToTop && e.deltaY < 0) {
                    scrollingToTop = true;
                    let newScrollPosition = 0;
                    document.documentElement.scrollTop = newScrollPosition;
                    scrollingToTop = false;
                }
            }
        }}"
        style:--max-padding-height="{selectedFilterElement
            ? maxFilterSelectionHeight + 65 + "px"
            : "0"}"
    >
        {#if filterCategories && ($orderedFilters || $nonOrderedFilters)}
            {#each filterCategories || [] as filterCategoryName (filterCategoryName || {})}
                {@const filterCategoryIsSelected = filterCategoryName === selectedFilterCategoryName}
                {#if $orderedFilters && filterCategoriesSelections}
                    {@const categoryIsAlgorithmFilter = filterCategoryName === "Algorithm Filter"}
                    {@const filterSelections = filterCategoriesSelections?.[filterCategoryName] || []}
                    {#each filterSelections || [] as filterSelectionName (filterCategoryName + filterSelectionName || {})}
                        {@const filterSelectionKey = filterCategoryName + "_" + filterSelectionName}
                        {@const filterSelectionIsSelected = filterCategoryIsSelected && filterSelectionName === openedFilterSelectionName}
                        <div
                            class="{'filter-select' +
                                (filterCategoryIsSelected
                                    ? ''
                                    : ' display-none')}"
                        >
                            <div class="filter-name">
                                <h2>
                                    {filterSelectionName || ""}
                                </h2>
                            </div>
                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                            <div
                                class="select"
                                tabindex="{!$menuVisible &&
                                !$popupVisible &&
                                $showFilterOptions &&
                                $windowWidth <= 425 &&
                                filterCategoryIsSelected
                                    ? '0'
                                    : '-1'}"
                                on:keyup="{(e) =>
                                    (e.key === 'Enter' ||
                                        e.key === 'ArrowDown' ||
                                        e.key === 'ArrowUp') &&
                                    filterCategorySelect(
                                        e,
                                        filterSelectionName,
                                    )}"
                                on:click="{(e) => {
                                    filterCategorySelect(
                                        e,
                                        filterSelectionName,
                                    );
                                }}"
                            >
                                <div class="value-wrap">
                                    <label
                                        class="disable-interaction"
                                        for="{filterSelectionKey}"
                                    >
                                        {filterSelectionKey}
                                    </label>
                                    <input
                                        tabindex="{!$menuVisible &&
                                        !$popupVisible &&
                                        $showFilterOptions
                                            ? '0'
                                            : '-1'}"
                                        id="{filterSelectionKey}"
                                        placeholder="Any"
                                        type="search"
                                        enterkeyhint="search"
                                        autocomplete="off"
                                        class="value-input"
                                        bind:value="{filterSelectionsSearch[
                                            filterSelectionKey
                                        ]}"
                                        disabled="{!$showFilterOptions ||
                                            $windowWidth <= 425 ||
                                            !filterCategoryIsSelected}"
                                        on:focusin="{() =>
                                            window.addHistory?.()}"
                                    />
                                </div>
                                {#if filterSelectionIsSelected}
                                    <svg
                                        class="angle-up"
                                        viewBox="0 0 512 512"
                                        on:keyup="{(e) =>
                                            e.key === 'Enter' &&
                                            closeFilterSelect()}"
                                        on:click="{closeFilterSelect}"
                                    >
                                        <!-- angle-up -->
                                        <path
                                            d="M201 137c13-12 33-12 46 0l160 160a32 32 0 0 1-46 46L224 205 87 343a32 32 0 0 1-46-46l160-160z"
                                        ></path>
                                    </svg>
                                {:else}
                                    <svg
                                        class="angle-down"
                                        viewBox="0 0 512 512"
                                    >
                                        <!-- angle-down -->
                                        <path
                                            d="M201 343c13 12 33 12 46 0l160-160a32 32 0 0 0-46-46L224 275 87 137a32 32 0 0 0-46 46l160 160z"
                                        ></path>
                                    </svg>
                                {/if}
                            </div>
                            <div
                                class="{'options-wrap' +
                                    (filterSelectionIsSelected
                                        ? ''
                                        : ' display-none hide')}"
                                on:wheel|stopPropagation="{() => {}}"
                                on:touchend|passive="{handleOptionsWrapVisibility}"
                            >
                                <div
                                    class="{'options-wrap-filter-info' +
                                        (filterSelectionIsSelected
                                            ? ''
                                            : ' hide')}"
                                >
                                    <div class="header">
                                        <div class="filter-title">
                                            {filterSelectionName || ""}
                                        </div>
                                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                        <svg
                                            viewBox="0 0 24 24"
                                            class="closing-x"
                                            tabindex="{!$menuVisible &&
                                            !$popupVisible &&
                                            $showFilterOptions &&
                                            filterSelectionIsSelected
                                                ? '0'
                                                : '-1'}"
                                            on:keyup="{(e) =>
                                                e.key === 'Enter' &&
                                                closeFilterSelect()}"
                                            on:click="{closeFilterSelect}"
                                            ><path
                                                fill="#fff"
                                                d="m19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z"
                                            ></path></svg
                                        >
                                    </div>
                                    <label
                                        class="disable-interaction"
                                        for="{'Search ' + filterSelectionKey}"
                                    >
                                        {"Search " + filterSelectionKey}
                                    </label>
                                    <input
                                        tabindex="{!$menuVisible &&
                                        !$popupVisible &&
                                        $showFilterOptions
                                            ? '0'
                                            : '-1'}"
                                        id="{'Search ' + filterSelectionKey}"
                                        placeholder="Any"
                                        type="search"
                                        enterkeyhint="search"
                                        autocomplete="off"
                                        bind:value="{filterSelectionsSearch[
                                            filterSelectionKey
                                        ]}"
                                        disabled="{!$showFilterOptions ||
                                            !filterCategoryIsSelected ||
                                            !filterSelectionIsSelected}"
                                        on:focusin="{() =>
                                            window.addHistory?.()}"
                                    />
                                    <div
                                        class="options"
                                        on:wheel|stopPropagation="{() => {}}"
                                    >
                                        {#if filterSelectionIsSelected}
                                            {@const isCOO = filterSelectionName === "country of origin"}
                                            {@const filterSelectionSearchWord = filterSelectionsSearch[filterSelectionKey]?.trim?.().replace(/[\uFF01-\uFF60\uFFE0-\uFFE6\u3000]/g, (ch) => {
                                                if (ch === '\u3000') return '';
                                                return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
                                            }).normalize('NFD').replace(/[^a-zA-Z0-9\p{Lo}]/gu, '').toLowerCase()}
                                            {@const selectionOptions = filterSelectionSearchWord ? 
                                                $orderedFilters?.[filterSelectionName]?.filter?.((option) => hasPartialMatch(option, filterSelectionSearchWord))
                                                : $orderedFilters?.[filterSelectionName]
                                            }
                                            {#if selectionOptions?.length}
                                                {@const isReadOnly =
                                                    filterCategoryName ===
                                                        "Media Filter" &&
                                                    $filterConfig
                                                        ?.readOnly?.[
                                                        filterSelectionName
                                                    ]}
                                                {@const filterCategoryArray =
                                                    filterCategoryName ===
                                                    "Media Filter"
                                                        ? selectedCategoryMediaFilters
                                                        : filterCategoryName ===
                                                            "Algorithm Filter"
                                                        ? $algorithmFilters
                                                        : filterCategoryName ===
                                                            "Content Caution"
                                                            ? $mediaCautions
                                                            : []}
                                                {#each selectionOptions || [] as optionName, optionIdx (optionName || {})}
                                                    {#if categoryIsAlgorithmFilter || optionName !== "all"}
                                                        {@const status = filterCategoryArray?.find?.((filter) =>
                                                            filter?.optionName === optionName &&
                                                            filter?.optionCategory === filterSelectionName &&
                                                            filter?.filterType === "selection"
                                                        )?.status}
                                                        {#await filterSelectionOptionsLoaded ? 1 : new Promise((resolve) => setTimeout(resolve, Math.min(optionIdx * 17, 2000000000)))}{""}{:then}
                                                            <div
                                                                title="{getTagFilterInfoText(
                                                                    filterSelectionName ===
                                                                        'tag category'
                                                                        ? {
                                                                            category:
                                                                                optionName,
                                                                        }
                                                                        : filterSelectionName ===
                                                                            'tag'
                                                                        ? {
                                                                                tag: optionName,
                                                                            }
                                                                        : {},
                                                                    filterSelectionName ===
                                                                        'tag category'
                                                                        ? 'all tags'
                                                                        : filterSelectionName ===
                                                                            'tag'
                                                                        ? 'category and description'
                                                                        : '',
                                                                )}"
                                                                class="option"
                                                                on:click="{handleFilterSelectionOptionChange(
                                                                    optionName,
                                                                    filterSelectionName,
                                                                    filterCategoryName,
                                                                    isReadOnly,
                                                                )}"
                                                                on:keyup="{(
                                                                    e,
                                                                ) =>
                                                                    e.key ===
                                                                        'Enter' &&
                                                                    handleFilterSelectionOptionChange(
                                                                        optionName,
                                                                        filterSelectionName,
                                                                        filterCategoryName,
                                                                        isReadOnly,
                                                                    )}"
                                                            >
                                                                <h3>
                                                                    {#if isCOO}
                                                                        {@const upperCaseCC = optionName?.toUpperCase?.()}
                                                                        {@const fullCountryName = COOs[upperCaseCC]}
                                                                        {#if fullCountryName}
                                                                            {`${fullCountryName} (${upperCaseCC})`}
                                                                        {:else}
                                                                            {upperCaseCC || optionName || ""}
                                                                        {/if}
                                                                    {:else}
                                                                        {optionName || ""}
                                                                    {/if}
                                                                </h3>
                                                                {#if status === "included" || (status === "excluded" && !isReadOnly)}
                                                                    <svg
                                                                        class="item-info"
                                                                        viewBox="0 0 512 512"
                                                                        style:--option-color="{status ===
                                                                        "included"
                                                                            ? // green
                                                                            "#5f9ea0"
                                                                            : // red
                                                                            "#e85d75"}"
                                                                    >
                                                                        <path
                                                                            class="item-info-path"
                                                                            d="{status ===
                                                                                'excluded' ||
                                                                            filterCategoryName ===
                                                                                'Content Caution'
                                                                                ? // circle-xmark
                                                                                'M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-81-337c-9 9-9 25 0 34l47 47-47 47c-9 9-9 24 0 34s25 9 34 0l47-47 47 47c9 9 24 9 34 0s9-25 0-34l-47-47 47-47c9-10 9-25 0-34s-25-9-34 0l-47 47-47-47c-10-9-25-9-34 0z'
                                                                                : // circle-check
                                                                                'M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm113-303c9-9 9-25 0-34s-25-9-34 0L224 286l-47-47c-9-9-24-9-34 0s-9 25 0 34l64 64c10 9 25 9 34 0l128-128z'}"

                                                                        ></path>
                                                                    </svg>
                                                                {/if}
                                                                {#if typeof window.showFullScreenInfo === "function" && ((filterSelectionName === "tag" && getTagFilterInfoText({ tag: optionName }, "category and description")) || (filterSelectionName === "tag category" && !jsonIsEmpty($tagInfo?.[optionName])))}
                                                                    <svg
                                                                        class="extra-item-info"
                                                                        viewBox="0 0 512 512"
                                                                        on:click|stopPropagation="{() => {
                                                                            let htmlToShow =
                                                                                '';
                                                                            if (
                                                                                filterSelectionName ===
                                                                                'tag'
                                                                            ) {
                                                                                htmlToShow =
                                                                                    getTagInfoHTML(
                                                                                        optionName,
                                                                                    );
                                                                            } else if (
                                                                                filterSelectionName ===
                                                                                'tag category'
                                                                            ) {
                                                                                htmlToShow =
                                                                                    getTagCategoryInfoHTML(
                                                                                        optionName,
                                                                                    );
                                                                            }
                                                                            window.showFullScreenInfo?.(
                                                                                htmlToShow,
                                                                            );
                                                                        }}"
                                                                        on:keyup|stopPropagation="{(
                                                                            e,
                                                                        ) => {
                                                                            if (
                                                                                e.key ===
                                                                                'Enter'
                                                                            ) {
                                                                                let htmlToShow =
                                                                                    '';
                                                                                if (
                                                                                    filterSelectionName ===
                                                                                    'tag'
                                                                                ) {
                                                                                    htmlToShow =
                                                                                        getTagInfoHTML(
                                                                                            optionName,
                                                                                        );
                                                                                } else if (
                                                                                    filterSelectionName ===
                                                                                    'tag category'
                                                                                ) {
                                                                                    htmlToShow =
                                                                                        getTagCategoryInfoHTML(
                                                                                            optionName,
                                                                                        );
                                                                                }
                                                                                window.showFullScreenInfo?.(
                                                                                    htmlToShow,
                                                                                );
                                                                            }
                                                                        }}"
                                                                        ><path
                                                                            class="item-info-path"
                                                                            d="M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-40-176h24v-64h-24a24 24 0 1 1 0-48h48c13 0 24 11 24 24v88h8a24 24 0 1 1 0 48h-80a24 24 0 1 1 0-48zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"

                                                                        ></path></svg
                                                                    >
                                                                {/if}
                                                            </div>
                                                        {/await}
                                                    {/if}
                                                {/each}
                                            {:else}
                                                <div class="option">
                                                    <h3>No Results</h3>
                                                </div>
                                            {/if}
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/each}
                {/if}
                {@const boolFilters =
                    $nonOrderedFilters?.[filterCategoryName]?.bool}
                {#each boolFilters || [] as boolFilterName (filterCategoryName + boolFilterName || {})}
                    {#if filterCategoryIsSelected && boolFilterIsChecked[filterCategoryName + boolFilterName] != null}
                        {@const boolFilterKey =
                            filterCategoryName + boolFilterName}
                        <div class="filter-bool-container">
                            <div style:visibility="none"></div>
                            <div
                                class="filter-bool-wrap"
                                on:click="{(e) =>
                                    handleCheckboxChange(
                                        e,
                                        boolFilterName,
                                        filterCategoryName,
                                    )}"
                                on:keyup="{(e) =>
                                    e.key === 'Enter' &&
                                    handleCheckboxChange(
                                        e,
                                        boolFilterName,
                                        filterCategoryName,
                                    )}"
                            >
                                <label
                                    class="disable-interaction"
                                    for="{'Checkbox: ' + boolFilterKey}"
                                >
                                    {boolFilterKey}
                                </label>
                                <input
                                    tabindex="{!$menuVisible &&
                                    !$popupVisible &&
                                    $showFilterOptions
                                        ? '0'
                                        : '-1'}"
                                    id="{'Checkbox: ' + boolFilterKey}"
                                    type="checkbox"
                                    class="filter-bool"
                                    on:change="{(e) => {
                                        if (
                                            !filterCategories ||
                                            !$nonOrderedFilters
                                        ) {
                                            return pleaseWaitAlert();
                                        } else {
                                            handleCheckboxChange(
                                                e,
                                                boolFilterName,
                                                filterCategoryName,
                                            );
                                        }
                                    }}"
                                    bind:checked="{boolFilterIsChecked[
                                        boolFilterKey
                                    ]}"
                                    disabled="{!$showFilterOptions ||
                                        $initData}"
                                />
                                <div class="filter-bool-label">
                                    {boolFilterName || ""}
                                </div>
                            </div>
                        </div>
                    {/if}
                {/each}
                {@const numberFilters = $nonOrderedFilters?.[filterCategoryName]?.number}
                {#each numberFilters || [] as { name, defaultValue, maxValue, minValue } (filterCategoryName + name || {})}
                    {#if filterCategoryIsSelected}
                        {@const numberFilterKey = filterCategoryName + name}
                        {@const filterCategoryArray =
                            filterCategoryName === "Media Filter"
                                ? selectedCategoryMediaFilters
                                : filterCategoryName === "Algorithm Filter"
                                  ? $algorithmFilters
                                  : filterCategoryName === "Content Caution"
                                    ? $mediaCautions
                                    : []}
                        <div
                            class="filter-input-number"
                            style:display="{filterCategoryIsSelected
                                ? ""
                                : "none"}"
                        >
                            <div class="filter-input-number-name">
                                <h2>{name || ""}</h2>
                            </div>
                            <div class="value-input-number-wrap">
                                <label
                                    class="disable-interaction"
                                    for="{'Number Filter: ' + numberFilterKey}"
                                >
                                    {"Number Filter: " + numberFilterKey}
                                </label>
                                {#key $selectedCategory + $showFilterOptions + (filterCategoryArray instanceof Array ? 1 : 0)}
                                    <input
                                        use:setDefaultInputNumberValue="{filterCategoryArray?.find?.(
                                            (filter) =>
                                                filter?.optionName === name &&
                                                filter?.filterType === 'number',
                                        )?.optionValue}"
                                        tabindex="{!$menuVisible &&
                                        !$popupVisible &&
                                        $showFilterOptions
                                            ? '0'
                                            : '-1'}"
                                        id="{'Number Filter: ' +
                                            numberFilterKey}"
                                        class="value-input-number"
                                        type="text"
                                        placeholder="{name === 'scoring system'
                                            ? 'Default: User Scoring'
                                            : (name === 'average score' || name === 'min average score') && typeof meanAverageScore === 'number' && meanAverageScore > 0
                                            ? 'Average: ' + formatNumber(meanAverageScore)
                                            : name === 'popularity' && (
                                                (typeof meanAnimePopularity === 'number' && meanAnimePopularity > 0) ||
                                                (typeof meanMangaPopularity === 'number' && meanMangaPopularity > 0) ||
                                                (typeof meanNovelPopularity === 'number' && meanNovelPopularity > 0)
                                            )
                                            ? [meanAnimePopularity, meanMangaPopularity, meanNovelPopularity].map((e) => typeof e === 'number' && e > 0 ? formatNumber(e, 0) : 'N/A').join(' | ')
                                            : name === 'min anime popularity' && typeof meanAnimePopularity === 'number' && meanAnimePopularity > 0
                                            ? 'Average: ' + formatNumber(meanAnimePopularity, meanAnimePopularity >= 1000 ? 1 : 0)
                                            : name === 'min manga popularity' && typeof meanMangaPopularity === 'number' && meanMangaPopularity > 0
                                            ? 'Average: ' + formatNumber(meanMangaPopularity, meanMangaPopularity >= 1000 ? 1 : 0)
                                            : name === 'min novel popularity' && typeof meanNovelPopularity === 'number' && meanNovelPopularity > 0
                                            ? 'Average: ' + formatNumber(meanNovelPopularity, meanNovelPopularity >= 1000 ? 1 : 0)
                                            : defaultValue != null
                                            ? 'Default: ' + defaultValue
                                            : conditionalInputNumberList.includes(name)
                                            ? '>123 or 123'
                                            : '123'}"
                                        on:input="{(e) => {
                                            if ($initData) {
                                                return pleaseWaitAlert();
                                            }
                                            let newValue = e.target.value;
                                            let oldValue =
                                                numberFiltersValues[
                                                    numberFilterKey
                                                ] ??
                                                filterCategoryArray?.find?.(
                                                    (filter) =>
                                                        filter?.optionName ===
                                                            name &&
                                                        filter?.filterType ===
                                                            'number',
                                                )?.optionValue ??
                                                '';
                                            numberFiltersValues[
                                                numberFilterKey
                                            ] = newValue;
                                            handleInputNumber(
                                                e,
                                                name,
                                                oldValue,
                                                newValue,
                                                maxValue,
                                                minValue,
                                                filterCategoryName,
                                            );
                                        }}"
                                        disabled="{!$showFilterOptions ||
                                            $initData}"
                                        on:focusin="{() =>
                                            window.addHistory?.()}"
                                    />
                                {/key}
                            </div>
                        </div>
                    {/if}
                {/each}
            {/each}
        {/if}
        {#if !filterCategories || !($orderedFilters && $nonOrderedFilters)}
            {#each Array(10) as _}
                <div class="filter-select">
                    <div class="filter-name skeleton shimmer"></div>
                    <div class="select skeleton shimmer"></div>
                </div>
            {/each}
        {/if}
    </div>
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div
        id="active-filters"
        class="{'active-filters' + ($showFilterOptions ? '' : ' display-none')}"
    >
        <div id="tag-filters" class="tag-filters">
            <div
                tabindex="{!$menuVisible && !$popupVisible && $showFilterOptions
                    ? '0'
                    : '-1'}"
                class="empty-tag-filter"
                title="Remove Filters"
                on:click="{removeAllActiveFilters}"
                on:keyup="{(e) =>
                    e.key === 'Enter' && removeAllActiveFilters()}"
            >
                <!-- Ban -->
                <svg viewBox="0 0 512 512">
                    <path
                        d="M367 413 100 145a192 192 0 0 0 268 268zm45-46A192 192 0 0 0 145 99l269 268zM1 256a256 256 0 1 1 512 0 256 256 0 1 1-512 0z"
                    ></path>
                </svg>
            </div>
            {#each activeFilters || [] as { filterType, optionName, optionCategory, status, optionValue }, activeFilterIdx (filterType + optionName + (optionCategory ?? "") || {})}
                {@const addTagInfo = optionCategory === "tag" && optionName !== "all"}
                {@const addTagCategoryInfo = optionCategory === "tag category" && optionName !== "all"}
                <div
                    class="active-tag-filter"
                    title={(
                        addTagInfo ? (getTagFilterInfoText({ tag: optionName }, "category and description") || "") :
                        addTagCategoryInfo ? (getTagFilterInfoText({ category: optionName }, "all tags") || "")
                        : ""
                    )}
                    tabindex="{!$menuVisible &&
                    !$popupVisible &&
                    $showFilterOptions
                        ? '0'
                        : '-1'}"
                    style:--active-tag-filter-color="{status === "included"
                        ? "hsl(185deg, 65%, 50%)"
                        : status === "excluded"
                        ? "hsl(345deg, 75%, 60%)"
                        : "hsl(0deg, 0%, 50%)"}"
                    on:click="{(e) =>
                        changeActiveStatus(
                            e,
                            filterType,
                            optionName,
                            activeFilterIdx,
                            status,
                            $filterConfig?.readOnly?.[optionCategory],
                        )}"
                    on:keyup="{(e) =>
                        e.key === 'Enter' &&
                        changeActiveStatus(
                            e,
                            filterType,
                            optionName,
                            activeFilterIdx,
                            status,
                            $filterConfig?.readOnly?.[optionCategory],
                        )}"
                >
                    <div class="active-filter">
                        {#if filterType === "number"}
                            <h3>
                                {optionName + " : " + optionValue || ""}
                            </h3>
                        {:else if optionCategory}
                            {#if optionCategory === "country of origin"}
                                {@const upperCaseCC = optionName?.toUpperCase?.()}
                                {@const fullCountryName = COOs[upperCaseCC]}
                                <h3>
                                    {`${optionCategory} : ${fullCountryName || upperCaseCC || ''}`}
                                </h3>
                            {:else}
                                <h3>
                                    {`${optionCategory} : ${optionName || ''}`}
                                </h3>
                            {/if}
                        {:else}
                            <h3>{optionName || ""}</h3>
                        {/if}
                    </div>
                    <!-- xmark -->
                    <svg
                        class="remove-active-filter"
                        viewBox="0 0 24 24"
                        tabindex="{!$menuVisible &&
                        !$popupVisible &&
                        $showFilterOptions
                            ? '0'
                            : '-1'}"
                        on:click|preventDefault="{() =>
                            removeActiveFilter(activeFilterIdx)}"
                        on:keyup="{(e) =>
                            e.key === 'Enter' &&
                            removeActiveFilter(activeFilterIdx)}"
                    >
                        <path
                            d="m19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z"
                        ></path>
                    </svg>
                </div>
            {/each}
        </div>
    </div>
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div
        class="{'close-filters' + ($showFilterOptions ? '' : ' display-none')}"
        on:click="{() => handleShowFilterOptions()}"
        on:keyup="{(e) => e.key === 'Enter' && handleShowFilterOptions()}"
        tabindex="{!$menuVisible && !$popupVisible && $showFilterOptions
            ? '0'
            : '-1'}"
    >
        <!-- Angle up -->
        <svg viewBox="0 0 512 512"
            ><path
                d="M201 137c13-12 33-12 46 0l160 160a32 32 0 0 1-46 46L224 205 87 343a32 32 0 0 1-46-46l160-160z"
            ></path></svg
        >
    </div>
    <div id="home-status" class="home-status">
        <span
            class="data-status"
        >
            <h2
                on:click="{() => {
                    getExtraInfo();
                }}"
                on:keyup="{() => {}}"
                class="{(!$dataStatus || !$showStatus) && $loadingDataStatus
                    ? ' loading'
                    : ''}"
            >
                {#if $showStatus && (
                    $dataStatus 
                    || $isImporting 
                    || $isExporting
                    || $loadingCategory[""] 
                    || $loadingCategory[$selectedCategory]
                )}
                    {$dataStatus || "Please Wait"}
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
            tabindex="{$menuVisible || $popupVisible ? '-1' : '0'}"
            bind:value="{$searchedWord}"
            on:focusin="{() => window.addHistory?.()}"
        />
    </div>

    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div class="last-filter-option">
        <div
            tabindex="{$menuVisible || $popupVisible ? '' : '0'}"
            class="change-grid-view"
            on:click="{handleGridView}"
            on:keyup="{(e) => e.key === 'Enter' && handleGridView()}"
        >
            <svg viewBox="{`0 0 ${$gridFullView ? '312' : '512'} 512`}">
                <path
                    d="{$gridFullView
                        ? // arrows-up-down
                          'M183 9a32 32 0 0 0-46 0l-96 96a32 32 0 0 0 46 46l41-42v294l-41-42a32 32 0 0 0-46 46l96 96c13 12 33 12 46 0l96-96a32 32 0 0 0-46-46l-41 42V109l41 42a32 32 0 0 0 46-46L183 9z'
                        : // arrows-left-right
                          'm407 375 96-96c12-13 12-33 0-46l-96-96a32 32 0 0 0-46 46l42 41H109l42-41a32 32 0 0 0-46-46L9 233a32 32 0 0 0 0 46l96 96a32 32 0 0 0 46-46l-42-41h294l-42 41a32 32 0 0 0 46 46z'}"
                ></path>
            </svg>
        </div>
        {#if ($listUpdateAvailable || $loadingCategory[""] || $loadingCategory[$selectedCategory]) && $initComplete}
            <div
                tabindex="{$menuVisible || $popupVisible ? '' : '0'}"
                class="refresh-list"
                on:click="{() => updateList()}"
                on:keyup="{(e) => e.key === 'Enter' && updateList()}"
            >
                <svg viewBox="0 0 512 512">
                    <path
                        d="M105 203a160 160 0 0 1 264-60l17 17h-50a32 32 0 1 0 0 64h128c18 0 32-14 32-32V64a32 32 0 1 0-64 0v51l-18-17a224 224 0 0 0-369 83 32 32 0 0 0 60 22zm-66 86a32 32 0 0 0-23 31v128a32 32 0 1 0 64 0v-51l18 17a224 224 0 0 0 369-83 32 32 0 0 0-60-22 160 160 0 0 1-264 60l-17-17h50a32 32 0 1 0 0-64H48a39 39 0 0 0-9 1z"
                    ></path>
                </svg>
            </div>
        {/if}
        {#if $orderedFilters?.sortFilter && $loadedMediaLists?.[$selectedCategory]?.sortBy}
            <div class="sort-filter">
                <svg
                    viewBox="{`0 ${
                        selectedSortType === 'asc' ? '-' : ''
                    }140 320 512`}"
                    on:click="{changeSortType}"
                    on:keyup="{(e) => e.key === 'Enter' && changeSortType()}"
                    tabindex="{$menuVisible ||
                    $popupVisible ||
                    selectedSortElement
                        ? ''
                        : '0'}"
                >
                    <path
                        d="{// sortdown
                        selectedSortType === 'asc'
                            ? 'M183 41a32 32 0 0 0-46 0L9 169c-9 10-12 23-7 35s17 20 30 20h256a32 32 0 0 0 23-55L183 41z'
                            : // sort up
                              'M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z'}"
                    ></path>
                </svg>
                <h2
                    tabindex="{$menuVisible ||
                    $popupVisible ||
                    selectedSortElement
                        ? ''
                        : '0'}"
                    on:click="{handleSortFilterPopup}"
                    on:keyup="{(e) =>
                        e.key === 'Enter' && handleSortFilterPopup(e)}"
                >
                    {selectedSortName || ""}
                </h2>
                <div
                    class="{'options-wrap ' +
                        (selectedSortElement ? '' : 'display-none hide')}"
                    on:touchend|passive="{handleOptionsWrapVisibility}"
                >
                    <div
                        class="{'options-wrap-filter-info ' +
                            (selectedSortElement ? '' : 'hide')}"
                    >
                        <div class="header">
                            <div class="filter-title">Sort By</div>
                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                            <svg
                                viewBox="0 0 24 24"
                                class="closing-x"
                                tabindex="{!$menuVisible &&
                                !$popupVisible &&
                                selectedSortElement &&
                                $windowWidth <= 425
                                    ? '0'
                                    : ''}"
                                on:keyup="{(e) =>
                                    e.key === 'Enter' &&
                                    handleSortFilterPopup(e)}"
                                on:click="{handleSortFilterPopup}"
                                ><path
                                    fill="#fff"
                                    d="m19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z"
                                ></path></svg
                            >
                        </div>
                        <div class="options">
                            {#each $orderedFilters?.sortFilter || [] as sortFilterName (sortFilterName || {})}
                                <div
                                    class="option"
                                    on:click="{() =>
                                        changeSort(sortFilterName)}"
                                    on:keyup="{(e) =>
                                        e.key === 'Enter' &&
                                        changeSort(sortFilterName)}"
                                >
                                    <h3>{sortFilterName || ""}</h3>
                                    {#if selectedSortName === sortFilterName}
                                        <svg
                                            viewBox="{`0 ${
                                                selectedSortType === 'asc'
                                                    ? '-180'
                                                    : '100'
                                            } 320 512`}"
                                        >
                                            <path
                                                d="{// sortdown
                                                selectedSortType === 'asc'
                                                    ? 'M183 41a32 32 0 0 0-46 0L9 169c-9 10-12 23-7 35s17 20 30 20h256a32 32 0 0 0 23-55L183 41z'
                                                    : // sort up
                                                      'M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z'}"
                                            ></path>
                                        </svg>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
        {:else}
            <div class="sort-filter skeleton shimmer"></div>
        {/if}
    </div>
</main>

<style>
    ::placeholder {
        opacity: 1 !important;
        color: var(--fg-color) !important;
    }

    :-ms-input-placeholder,
    ::-ms-input-placeholder {
        opacity: 1 !important;
        color: var(--fg-color) !important;
    }

    .media-lists {
        display: flex;
        gap: 50px;
        overflow-x: hidden;
    }

    main {
        --filters-space: ;
        --active-tag-filter-space: ;
        --category-settings-space: ;
        display: grid;
        grid-template-rows: 42px var(--category-settings-space) var(--filters-space) var(--active-tag-filter-space) 44px 42px 45px auto;
        padding-top: 15px;
        padding-inline: 50px;
        transition: opacity 0.2s ease-out;
    }

    .skeleton {
        border-radius: 6px !important;
        background-color: hsla(0, 0%, 10%, 0.5) !important;
    }
    .options-wrap {
        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.2) !important;
    }
    .category-wrap {
        --edit-cancel-icon: ;
        --save-icon: ;
        display: grid;
        grid-template-columns: auto var(--save-icon) var(--edit-cancel-icon) 25px;
        align-items: center;
        column-gap: 20px;
        padding: 8px 15px 8px 0px;
        background-color: var(--bg-color);
        border: 1px solid var(--bd-color);
        border-radius: 6px;
        width: 100%;
        height: max-content;
        position: relative;
        cursor: pointer;
    }
    .category-wrap.editing {
        cursor: unset !important;
    }
    .category-wrap .options-wrap {
        position: absolute;
        left: 0;
        top: 42.5px;
        background-color: var(--bg-color);
        border: 1px solid var(--bd-color);
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        max-height: var(--max-filter-selection-height);
        margin-top: 1px;
        border-radius: 6px;
        padding: 6px;
        z-index: 1;
        cursor: default;
        width: 100%;
    }
    .category-wrap .options {
        display: flex;
        align-items: start;
        flex-direction: column;
        cursor: default;
        gap: 5px;
        width: 100%;
    }
    .category-wrap .option {
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
    .category-wrap .option h3 {
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
    .category-selection {
        --edit-icon-width: 0px;
        background-color: var(--bg-color);
        color: var(--fg-color);
        position: absolute;
        opacity: 0;
        width: calc(100% - var(--edit-icon-width) - 35px);
        height: 100%;
    }
    .input-search,
    .category {
        outline: none;
        border: none;
        background-color: transparent;
        color: var(--fg-color);
        width: 100%;
        cursor: text;
    }
    .category {
        padding-left: 15px;
    }
    .add-custom-category,
    .remove-custom-category {
        width: 30px;
        height: 30px;
        display: grid;
        justify-content: center;
        align-items: center;
        margin-left: auto;
    }
    .filter-category-wrap-icon {
        height: 20px;
        width: 20px;
        cursor: pointer;
    }
    .filter-category-dropdown {
        display: grid;
        grid-template-columns: auto 15px;
        gap: 2px;
        align-items: center;
        width: 125px;
        cursor: pointer;
    }
    .filter-category-dropdown > svg {
        width: 15px;
        height: 15px;
    }
    .filter-category .options-wrap {
        position: absolute;
        left: 0;
        top: 27.5px;
        background-color: var(--bg-color);
        border: 1px solid var(--bd-color);
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        max-height: var(--max-filter-selection-height);
        margin-top: 1px;
        border-radius: 6px;
        padding: 6px;
        z-index: 1;
        cursor: default;
    }
    .filter-category .options {
        display: flex;
        align-items: start;
        flex-direction: column;
        cursor: default;
        gap: 5px;
        width: max-content;
    }
    .filter-category .option {
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
    .filter-category .option h3 {
        cursor: pointer;
        text-transform: capitalize;
    }

    .category-icon-wrap {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .show-filter-options {
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

    .category-settings-wrap {
        --add-icon-size: ;
        --mape-size: ;
        --remove-icon-size: ;
        display: grid;
        grid-template-columns: 125px var(--mape-size) var(--remove-icon-size) var(--add-icon-size);
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

    .category-settings-wrap .skeleton {
        height: 18px;
        width: 100px;
    }

    .filter-category {
        overflow-x: auto;
        overflow-y: hidden;
        width: fit-content;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .filter-category::-webkit-scrollbar {
        display: none;
    }

    .filter-category h2 {
        white-space: nowrap;
        user-select: none;
    }

    .mean-error {
        overflow-x: auto;
        overflow-y: hidden;
        color: var(--mean-error-color);
        font-size: 15px;
        user-select: none;
        white-space: nowrap;
        -ms-overflow-style: none;
        scrollbar-width: none;
        text-align: right;
    }

    .mean-error::-webkit-scrollbar {
        display: none;
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
        cursor: pointer;
    }

    .data-status h2.loading {
        animation: loading-blink 1s ease-in-out infinite;
    }
    .mean-error.loading {
        animation: loading-blink 1s ease-in-out infinite;
    }

    .filters {
        overflow-x: auto;
        overflow-y: hidden;
        display: flex;
        gap: 10px;
        flex-wrap: nowrap;
        padding-bottom: var(--max-padding-height);
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
        max-height: var(--max-filter-selection-height);
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
        fill: var(--option-color);
        height: 14px;
        width: 14px;
    }
    .filter-bool-container {
        display: grid;
        grid-template-rows: 18px 30px;
        grid-row-gap: 5px;
        width: 185px;
    }
    .filter-bool-container .filter-bool-wrap {
        min-width: 185px;
        width: 185px;
        cursor: pointer;
    }
    .filter-bool-container .filter-bool-wrap,
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
    .filter-bool-container .filter-bool {
        width: 14px;
        height: 14px;
        border-radius: 6px;
        accent-color: hsl(185, 65%, 40%);
        cursor: pointer;
    }
    .filter-bool-container .filter-bool-label {
        font-weight: 600;
        text-transform: capitalize;
        user-select: none;
        font-size: 14px;
        cursor: pointer;
    }

    @media (pointer: fine) and (hover: hover) {
        .option:hover h3 {
            color: hsl(var(--ac-color)) !important;
        }
    }

    .active-filters {
        display: grid;
        align-items: start;
        justify-content: space-between;
        gap: 15px;
        min-height: 28px;
        width: 100%;
        grid-template-columns: 1fr;
        margin-top: 20px;
    }
    .active-filters.seen-more {
        grid-template-columns: calc(100% - 43px) 28px;
    }

    .active-filters .empty-tag-filter {
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 6px;
        cursor: pointer;
        width: 30px;
        height: 30px;
    }

    .empty-tag-filter svg {
        width: 20px;
        height: 20px;
    }

    .tag-filters {
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
    .tag-filters::-webkit-scrollbar {
        display: none;
    }

    .tag-filters > * {
        scroll-snap-align: start;
    }

    .tag-filters.skeleton {
        height: 28px;
        width: 90px;
    }

    .tag-filters:after {
        content: "";
        flex: 1000 0 auto;
    }

    .active-filters .active-tag-filter {
        animation: fade-in 0.2s ease-out;
        background-color: var(--bg-color);
        color: var(--active-tag-filter-color);
        border: 1px solid var(--active-tag-filter-color);
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
    .active-filter {
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
    .active-filter::-webkit-scrollbar {
        display: none;
    }
    .active-filter > h3 {
        line-height: 1px;
        min-width: max-content;
        text-transform: capitalize;
        cursor: pointer;
    }
    .active-tag-filter svg {
        width: 20px;
        height: 20px;
        fill: var(--active-tag-filter-color) !important;
    }

    .change-grid-view,
    .refresh-list {
        display: flex;
        justify-content: center;
        align-items: center;
        background: var(--bg-color);
        border-radius: 6px;
        cursor: pointer;
        width: 30px;
        height: 30px;
    }
    .change-grid-view svg,
    .refresh-list svg {
        height: 15px;
        width: 15px;
    }

    .last-filter-option {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        min-height: 30px;
        margin-top: 12px;
    }

    .sort-filter {
        display: flex;
        justify-content: end;
        align-items: center;
        gap: 4px;
        margin-left: auto;
        position: relative;
    }
    .sort-filter.skeleton {
        min-height: 17px;
        min-width: 109px;
    }
    .sort-filter > h2 {
        text-align: end;
    }
    .sort-filter h2,
    .sort-filter h3,
    .sort-filter svg {
        user-select: none;
        cursor: pointer;
        text-transform: capitalize;
    }

    .sort-filter svg {
        height: 15px;
        width: 15px;
    }

    .sort-filter .options-wrap {
        position: absolute;
        display: flex;
        right: 0;
        top: 20px;
        background-color: var(--bg-color);
        border: 1px solid var(--bd-color);
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        max-height: var(--max-filter-selection-height);
        margin-top: 1px;
        border-radius: 6px;
        padding: 6px;
        z-index: 1;
        cursor: default;
    }
    .sort-filter .options {
        display: flex;
        align-items: start;
        flex-direction: column;
        cursor: default;
        gap: 5px;
        width: max-content;
    }
    .sort-filter .option {
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

    .sort-filter .options .option:last-child {
        padding-bottom: 15px;
    }

    .sort-filter .option svg {
        margin-left: auto;
        height: 15px;
        width: 15px;
    }

    .shimmer {
        position: relative;
        overflow: hidden;
    }

    .shimmer::before {
        animation: loading-shimmer 2s linear infinite;
        position: absolute;
        background: linear-gradient(90deg,hsla(0, 0%, 10%, 0) 0,hsla(0, 0%, 100%, 0.06) 40%,hsla(0, 0%, 100%, 0.06) 60%,hsla(0, 0%, 10%, 0));
        content: "";
        display: block;
        height: 100%;
        transform: translateX(0) translateZ(0);
        width: 200%;
    }
    @keyframes loading-shimmer {
        0% {
            transform: translateX(-100%) translateZ(0);
        }
        100% {
            transform: translateX(100%) translateZ(0);
        }
    }

    @keyframes loading-blink {
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
    .filters.has-wheel {
        scroll-snap-type: none !important;
    }
    .filters.has-wheel > * {
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

    input[type="search"]:not(:hover):not(:focus):not(:disabled):not(:placeholder-shown)::-webkit-search-cancel-button {
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
            background-image: var(--x-close-icon);
            background-size: 15px;
        }
        #input-search[type="search"]::-webkit-search-cancel-button {
            -webkit-appearance: none;
            appearance: none;
            height: 20px;
            width: 20px;
            background-image: var(--x-close-icon);
            background-size: 20px;
        }
    }

    @media screen and (hover: hover) and (pointer: fine) {
        .filters {
            scroll-snap-type: none !important;
        }
    }

    @media screen and (max-width: 750px) {
        main {
            padding-inline: 10px;
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
        .filter-category .options-wrap,
        .filter-select .options-wrap,
        .sort-filter .options-wrap,
        .category-wrap .options-wrap {
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
            border: none !important;
            padding: 0 !important;
            transform: translateZ(0);
        }
        .options-wrap {
            opacity: 1;
            transition: opacity 0.2s ease-out;
            animation: fade-in 0.2s ease-out;
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

        .filter-category .options,
        .sort-filter .options,
        .category-wrap .options {
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
                background-image: var(--x-close-icon);
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
        user-select: none !important;
        touch-action: none !important;
        -webkit-user-drag: none !important;
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
