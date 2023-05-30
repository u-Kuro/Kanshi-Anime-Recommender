<script>
    import { onMount, onDestroy } from "svelte";
    import { IDBinit, retrieveJSON, saveJSON } from "../../js/indexedDB.js";
    import {
        IndexedDB,
        filterOptions,
        activeTagFilters,
        searchedAnimeKeyword,
    } from "../../js/globalValues.js";
    import { dragScroll } from "../../js/others/dragScroll.js";

    let writableSubscriptions = [];

    let Init = true;

    let selectedFilterTypeElement;
    let selectedFilterElement;
    let selectedSortElement;
    let maxFilterSelectionHeight;
    let filtersIsScrolling;
    let tagFilterIsScrolling;
    let highlightedEl;

    let clickOutsideListener;
    let windowResized;
    let handleFilterTypes;
    let handleShowFilterTypes;
    let handleDropdownKeyDown;
    let filterSelect;
    let closeFilterSelect;
    let hasPartialMatch;
    let unsubTagFiltersDragScroll;
    let handleFilterSelectOptionChange;
    let handleFiltersScroll;
    let handleTagFilterScroll;
    let tagFilterScrollTimeout;
    let handleCheckboxChange;
    let handleInputNumber;
    let removeActiveTag;
    let changeActiveSelect;
    let removeAllActiveTag;
    let handleSortFilterPopup;
    let changeSort;
    let changeSortType;

    async function saveFilters() {
        await saveJSON($filterOptions, "filterOptions");
        await saveJSON($activeTagFilters, "activeTagFilters");
    }

    onMount(() => {
        // Init
        maxFilterSelectionHeight = window.innerHeight * 0.3;
        unsubTagFiltersDragScroll = dragScroll(
            document.getElementsByClassName("tagFilters")[0]
        );
        windowResized = () => {
            maxFilterSelectionHeight = window.innerHeight * 0.3;
        };
        handleFilterTypes = (newFilterTypeName) => {
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
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].isSelected = false;
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
        };
        handleShowFilterTypes = (event) => {
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
                selectedFilterTypeElement = false;
            }
        };
        handleFiltersScroll = () => {
            filtersIsScrolling = true;
            if (selectedFilterElement) {
                let idxTypeSelected =
                    $filterOptions?.filterSelection?.findIndex(
                        ({ isSelected }) => isSelected
                    );
                $filterOptions?.filterSelection?.[
                    idxTypeSelected
                ].filters.Dropdown.forEach((e) => {
                    e.selected = false;
                });
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown =
                    $filterOptions?.filterSelection?.[
                        idxTypeSelected
                    ].filters.Dropdown;
                selectedFilterElement = null;
            }
            filtersIsScrolling = false;
        };
        handleTagFilterScroll = () => {
            if (tagFilterScrollTimeout) clearTimeout(tagFilterScrollTimeout);
            tagFilterIsScrolling = true;
            tagFilterScrollTimeout = setTimeout(() => {
                tagFilterIsScrolling = false;
            }, 500);
        };
        filterSelect = (event, dropdownIdx) => {
            let element = event.target;
            let filSelectEl = element.closest(".filter-select");
            if (filSelectEl === selectedFilterElement) return;
            let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
                ({ isSelected }) => isSelected
            );
            if (selectedFilterElement instanceof Element) {
                let selectedIndex = getIndexInParent(selectedFilterElement);
                if (
                    element.classList.contains("icon") &&
                    $filterOptions?.filterSelection?.[idxTypeSelected].filters
                        .Dropdown[selectedIndex].selected
                )
                    return;
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown[selectedIndex].selected = false;
            }
            if (Init) Init = false;
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                dropdownIdx
            ].selected = true;
            selectedFilterElement = filSelectEl;
        };
        closeFilterSelect = (dropDownIdx) => {
            let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
                ({ isSelected }) => isSelected
            );
            $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[
                dropDownIdx
            ].selected = false;
            selectedFilterElement = null;
        };
        clickOutsideListener = (event) => {
            if ($filterOptions?.filterSelection?.length < 1 || !$filterOptions)
                return;
            let element = event.target;
            let classList = element.classList;
            // Filter Type Dropdown
            let filterTypeEl = element.closest(".filterType");
            if (!classList.contains("filterType") && !filterTypeEl) {
                selectedFilterTypeElement = false;
                if (highlightedEl instanceof Element) {
                    highlightedEl.style.backgroundColor = "";
                    highlightedEl = null;
                }
            }
            // Sort Filter Dropdown
            let sortSelectEl = element.closest(".sortFilter");
            if (!classList.contains("sortFilter") && !sortSelectEl) {
                selectedSortElement = false;
                if (highlightedEl instanceof Element) {
                    highlightedEl.style.backgroundColor = "";
                    highlightedEl = null;
                }
            }
            // Filter Selection Dropdown
            let filterSelectEl = element.closest(".filter-select");
            let filterNameEl = element.closest(".filter-name");
            if (
                filterSelectEl !== selectedFilterElement ||
                filterNameEl ||
                classList.contains("filter-name")
            ) {
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
                if (highlightedEl instanceof Element) {
                    highlightedEl.style.backgroundColor = "";
                    highlightedEl = null;
                }
            }
        };
        handleFilterSelectOptionChange = (
            optionName,
            optionType,
            optionIdx,
            dropdownIdx,
            changeType
        ) => {
            let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
                ({ isSelected }) => isSelected
            );
            let nameTypeSelected =
                $filterOptions?.filterSelection?.[idxTypeSelected]
                    .filterSelectionName;
            let currentValue =
                $filterOptions?.filterSelection?.[idxTypeSelected].filters
                    .Dropdown[dropdownIdx].options[optionIdx].selected;
            if (currentValue === "none" || currentValue === true) {
                // true is default value of selections
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown[dropdownIdx].options[optionIdx].selected =
                    "included";
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
                    ].filters.Dropdown[dropdownIdx].options[
                        optionIdx
                    ].selected = "none";
                    $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                        nameTypeSelected
                    ].filter(
                        (e) =>
                            !(
                                e.optionIdx === optionIdx &&
                                e.optionName === optionName &&
                                e.filterType === "dropdown" &&
                                e.categIdx === dropdownIdx
                            )
                    );
                } else {
                    $filterOptions.filterSelection[
                        idxTypeSelected
                    ].filters.Dropdown[dropdownIdx].options[
                        optionIdx
                    ].selected = "excluded";
                    $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                        nameTypeSelected
                    ].map((e) => {
                        if (
                            e.optionIdx === optionIdx &&
                            e.optionName === optionName &&
                            e.filterType === "dropdown" &&
                            e.categIdx === dropdownIdx &&
                            e.selected === "included"
                        ) {
                            e.selected = "excluded";
                        }
                        return e;
                    });
                }
            } else {
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
                            e.categIdx === dropdownIdx
                        )
                );
            }
            saveFilters();
        };
        handleCheckboxChange = (event, checkBoxName, checkboxIdx) => {
            let element = event.target;
            let classList = element.classList;
            let keyCode = event.which || event.keyCode || 0;
            if (
                (classList.contains("checkbox") && event.type === "click") ||
                (classList.contains("checkbox") &&
                    keyCode !== 13 &&
                    event.type === "keydown")
            )
                return; // Prevent Default

            let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
                ({ isSelected }) => isSelected
            );
            let nameTypeSelected =
                $filterOptions?.filterSelection?.[idxTypeSelected]
                    .filterSelectionName;
            let currentCheckBoxStatus =
                $filterOptions?.filterSelection?.[idxTypeSelected].filters
                    .Checkbox[checkboxIdx].isSelected;
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
            saveFilters();
        };
        handleInputNumber = (
            event,
            newValue,
            inputNumIdx,
            inputNumberName,
            maxValue,
            minValue
        ) => {
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
            let newValueLowerCase = newValue.toLowerCase();
            if (
                newValueLowerCase === "infinity" ||
                newValueLowerCase === "-Infinity"
            ) {
                newValue = newValueLowerCase.startsWith("-")
                    ? "-Infinity"
                    : "Infinity";
            }
            if (
                (newValue !== currentValue &&
                    !isNaN(newValue) &&
                    !isNaN(currentValue) &&
                    (parseFloat(newValue) >= minValue ||
                        typeof minValue !== "number") &&
                    (parseFloat(newValue) <= maxValue ||
                        typeof maxValue !== "number")) ||
                newValue === "" ||
                (newValue.startsWith("-") &&
                    (typeof minValue === "number" ? minValue < 0 : true)) ||
                ("-infinity".includes(newValueLowerCase) &&
                    (typeof minValue === "number"
                        ? minValue === -Infinity
                        : true)) ||
                ("infinity".includes(newValueLowerCase) &&
                    (typeof maxValue === "number"
                        ? maxValue === Infinity
                        : true))
            ) {
                if (newValue === "") {
                    $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                        nameTypeSelected
                    ].filter(
                        (e) =>
                            !(
                                e.optionIdx === inputNumIdx &&
                                e.optionName === inputNumberName &&
                                e.optionValue === parseFloat(currentValue) &&
                                e.filterType === "input number" &&
                                e.selected === "included"
                            )
                    );
                } else if (
                    (("-infinity".includes(newValueLowerCase) ||
                        "infinity".includes(newValueLowerCase)) &&
                    newValueLowerCase.startsWith("-")
                        ? newValueLowerCase !== "-infinity"
                        : newValueLowerCase !== "infinity") &&
                    isNaN(newValue)
                ) {
                    $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                        nameTypeSelected
                    ].filter(
                        (e) =>
                            !(
                                e.optionIdx === inputNumIdx &&
                                e.optionName === inputNumberName &&
                                e.optionValue === parseFloat(currentValue) &&
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
                            item.optionValue === parseFloat(currentValue) &&
                            item.optionIdx === inputNumIdx &&
                            item.filterType === "input number"
                    );
                    if (elementIdx === -1) {
                        $activeTagFilters[nameTypeSelected].unshift({
                            optionName: inputNumberName,
                            optionValue: parseFloat(newValue),
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
                        $activeTagFilters[nameTypeSelected].unshift({
                            optionName: inputNumberName,
                            optionValue: parseFloat(newValue),
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
                saveFilters();
            } else if (
                isNaN(newValue) ||
                (newValue < minValue && typeof minValue === "number") ||
                (newValue > maxValue && typeof maxValue === "number")
            ) {
                event.target.value = currentValue;
            }
        };
        changeActiveSelect = (
            optionIdx,
            optionName,
            filterType,
            categIdx,
            changeType
        ) => {
            if (tagFilterIsScrolling) return false;
            if (changeType === "read" || filterType !== "dropdown") return; // Unchangable Selection
            let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
                ({ isSelected }) => isSelected
            );
            let nameTypeSelected =
                $filterOptions?.filterSelection?.[idxTypeSelected]
                    .filterSelectionName;
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
                        e.selected === "included"
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
                        e.selected === "excluded"
                    ) {
                        e.selected = "included";
                    }
                    return e;
                });
            }
            saveFilters();
        };
        removeActiveTag = (optionIdx, optionName, filterType, categIdx) => {
            if (tagFilterIsScrolling) return;
            let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(
                ({ isSelected }) => isSelected
            );
            let nameTypeSelected =
                $filterOptions?.filterSelection?.[idxTypeSelected]
                    .filterSelectionName;
            if (filterType === "checkbox") {
                // Is Checkbox
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Checkbox[optionIdx].isSelected = false;
            } else if (filterType === "input number") {
                // Is Input Number
                $filterOptions.filterSelection[idxTypeSelected].filters[
                    "Input Number"
                ][optionIdx].numberValue = "";
            } else {
                // Is Only Read optionName
                $filterOptions.filterSelection[
                    idxTypeSelected
                ].filters.Dropdown[categIdx].options[optionIdx].selected =
                    "none";
            }
            $activeTagFilters[nameTypeSelected] = $activeTagFilters[
                nameTypeSelected
            ].filter(
                (e) =>
                    !(
                        e.optionName === optionName &&
                        e.optionIdx === optionIdx &&
                        e.filterType === filterType
                    )
            );
            saveFilters();
        };
        removeAllActiveTag = () => {
            if (tagFilterIsScrolling) return false;
            if (confirm("Do you want to remove all filters?") === true) {
                let idxTypeSelected =
                    $filterOptions?.filterSelection?.findIndex(
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
                saveFilters();
            }
        };
        handleSortFilterPopup = (event) => {
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
            }
        };
        changeSort = (newSortName) => {
            let { sortName, sortType } = $filterOptions?.sortFilter?.filter(
                ({ sortType }) => sortType !== "none"
            )[0];
            let idxSortSelected = $filterOptions?.sortFilter?.findIndex(
                ({ sortType }) => sortType !== "none"
            );
            if (sortName === newSortName) {
                let newSortType = sortType === "desc" ? "asc" : "desc";
                $filterOptions.sortFilter[idxSortSelected].sortType =
                    newSortType;
            } else if (sortName !== newSortName) {
                $filterOptions.sortFilter[idxSortSelected].sortType = "none";
                let idxNewSortSelected = $filterOptions?.sortFilter?.findIndex(
                    ({ sortName }) => sortName === newSortName
                );
                $filterOptions.sortFilter[idxNewSortSelected].sortType = "desc";
            }
            saveFilters();
        };
        changeSortType = () => {
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
            saveFilters();
        };
        handleDropdownKeyDown = (event) => {
            let keyCode = event.which || event.keyCode || 0;
            // 38up 40down 13enter
            if (keyCode == 38 || keyCode == 40) {
                var element = Array.from(
                    document.getElementsByClassName("options-wrap") || []
                ).find(
                    (el) =>
                        getComputedStyle(el).display !== "none" &&
                        getComputedStyle(el).visibility !== "hidden"
                );
                // let element =
                document.getElementsByClassName("options-wrap")?.[0];
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
                                inline: "end",
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
                        getComputedStyle(el).visibility !== "hidden"
                );
                if (element?.closest?.(".filter-select") && keyCode !== 9)
                    return;
                let idxTypeSelected =
                    $filterOptions?.filterSelection?.findIndex(
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
        };
        hasPartialMatch = (strings, searchString) => {
            if (typeof strings === "string") {
                let fullstring = strings;
                strings = strings?.split?.(" ");
                strings.push(fullstring);
            }
            return strings.some(function (str) {
                return str
                    ?.toLowerCase?.()
                    .startsWith(searchString?.toLowerCase?.());
            });
        };
        document
            .getElementsByClassName("filters")[0]
            .addEventListener("scroll", handleFiltersScroll);
        document
            .getElementsByClassName("tagFilters")[0]
            .addEventListener("scroll", handleTagFilterScroll);
        document.addEventListener("keydown", handleDropdownKeyDown);
        window.addEventListener("resize", windowResized);
        window.addEventListener("pointerdown", clickOutsideListener);
    });
    onDestroy(() => {
        writableSubscriptions.forEach((unsub) => unsub());
        filterOptionsUnsubscribe();
        unsubTagFiltersDragScroll();
        document.removeEventListener("keydown", handleDropdownKeyDown);
        document
            .getElementsByClassName("filters")[0]
            .removeEventListener("scroll", handleFiltersScroll);
        if (tagFilterScrollTimeout) clearTimeout(tagFilterScrollTimeout);
        document
            .getElementsByClassName("tagFilters")[0]
            .removeEventListener("scroll", handleTagFilterScroll);
        window.removeEventListener("resize", windowResized);
        window.removeEventListener("pointerdown", clickOutsideListener);
    });

    // Helper
    function getIndexInParent(element) {
        if (!element) return;
        return Array.from(element.parentNode.children).indexOf(element);
    }
