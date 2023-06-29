<script>
    import { onMount, tick } from "svelte";
    import { saveJSON } from "../../js/indexedDB.js";
    import {
        finalAnimeList,
        animeLoaderWorker,
        filterOptions,
        activeTagFilters,
        searchedAnimeKeyword,
        dataStatus,
        updateRecommendationList,
        loadAnime,
        username,
        initData,
        confirmPromise,
        asyncAnimeReloaded,
    } from "../../js/globalValues.js";
    import { fade, fly } from "svelte/transition";
    import {
        addClass,
        changeInputValue,
        dragScroll,
        removeClass,
    } from "../../js/others/helper.js";

    let Init = true;

    let windowWidth = window.innerWidth;
    let maxFilterSelectionHeight;
    let unsubFilterDragScroll;

    let selectedFilterTypeElement;
    let selectedFilterElement;
    let selectedSortElement;
    let highlightedEl;

    let filterScrollTimeout;
    let filterIsScrolling;

    let showAllActiveFilters = false;

    let nameChangeUpdateProcessedList = ["Algorithm Filter"];
    let nameChangeUpdateFinalList = ["sort", "Anime Filter", "Content Caution"];
    let conditionalInputNumberList = [
        "weighted score",
        "score",
        "average score",
        "user score",
        "popularity",
    ];
    let saveFiltersTimeout;
    let lastChangeName;

    function saveFilters(changeName) {
        if (saveFiltersTimeout && lastChangeName === changeName) {
            clearTimeout(saveFiltersTimeout);
        }
        lastChangeName = changeName;
        saveFiltersTimeout = setTimeout(async () => {
            if (nameChangeUpdateProcessedList.includes(changeName)) {
                if ($animeLoaderWorker) {
                    $animeLoaderWorker.terminate();
                    $animeLoaderWorker = null;
                }
                $finalAnimeList = null;
                $dataStatus = "Updating List";
                await saveJSON(true, "shouldProcessRecommendation");
                await saveJSON($filterOptions, "filterOptions");
                await saveJSON($activeTagFilters, "activeTagFilters");
                $updateRecommendationList = !$updateRecommendationList;
            } else if (nameChangeUpdateFinalList.includes(changeName)) {
                if ($animeLoaderWorker) {
                    $animeLoaderWorker.terminate();
                    $animeLoaderWorker = null;
                }
                $finalAnimeList = null;
                $dataStatus = "Updating List";
                await saveJSON($filterOptions, "filterOptions");
                await saveJSON($activeTagFilters, "activeTagFilters");
                $loadAnime = !$loadAnime;
            } else {
                await saveJSON($filterOptions, "filterOptions");
                await saveJSON($activeTagFilters, "activeTagFilters");
            }
        }, 300);
    }

    async function scrollToFirstTagFilter() {
        let parentEl = document.getElementById("tagFilters");
        await tick();
        if (parentEl instanceof Element) {
            parentEl.scrollTop = 0
        }
    }

    function windowResized() {
        maxFilterSelectionHeight = window.innerHeight * 0.3;
        windowWidth = window.innerWidth;
    }
    async function handleFilterTypes(newFilterTypeName) {
        if ($initData) return pleaseWaitAlert();
        let idxTypeSelected = $filterOptions?.filterSelection.findIndex(
            ({ isSelected }) => isSelected
        );
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                .filterSelectionName;
        if (nameTypeSelected !== newFilterTypeName) {
            // Close Filter Dropdown
            selectedSortElement = false;
            // Reload Anime for Async Animation
            if ($finalAnimeList?.length > 18) {
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
                        filterSelectionName === newFilterTypeName
                );
            $filterOptions.filterSelection[
                newIdxFilterTypeSelected
            ].isSelected = true;
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
        if ($initData && ($filterOptions?.filterSelection?.length ?? 0) < 1) {
            return pleaseWaitAlert();
        }
        let element = event.target;
        let classList = element.classList;
        let filterTypEl = element.closest(".filterType");
        let optionsWrap = element.closest(".options-wrap");
        if (
            (classList.contains("filterType") || filterTypEl) &&
            !selectedFilterTypeElement
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
        let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
            ({ isSelected }) => isSelected
        );
        if (selectedFilterElement instanceof Element) {
            let filterSelectChildrenArray = Array.from(
                selectedFilterElement.parentElement.children
            ).filter((el) => {
                return !el.classList.contains("disable-interaction");
            });
            let selectedIndex = filterSelectChildrenArray.indexOf(
                selectedFilterElement
            );
            if (
                element.classList.contains("icon") &&
                !element.classList.contains("fa-angle-down") &&
                $filterOptions?.filterSelection?.[idxTypeSelected].filters
                    .Dropdown[selectedIndex].selected
            )
                return;
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                selectedIndex
            ].selected = false;
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
        let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
            ({ isSelected }) => isSelected
        );
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
            // Close Filter Type Dropdown
            selectedFilterTypeElement = false;
            // Close Sort Filter Dropdown
            selectedSortElement = false;
            // Close Filter Selection Dropdown
            let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
                ({ isSelected }) => isSelected
            );
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
            !element.closest(".options-wrap") &&
            !classList.contains("async-element")
        ) {
            // Large Screen Width
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
            if (
                !classList.contains("select") &&
                !classList.contains("fa-angle-down") &&
                !inputDropdownSelectEl
            ) {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".filter-select")
                ) {
                    removeClass(highlightedEl, "highlight");
                    highlightedEl = null;
                }
                let idxTypeSelected =
                    $filterOptions?.filterSelection?.findIndex(
                        ({ isSelected }) => isSelected
                    );
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
        filterSelectionName
    ) {
        if ($initData) return pleaseWaitAlert();
        let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
            ({ isSelected }) => isSelected
        );
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                .filterSelectionName;
        let currentValue =
            $filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown[
                dropdownIdx
            ].options[optionIdx].selected;
        if (
            currentValue === "none" ||
            currentValue === true ||
            (changeType === "read" && currentValue !== "included")
        ) {
            // true is default value of selections
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                dropdownIdx
            ].options[optionIdx].selected = "included";
            $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                nameTypeSelected
            ].filter((e) => {
                return (
                    e.optionName + e.optionIdx + e.optionType !==
                    optionName + optionIdx + optionType
                );
            });
            $activeTagFilters[nameTypeSelected].unshift({
                optionName: optionName,
                optionType: optionType,
                optionIdx: optionIdx,
                categIdx: dropdownIdx,
                selected: "included",
                changeType: changeType,
                filterType: "dropdown",
            });
            $activeTagFilters[nameTypeSelected] =
                $activeTagFilters[nameTypeSelected];
        } else if (currentValue === "included") {
            if (changeType === "read") {
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown[dropdownIdx].options[optionIdx].selected =
                    "none";
                $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                    nameTypeSelected
                ].filter(
                    (e) =>
                        !(
                            e.optionIdx === optionIdx &&
                            e.optionName === optionName &&
                            e.filterType === "dropdown" &&
                            e.categIdx === dropdownIdx &&
                            (e.optionType ? e.optionType === optionType : true)
                        )
                );
            } else {
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown[dropdownIdx].options[optionIdx].selected =
                    "excluded";
                $activeTagFilters[nameTypeSelected] = $activeTagFilters[
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
            }
        } else {
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                dropdownIdx
            ].options[optionIdx].selected = "none";
            $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                nameTypeSelected
            ].filter(
                (e) =>
                    !(
                        e.optionIdx === optionIdx &&
                        e.optionName === optionName &&
                        e.filterType === "dropdown" &&
                        e.categIdx === dropdownIdx &&
                        e.optionType === optionType
                    )
            );
        }
        saveFilters(filterSelectionName);
    }
    function handleCheckboxChange(
        event,
        checkBoxName,
        checkboxIdx,
        filterSelectionName
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
        let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
            ({ isSelected }) => isSelected
        );
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                .filterSelectionName;
        let currentCheckBoxStatus =
            $filterOptions?.filterSelection?.[idxTypeSelected].filters.Checkbox[
                checkboxIdx
            ].isSelected;
        if (currentCheckBoxStatus) {
            $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                nameTypeSelected
            ].filter(
                (e) =>
                    !(
                        e.optionIdx === checkboxIdx &&
                        e.optionName === checkBoxName &&
                        e.filterType === "checkbox" &&
                        e.selected === "included"
                    )
            );
        } else {
            $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                nameTypeSelected
            ].filter((e) => {
                return (
                    e.optionName + e.optionIdx !== checkBoxName + checkboxIdx
                );
            });
            $activeTagFilters[nameTypeSelected].unshift({
                optionName: checkBoxName,
                optionIdx: checkboxIdx,
                filterType: "checkbox",
                selected: "included",
                changeType: "read",
            });
            $activeTagFilters[nameTypeSelected] =
                $activeTagFilters[nameTypeSelected];
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
        filterSelectionName
    ) {
        if ($initData) return pleaseWaitAlert();
        let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
            ({ isSelected }) => isSelected
        );
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
                    if (!newCMPNumber) {
                        $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                            nameTypeSelected
                        ].filter(
                            (e) =>
                                !(
                                    e.optionIdx === inputNumIdx &&
                                    e.optionName === inputNumberName &&
                                    e.optionValue === currentValue &&
                                    e.filterType === "input number"
                                )
                        );
                    } else {
                        let elementIdx = $activeTagFilters[
                            nameTypeSelected
                        ].findIndex(
                            (item) =>
                                item.optionName === inputNumberName &&
                                item.optionValue === currentValue &&
                                item.optionIdx === inputNumIdx &&
                                item.filterType === "input number"
                        );
                        if (elementIdx === -1) {
                            $activeTagFilters[nameTypeSelected] =
                                $activeTagFilters[nameTypeSelected].filter(
                                    (e) => {
                                        return (
                                            e.optionName + e.optionIdx !==
                                            inputNumberName + inputNumIdx
                                        );
                                    }
                                );
                            $activeTagFilters[nameTypeSelected].unshift({
                                optionName: inputNumberName,
                                optionValue: newValue,
                                CMPoperator: newCMPOperator,
                                CMPNumber: newCMPNumber,
                                optionIdx: inputNumIdx,
                                filterType: "input number",
                                selected: "included",
                                changeType: "read",
                            });
                        } else {
                            $activeTagFilters[nameTypeSelected].splice(
                                elementIdx,
                                1
                            );
                            $activeTagFilters[nameTypeSelected] =
                                $activeTagFilters[nameTypeSelected].filter(
                                    (e) => {
                                        return (
                                            e.optionName + e.optionIdx !==
                                            inputNumberName + inputNumIdx
                                        );
                                    }
                                );
                            $activeTagFilters[nameTypeSelected].unshift({
                                optionName: inputNumberName,
                                optionValue: newValue,
                                CMPoperator: newCMPOperator,
                                CMPNumber: newCMPNumber,
                                optionIdx: inputNumIdx,
                                filterType: "input number",
                                selected: "included",
                                changeType: "read",
                            });
                        }
                        $activeTagFilters = $activeTagFilters;
                    }
                    $filterOptions.filterSelection[idxTypeSelected].filters[
                        "Input Number"
                    ][inputNumIdx].numberValue = newValue;
                    saveFilters(filterSelectionName);
                } else {
                    changeInputValue(event.target, currentValue);
                }
            } else {
                let elementIdx = $activeTagFilters[nameTypeSelected].findIndex(
                    (item) =>
                        item.optionName === inputNumberName &&
                        item.optionValue === currentValue &&
                        item.optionIdx === inputNumIdx &&
                        item.filterType === "input number"
                );
                if (elementIdx >= 0) {
                    $activeTagFilters[nameTypeSelected][elementIdx].selected =
                        "included";
                }
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
                if (newValue === "") {
                    $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                        nameTypeSelected
                    ].filter(
                        (e) =>
                            !(
                                e.optionIdx === inputNumIdx &&
                                e.optionName === inputNumberName &&
                                e.optionValue === currentValue &&
                                e.filterType === "input number"
                            )
                    );
                } else {
                    let elementIdx = $activeTagFilters[
                        nameTypeSelected
                    ].findIndex(
                        (item) =>
                            item.optionName === inputNumberName &&
                            item.optionValue === currentValue &&
                            item.optionIdx === inputNumIdx &&
                            item.filterType === "input number"
                    );
                    if (elementIdx === -1) {
                        $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                            nameTypeSelected
                        ].filter((e) => {
                            return (
                                e.optionName + e.optionIdx !==
                                inputNumberName + inputNumIdx
                            );
                        });
                        $activeTagFilters[nameTypeSelected].unshift({
                            optionName: inputNumberName,
                            optionValue: newValue,
                            optionIdx: inputNumIdx,
                            filterType: "input number",
                            selected: "included",
                            changeType: "read",
                        });
                    } else {
                        $activeTagFilters[nameTypeSelected].splice(
                            elementIdx,
                            1
                        );
                        $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                            nameTypeSelected
                        ].filter((e) => {
                            return (
                                e.optionName + e.optionIdx !==
                                inputNumberName + inputNumIdx
                            );
                        });
                        $activeTagFilters[nameTypeSelected].unshift({
                            optionName: inputNumberName,
                            optionValue: newValue,
                            optionIdx: inputNumIdx,
                            filterType: "input number",
                            selected: "included",
                            changeType: "read",
                        });
                    }
                    $activeTagFilters = $activeTagFilters;
                }
                $filterOptions.filterSelection[idxTypeSelected].filters[
                    "Input Number"
                ][inputNumIdx].numberValue = newValue;
                saveFilters(filterSelectionName);
            } else {
                if (elementIdx >= 0) {
                    $activeTagFilters[nameTypeSelected][elementIdx].selected =
                        "included";
                }
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
        optionValue
    ) {
        if ($initData) return pleaseWaitAlert();
        let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
            ({ isSelected }) => isSelected
        );
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                .filterSelectionName;
        if (filterType === "input number") {
            let elementIdx = $activeTagFilters[nameTypeSelected].findIndex(
                (item) =>
                    item.optionName === optionName &&
                    item.optionValue === optionValue &&
                    item.optionIdx === optionIdx &&
                    item.filterType === "input number"
            );
            if (elementIdx >= 0) {
                let currentSelect =
                    $activeTagFilters[nameTypeSelected][elementIdx].selected;
                if (currentSelect === "included") {
                    $activeTagFilters[nameTypeSelected][elementIdx].selected =
                        "excluded";
                } else {
                    $activeTagFilters[nameTypeSelected][elementIdx].selected =
                        "included";
                }
            }
        } else if (filterType === "checkbox") {
            let tagFilterIdx = $activeTagFilters[nameTypeSelected].findIndex(
                (e) =>
                    e.optionIdx === optionIdx &&
                    e.optionName === optionName &&
                    e.filterType === filterType
            );
            let checkboxSelection =
                $activeTagFilters?.[nameTypeSelected]?.[tagFilterIdx]?.selected;
            if (checkboxSelection === "included") {
                $activeTagFilters[nameTypeSelected][tagFilterIdx].selected =
                    "excluded";
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Checkbox[optionIdx].isSelected = false;
            } else if (checkboxSelection === "excluded") {
                $activeTagFilters[nameTypeSelected][tagFilterIdx].selected =
                    "included";
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Checkbox[optionIdx].isSelected = true;
            }
        } else if (filterType === "dropdown") {
            let currentSelect =
                $filterOptions?.filterSelection?.[idxTypeSelected].filters
                    .Dropdown[categIdx].options[optionIdx].selected;
            if (currentSelect === "included") {
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown[categIdx].options[optionIdx].selected =
                    "excluded";
                $activeTagFilters[nameTypeSelected] = $activeTagFilters[
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
            } else if (currentSelect === "excluded") {
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown[categIdx].options[optionIdx].selected =
                    "included";
                $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                    nameTypeSelected
                ].map((e) => {
                    if (
                        e.optionIdx === optionIdx &&
                        e.optionName === optionName &&
                        e.selected === "excluded" &&
                        (e.optionType ? e.optionType === optionType : true)
                    ) {
                        e.selected = "included";
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
        optionType
    ) {
        if ($initData) return pleaseWaitAlert();
        let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
            ({ isSelected }) => isSelected
        );
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
        $activeTagFilters[nameTypeSelected] = $activeTagFilters[
            nameTypeSelected
        ].filter(
            (e) =>
                !(
                    e.optionName === optionName &&
                    e.optionIdx === optionIdx &&
                    e.filterType === filterType &&
                    (e.optionType ? e.optionType === optionType : true)
                )
        );
        saveFilters(nameTypeSelected);
    }
    async function removeAllActiveTag(event) {
        if ($initData) return pleaseWaitAlert();
        if (await $confirmPromise("Do you want to remove all filters?")) {
            let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
                ({ isSelected }) => isSelected
            );
            let nameTypeSelected =
                $filterOptions?.filterSelection?.[idxTypeSelected]
                    .filterSelectionName;
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
            $activeTagFilters[nameTypeSelected] = [];
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
        let { sortName, sortType } = $filterOptions?.sortFilter?.filter(
            ({ sortType }) => sortType !== "none"
        )[0];
        let idxSortSelected = $filterOptions?.sortFilter?.findIndex(
            ({ sortType }) => sortType !== "none"
        );
        if (sortName === newSortName) {
            let newSortType = sortType === "desc" ? "asc" : "desc";
            $filterOptions.sortFilter[idxSortSelected].sortType = newSortType;
        } else if (sortName !== newSortName) {
            $filterOptions.sortFilter[idxSortSelected].sortType = "none";
            let idxNewSortSelected = $filterOptions?.sortFilter?.findIndex(
                ({ sortName }) => sortName === newSortName
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
        let { sortType } = $filterOptions?.sortFilter?.filter(
            ({ sortType }) => sortType !== "none"
        )[0];
        let idxSortSelected = $filterOptions?.sortFilter?.findIndex(
            ({ sortType }) => sortType !== "none"
        );
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
                document.getElementsByClassName("options-wrap") || []
            ).find((el) => {
                return !el.classList.contains("disable-interaction");
            });
            if (
                element?.closest?.(".filterType") ||
                element?.closest?.(".sortFilter") ||
                element?.closest?.(".filter-select")
            ) {
                event.preventDefault();
                // handle sortFilter
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl?.closest?.(".options")?.children?.length
                ) {
                    let parent = highlightedEl.closest(".options");
                    let options = Array.from(
                        parent.querySelectorAll(".option")
                    );
                    let currentidx = options.indexOf(highlightedEl);
                    let nextEl, iteratedEl, firstEl, lastEl;
                    for (let idx = 0; idx < options.length; idx++) {
                        if (
                            !options[idx].classList.contains(
                                "disable-interaction"
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
                            container: parent,
                            block: "nearest",
                            inline: "nearest",
                        });
                    }
                } else {
                    let options = element.querySelectorAll(
                        ".option:not(.disable-interaction)"
                    );
                    highlightedEl = options[0];
                    if (highlightedEl instanceof Element) {
                        addClass(highlightedEl, "highlight");
                        highlightedEl.scrollIntoView({
                            behavior: "smooth",
                            container: parent,
                            block: "nearest",
                            inline: "nearest",
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
                document.getElementsByClassName("options-wrap") || []
            ).find((el) => !el.classList.contains("disable-interaction"));
            if (
                (element?.closest?.(".filter-select") && keyCode !== 9) ||
                (element instanceof Element &&
                    getComputedStyle(element).position === "fixed")
            )
                return;
            let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
                ({ isSelected }) => isSelected
            );
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

    async function handleShowActiveFilters() {
        if ($finalAnimeList?.length > 18) {
            await callAsyncAnimeReload();
        }
        showAllActiveFilters = !showAllActiveFilters;
        scrollToFirstTagFilter();
    }
    let asyncAnimeReloadPromise;
    function callAsyncAnimeReload() {
        return new Promise((resolve) => {
            if ($animeLoaderWorker instanceof Worker) {
                $finalAnimeList = null;
                $animeLoaderWorker.postMessage({
                    reload: true,
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

    window.checkOpenDropdown = () => {
        return (
            (selectedFilterElement ||
                selectedFilterTypeElement ||
                selectedSortElement) &&
            window.innerWidth <= 425
        );
    };
    window.closeDropdown = () => {
        // Small Screen Width
        if (highlightedEl instanceof Element) {
            removeClass(highlightedEl, "highlight");
            highlightedEl = null;
        }
        // Close Filter Type Dropdown
        selectedFilterTypeElement = false;
        // Close Sort Filter Dropdown
        selectedSortElement = false;
        // Close Filter Selection Dropdown
        let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
            ({ isSelected }) => isSelected
        );
        $filterOptions?.filterSelection?.[
            idxTypeSelected
        ].filters.Dropdown.forEach((e) => {
            e.selected = false;
        });
        $filterOptions.filterSelection[idxTypeSelected] =
            $filterOptions?.filterSelection?.[idxTypeSelected];
        selectedFilterElement = null;
    };

    onMount(() => {
        // Init
        maxFilterSelectionHeight = window.innerHeight * 0.3;

        let filterEl = document.getElementById("filters");
        filterEl.addEventListener("scroll", handleFilterScroll);
        unsubFilterDragScroll = dragScroll(filterEl, "x");

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

    // Helper
</script>

<main>
    <div class="home-status">
        {#if $filterOptions}
            <span>
                <h2>
                    {$filterOptions?.filterSelection?.filter?.(
                        ({ isSelected }) => isSelected
                    )?.[0]?.filterSelectionName || ""}
                </h2>
            </span>
        {:else}
            <div class="skeleton shimmer" />
        {/if}
        {#if $dataStatus || !$username}
            <span out:fade={{ duration: 300 }} class="data-status">
                <h2>
                    {#if $dataStatus}
                        {$dataStatus}
                    {:else if !$username && !$initData}
                        {"No Anilist Username Found"}
                    {:else}
                        {""}
                    {/if}
                </h2>
            </span>
        {/if}
    </div>
    <div class="input-search-wrap">
        <input
            id="input-search"
            class="input-search"
            type="search"
            enterkeyhint="search"
            autocomplete="off"
            placeholder="Search"
            bind:value={$searchedAnimeKeyword}
        />
        <div class="filterType">
            <i
                class="input-search-wrap-icon fa-solid fa-sliders"
                on:click={handleShowFilterTypes}
                on:keydown={(e) =>
                    e.key === "Enter" && handleShowFilterTypes(e)}
            />
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
                                on:keydown={(e) =>
                                    e.key === "Enter" &&
                                    handleShowFilterTypes(e)}
                                on:click={handleShowFilterTypes}
                            >
                                ×
                            </div>
                        </div>
                        <div class="options">
                            {#each $filterOptions?.filterSelection || [] as { filterSelectionName, isSelected } (filterSelectionName)}
                                <div
                                    class="option"
                                    on:click={handleFilterTypes(
                                        filterSelectionName
                                    )}
                                    on:keydown={(e) =>
                                        e.key === "Enter" &&
                                        handleFilterTypes(filterSelectionName)}
                                >
                                    <h3
                                        style:color={isSelected
                                            ? "#3db4f2"
                                            : "inherit"}
                                    >
                                        {filterSelectionName || ""}
                                    </h3>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
    <div
        class="filters"
        id="filters"
        style:--maxPaddingHeight="{window.innerHeight}px"
    >
        {#if $filterOptions}
            {#each $filterOptions?.filterSelection || [] as filterSelection, filSelIdx (filterSelection.filterSelectionName)}
                {#each filterSelection.filters.Dropdown || [] as Dropdown, dropdownIdx (filterSelection.filterSelectionName + Dropdown.filName)}
                    <div
                        class={"filter-select " +
                            (filterSelection.isSelected
                                ? ""
                                : "disable-interaction")}
                    >
                        <div class="filter-name">
                            <h2>{Dropdown.filName || ""}</h2>
                        </div>
                        <div
                            class="select"
                            on:keydown={(e) =>
                                (e.key === "Enter" ||
                                    e.key === "ArrowDown" ||
                                    e.key === "ArrowUp") &&
                                filterSelect(e, dropdownIdx)}
                            on:click={(e) => filterSelect(e, dropdownIdx)}
                        >
                            <div class="value-wrap">
                                <input
                                    placeholder="Any"
                                    type="search"
                                    enterkeyhint="search"
                                    autocomplete="off"
                                    class="value-input"
                                    bind:value={$filterOptions.filterSelection[
                                        filSelIdx
                                    ].filters.Dropdown[dropdownIdx].optKeyword}
                                    disabled={windowWidth <= 425 ||
                                        !filterSelection.isSelected}
                                />
                            </div>
                            {#if Dropdown.selected && Dropdown.options.length && !Init}
                                <i
                                    class="icon fa-solid fa-angle-up"
                                    on:keydown={(e) =>
                                        e.key === "Enter" &&
                                        closeFilterSelect(dropdownIdx)}
                                    on:click={closeFilterSelect(dropdownIdx)}
                                />
                            {:else}
                                <i class="icon fa-solid fa-angle-down" />
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
                                    <div
                                        class="closing-x"
                                        on:keydown={(e) =>
                                            e.key === "Enter" &&
                                            closeFilterSelect(dropdownIdx)}
                                        on:click={closeFilterSelect(
                                            dropdownIdx
                                        )}
                                    >
                                        ×
                                    </div>
                                </div>
                                <input
                                    placeholder="Any"
                                    type="search"
                                    enterkeyhint="search"
                                    autocomplete="off"
                                    bind:value={$filterOptions.filterSelection[
                                        filSelIdx
                                    ].filters.Dropdown[dropdownIdx].optKeyword}
                                    disabled={!filterSelection.isSelected}
                                />
                                <div class="options">
                                    {#if Dropdown.options?.filter?.(({ optionName }) => hasPartialMatch(optionName, Dropdown.optKeyword) || Dropdown.optKeyword === "")?.length}
                                        {#each Dropdown.options || [] as option, optionIdx (filterSelection.filterSelectionName + Dropdown.filName + option.optionName)}
                                            <div
                                                class={"option " +
                                                    (hasPartialMatch(
                                                        option.optionName,
                                                        Dropdown.optKeyword
                                                    )
                                                        ? ""
                                                        : "disable-interaction")}
                                                on:click={handleFilterSelectOptionChange(
                                                    option.optionName,
                                                    Dropdown.filName,
                                                    optionIdx,
                                                    dropdownIdx,
                                                    Dropdown.changeType,
                                                    filterSelection.filterSelectionName
                                                )}
                                                on:keydown={(e) =>
                                                    e.key === "Enter" &&
                                                    handleFilterSelectOptionChange(
                                                        option.optionName,
                                                        Dropdown.filName,
                                                        optionIdx,
                                                        dropdownIdx,
                                                        Dropdown.changeType,
                                                        filterSelection.filterSelectionName
                                                    )}
                                            >
                                                <h3>
                                                    {option.optionName || ""}
                                                </h3>
                                                {#if option.selected === "included"}
                                                    {#if filterSelection.filterSelectionName === "Content Caution"}
                                                        <i
                                                            style:--optionColor="#5f9ea0"
                                                            class="fa-regular fa-circle-xmark async-element"
                                                        />
                                                    {:else}
                                                        <i
                                                            style:--optionColor="#5f9ea0"
                                                            class="fa-regular fa-circle-check async-element"
                                                        />
                                                    {/if}
                                                {:else if option.selected === "excluded" && Dropdown.changeType !== "read"}
                                                    <i
                                                        style:--optionColor="#e85d75"
                                                        class="fa-regular fa-circle-xmark async-element"
                                                    />
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
                {#each filterSelection.filters.Checkbox || [] as Checkbox, checkboxIdx (filterSelection.filterSelectionName + Checkbox.filName)}
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
                                        filterSelection.filterSelectionName
                                    )}
                                on:keydown={(e) =>
                                    e.key === "Enter" &&
                                    handleCheckboxChange(
                                        e,
                                        Checkbox.filName,
                                        checkboxIdx,
                                        filterSelection.filterSelectionName
                                    )}
                            >
                                {#if $initData}
                                    <input
                                        type="checkbox"
                                        class="checkbox"
                                        on:change={(e) => {
                                            e.target.checked = false;
                                            pleaseWaitAlert();
                                        }}
                                        checked={Checkbox.isSelected}
                                    />
                                {:else}
                                    <input
                                        type="checkbox"
                                        class="checkbox"
                                        on:change={(e) =>
                                            handleCheckboxChange(
                                                e,
                                                Checkbox.filName,
                                                checkboxIdx,
                                                filterSelection.filterSelectionName
                                            )}
                                        bind:checked={Checkbox.isSelected}
                                    />
                                {/if}
                                <div class="checkbox-label">
                                    {Checkbox.filName || ""}
                                </div>
                            </div>
                        </div>
                    {/if}
                {/each}
                {#each filterSelection.filters["Input Number"] || [] as inputNum, inputNumIdx (filterSelection.filterSelectionName + inputNum.filName)}
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
                                <input
                                    class="value-input-number"
                                    type="text"
                                    placeholder={inputNum.filName ===
                                    "scoring system"
                                        ? "Default: User Scoring"
                                        : conditionalInputNumberList.includes(
                                              inputNum.filName
                                          )
                                        ? ">123 or 123"
                                        : inputNum.defaultValue !== null
                                        ? "Default: " + inputNum.defaultValue
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
                                            filterSelection.filterSelectionName
                                        )}
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
    <div
        class="activeFilters"
        style:display={(
            $activeTagFilters?.[
                $filterOptions?.filterSelection?.[
                    $filterOptions?.filterSelection?.findIndex(
                        ({ isSelected }) => isSelected
                    )
                ]?.filterSelectionName
            ] || []
        ).length
            ? ""
            : "none"}
    >
        <div
            id="tagFilters"
            class="tagFilters"
            style:max-height={showAllActiveFilters ? "200px" : "28px"}
        >
            <i
                style:display={$activeTagFilters ? "" : "none"}
                class="fa-solid fa-ban"
                title="Remove Filters"
                on:click={removeAllActiveTag}
                on:keydown={(e) => e.key === "Enter" && removeAllActiveTag(e)}
                style:visibility={$activeTagFilters?.[
                    $filterOptions?.filterSelection?.[
                        $filterOptions?.filterSelection?.findIndex(
                            ({ isSelected }) => isSelected
                        )
                    ]?.filterSelectionName
                ]?.length
                    ? "visible"
                    : "hidden"}
            />
            {#each $activeTagFilters?.[$filterOptions?.filterSelection?.[$filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected)]?.filterSelectionName] || [] as { optionName, optionIdx, selected, changeType, filterType, categIdx, optionValue, optionType } (optionName + optionIdx + (optionType ?? ""))}
                <div
                    class="activeTagFilter"
                    transition:fly={{ x: -10, duration: 300 }}
                    style:--activeTagFilterColor={selected === "included"
                        ? "#5f9ea0"
                        : "#e85d75"}
                    on:click={(e) =>
                        changeActiveSelect(
                            e,
                            optionIdx,
                            optionName,
                            filterType,
                            categIdx,
                            changeType,
                            optionType,
                            optionValue
                        )}
                    on:keydown={(e) =>
                        e.key === "Enter" &&
                        changeActiveSelect(
                            e,
                            optionIdx,
                            optionName,
                            filterType,
                            categIdx,
                            changeType,
                            optionType,
                            optionValue
                        )}
                >
                    {#if filterType === "input number"}
                        <h3>
                            {optionName + ": " + optionValue || ""}
                        </h3>
                    {:else if optionType}
                        <h3>{optionType + ": " + optionName || ""}</h3>
                    {:else}
                        <h3>{optionName || ""}</h3>
                    {/if}
                    <i
                        class="fa-solid fa-xmark"
                        on:click|preventDefault={(e) =>
                            removeActiveTag(
                                e,
                                optionIdx,
                                optionName,
                                filterType,
                                categIdx,
                                optionType
                            )}
                        on:keydown={(e) =>
                            e.key === "Enter" &&
                            removeActiveTag(
                                e,
                                optionIdx,
                                optionName,
                                filterType,
                                categIdx,
                                optionType
                            )}
                    />
                </div>
            {/each}
        </div>
        <div
            class="showHideActiveFilters"
            on:click={handleShowActiveFilters}
            on:keydown={(e) => e.key === "Enter" && handleShowActiveFilters()}
        >
            <i
                class={"icon fa-solid fa-angle-" +
                    (showAllActiveFilters ? "up" : "down")}
            />
        </div>
    </div>
    {#if $filterOptions}
        <div class="sortFilter">
            <i
                on:click={changeSortType}
                on:keydown={(e) => e.key === "Enter" && changeSortType(e)}
                class={"fa-duotone fa-sort-" +
                    ($filterOptions?.sortFilter?.[
                        $filterOptions?.sortFilter?.findIndex(
                            ({ sortType }) => sortType !== "none"
                        )
                    ]?.sortType === "asc"
                        ? "up"
                        : "down")}
            />
            <h2
                on:click={handleSortFilterPopup}
                on:keydown={(e) =>
                    e.key === "Enter" && handleSortFilterPopup(e)}
            >
                {$filterOptions?.sortFilter?.[
                    $filterOptions?.sortFilter.findIndex(
                        ({ sortType }) => sortType !== "none"
                    )
                ]?.sortName || ""}
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
                        <div
                            class="closing-x"
                            on:keydown={(e) =>
                                e.key === "Enter" && handleSortFilterPopup(e)}
                            on:click={handleSortFilterPopup}
                        >
                            ×
                        </div>
                    </div>
                    <div class="options">
                        {#each $filterOptions?.sortFilter || [] as { sortName }, sortIdx (sortName + sortIdx)}
                            <div
                                class="option"
                                on:click={changeSort(sortName)}
                                on:keydown={(e) =>
                                    e.key === "Enter" && changeSort(sortName)}
                            >
                                <h3>{sortName || ""}</h3>
                                {#if $filterOptions?.sortFilter?.[$filterOptions?.sortFilter?.findIndex(({ sortType }) => sortType !== "none")].sortName === sortName && sortName}
                                    <i
                                        class={"fa-duotone fa-sort-" +
                                            ($filterOptions?.sortFilter?.[
                                                $filterOptions?.sortFilter?.findIndex(
                                                    ({ sortType }) =>
                                                        sortType !== "none"
                                                )
                                            ].sortType === "asc"
                                                ? "up"
                                                : "down")}
                                    />
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
        display: grid;
        grid-template-rows: 20px 55px 80px auto 37px auto;
        padding-top: 1.5em;
    }

    .skeleton {
        border-radius: 6px !important;
        background-color: rgba(30, 42, 56, 0.8) !important;
    }

    .input-search-wrap {
        display: grid;
        grid-template-columns: auto 20px;
        align-items: center;
        column-gap: 1em;
        padding: 10px 15px;
        background-color: rgb(21, 31, 46);
        border-radius: 6px;
        width: 100%;
        height: max-content;
        position: relative;
        margin-top: 1.5em;
    }
    .input-search {
        outline: none;
        border: none;
        background-color: rgb(21, 31, 46);
        color: white;
        width: 100%;
        cursor: text;
    }
    .input-search-wrap-icon {
        font-size: 20px;
        cursor: pointer;
    }
    .filterType .options-wrap {
        position: absolute;
        right: 0;
        top: 41px;
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

    .home-status {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        justify-content: space-between;
        align-items: center;
        width: 100%;
        column-gap: 10px;
        height: 20px;
    }

    .home-status .skeleton {
        height: 18px;
        width: 100px;
    }

    .home-status span {
        overflow-x: auto;
        overflow-y: hidden;
    }
    .home-status span::-webkit-scrollbar {
        display: none;
    }

    .home-status span h2 {
        white-space: nowrap;
        user-select: none;
    }

    .home-status .data-status h2 {
        margin-left: auto;
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
    .filter-select .icon {
        font-size: 14px;
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

    .options::-webkit-scrollbar {
        display: none;
    }
    .highlight {
        background-color: rgba(0, 0, 0, 0.25);
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
        grid-template-columns: auto 12px;
        grid-column-gap: 8px;
        cursor: pointer;
        user-select: none;
        border-radius: 6px;
    }

    .filter-select .option h3 {
        cursor: pointer !important;
        text-transform: capitalize;
    }

    .filter-select .option i {
        color: var(--optionColor);
        font-size: 1.4rem;
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

    .activeFilters {
        display: grid;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        min-height: 28px;
        width: 100%;
        grid-template-columns: 100%;
        margin-top: 2em;
    }

    .tagFilters {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        user-select: none;
        overflow-y: auto;
        scroll-snap-type: y mandatory;
        will-change: max-height;
    }

    .tagFilters > * {
        scroll-snap-align: start;
    }

    .tagFilters.skeleton {
        height: 28px;
        width: 90px;
    }

    .tagFilters > i {
        font-size: 1.5rem;
        height: 28px;
        line-height: 28px;
        cursor: pointer;
        padding: 0 4px;
    }
    .tagFilters:after {
        content: "";
        flex: 1000 0 auto;
    }

    .tagFilters::-webkit-scrollbar {
        display: none !important;
    }
    .activeFilters .activeTagFilter {
        background-color: var(--activeTagFilterColor);
        padding: 8px 10px;
        display: flex;
        flex: 1;
        justify-content: space-between;
        align-items: center;
        column-gap: 6px;
        border-radius: 6px;
        cursor: pointer;
    }
    .activeTagFilter h3 {
        line-height: 1px;
        line-height: 1px;
        min-width: max-content;
        text-transform: capitalize;
        cursor: pointer;
    }
    .activeTagFilter i {
        font-size: 1.2rem;
    }

    .showHideActiveFilters {
        display: flex;
        justify-content: center;
        background: rgb(21, 31, 46);
        padding: 0.9em 1.5em;
        border-radius: 6px;
        cursor: pointer;
    }

    .sortFilter {
        display: flex;
        justify-content: end;
        align-items: center;
        gap: 8px;
        min-height: 17px;
        margin-top: 2em;
        margin-left: auto;
        position: relative;
    }
    .sortFilter.skeleton {
        min-height: 17px;
        min-width: 109px;
    }
    .sortFilter h2,
    .sortFilter h3,
    .sortFilter i {
        user-select: none;
        cursor: pointer;
        text-transform: capitalize;
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
        grid-template-columns: auto 12px;
        grid-column-gap: 8px;
        cursor: pointer;
        user-select: none;
        border-radius: 6px;
    }
    .sortFilter .option i {
        margin-left: auto;
        font-size: 1.2rem;
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
        transform: translateX(0);
        width: 200%;
    }
    @keyframes loadingShimmer {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(100%);
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
        position: fixed;
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
    .filters > * {
        scroll-snap-align: start;
    }

    @media (pointer: fine) {
        .filters {
            scroll-snap-type: none !important;
        }
        .filters > * {
            scroll-snap-align: none !important;
        }
    }

    .disable-interaction {
        pointer-events: none !important;
        position: fixed !important;
        transform: translateY(-99999px) !important;
        user-select: none !important;
        touch-action: none !important;
        cursor: not-allowed !important;
        -webkit-user-drag: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
    }

    @media screen and (max-width: 425px) {
        .filter-select .select {
            cursor: pointer !important;
        }
        .filterType .options-wrap,
        .filter-select .options-wrap,
        .sortFilter .options-wrap {
            position: fixed !important;
            display: flex !important;
            flex-direction: column !important;
            z-index: 996 !important;
            left: 0px !important;
            top: 0px;
            width: 100% !important;
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
        }
        .options-wrap::-webkit-scrollbar {
            display: none;
        }
        .options-wrap.hide {
            transition: transform 0s ease 0.3s;
        }
        .options-wrap-filter-info {
            display: flex !important;
            flex-direction: column;
            width: 90vw;
            padding: 14px 0 0 0;
            gap: 14px;
            background-color: #0b1622;
            border-radius: 6px 6px 0px 0px;
            top: 25vh;
            max-height: 60vh !important;
            position: absolute;
            transform: translateY(0) !important;
            opacity: 1 !important;
            transition: transform 0.3s ease, opacity 0.3s ease !important;
        }
        .options-wrap-filter-info.hide {
            transform: translateY(20px) !important;
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
            max-height: calc(60vh - 112px) !important;
            border-radius: 0px 0px 6px 6px !important;
            padding: 6px 11px !important;
            overflow: auto !important;
            gap: 0 !important;
            min-height: 59px !important;
            overscroll-behavior: contain !important;
        }

        .options .option {
            padding: 14px 12px !important;
        }

        .option h3,
        .option i {
            font-size: 1.6rem !important;
        }
    }
</style>
