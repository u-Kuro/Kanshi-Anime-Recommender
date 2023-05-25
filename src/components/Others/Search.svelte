<script>
    import { onMount, onDestroy } from "svelte";
    import { dragScroll } from "../../js/others/dragScroll.js";
    let filterTypeSelected = "Anime Filter";
    let filterTypeSelections = {
        "Anime Filter": true,
        "Content Warning": false,
        "Algorithm Filter": false,
    };
    let activeTagFilters = {
        "Anime Filter": [],
        "Content Warning": [],
        "Algorithm Filter": [],
    };
    let sortFilter = ["Weighted Score", "desc"];
    let sortSelections = {
        "Weighted Score": "desc",
        Score: "none",
        "Average Score": "none",
        "User Score": "none",
        Popularity: "none",
        Date: "none",
    };
    let inputNumberSelections = {
        "Anime Filter": {
            "Hello Num1": {
                numberValue: "",
                defaultValue: 1,
                maxValue: 111,
                minValue: 1,
            },
            "Hello Num2": {
                numberValue: "",
                defaultValue: 2,
                maxValue: 222,
                minValue: 2,
            },
            "Hello Num3": {
                numberValue: "",
                defaultValue: 3,
                maxValue: 333,
                minValue: 3,
            },
        },
        "Content Warning": {
            numberValue: 0,
            maxValue: 100,
            minValue: 0,
        },
        "Algorithm Filter": {
            numberValue: 0,
            maxValue: 100,
            minValue: 0,
        },
    };
    let checkBoxSelections = {
        "Anime Filter": {
            "Hide My Anime": false,
        },
        "Content Warning": {
            "Hide My Content": false,
        },
        "Algorithm Filter": {
            "Hide My Algorithms": false,
        },
    };

    let x = {
        Format: {},
        Genre: {
            genre1: true,
            genre2: true,
            genre3: true,
            genre4: true,
            genre5: true,
            genre6: true,
        },
        Tag: {},
        "Tag Category": {},
        Studio: {},
        Staff: {},
        "Staff Role": {},
        Year: {},
        season: {},
        "Airing Status": {},
        "User Status": {},
        "Sort Type": {},
        Others: {
            "Anime Filter": {
                Checkbox: {},
                "Input Number": {},
            },
            "Content Warning": {
                Checkbox: {},
                "Input Number": {},
            },
            "Filter Algorithm": {
                Checkbox: {},
                "Input Number": {},
            },
        },
    };
    let filterSelections = {
        "Anime Filter": [
            {
                filname: "Genre",
                optKeyword: "",
                options: {
                    Action: "none",
                    Comedy: "none",
                    Drama: "none",
                    Fantasy: "none",
                    Horror: "none",
                    Mystery: "none",
                    "Romance Shoujoasdasdadsadads": "none",
                },
                selected: false,
                changeType: "write",
            },
            {
                filname: "Tags",
                optKeyword: "",
                options: {
                    Tag1: "none",
                    Tags2: "none",
                    Tags3: "none",
                    Tags4: "none",
                },
                selected: false,
                changeType: "read",
            },
            {
                filname: "Year",
                optKeyword: "",
                options: {
                    Year1: "none",
                    Year2: "none",
                    Year3: "none",
                    Year4: "none",
                    Year5: "none",
                    Year6: "none",
                },
                selected: false,
                changeType: "write",
            },
            {
                filname: "Season",
                optKeyword: "",
                options: {
                    Season1: "none",
                    Season2: "none",
                    Season3: "none",
                    Season4: "none",
                    Season5: "none",
                    Season6: "none",
                },
                selected: false,
            },
            {
                filname: "Format",
                optKeyword: "",
                options: {
                    Format1: "none",
                    Format2: "none",
                    Format3: "none",
                    Format4: "none",
                    Format5: "none",
                },
                selected: false,
                changeType: "write",
            },
            {
                filname: "Airing Status",
                optKeyword: "",
                options: {
                    Airing: "none",
                    Airing1: "none",
                    Airing2: "none",
                    Airing3: "none",
                    Airing4: "none",
                    Airing5: "none",
                },
                selected: false,
                changeType: "write",
            },
        ],
        "Content Warning": [
            {
                filname: "Genre",
                optKeyword: "",
                options: {
                    ActionCW: "none",
                    ComedyCW: "none",
                    DramaCW: "none",
                    FantasyCW: "none",
                    HorrorCW: "none",
                    MysteryCW: "none",
                    "Romance ShoujoasdasdadsadadsCW": "none",
                },
                selected: false,
                changeType: "write",
            },
        ],
        "Algorithm Filter": [
            {
                filname: "Genre",
                optKeyword: "",
                options: {
                    ActionAF: "none",
                    ComedyAF: "none",
                    DramaAF: "none",
                    FantasyAF: "none",
                    HorrorAF: "none",
                    MysteryAF: "none",
                    "Romance ShoujoasdasdadsadadsCW": "none",
                },
                selected: false,
                changeType: "read",
            },
        ],
    };
    let selectedFilterTypeElement;
    let selectedFilterElement;
    let selectedSortElement;
    let maxFilterSelectionHeight;
    let filtersIsScrolling;
    let tagFilterIsScrolling;

    // Init
    let clickOutsideListener;
    let windowResized;
    let handleFilterTypes;
    let handleShowFilterTypes;
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
                filterSelections[filterTypeSelected] = filterSelections[
                    filterTypeSelected
                ].map((e) => {
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
                filterSelections[filterTypeSelected] = filterSelections[
                    filterTypeSelected
                ].map((e) => {
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
                    filterSelections[filterTypeSelected][selectedIndex].selected
                )
                    return;
                filterSelections[filterTypeSelected][
                    selectedIndex
                ].selected = false;
            }
            // Add New
            let newindex = parseInt(idx);
            filterSelections[filterTypeSelected][newindex].selected = true;
            selectedFilterElement = filSelectEl;
        };
        closeFilterSelect = (idx) => {
            let index = parseInt(idx);
            filterSelections[filterTypeSelected][index].selected = false;
            selectedFilterElement = null;
        };
        clickOutsideListener = (event) => {
            let element = event.target;
            let classList = element.classList;
            // Filter Type Dropdown
            let filterTypeEl = element.closest(".filterType");
            if (!classList.contains("filterType") && !filterTypeEl) {
                selectedFilterTypeElement = false;
            }
            // Sort Filter Dropdown
            let sortSelectEl = element.closest(".sortFilter");
            if (!classList.contains("sortFilter") && !sortSelectEl) {
                selectedSortElement = false;
            }
            // Filter Selection Dropdown
            let filterSelectEl = element.closest(".filter-select");
            if (filterSelectEl !== selectedFilterElement) {
                filterSelections[filterTypeSelected] = filterSelections[
                    filterTypeSelected
                ].map((e) => {
                    e.selected = false;
                    return e;
                });
                selectedFilterElement = null;
            }
        };
        handleFilterSelectOptionChange = (option, idx, changeType) => {
            let newindex = parseInt(idx);
            let currentValue =
                filterSelections[filterTypeSelected][newindex].options[option];
            if (currentValue === "none") {
                filterSelections[filterTypeSelected][newindex].options[option] =
                    "included";
                activeTagFilters[filterTypeSelected].unshift({
                    option: option,
                    idx: newindex,
                    selected: "included",
                    changeType: changeType,
                });
                activeTagFilters[filterTypeSelected] =
                    activeTagFilters[filterTypeSelected];
            } else if (currentValue === "included") {
                if (changeType === "read") {
                    filterSelections[filterTypeSelected][newindex].options[
                        option
                    ] = "none";
                    activeTagFilters[filterTypeSelected] = activeTagFilters[
                        filterTypeSelected
                    ].filter(
                        (e) => !(e.idx === newindex && e.option === option)
                    );
                } else {
                    filterSelections[filterTypeSelected][newindex].options[
                        option
                    ] = "excluded";
                    activeTagFilters[filterTypeSelected].forEach((e) => {
                        if (
                            e.idx === newindex &&
                            e.option === option &&
                            e.selected === "included"
                        ) {
                            e.selected = "excluded";
                        }
                    });
                    activeTagFilters[filterTypeSelected] =
                        activeTagFilters[filterTypeSelected];
                }
            } else {
                filterSelections[filterTypeSelected][newindex].options[option] =
                    "none";
                activeTagFilters[filterTypeSelected] = activeTagFilters[
                    filterTypeSelected
                ].filter((e) => !(e.idx === newindex && e.option === option));
            }
        };
        handleCheckboxChange = (event, checkBoxName) => {
            let element = event.target;
            let classList = element.classList;
            if (classList.contains("checkbox") && event.type === "click")
                return; // Prevent Default
            let currentCheckBoxStatus =
                checkBoxSelections[filterTypeSelected][checkBoxName];
            if (currentCheckBoxStatus) {
                activeTagFilters[filterTypeSelected] = activeTagFilters[
                    filterTypeSelected
                ].filter(
                    (e) =>
                        !(
                            e.idx === -1 &&
                            e.option === checkBoxName &&
                            e.selected === "included"
                        )
                );
            } else {
                activeTagFilters[filterTypeSelected].unshift({
                    option: checkBoxName,
                    idx: -1,
                    selected: "included",
                    changeType: "read",
                });
                activeTagFilters[filterTypeSelected] =
                    activeTagFilters[filterTypeSelected];
            }
            checkBoxSelections[filterTypeSelected][checkBoxName] =
                !checkBoxSelections[filterTypeSelected][checkBoxName];
        };
        handleInputNumber = (
            event,
            newValue,
            inputNumberName,
            maxValue,
            minValue
        ) => {
            let currentValue =
                inputNumberSelections[filterTypeSelected][inputNumberName]
                    .numberValue;
            if (
                (newValue !== currentValue &&
                    !isNaN(newValue) &&
                    !isNaN(currentValue) &&
                    parseFloat(newValue) >= minValue &&
                    parseFloat(newValue) <= maxValue) ||
                newValue === ""
            ) {
                if (newValue === "") {
                    activeTagFilters[filterTypeSelected] = activeTagFilters[
                        filterTypeSelected
                    ].filter(
                        (e) =>
                            !(
                                e.idx === -2 &&
                                e.option ===
                                    `${inputNumberName}: ${currentValue}` &&
                                e.selected === "included"
                            )
                    );
                } else {
                    let elementIdx = activeTagFilters[
                        filterTypeSelected
                    ].findIndex(
                        (item) =>
                            item.option ===
                                `${inputNumberName}: ${currentValue}` &&
                            item.idx === -2
                    );
                    if (elementIdx === -1) {
                        activeTagFilters[filterTypeSelected].unshift({
                            option: `${inputNumberName}: ${newValue}`,
                            idx: -2,
                            selected: "included",
                            changeType: "read",
                        });
                    } else {
                        activeTagFilters[filterTypeSelected].splice(
                            elementIdx,
                            1
                        );
                        activeTagFilters[filterTypeSelected].unshift({
                            option: `${inputNumberName}: ${newValue}`,
                            idx: -2,
                            selected: "included",
                            changeType: "read",
                        });
                    }
                    activeTagFilters = activeTagFilters;
                }
                inputNumberSelections[filterTypeSelected][
                    inputNumberName
                ].numberValue = newValue;
            } else if (
                isNaN(newValue) ||
                newValue < minValue ||
                newValue > maxValue
            ) {
                event.target.value = currentValue;
            } else if (newValue === currentValue) {
                return;
            }
        };
        changeActiveSelect = (idx, option, changeType) => {
            if (tagFilterIsScrolling) return false;
            // let element = event.target;
            // if (!element.classList.contains("activeTagFilter")) {
            //     element = element.closest(".activeTagFilter");
            // }
            idx = parseInt(idx);
            // let option = element.getAttribute("option");
            // let changeType = element.getAttribute("changeType");
            if (idx < 0 || changeType === "read") return; // Unchangable Selection
            let currentSelect =
                filterSelections[filterTypeSelected][idx].options[option];
            if (currentSelect === "included") {
                filterSelections[filterTypeSelected][idx].options[option] =
                    "excluded";
                activeTagFilters[filterTypeSelected] = activeTagFilters[
                    filterTypeSelected
                ].map((e) => {
                    if (
                        e.idx === idx &&
                        e.option === option &&
                        e.selected === "included"
                    ) {
                        e.selected = "excluded";
                    }
                    return e;
                });
            } else if (currentSelect === "excluded") {
                filterSelections[filterTypeSelected][idx].options[option] =
                    "included";
                activeTagFilters[filterTypeSelected] = activeTagFilters[
                    filterTypeSelected
                ].map((e) => {
                    if (
                        e.idx === idx &&
                        e.option === option &&
                        e.selected === "excluded"
                    ) {
                        e.selected = "included";
                    }
                    return e;
                });
            }
        };
        removeActiveTag = (idx, option) => {
            if (tagFilterIsScrolling) return;
            // let element = event.target;
            // if (!element.classList.contains("activeTagFilter")) {
            //     element = element.closest(".activeTagFilter");
            // }
            idx = parseInt(idx);
            // let option = element.getAttribute("option");
            if (idx === -1) {
                // Is Checkbox
                checkBoxSelections[filterTypeSelected][option] = false;
            } else if (idx === -2) {
                // Is Input Number
                inputNumberSelections[filterTypeSelected][
                    option.split(":")[0].trim()
                ].numberValue = "";
            } else {
                // Is Only Read Option
                filterSelections[filterTypeSelected][idx].options[option] =
                    "none";
            }
            activeTagFilters[filterTypeSelected] = activeTagFilters[
                filterTypeSelected
            ].filter((e) => !(e.option === option && e.idx === idx));
        };
        removeAllActiveTag = () => {
            if (tagFilterIsScrolling) return false;
            if (confirm("Do you want to remove all filters?") == true) {
                // Remove Active Number Input
                Object.keys(inputNumberSelections[filterTypeSelected]).forEach(
                    (e) => {
                        inputNumberSelections[filterTypeSelected][
                            e
                        ].numberValue = "";
                    }
                );
                // Remove Checkbox
                Object.keys(checkBoxSelections[filterTypeSelected]).forEach(
                    (checkBoxName) => {
                        checkBoxSelections[filterTypeSelected][
                            checkBoxName
                        ] = false;
                    }
                );
                // Remove Option Selections
                filterSelections[filterTypeSelected].forEach((e) => {
                    Object.entries(e.options).forEach(([option, selected]) => {
                        e.options[option] = "none";
                    });
                });
                filterSelections[filterTypeSelected] =
                    filterSelections[filterTypeSelected];
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
            // let element = event.target;
            // let classList = element.classList;
            // if (!classList.contains("option")) {
            //     element = element.closest(".option");
            // }
            let [currentSortName, currentSortType] = sortFilter;
            // let sortName = element.getAttribute("sortName");
            if (currentSortName === sortname) {
                let newSortType = currentSortType === "desc" ? "asc" : "desc";
                sortSelections[currentSortName] = newSortType;
                sortFilter = [sortname, newSortType];
            } else if (currentSortName !== sortname) {
                sortSelections[sortname] = "desc";
                sortFilter = [sortname, "desc"];
            }
        };
        changeSortType = () => {
            let [currentSortName, currentSortType] = sortFilter;
            if (currentSortType === "desc") {
                sortSelections[currentSortName] = "asc";
                sortFilter = [currentSortName, "asc"];
            } else {
                sortSelections[currentSortName] = "desc";
                sortFilter = [currentSortName, "desc"];
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
        window.addEventListener("resize", windowResized);
        window.addEventListener("pointerdown", clickOutsideListener);
    });
    onDestroy(() => {
        unsubTagFiltersDragScroll();
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
        {#each filterSelections[filterTypeSelected] as { filname, options, selected, changeType, optKeyword }, idx (filname)}
            <div class="filter-select" {filname} {changeType}>
                <div class="filter-name">
                    <h2>{filname}</h2>
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
                            bind:value={filterSelections[filterTypeSelected][
                                idx
                            ].optKeyword}
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
                            {#each Object.entries(options) as [option, selected]}
                                {#if hasPartialMatch(option, optKeyword) || optKeyword === ""}
                                    <div
                                        class="option"
                                        {option}
                                        {changeType}
                                        on:click={handleFilterSelectOptionChange(
                                            option,
                                            idx,
                                            changeType
                                        )}
                                        on:keydown={handleFilterSelectOptionChange(
                                            option,
                                            idx,
                                            changeType
                                        )}
                                    >
                                        <h3>{option}</h3>
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
        {#each Object.entries(checkBoxSelections[filterTypeSelected]) as [checkBoxName, isSelected] (checkBoxName)}
            <div
                class="filter-checkbox"
                {checkBoxName}
                on:click={(e) => handleCheckboxChange(e, checkBoxName)}
                on:keydown={(e) => handleCheckboxChange(e, checkBoxName)}
            >
                <div style:visibility="none" />
                <div class="checkbox-wrap">
                    <input
                        type="checkbox"
                        class="checkbox"
                        on:change={(e) => handleCheckboxChange(e, checkBoxName)}
                        bind:checked={checkBoxSelections[filterTypeSelected][
                            checkBoxName
                        ]}
                    />
                    <div class="checkbox-label">{checkBoxName}</div>
                </div>
            </div>
        {/each}
        {#each Object.entries(inputNumberSelections[filterTypeSelected]) as [inputNumberName, { numberValue, maxValue, minValue, defaultValue }] (inputNumberName)}
            <div class="filter-input-number" {inputNumberName} {numberValue}>
                <div class="filter-input-number-name">
                    <h2>{inputNumberName}</h2>
                </div>
                <div class="value-input-number-wrap">
                    <input
                        class="value-input-number"
                        type="text"
                        placeholder={"Default: " + defaultValue}
                        value={numberValue}
                        on:input={(e) =>
                            handleInputNumber(
                                e,
                                e.target.value,
                                inputNumberName,
                                maxValue,
                                minValue
                            )}
                    />
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
            {#each activeTagFilters[filterTypeSelected] as { option, idx, selected, changeType } (option + idx)}
                {#if selected !== "none"}
                    <div
                        class="activeTagFilter"
                        style:--activeTagFilterColor={selected === "included"
                            ? "#5f9ea0"
                            : "#e85d75"}
                        {option}
                        {idx}
                        {changeType}
                        on:click={changeActiveSelect(idx, option, changeType)}
                        on:keydown={changeActiveSelect(idx, option, changeType)}
                    >
                        <h3>{option}</h3>
                        <i
                            class="fa-solid fa-xmark"
                            on:click|preventDefault={removeActiveTag(
                                idx,
                                option
                            )}
                            on:keydown={removeActiveTag(idx, option)}
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
                    (sortFilter[1] === "asc" ? "up" : "down")}
            />
            <h3
                on:click={handleSortFilterPopup}
                on:keydown={handleSortFilterPopup}
            >
                {sortFilter[0]}
                {#if selectedSortElement}
                    <div
                        class="options-wrap"
                        style:--maxFilterSelectionHeight="{maxFilterSelectionHeight}px"
                    >
                        <div class="options">
                            {#each Object.keys(sortSelections) as sortname (sortname)}
                                <div
                                    {sortname}
                                    class="option"
                                    on:click={changeSort(sortname)}
                                    on:keydown={changeSort(sortname)}
                                >
                                    <h3>{sortname}</h3>
                                    {#if sortFilter[0] === sortname}
                                        <i
                                            class={"fa-duotone fa-sort-" +
                                                (sortFilter[1] === "asc"
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
        padding: 11px 16px;
        z-index: 1;
        cursor: default;
    }
    .filterType .options {
        display: flex;
        align-items: start;
        flex-direction: column;
        cursor: default;
        gap: 11px;
        width: max-content;
    }
    .filterType .option {
        color: inherit;
        display: grid;
        align-items: center;
        padding: 5px 0;
        width: 100%;
        grid-template-columns: auto;
        grid-column-gap: 8px;
        cursor: pointer;
        height: 25px;
        cursor: pointer;
        user-select: none;
    }
    .filterType .option h3 {
        cursor: pointer;
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
        padding: 11px 16px;
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
        gap: 11px;
    }

    .filter-select .option {
        color: inherit;
        padding-block: 5px;
        display: grid;
        grid-template-columns: auto 12px;
        align-items: center;
        cursor: pointer;
        grid-column-gap: 8px;
        user-select: none;
    }

    .filter-select .option h3 {
        cursor: pointer !important;
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
        height: 28px;
        line-height: 28px;
        user-select: none;
        cursor: pointer;
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
        padding: 11px 16px;
        z-index: 1;
        cursor: default;
    }
    .sortFilter .options {
        display: flex;
        align-items: start;
        flex-direction: column;
        cursor: default;
        gap: 11px;
        width: max-content;
    }
    .sortFilter .option {
        color: inherit;
        display: grid;
        align-items: center;
        padding: 5px 0;
        width: 100%;
        grid-template-columns: auto 12px;
        grid-column-gap: 8px;
        cursor: pointer;
        height: 25px;
        user-select: none;
    }
    .sortFilter .option i {
        margin-left: auto;
    }
</style>