</script>

<main>
    <div class="input-search-wrap">
        <input
            class="input-search"
            type="text"
            placeholder="Search"
            bind:value={$searchedAnimeKeyword}
        />
        <div class="filterType">
            <i
                class="fa-solid fa-sliders"
                on:click={handleShowFilterTypes}
                on:keydown={handleShowFilterTypes}
            />
            <div
                class="options-wrap"
                style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                style:visibility={selectedFilterTypeElement ? "" : "hidden"}
                style:pointer-events={selectedFilterTypeElement ? "" : "none"}
            >
                <div class="options">
                    {#each $filterOptions?.filterSelection || [] as { filterSelectionName, isSelected } (filterSelectionName)}
                        <div
                            class="option"
                            on:click={handleFilterTypes(filterSelectionName)}
                            on:keydown={handleFilterTypes(filterSelectionName)}
                        >
                            <h3
                                style:color={isSelected ? "#3db4f2" : "inherit"}
                            >
                                {filterSelectionName || ""}
                            </h3>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>
    <div class="filters">
        {#if $filterOptions?.filterSelection?.length}
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
                            on:keydown={(e) => filterSelect(e, dropdownIdx)}
                            on:click={(e) => filterSelect(e, dropdownIdx)}
                        >
                            <div class="value-wrap">
                                <input
                                    type="search"
                                    placeholder="Any"
                                    autocomplete="off"
                                    class="value-input"
                                    bind:value={$filterOptions.filterSelection[
                                        filSelIdx
                                    ].filters.Dropdown[dropdownIdx].optKeyword}
                                />
                            </div>
                            {#if selected && options.length && !Init}
                                <i
                                    class="icon fa-solid fa-angle-up"
                                    on:keydown={closeFilterSelect(dropdownIdx)}
                                    on:click={closeFilterSelect(dropdownIdx)}
                                />
                            {:else}
                                <i class="icon fa-solid fa-angle-down" />
                            {/if}
                        </div>
                        <div
                            class="options-wrap"
                            style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                            style:visibility={options.length &&
                            selected &&
                            !filtersIsScrolling &&
                            !Init
                                ? ""
                                : "hidden"}
                            style:pointer-events={options.length &&
                            selected &&
                            !filtersIsScrolling &&
                            !Init
                                ? ""
                                : "none"}
                        >
                            <div class="options">
                                {#each options as { optionName, selected }, optionIdx (optionName + optionIdx)}
                                    {#if hasPartialMatch(optionName, optKeyword) || optKeyword === ""}
                                        <div
                                            class="option"
                                            on:click={handleFilterSelectOptionChange(
                                                optionName,
                                                filName,
                                                optionIdx,
                                                dropdownIdx,
                                                changeType
                                            )}
                                            on:keydown={handleFilterSelectOptionChange(
                                                optionName,
                                                filName,
                                                optionIdx,
                                                dropdownIdx,
                                                changeType
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
                                    {/if}
                                {/each}
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
                                placeholder={defaultValue !== null
                                    ? "Default: " + defaultValue
                                    : "Input Number"}
                                value={numberValue || ""}
                                on:input={(e) =>
                                    handleInputNumber(
                                        e,
                                        e.target.value,
                                        inputNumIdx,
                                        filName,
                                        maxValue,
                                        minValue
                                    )}
                            />
                        </div>
                    </div>
                {/each}
                {#each filters.Checkbox || [] as Checkbox, checkboxIdx (Checkbox.filName + checkboxIdx)}
                    <div
                        class="filter-checkbox"
                        style:display={isSelected ? "" : "none"}
                        on:click={(e) =>
                            handleCheckboxChange(
                                e,
                                Checkbox.filName,
                                checkboxIdx
                            )}
                        on:keydown={(e) =>
                            handleCheckboxChange(
                                e,
                                Checkbox.filName,
                                checkboxIdx
                            )}
                    >
                        <div style:visibility="none" />
                        <div class="checkbox-wrap">
                            <input
                                type="checkbox"
                                class="checkbox"
                                on:change={(e) =>
                                    handleCheckboxChange(
                                        e,
                                        Checkbox.filName,
                                        checkboxIdx
                                    )}
                                bind:checked={Checkbox.isSelected}
                            />
                            <div class="checkbox-label">
                                {Checkbox.filName || ""}
                            </div>
                        </div>
                    </div>
                {/each}
            {/each}
        {:else}
            {#each Array(10) as _}
                <div class="filter-select shimmer">
                    <div class="filter-name skeleton" />
                    <div class="select skeleton">
                        <div class="value-wrap">
                            <input
                                type="search"
                                autocomplete="off"
                                class="value-input"
                                disabled
                            />
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
    <div class="activeFilters">
        <i
            class="fa-solid fa-ban"
            title="Remove Filters"
            on:click={removeAllActiveTag}
            on:keydown={removeAllActiveTag}
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
        <div class="tagFilters">
            {#each $activeTagFilters?.[$filterOptions?.filterSelection?.[$filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected)]?.filterSelectionName] || [] as { optionName, optionIdx, selected, changeType, filterType, categIdx, optionValue } (optionName + optionIdx)}
                {#if selected !== "none"}
                    <div
                        class="activeTagFilter"
                        style:--activeTagFilterColor={selected === "included"
                            ? "#5f9ea0"
                            : "#e85d75"}
                        on:click={changeActiveSelect(
                            optionIdx,
                            optionName,
                            filterType,
                            categIdx,
                            changeType
                        )}
                        on:keydown={changeActiveSelect(
                            optionIdx,
                            optionName,
                            filterType,
                            categIdx,
                            changeType
                        )}
                    >
                        {#if filterType === "input number"}
                            <h3>{optionName + ": " + optionValue || ""}</h3>
                        {:else}
                            <h3>{optionName || ""}</h3>
                        {/if}
                        <i
                            class="fa-solid fa-xmark"
                            on:click|preventDefault={removeActiveTag(
                                optionIdx,
                                optionName,
                                filterType,
                                categIdx
                            )}
                            on:keydown={removeActiveTag(
                                optionIdx,
                                optionName,
                                filterType,
                                categIdx
                            )}
                        />
                    </div>
                {/if}
            {/each}
        </div>
        {#if $filterOptions?.sortFilter?.length}
            <div class="sortFilter">
                <i
                    on:click={changeSortType}
                    on:keydown={changeSortType}
                    class={"fa-duotone fa-sort-" +
                        ($filterOptions?.sortFilter?.[
                            $filterOptions?.sortFilter?.findIndex(
                                ({ sortType }) => sortType !== "none"
                            )
                        ]?.sortType === "asc"
                            ? "up"
                            : "down")}
                />
                <h3
                    on:click={handleSortFilterPopup}
                    on:keydown={handleSortFilterPopup}
                >
                    {$filterOptions?.sortFilter?.[
                        $filterOptions?.sortFilter.findIndex(
                            ({ sortType }) => sortType !== "none"
                        )
                    ]?.sortName || ""}
                    <div
                        class="options-wrap"
                        style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                        style:visibility={selectedSortElement ? "" : "hidden"}
                        style:pointer-events={selectedSortElement ? "" : "none"}
                    >
                        <div class="options">
                            {#each $filterOptions?.sortFilter || [] as { sortName }, sortIdx (sortName + sortIdx)}
                                <div
                                    class="option"
                                    on:click={changeSort(sortName)}
                                    on:keydown={changeSort(sortName)}
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
                </h3>
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
        grid-template-rows: 36px 59px 28px;
        row-gap: 1.25em;
        padding-top: 1.25em;
    }

    .skeleton {
        border-radius: 6px !important;
        background-color: rgba(0, 0, 0, 0.25) !important;
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
    }
    .input-search {
        overflow: auto;
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

    .filters {
        overflow-y: auto;
        display: flex;
        gap: 1em;
        flex-wrap: wrap;
        justify-content: space-evenly;
        scroll-snap-type: y mandatory;
    }
    .filters::-webkit-scrollbar {
        width: 5px !important;
    }
    .filters::-webkit-scrollbar-track {
        background-color: transparent;
    }
    .filters::-webkit-scrollbar-thumb {
        background-color: #b9cadd;
        border-radius: 5px;
    }

    .filter-select,
    .filter-input-number {
        display: grid;
        grid-template-rows: 18px 30px;
        grid-row-gap: 5px;
        width: 142px;
        scroll-snap-align: start;
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
        top: 180px;
        background-color: rgb(21, 31, 46);
        width: 142px;
        overflow-y: auto;
        max-height: var(--maxFilterSelectionHeight);
        margin-top: 1px;
        border-radius: 6px;
        padding: 6px;
        z-index: 1;
    }
    .options-wrap::-webkit-scrollbar {
        width: 5px !important;
    }
    .options-wrap::-webkit-scrollbar-track {
        background-color: transparent;
    }
    .options-wrap::-webkit-scrollbar-thumb {
        background-color: #b9cadd;
        border-radius: 5px;
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
        width: 142px;
        scroll-snap-align: start;
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
    }
    .filter-checkbox .checkbox-label {
        font-weight: 600;
        text-transform: capitalize;
        -webkit-user-select: none;
        -ms-user-select: none;
        user-select: none;
        font-size: 1.4rem;
    }

    .activeFilters {
        display: grid;
        align-items: center;
        gap: 15px;
        min-height: 28px;
        width: 100%;
        grid-template-columns: 15px repeat(2, auto);
    }
    .activeFilters > i {
        font-size: 1.5rem;
        height: 28px;
        line-height: 28px;
        cursor: pointer;
    }

    .tagFilters {
        display: flex;
        align-items: center;
        overflow-x: auto;
        justify-content: start;
        gap: 15px;
        user-select: none;
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
        min-width: 109px;
        min-height: 15px;
        margin-left: auto;
        position: relative;
    }
    .sortFilter h3,
    .sortFilter i {
        user-select: none;
        cursor: pointer;
        text-transform: capitalize;
    }

    .sortFilter .options-wrap {
        position: absolute;
        right: 0;
        background-color: rgb(21, 31, 46);
        overflow-y: auto;
        overflow-x: hidden;
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
</style>
