<script>
    import { onMount } from "svelte";
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
    } from "../../js/globalValues.js";
    import { fade, fly } from "svelte/transition";
    import {
        changeInputValue,
        dragScroll,
        getChildIndex,
    } from "../../js/others/helper.js";

    let Init = true;

    let windowWidth = window.innerWidth;
    let maxFilterSelectionHeight;
    let unsubFilterDragScroll;
    let unsubTagFiltersDragScroll;

    let selectedFilterTypeElement;
    let selectedFilterElement;
    let selectedSortElement;
    let highlightedEl;

    let filterScrollTimeout;
    let filterIsScrolling;

    let tagFilterScrollTimeout;
    let tagFilterIsScrolling;

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

    function windowResized() {
        maxFilterSelectionHeight = window.innerHeight * 0.3;
        windowWidth = window.innerWidth;
    }
    function handleFilterTypes(newFilterTypeName) {
        let idxTypeSelected = $filterOptions?.filterSelection.findIndex(
            ({ isSelected }) => isSelected
        );
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                .filterSelectionName;
        if (nameTypeSelected !== newFilterTypeName) {
            // Close Filter Dropdown
            selectedSortElement = false;
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
            saveFilters();
        }
    }
    function handleShowFilterTypes(event) {
        if ($filterOptions?.filterSelection?.length < 1) return;
        let element = event.target;
        let classList = element.classList;
        let filterTypEl = element.closest(".filterType");
        let optionsWrap = element.closest(".options-wrap");
        if (
            (classList.contains("filterType") || filterTypEl) &&
            !selectedFilterTypeElement
        ) {
            selectedFilterTypeElement = true;
        } else if (!optionsWrap && !classList.contains("options-wrap")) {
            if (
                highlightedEl instanceof Element &&
                highlightedEl.closest(".filterType")
            ) {
                highlightedEl.style.backgroundColor = "";
                highlightedEl = null;
            }
            selectedFilterTypeElement = false;
        }
    }
    function handleTagFilterScroll() {
        if (tagFilterScrollTimeout) clearTimeout(tagFilterScrollTimeout);
        tagFilterIsScrolling = true;
        tagFilterScrollTimeout = setTimeout(() => {
            tagFilterIsScrolling = false;
        }, 500);
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
                return (
                    getComputedStyle(el).display !== "none" &&
                    getComputedStyle(el).visibility !== "hidden" &&
                    (parseFloat(getComputedStyle(el).top) > -999 ||
                        isNaN(parseFloat(getComputedStyle(el).top)))
                );
            });
            let selectedIndex = filterSelectChildrenArray.indexOf(
                selectedFilterElement
            );
            if (
                element.classList.contains("icon") &&
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
            highlightedEl.style.backgroundColor = "";
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
            highlightedEl.style.backgroundColor = "";
            highlightedEl = null;
        }
        selectedFilterElement = null;
    }
    function clickOutsideListener(event) {
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
                highlightedEl.style.backgroundColor = "";
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
            !element.closest(".options-wrap")
        ) {
            // Large Screen Width
            // Filter Type Dropdown
            let filterTypeEl = element.closest(".filterType");
            if (!classList.contains("filterType") && !filterTypeEl) {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".filterType")
                ) {
                    highlightedEl.style.backgroundColor = "";
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
                    highlightedEl.style.backgroundColor = "";
                    highlightedEl = null;
                }
                selectedSortElement = false;
            }

            // Filter Selection Dropdown
            let inputDropdownSelectEl = element.closest(".select");
            if (!classList.contains("select") && !inputDropdownSelectEl) {
                if (
                    highlightedEl instanceof Element &&
                    highlightedEl.closest(".filter-select")
                ) {
                    highlightedEl.style.backgroundColor = "";
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
        if (currentValue === "none" || currentValue === true) {
            // true is default value of selections
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                dropdownIdx
            ].options[optionIdx].selected = "included";
            $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                nameTypeSelected
            ].filter((e) => {
                return (
                    e.optionName + e.optionIdx + (e.optionType ?? "") !==
                    optionName + optionIdx + (e.optionType ?? "")
                );
            });
            $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                nameTypeSelected
            ].filter((e) => {
                return (
                    e.optionName + e.optionIdx + (e.optionType ?? "") !==
                    optionName + optionIdx + (optionType ?? "")
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
                        (e.optionType ? e.optionType === optionType : true)
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
                        (e.optionType ? e.optionType === optionType : true)
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
                    e.optionName + e.optionIdx + (e.optionType ?? "") !==
                    checkBoxName + checkboxIdx
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
                                    e.filterType === "input number" &&
                                    e.selected === "included"
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
                                            e.optionName +
                                                e.optionIdx +
                                                (e.optionType ?? "") !==
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
                                            e.optionName +
                                                e.optionIdx +
                                                (e.optionType ?? "") !==
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
                                e.filterType === "input number" &&
                                e.selected === "included"
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
                                e.optionName +
                                    e.optionIdx +
                                    (e.optionType ?? "") !==
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
                                e.optionName +
                                    e.optionIdx +
                                    (e.optionType ?? "") !==
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
        optionType
    ) {
        if (tagFilterIsScrolling && event.pointerType === "mouse") return false;
        if (changeType === "read" || filterType !== "dropdown") return; // Unchangable Selection
        let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
            ({ isSelected }) => isSelected
        );
        let nameTypeSelected =
            $filterOptions?.filterSelection?.[idxTypeSelected]
                .filterSelectionName;
        let currentSelect =
            $filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown[
                categIdx
            ].options[optionIdx].selected;
        if (currentSelect === "included") {
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                categIdx
            ].options[optionIdx].selected = "excluded";
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
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                categIdx
            ].options[optionIdx].selected = "included";
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
        if (tagFilterIsScrolling && event.pointerType === "mouse") return;
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
        } else if (!optionsWrap && !classList.contains("options-wrap")) {
            selectedSortElement = false;
            if (
                highlightedEl instanceof Element &&
                highlightedEl.closest(".sortFilter")
            ) {
                highlightedEl.style.backgroundColor = "";
                highlightedEl = null;
            }
        }
    }
    function changeSort(newSortName) {
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
    }
    function changeSortType() {
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
                return (
                    getComputedStyle(el).display !== "none" &&
                    getComputedStyle(el).visibility !== "hidden" &&
                    (parseFloat(getComputedStyle(el).top) > -999 ||
                        isNaN(parseFloat(getComputedStyle(el).top)))
                );
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
                    let idx = Array.from(parent.children).indexOf(
                        highlightedEl
                    );
                    let nextIdx =
                        keyCode === 38
                            ? idx <= 0
                                ? parent.children.length - 1
                                : idx - 1
                            : idx >= parent.children.length - 1
                            ? 0
                            : idx + 1;
                    let currentHighlightedEl = highlightedEl;
                    highlightedEl = parent.children?.[nextIdx];
                    if (highlightedEl instanceof Element) {
                        currentHighlightedEl.style.backgroundColor = "";
                        highlightedEl.style.backgroundColor =
                            "rgba(0,0,0,0.25)";
                        highlightedEl.scrollIntoView({
                            behavior:
                                nextIdx === 0 ||
                                nextIdx === parent.children.length - 1
                                    ? "auto"
                                    : "smooth",
                            container: parent,
                            block: "nearest",
                        });
                    }
                } else {
                    let options = element.querySelector(".options");
                    highlightedEl = options?.children?.[0];
                    if (highlightedEl instanceof Element) {
                        highlightedEl.style.backgroundColor =
                            "rgba(0,0,0,0.25)";
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
            ).find(
                (el) =>
                    getComputedStyle(el).display !== "none" &&
                    getComputedStyle(el).visibility !== "hidden" &&
                    (parseFloat(getComputedStyle(el).top) > -999 ||
                        isNaN(parseFloat(getComputedStyle(el).top)))
            );
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
                highlightedEl.style.backgroundColor = "";
                highlightedEl = null;
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
            highlightedEl.style.backgroundColor = "";
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

        let tagFilterEl = document.getElementById("tagFilters");
        tagFilterEl.addEventListener("scroll", handleTagFilterScroll);
        unsubTagFiltersDragScroll = dragScroll(tagFilterEl, "x");

        document.addEventListener("keydown", handleDropdownKeyDown);
        window.addEventListener("resize", windowResized);
        window.addEventListener("click", clickOutsideListener);
    });

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
            disabled={$initData}
            bind:value={$searchedAnimeKeyword}
        />
        <div class="filterType">
            <i
                class="fa-solid fa-sliders"
                on:click={handleShowFilterTypes}
                on:keydown={(e) =>
                    e.key === "Enter" && handleShowFilterTypes(e)}
            />
            {#if !$initData}
                <div
                    class="options-wrap"
                    style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                    style:top={selectedFilterTypeElement ? "" : "-9999px"}
                >
                    {#if $filterOptions}
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
                    {/if}
                </div>
            {/if}
        </div>
    </div>
    <div
        class="filters"
        id="filters"
        style:--maxPaddingHeight="{window.innerHeight}px"
    >
        {#if $filterOptions && !$initData}
            {#each $filterOptions?.filterSelection || [] as { filterSelectionName, filters, isSelected }, filSelIdx (filterSelectionName + filSelIdx)}
                {#each filters.Dropdown || [] as { filName, options, selected, changeType, optKeyword }, dropdownIdx (filName + dropdownIdx)}
                    <div
                        class="filter-select"
                        style:display={isSelected ? "" : "none"}
                    >
                        <div class="filter-name">
                            <h2>{filName || ""}</h2>
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
                                    disabled={windowWidth <= 425}
                                />
                            </div>
                            {#if selected && options.length && !Init}
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
                            class="options-wrap"
                            style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                            style:top={options.length &&
                            selected === true &&
                            !Init
                                ? ""
                                : "-9999px"}
                        >
                            <div class="options-wrap-filter-info">
                                <div>
                                    <h2>{filName}</h2>
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
                                />
                            </div>
                            <div class="options">
                                {#if options?.filter?.(({ optionName }) => hasPartialMatch(optionName, optKeyword) || optKeyword === "")?.length}
                                    {#each options.filter(({ optionName }) => hasPartialMatch(optionName, optKeyword) || optKeyword === "") || [] as { optionName, selected }, optionIdx (optionName + optionIdx)}
                                        <div
                                            class="option"
                                            on:click={handleFilterSelectOptionChange(
                                                optionName,
                                                filName,
                                                optionIdx,
                                                dropdownIdx,
                                                changeType,
                                                filterSelectionName
                                            )}
                                            on:keydown={(e) =>
                                                e.key === "Enter" &&
                                                handleFilterSelectOptionChange(
                                                    optionName,
                                                    filName,
                                                    optionIdx,
                                                    dropdownIdx,
                                                    changeType,
                                                    filterSelectionName
                                                )}
                                        >
                                            <h3>{optionName || ""}</h3>
                                            {#if selected === "included"}
                                                <i
                                                    style:--optionColor="#5f9ea0"
                                                    class="fa-regular fa-circle-check"
                                                />
                                            {:else if selected === "excluded"}
                                                <i
                                                    style:--optionColor="#e85d75"
                                                    class="fa-regular fa-circle-xmark"
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
                {/each}
                {#each filters.Checkbox || [] as Checkbox, checkboxIdx (Checkbox.filName + checkboxIdx)}
                    <div
                        class="filter-checkbox"
                        style:display={isSelected ? "" : "none"}
                    >
                        <div style:visibility="none" />
                        <div
                            class="checkbox-wrap"
                            on:click={(e) =>
                                handleCheckboxChange(
                                    e,
                                    Checkbox.filName,
                                    checkboxIdx,
                                    filterSelectionName
                                )}
                            on:keydown={(e) =>
                                e.key === "Enter" &&
                                handleCheckboxChange(
                                    e,
                                    Checkbox.filName,
                                    checkboxIdx,
                                    filterSelectionName
                                )}
                        >
                            <input
                                type="checkbox"
                                class="checkbox"
                                on:change={(e) =>
                                    handleCheckboxChange(
                                        e,
                                        Checkbox.filName,
                                        checkboxIdx,
                                        filterSelectionName
                                    )}
                                bind:checked={Checkbox.isSelected}
                            />
                            <div class="checkbox-label">
                                {Checkbox.filName || ""}
                            </div>
                        </div>
                    </div>
                {/each}
                {#each filters["Input Number"] || [] as { filName, numberValue, maxValue, minValue, defaultValue }, inputNumIdx (filName + inputNumIdx)}
                    <div
                        class="filter-input-number"
                        style:display={isSelected ? "" : "none"}
                    >
                        <div class="filter-input-number-name">
                            <h2>{filName || ""}</h2>
                        </div>
                        <div class="value-input-number-wrap">
                            <input
                                class="value-input-number"
                                type="text"
                                placeholder={filName === "scoring system"
                                    ? "Default: User Scoring"
                                    : conditionalInputNumberList.includes(
                                          filName
                                      )
                                    ? ">123 or 123"
                                    : defaultValue !== null
                                    ? "Default: " + defaultValue
                                    : "123"}
                                value={numberValue || ""}
                                on:input={(e) =>
                                    handleInputNumber(
                                        e,
                                        e.target.value,
                                        inputNumIdx,
                                        filName,
                                        maxValue,
                                        minValue,
                                        filterSelectionName
                                    )}
                            />
                        </div>
                    </div>
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
    <div class="activeFilters">
        <i
            style:display={$activeTagFilters && !$initData ? "" : "none"}
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
        <div
            id="tagFilters"
            class="tagFilters"
            style:display={$activeTagFilters && !$initData ? "" : "none"}
        >
            {#each $activeTagFilters?.[$filterOptions?.filterSelection?.[$filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected)]?.filterSelectionName] || [] as { optionName, optionIdx, selected, changeType, filterType, categIdx, optionValue, optionType }, tagFilterIdx (optionName + optionIdx + (optionType ?? ""))}
                {#if selected !== "none"}
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
                                optionType
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
                                optionType
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
                {/if}
            {/each}
        </div>
        {#if !$activeTagFilters || $initData}
            <i class="skeleton shimmer" />
            <div class="tagFilters skeleton shimmer" />
        {/if}
        {#if $filterOptions && !$initData}
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
                    <div
                        class="options-wrap"
                        style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                        style:top={selectedSortElement ? "" : "-9999px"}
                    >
                        <div class="options">
                            {#each $filterOptions?.sortFilter || [] as { sortName }, sortIdx (sortName + sortIdx)}
                                <div
                                    class="option"
                                    on:click={changeSort(sortName)}
                                    on:keydown={(e) =>
                                        e.key === "Enter" &&
                                        changeSort(sortName)}
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
                </h2>
            </div>
        {:else}
            <div class="sortFilter skeleton shimmer" />
        {/if}
    </div>
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
        grid-template-rows: 20px 55px 80px 50px;
        padding-top: 2em;
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
    .input-search-wrap i {
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
        cursor: pointer;
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
    }
    .filter-select .value-wrap {
        width: max-content;
        max-width: 98px;
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
        gap: 15px;
        min-height: 28px;
        width: 100%;
        grid-template-columns: 23px repeat(2, auto);
        margin-top: 2em;
    }
    .activeFilters > i {
        font-size: 1.5rem;
        height: 28px;
        line-height: 28px;
        cursor: pointer;
        padding: 0 4px;
    }

    .activeFilters > i.skeleton {
        font-size: 1.5rem;
        height: 20px;
        width: 20px;
        cursor: pointer;
    }

    .tagFilters {
        display: flex;
        align-items: center;
        overflow-x: auto;
        overscroll-behavior: contain;
        justify-content: start;
        gap: 15px;
        user-select: none;
    }

    .tagFilters.skeleton {
        height: 28px;
        width: 90px;
    }

    .tagFilters::-webkit-scrollbar {
        display: none !important;
    }
    .activeFilters .activeTagFilter {
        background-color: var(--activeTagFilterColor);
        padding: 8px 10px;
        display: flex;
        justify-content: center;
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
    }
    .activeTagFilter i {
        font-size: 1.2rem;
    }

    .sortFilter {
        display: flex;
        justify-content: end;
        align-items: center;
        gap: 8px;
        min-height: 17px;
        margin-left: auto;
        position: relative;
    }
    .sortFilter.skeleton {
        min-height: 17px;
        min-width: 109px;
    }
    .sortFilter h2,
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
    .options-wrap-filter-info {
        display: none !important;
    }
    .options-wrap-filter-info h2 {
        display: none !important;
    }
    .options-wrap-filter-info input {
        display: none !important;
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

    @media screen and (max-width: 425px) {
        .filter-select .options-wrap {
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
        .filter-select .options-wrap-filter-info {
            display: flex !important;
            flex-direction: column;
            width: 90vw;
            padding: 14px 12px;
            gap: 14px;
            background-color: #0b1622;
            border-radius: 6px 6px 0px 0px;
            transform: translateY(2px);
        }
        .filter-select .options-wrap-filter-info h2 {
            display: initial !important;
            font-size: 1.8rem;
            font-weight: bold;
            text-transform: capitalize;
        }
        .filter-select .options-wrap-filter-info input {
            display: initial !important;
            background: #151f2e;
            padding: 14px 12px;
            border-radius: 6px;
            font-size: 1.6rem;
            color: inherit;
            border: none;
            outline: none;
            width: 100%;
            cursor: text;
        }

        .filter-select .options-wrap .options {
            display: flex !important;
            flex-direction: column !important;
            background-color: #151f2e !important;
            width: 90vw !important;
            height: calc(60vh - 112px) !important;
            border-radius: 0px 0px 6px 6px !important;
            padding: 6px 11px !important;
            overflow: auto !important;
            gap: 0 !important;
            min-height: 59px !important;
            overscroll-behavior: contain !important;
        }

        .filter-select .options .option {
            padding: 14px 12px !important;
        }

        .filter-select .option h3,
        .filter-select .option i {
            font-size: 1.6rem !important;
        }
    }
</style>
