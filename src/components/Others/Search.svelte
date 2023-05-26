<script>
    import { onMount, onDestroy } from "svelte";
    import { filterOptions } from "../../js/globalValues.js";
    import { dragScroll } from "../../js/others/dragScroll.js";

    onMount(() => {
        // Init
        // let filOpts = $filterOptions
        // sortSelections = filOpts["sort type"]
        // let defaults = filOpts.defaults
        // checkBoxSelections["Anime Filter"] = defaults["Anime Filter"].Checkbox || {}
        // checkBoxSelections["Content Warning"] = defaults["Content Warning"].Checkbox || {}
        // checkBoxSelections["Filter Algorithm"] = defaults["Content Warning"].Checkbox || {}
        // inputNumberSelections["Anime Filter"] = defaults["Anime Filter"]["Input Number"] || {}
        // inputNumberSelections["Content Warning"] = defaults["Content Warning"]["Input Number"] || {}
        // inputNumberSelections["Filter Algorithm"] = defaults["Content Warning"]["Input Number"] || {}
        // filterSelections
    });
    let filterTypeSelected = "Anime Filter";
    let filterTypeSelections = {
        "Anime Filter": true,
        "Content Warning": false,
        "Filter Algorithm": false,
    };
    let activeTagFilters = {
        "Anime Filter": [],
        "Content Warning": [],
        "Filter Algorithm": [],
    };
    // let filterOptionsUnsubscribe = filterOptions.subscribe((value) => {
    //     // Add Their own Filters
    // });
    let userFilters = {
        "Anime Filter": {
            Dropdown: [
                {
                    filName: "genre",
                    options: {
                        action: true,
                        comedy: true,
                        ecchi: true,
                        fantasy: true,
                        "mahou shoujo": true,
                        "sci-fi": true,
                        drama: true,
                        mystery: true,
                        adventure: true,
                        romance: true,
                        "slice of life": true,
                        supernatural: true,
                        music: true,
                        psychological: true,
                        mecha: true,
                        sports: true,
                        horror: true,
                        thriller: true,
                    },
                    optKeyword: "",
                    selected: false,
                    changeType: "write",
                },
            ],
            Checkbox: [
                {
                    filName: "hide my anime",
                    isSelected: false,
                },
            ],
            "Input Number": [
                {
                    filName: "limit favourites",
                    defaultValue: null,
                    maxValue: null,
                    minValue: 0,
                    numberValue: "",
                },
            ],
        },
        "Content Warning": {
            Dropdown: [
                {
                    filName: "genre",
                    options: {
                        action: true,
                        comedy: true,
                        ecchi: true,
                        fantasy: true,
                        "mahou shoujo": true,
                        "sci-fi": true,
                        drama: true,
                        mystery: true,
                        adventure: true,
                        romance: true,
                        "slice of life": true,
                        supernatural: true,
                        music: true,
                        psychological: true,
                        mecha: true,
                        sports: true,
                        horror: true,
                        thriller: true,
                    },
                    optKeyword: "",
                    selected: false,
                    changeType: "write",
                },
            ],
            Checkbox: [],
            "Input Number": [],
        },
        "Filter Algorithm": {
            Dropdown: [
                {
                    filName: "genre",
                    options: {
                        action: true,
                        comedy: true,
                        ecchi: true,
                        fantasy: true,
                        "mahou shoujo": true,
                        "sci-fi": true,
                        drama: true,
                        mystery: true,
                        adventure: true,
                        romance: true,
                        "slice of life": true,
                        supernatural: true,
                        music: true,
                        psychological: true,
                        mecha: true,
                        sports: true,
                        horror: true,
                        thriller: true,
                        all: true,
                    },
                    optKeyword: "",
                    selected: false,
                    changeType: "write",
                },
            ],
            Checkbox: [
                {
                    filName: "inc. all factors",
                    isSelected: false,
                },
            ],
            "Input Number": [
                {
                    filName: "sample size",
                    defaultValue: null,
                    maxValue: null,
                    minValue: 1,
                    numberValue: "",
                },
            ],
        },
        "sort type": {
            "weighted score": "desc",
            score: "none",
            "average score": "none",
            "user score": "none",
            popularity: "none",
            date: "none",
        },
    };
    // let sortFilter = ["Weighted Score", "desc"];
    // let sortSelections = {
    //     "Weighted Score": "desc",
    //     Score: "none",
    //     "Average Score": "none",
    //     "User Score": "none",
    //     Popularity: "none",
    //     Date: "none",
    // };
    // let inputNumberSelections = {
    //     "Anime Filter": {
    //         "Hello Num1": {
    //             numberValue: "",
    //             defaultValue: 1,
    //             maxValue: 111,
    //             minValue: 1,
    //         },
    //         "Hello Num2": {
    //             numberValue: "",
    //             defaultValue: 2,
    //             maxValue: 222,
    //             minValue: 2,
    //         },
    //         "Hello Num3": {
    //             numberValue: "",
    //             defaultValue: 3,
    //             maxValue: 333,
    //             minValue: 3,
    //         },
    //     },
    //     "Content Warning": {
    //         numberValue: 0,
    //         maxValue: 100,
    //         minValue: 0,
    //     },
    //     "Filter Algorithm": {
    //         numberValue: 0,
    //         maxValue: 100,
    //         minValue: 0,
    //     },
    // };
    // let checkBoxSelections = {
    //     "Anime Filter": {
    //         "Hide My Anime": false,
    //     },
    //     "Content Warning": {
    //         "Hide My Content": false,
    //     },
    //     "Filter Algorithm": {
    //         "Hide My Algorithms": false,
    //     },
    // };
    // let filterSelections = {
    //     "Anime Filter": [
    //         {
    //             filName: "Genre",
    //             optKeyword: "",
    //             options: {
    //                 Action: "none",
    //                 Comedy: "none",
    //                 Drama: "none",
    //                 Fantasy: "none",
    //                 Horror: "none",
    //                 Mystery: "none",
    //                 "Romance Shoujoasdasdadsadads": "none",
    //             },
    //             selected: false,
    //             changeType: "write",
    //         },
    //         {
    //             filName: "Tags",
    //             optKeyword: "",
    //             options: {
    //                 Tag1: "none",
    //                 Tags2: "none",
    //                 Tags3: "none",
    //                 Tags4: "none",
    //             },
    //             selected: false,
    //             changeType: "read",
    //         },
    //         {
    //             filName: "Year",
    //             optKeyword: "",
    //             options: {
    //                 Year1: "none",
    //                 Year2: "none",
    //                 Year3: "none",
    //                 Year4: "none",
    //                 Year5: "none",
    //                 Year6: "none",
    //             },
    //             selected: false,
    //             changeType: "write",
    //         },
    //         {
    //             filName: "Season",
    //             optKeyword: "",
    //             options: {
    //                 Season1: "none",
    //                 Season2: "none",
    //                 Season3: "none",
    //                 Season4: "none",
    //                 Season5: "none",
    //                 Season6: "none",
    //             },
    //             selected: false,
    //         },
    //         {
    //             filName: "Format",
    //             optKeyword: "",
    //             options: {
    //                 Format1: "none",
    //                 Format2: "none",
    //                 Format3: "none",
    //                 Format4: "none",
    //                 Format5: "none",
    //             },
    //             selected: false,
    //             changeType: "write",
    //         },
    //         {
    //             filName: "Airing Status",
    //             optKeyword: "",
    //             options: {
    //                 Airing: "none",
    //                 Airing1: "none",
    //                 Airing2: "none",
    //                 Airing3: "none",
    //                 Airing4: "none",
    //                 Airing5: "none",
    //             },
    //             selected: false,
    //             changeType: "write",
    //         },
    //     ],
    //     "Content Warning": [
    //         {
    //             filName: "Genre",
    //             optKeyword: "",
    //             options: {
    //                 ActionCW: "none",
    //                 ComedyCW: "none",
    //                 DramaCW: "none",
    //                 FantasyCW: "none",
    //                 HorrorCW: "none",
    //                 MysteryCW: "none",
    //                 "Romance ShoujoasdasdadsadadsCW": "none",
    //             },
    //             selected: false,
    //             changeType: "write",
    //         },
    //     ],
    //     "Filter Algorithm": [
    //         {
    //             filName: "Genre",
    //             optKeyword: "",
    //             options: {
    //                 ActionAF: "none",
    //                 ComedyAF: "none",
    //                 DramaAF: "none",
    //                 FantasyAF: "none",
    //                 HorrorAF: "none",
    //                 MysteryAF: "none",
    //                 "Romance ShoujoasdasdadsadadsCW": "none",
    //             },
    //             selected: false,
    //             changeType: "read",
    //         },
    //     ],
    // };
    let selectedFilterTypeElement;
    let selectedFilterElement;
    let selectedSortElement;
    let maxFilterSelectionHeight;
    let filtersIsScrolling;
    let tagFilterIsScrolling;
    let highlightedEl;

    // Init
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
    onMount(() => {
        maxFilterSelectionHeight = window.innerHeight * 0.3;
        unsubTagFiltersDragScroll = dragScroll(
            document.getElementsByClassName("tagFilters")[0]
        );
        windowResized = () => {
            maxFilterSelectionHeight = window.innerHeight * 0.3;
        };
        handleFilterTypes = (newFilterTypeName) => {
            if (filterTypeSelected !== newFilterTypeName) {
                // Close Filter Dropdown
                selectedSortElement = false;
                // Close Filter Selection Dropdown
                userFilters[filterTypeSelected].Dropdown = userFilters[
                    filterTypeSelected
                ].Dropdown.map((e) => {
                    e.selected = false;
                    return e;
                });
                selectedFilterElement = null;
                // Change Filter Type
                filterTypeSelections[filterTypeSelected] = false;
                filterTypeSelections[newFilterTypeName] = true;
                filterTypeSelected = newFilterTypeName;
            }
        };
        handleShowFilterTypes = (event) => {
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
                userFilters[filterTypeSelected].Dropdown = userFilters[
                    filterTypeSelected
                ].Dropdown.map((e) => {
                    e.selected = false;
                    return e;
                });
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
        filterSelect = (event, idx) => {
            let element = event.target;
            let filSelectEl = element.closest(".filter-select");
            if (filSelectEl === selectedFilterElement) return;
            if (selectedFilterElement instanceof Element) {
                let selectedIndex = getIndexInParent(selectedFilterElement);
                if (
                    element.classList.contains("icon") &&
                    userFilters[filterTypeSelected].Dropdown[selectedIndex]
                        .selected
                )
                    return;
                userFilters[filterTypeSelected].Dropdown[
                    selectedIndex
                ].selected = false;
            }
            // Add New
            let newindex = parseInt(idx);
            userFilters[filterTypeSelected].Dropdown[newindex].selected = true;
            selectedFilterElement = filSelectEl;
        };
        closeFilterSelect = (idx) => {
            let index = parseInt(idx);
            userFilters[filterTypeSelected].Dropdown[index].selected = false;
            selectedFilterElement = null;
        };
        clickOutsideListener = (event) => {
            let element = event.target;
            let classList = element.classList;
            // Filter Type Dropdown
            let filterTypeEl = element.closest(".filterType");
            if (!classList.contains("filterType") && !filterTypeEl) {
                selectedFilterTypeElement = false;
                highlightedEl = null;
            }
            // Sort Filter Dropdown
            let sortSelectEl = element.closest(".sortFilter");
            if (!classList.contains("sortFilter") && !sortSelectEl) {
                selectedSortElement = false;
                highlightedEl = null;
            }
            // Filter Selection Dropdown
            let filterSelectEl = element.closest(".filter-select");
            if (filterSelectEl !== selectedFilterElement) {
                userFilters[filterTypeSelected].Dropdown = userFilters[
                    filterTypeSelected
                ].Dropdown.map((e) => {
                    e.selected = false;
                    return e;
                });
                selectedFilterElement = null;
                highlightedEl = null;
            }
        };
        handleFilterSelectOptionChange = (tagName, idx, changeType) => {
            let newindex = parseInt(idx);
            let currentValue =
                userFilters[filterTypeSelected].Dropdown[newindex].options[
                    tagName
                ];
            if (currentValue === "none" || currentValue === true) {
                // true is default value of selections
                userFilters[filterTypeSelected].Dropdown[newindex].options[
                    tagName
                ] = "included";
                activeTagFilters[filterTypeSelected].unshift({
                    tagName: tagName,
                    tagIdx: newindex,
                    selected: "included",
                    changeType: changeType,
                    filterType: "dropdown",
                });
                activeTagFilters[filterTypeSelected] =
                    activeTagFilters[filterTypeSelected];
            } else if (currentValue === "included") {
                if (changeType === "read") {
                    userFilters[filterTypeSelected].Dropdown[newindex].options[
                        tagName
                    ] = "none";
                    activeTagFilters[filterTypeSelected] = activeTagFilters[
                        filterTypeSelected
                    ].filter(
                        (e) =>
                            !(
                                e.tagIdx === newindex &&
                                e.tagName === tagName &&
                                e.filterType === "dropdown"
                            )
                    );
                } else {
                    userFilters[filterTypeSelected].Dropdown[newindex].options[
                        tagName
                    ] = "excluded";
                    activeTagFilters[filterTypeSelected] = activeTagFilters[
                        filterTypeSelected
                    ].map((e) => {
                        if (
                            e.tagIdx === newindex &&
                            e.tagName === tagName &&
                            e.filterType === "dropdown" &&
                            e.selected === "included"
                        ) {
                            e.selected = "excluded";
                        }
                        return e;
                    });
                }
            } else {
                userFilters[filterTypeSelected].Dropdown[newindex].options[
                    tagName
                ] = "none";
                activeTagFilters[filterTypeSelected] = activeTagFilters[
                    filterTypeSelected
                ].filter(
                    (e) =>
                        !(
                            e.tagIdx === newindex &&
                            e.tagName === tagName &&
                            e.filterType === "dropdown"
                        )
                );
            }
        };
        handleCheckboxChange = (event, checkBoxName, tagIdx) => {
            let element = event.target;
            let classList = element.classList;
            if (classList.contains("checkbox") && event.type === "click")
                return; // Prevent Default
            let currentCheckBoxStatus =
                userFilters[filterTypeSelected].Checkbox[tagIdx].isSelected;
            if (currentCheckBoxStatus) {
                activeTagFilters[filterTypeSelected] = activeTagFilters[
                    filterTypeSelected
                ].filter(
                    (e) =>
                        !(
                            e.tagIdx === tagIdx &&
                            e.tagName === checkBoxName &&
                            e.filterType === "checkbox" &&
                            e.selected === "included"
                        )
                );
            } else {
                activeTagFilters[filterTypeSelected].unshift({
                    tagName: checkBoxName,
                    tagIdx: tagIdx,
                    filterType: "checkbox",
                    selected: "included",
                    changeType: "read",
                });
                activeTagFilters[filterTypeSelected] =
                    activeTagFilters[filterTypeSelected];
            }
            userFilters[filterTypeSelected].Checkbox[tagIdx].isSelected =
                !userFilters[filterTypeSelected].Checkbox[tagIdx].isSelected;
        };
        handleInputNumber = (
            event,
            newValue,
            tagIdx,
            inputNumberName,
            maxValue,
            minValue
        ) => {
            let currentValue =
                userFilters[filterTypeSelected]["Input Number"][tagIdx]
                    .numberValue;
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
                "-infinity".includes(newValueLowerCase)
            ) {
                if (newValue === "") {
                    activeTagFilters[filterTypeSelected] = activeTagFilters[
                        filterTypeSelected
                    ].filter(
                        (e) =>
                            !(
                                e.tagIdx === tagIdx &&
                                e.tagName ===
                                    `${inputNumberName}: ${currentValue}` &&
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
                    activeTagFilters[filterTypeSelected] = activeTagFilters[
                        filterTypeSelected
                    ].filter(
                        (e) =>
                            !(
                                e.tagIdx === tagIdx &&
                                e.tagName ===
                                    `${inputNumberName}: ${currentValue}` &&
                                e.filterType === "input number" &&
                                e.selected === "included"
                            )
                    );
                } else {
                    let elementIdx = activeTagFilters[
                        filterTypeSelected
                    ].findIndex(
                        (item) =>
                            item.tagName ===
                                `${inputNumberName}: ${currentValue}` &&
                            item.tagIdx === tagIdx &&
                            item.filterType === "input number"
                    );
                    if (elementIdx === -1) {
                        activeTagFilters[filterTypeSelected].unshift({
                            tagName: `${inputNumberName}: ${newValue}`,
                            tagIdx: tagIdx,
                            filterType: "input number",
                            selected: "included",
                            changeType: "read",
                        });
                    } else {
                        activeTagFilters[filterTypeSelected].splice(
                            elementIdx,
                            1
                        );
                        activeTagFilters[filterTypeSelected].unshift({
                            tagName: `${inputNumberName}: ${newValue}`,
                            tagIdx: tagIdx,
                            filterType: "input number",
                            selected: "included",
                            changeType: "read",
                        });
                    }
                    activeTagFilters = activeTagFilters;
                }
                userFilters[filterTypeSelected]["Input Number"][
                    tagIdx
                ].numberValue = newValue;
            } else if (
                isNaN(newValue) ||
                (newValue < minValue && typeof minValue === "number") ||
                (newValue > maxValue && typeof maxValue === "number")
            ) {
                event.target.value = currentValue;
            }
        };
        changeActiveSelect = (tagIdx, filterType, tagName, changeType) => {
            if (tagFilterIsScrolling) return false;
            tagIdx = parseInt(tagIdx);
            if (changeType === "read" || filterType !== "dropdown") return; // Unchangable Selection
            let currentSelect =
                userFilters[filterTypeSelected].Dropdown[tagIdx].options[
                    tagName
                ];
            if (currentSelect === "included") {
                userFilters[filterTypeSelected].Dropdown[tagIdx].options[
                    tagName
                ] = "excluded";
                activeTagFilters[filterTypeSelected] = activeTagFilters[
                    filterTypeSelected
                ].map((e) => {
                    if (
                        e.tagIdx === tagIdx &&
                        e.tagName === tagName &&
                        e.selected === "included"
                    ) {
                        e.selected = "excluded";
                    }
                    return e;
                });
            } else if (currentSelect === "excluded") {
                userFilters[filterTypeSelected].Dropdown[tagIdx].options[
                    tagName
                ] = "included";
                activeTagFilters[filterTypeSelected] = activeTagFilters[
                    filterTypeSelected
                ].map((e) => {
                    if (
                        e.tagIdx === tagIdx &&
                        e.tagName === tagName &&
                        e.selected === "excluded"
                    ) {
                        e.selected = "included";
                    }
                    return e;
                });
            }
        };
        removeActiveTag = (tagIdx, tagName, filterType) => {
            if (tagFilterIsScrolling) return;
            tagIdx = parseInt(tagIdx);
            if (filterType === "checkbox") {
                // Is Checkbox
                userFilters[filterTypeSelected].Checkbox[
                    tagIdx
                ].isSelected = false;
            } else if (filterType === "input number") {
                // Is Input Number
                userFilters[filterTypeSelected]["Input Number"][
                    tagIdx
                ].numberValue = "";
            } else {
                // Is Only Read tagName
                userFilters[filterTypeSelected].Dropdown[tagIdx].options[
                    tagName
                ] = "none";
            }
            activeTagFilters[filterTypeSelected] = activeTagFilters[
                filterTypeSelected
            ].filter(
                (e) =>
                    !(
                        e.tagName === tagName &&
                        e.tagIdx === tagIdx &&
                        e.filterType === filterType
                    )
            );
        };
        removeAllActiveTag = () => {
            if (tagFilterIsScrolling) return false;
            if (confirm("Do you want to remove all filters?") == true) {
                // Remove Active Number Input
                userFilters[filterTypeSelected]["Input Number"] = userFilters[
                    filterTypeSelected
                ]["Input Number"].map((e) => {
                    e.numberValue = "";
                    return e;
                });
                // Remove Checkbox
                userFilters[filterTypeSelected].Checkbox = userFilters[
                    filterTypeSelected
                ].Checkbox.map((e) => {
                    e.isSelected = false;
                    return e;
                });
                // Remove Option Selections
                userFilters[filterTypeSelected].Dropdown = userFilters[
                    filterTypeSelected
                ].Dropdown.map((e) => {
                    Object.entries(e.options).forEach(([tagName, selected]) => {
                        e.options[tagName] = "none";
                    });
                    return e;
                });
                activeTagFilters[filterTypeSelected] = [];
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
        changeSort = (sortname) => {
            let [currentSortName, currentSortType] = Object.entries(
                userFilters["sort type"]
            ).filter(([k, v]) => v === "desc" || v === "asc")[0];
            if (currentSortName === sortname) {
                let newSortType = currentSortType === "desc" ? "asc" : "desc";
                userFilters["sort type"][currentSortName] = newSortType;
            } else if (currentSortName !== sortname) {
                userFilters["sort type"][currentSortName] = "none";
                userFilters["sort type"][sortname] = "desc";
            }
        };
        changeSortType = () => {
            let [currentSortName, currentSortType] = Object.entries(
                userFilters["sort type"]
            ).filter(([k, v]) => v === "desc" || v === "asc")[0];
            if (currentSortType === "desc") {
                userFilters["sort type"][currentSortName] = "asc";
            } else {
                userFilters["sort type"][currentSortName] = "desc";
            }
        };
        handleDropdownKeyDown = (event) => {
            let keyCode = event.which || event.keyCode || 0;
            // 38up 40down 13enter

            if (keyCode == 38 || keyCode == 40) {
                let element =
                    document.getElementsByClassName("options-wrap")[0];
                console.log(element);
                if (
                    element.closest(".filterType") ||
                    element.closest(".sortFilter") ||
                    element.closest(".filter-select")
                ) {
                    event.preventDefault();
                    // handle sortFilter
                    if (highlightedEl instanceof Element) {
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
                                behavior: "smooth",
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
                selectedFilterTypeElement = false;
                selectedSortElement = false;
                userFilters[filterTypeSelected].Dropdown = userFilters[
                    filterTypeSelected
                ].Dropdown.map((e) => {
                    e.selected = false;
                    return e;
                });
                selectedFilterElement = null;
                highlightedEl = null;
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
        <input class="input-search" type="text" placeholder="Search" />
        <div class="filterType">
            <i
                class="fa-solid fa-sliders"
                on:click={handleShowFilterTypes}
                on:keydown={handleShowFilterTypes}
            />
            {#if selectedFilterTypeElement}
                <div
                    class="options-wrap"
                    style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                >
                    <div class="options">
                        {#each Object.entries(filterTypeSelections) as [filterTypeName, isActive] (filterTypeName)}
                            <div
                                {filterTypeName}
                                class="option"
                                on:click={handleFilterTypes(filterTypeName)}
                                on:keydown={handleFilterTypes(filterTypeName)}
                            >
                                <h3
                                    style:color={isActive
                                        ? "#3db4f2"
                                        : "inherit"}
                                >
                                    {filterTypeName}
                                </h3>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>
    <div class="filters">
        {#each userFilters[filterTypeSelected].Dropdown as { filName, options, selected, changeType, optKeyword }, idx (filName)}
            <div class="filter-select" {filName} {changeType}>
                <div class="filter-name">
                    <h2>{filName}</h2>
                </div>
                <div
                    class="select"
                    on:keydown={(e) => filterSelect(e, idx)}
                    on:click={(e) => filterSelect(e, idx)}
                >
                    <div class="value-wrap">
                        <input
                            type="search"
                            placeholder="Any"
                            autocomplete="off"
                            class="value-input"
                            bind:value={userFilters[filterTypeSelected]
                                .Dropdown[idx].optKeyword}
                        />
                    </div>
                    {#if selected && Object.entries(options).length}
                        <i
                            class="icon fa-solid fa-angle-up"
                            on:keydown={closeFilterSelect(idx)}
                            on:click={closeFilterSelect(idx)}
                        />
                    {:else}
                        <i class="icon fa-solid fa-angle-down" />
                    {/if}
                </div>
                {#if Object.entries(options).length && selected && !filtersIsScrolling}
                    <div
                        class="options-wrap"
                        style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                    >
                        <div class="options">
                            {#each Object.entries(options) as [tagName, selected]}
                                {#if hasPartialMatch(tagName, optKeyword) || optKeyword === ""}
                                    <div
                                        class="option"
                                        on:click={handleFilterSelectOptionChange(
                                            tagName,
                                            idx,
                                            changeType
                                        )}
                                        on:keydown={handleFilterSelectOptionChange(
                                            tagName,
                                            idx,
                                            changeType
                                        )}
                                    >
                                        <h3>{tagName}</h3>
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
                {/if}
            </div>
        {/each}
        {#each userFilters[filterTypeSelected]["Input Number"] as { filName, numberValue, maxValue, minValue, defaultValue }, idx (filName)}
            <div class="filter-input-number">
                <div class="filter-input-number-name">
                    <h2>{filName}</h2>
                </div>
                <div class="value-input-number-wrap">
                    <input
                        class="value-input-number"
                        type="text"
                        placeholder={defaultValue !== null
                            ? "Default: " + defaultValue
                            : "Input Number"}
                        value={numberValue}
                        on:input={(e) =>
                            handleInputNumber(
                                e,
                                e.target.value,
                                idx,
                                filName,
                                maxValue,
                                minValue
                            )}
                    />
                </div>
            </div>
        {/each}
        {#each userFilters[filterTypeSelected].Checkbox as { filName }, idx (filName)}
            <div
                class="filter-checkbox"
                {filName}
                on:click={(e) => handleCheckboxChange(e, filName, idx)}
                on:keydown={(e) => handleCheckboxChange(e, filName, idx)}
            >
                <div style:visibility="none" />
                <div class="checkbox-wrap">
                    <input
                        type="checkbox"
                        class="checkbox"
                        on:change={(e) => handleCheckboxChange(e, filName, idx)}
                        bind:checked={userFilters[filterTypeSelected].Checkbox[
                            idx
                        ].isSelected}
                    />
                    <div class="checkbox-label">{filName}</div>
                </div>
            </div>
        {/each}
    </div>
    <div class="activeFilters">
        <i
            class="fa-solid fa-ban"
            title="Remove Filters"
            on:click={removeAllActiveTag}
            on:keydown={removeAllActiveTag}
            style:visibility={activeTagFilters[filterTypeSelected].length
                ? "visible"
                : "hidden"}
        />
        <div class="tagFilters">
            {#each activeTagFilters[filterTypeSelected] as { tagName, tagIdx, selected, changeType, filterType } (tagName + tagIdx)}
                {#if selected !== "none"}
                    <div
                        class="activeTagFilter"
                        style:--activeTagFilterColor={selected === "included"
                            ? "#5f9ea0"
                            : "#e85d75"}
                        on:click={changeActiveSelect(
                            tagIdx,
                            filterType,
                            tagName,
                            changeType
                        )}
                        on:keydown={changeActiveSelect(
                            tagIdx,
                            filterType,
                            tagName,
                            changeType
                        )}
                    >
                        <h3>{tagName}</h3>
                        <i
                            class="fa-solid fa-xmark"
                            on:click|preventDefault={removeActiveTag(
                                tagIdx,
                                tagName,
                                filterType
                            )}
                            on:keydown={removeActiveTag(
                                tagIdx,
                                tagName,
                                filterType
                            )}
                        />
                    </div>
                {/if}
            {/each}
        </div>
        <div class="sortFilter">
            <i
                on:click={changeSortType}
                on:keydown={changeSortType}
                class={"fa-duotone fa-sort-" +
                    (Object.entries(userFilters["sort type"]).filter(
                        ([k, v]) => v !== "none"
                    )[0][1] === "asc"
                        ? "up"
                        : "down")}
            />
            <h3
                on:click={handleSortFilterPopup}
                on:keydown={handleSortFilterPopup}
            >
                {Object.entries(userFilters["sort type"]).filter(
                    ([k, v]) => v !== "none"
                )[0][0]}
                {#if selectedSortElement}
                    <div
                        class="options-wrap"
                        style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                    >
                        <div class="options">
                            {#each Object.keys(userFilters["sort type"]) as sortname (sortname)}
                                <div
                                    {sortname}
                                    class="option"
                                    on:click={changeSort(sortname)}
                                    on:keydown={changeSort(sortname)}
                                >
                                    <h3>{sortname}</h3>
                                    {#if Object.entries(userFilters["sort type"]).filter(([k, v]) => v !== "none")[0][0] === sortname}
                                        <i
                                            class={"fa-duotone fa-sort-" +
                                                (Object.entries(
                                                    userFilters["sort type"]
                                                ).filter(
                                                    ([k, v]) => v !== "none"
                                                )[0][1] === "asc"
                                                    ? "up"
                                                    : "down")}
                                        />
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </h3>
        </div>
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
        height: 28px;
    }
    .filterType .option h3 {
        cursor: pointer;
        text-transform: capitalize;
        text-indent: 1ch;
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
        height: 28px;
    }

    .filter-select .option h3 {
        cursor: pointer !important;
        text-transform: capitalize;
        text-indent: 1ch;
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
        min-width: max-content;
        margin-left: auto;
        position: relative;
    }
    .sortFilter h3,
    .sortFilter i {
        user-select: none;
        cursor: pointer;
        text-transform: capitalize;
    }

    .sortFilter h3 {
        text-indent: 1ch;
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
        height: 28px;
    }
    .sortFilter .option i {
        margin-left: auto;
    }
</style>
