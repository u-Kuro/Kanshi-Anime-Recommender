<script>
    import {
        menuVisible,
        hiddenEntries,
        animeLoaderWorker,
        finalAnimeList,
        dataStatus,
        searchedAnimeKeyword,
        filterOptions,
        activeTagFilters,
    } from "../../js/globalValues.js";
    import { onMount, onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import { saveJSON } from "../../js/indexedDB.js";
    import {
        processRecommendedAnimeList,
        animeLoader,
        requestAnimeEntries,
        requestUserEntries,
    } from "../../js/workerUtils.js";
    import { jsonIsEmpty } from "../../js/others/helper.js";

    function stillFixing() {
        alert("Still Fixing This");
    }

    function updateList() {
        if (confirm("Are you sure you want to update your list?")) {
            $menuVisible = false;
            requestUserEntries()
                .then(() => {
                    requestAnimeEntries();
                })
                .catch((error) => {
                    console.error(error);
                });
        }
    }

    function handleMenuVisibility(event) {
        let element = event.target;
        let classList = element.classList;
        if (classList.contains("button")) return;
        $menuVisible = !$menuVisible;
    }

    async function showAllHiddenEntries() {
        if (jsonIsEmpty($hiddenEntries)) {
            // Alert No Hidden Entries
            alert("No Hidden Entries");
            return;
        } else if (
            confirm("Are you sure you want to show all hidden Anime Entries?")
        ) {
            if ($animeLoaderWorker) {
                $animeLoaderWorker.terminate();
                $animeLoaderWorker = null;
            }
            $finalAnimeList = null;
            $dataStatus = "Updating List";
            $menuVisible = false;
            let filterSelectionIdx =
                $filterOptions?.filterSelection?.findIndex?.(
                    ({ filterSelectionName }) =>
                        filterSelectionName === "Anime Filter"
                );
            let checkBoxFilterIdx = $filterOptions?.filterSelection?.[
                filterSelectionIdx ?? -1
            ]?.filters?.Checkbox?.findIndex?.(
                ({ filName }) => filName === "hidden"
            );
            if (filterSelectionIdx >= 0 && checkBoxFilterIdx >= 0) {
                $filterOptions.filterSelection[
                    filterSelectionIdx ?? -1
                ].filters.Checkbox[checkBoxFilterIdx ?? -1].isSelected = false;
                // $filterOptions = $filterOptions;
            }
            if ($activeTagFilters?.["Anime Filter"]) {
                $activeTagFilters["Anime Filter"] = $activeTagFilters[
                    "Anime Filter"
                ].filter(
                    ({ optionName, filterType }) =>
                        optionName !== "hidden" && filterType !== "checkbox"
                );
            }
            $hiddenEntries = {};
            await saveJSON($filterOptions, "filterOptions");
            await saveJSON($activeTagFilters, "activeTagFilters");
            await saveJSON($hiddenEntries, "hiddenEntries");
            animeLoader()
                .then(async (data) => {
                    $animeLoaderWorker = data.animeLoaderWorker;
                    $searchedAnimeKeyword = "";
                    $finalAnimeList = data.finalAnimeList;
                    $dataStatus = null;
                    return;
                })
                .catch((error) => {
                    throw error;
                });
        }
    }
</script>

{#if $menuVisible}
    <div
        class="menu-container"
        on:click={handleMenuVisibility}
        on:keydown={handleMenuVisibility}
        transition:fade={{ duration: 300 }}
    >
        <div class="menu">
            <button class="button" on:click={updateList} on:keydown={updateList}
                >Update List</button
            >
            <button
                class="button"
                on:click={showAllHiddenEntries}
                on:keydown={showAllHiddenEntries}
                >Show All Hidden Entries</button
            >
            <input
                class="darkMode"
                type="file"
                id="importFile"
                style="display: none;"
                accept=".json"
            />
            <button
                class="button"
                on:click={stillFixing}
                on:keydown={stillFixing}>Import List</button
            >
            <button
                class="button"
                on:click={stillFixing}
                on:keydown={stillFixing}>Export List</button
            >
            <button
                class="button"
                on:click={stillFixing}
                on:keydown={stillFixing}>Dark Mode</button
            >
            <button
                class="button"
                on:click={stillFixing}
                on:keydown={stillFixing}>Update Every Hour</button
            >
            <button
                class="button"
                on:click={stillFixing}
                on:keydown={stillFixing}>Export Every Hour</button
            >
            <button
                class="button"
                on:click={stillFixing}
                on:keydown={stillFixing}>Create Another Account</button
            >
        </div>
    </div>
{/if}

<style>
    .menu-container {
        position: fixed;
        padding-top: 58px;
        top: 0;
        display: flex;
        width: 100%;
        height: 100%;
        background-color: rgb(0, 0, 0, 0.925);
        z-index: 1;
    }
    .menu {
        margin: 0 auto;
        padding: 1.5em 50px;
        width: 100vw;
        height: max-content;
        display: flex;
        flex-wrap: wrap;
        gap: 1.5em;
        max-width: 1140px;
        max-height: 100%;
        overflow-x: hidden;
        overflow-y: auto;
    }
    .menu::-webkit-scrollbar {
        display: none;
    }
    .menu > .button {
        -moz-box-shadow: 0 3px 20px 0 #2b2d42;
        -webkit-box-shadow: 0 3px 20px 0 #2b2d42;
        box-shadow: 0 3px 20px 0 #2b2d42;
        font-size: clamp(1.2rem, 1.3rem, 1.4rem);
        border-radius: 2em;
        background-color: rgb(40 69 102);
        color: #b9cadd;
        padding: 0.8em 1.6em;
        height: fit-content;
        border: none;
        cursor: pointer;
    }
    @media screen and (orientation: portrait) {
        .menu {
            padding: 1.5em 1em;
        }
    }
    /* .menu > button.selected {
        background-color: #000 !important;
        color: #b9cadd !important;
    } */
    /* Light */
    /* .light {
        background-color: rgb(0, 0, 0, 0.925);
        color: #f0f0f0;
    }
    .light.selected {
        background-color: #f0f0f0 !important;
        color: #000 !important;
    } */
</style>
