<script>
    import {
        appID,
        android,
        menuVisible,
        hiddenEntries,
        animeLoaderWorker,
        finalAnimeList,
        dataStatus,
        autoUpdate,
        autoExport,
        exportPathIsAvailable,
        filterOptions,
        activeTagFilters,
        runUpdate,
        runExport,
        confirmPromise,
        initData,
        importantUpdate,
        importantLoad,
        popupVisible,
    } from "../../js/globalValues.js";
    import { fly } from "svelte/transition";
    import { saveJSON } from "../../js/indexedDB.js";
    import { importUserData } from "../../js/workerUtils.js";
    import { jsonIsEmpty } from "../../js/others/helper.js";

    let importFileInput;

    async function stillFixing() {
        $confirmPromise({
            isAlert: true,
            text: "Sorry, this is still not working.",
        });
    }

    async function importData() {
        if ($initData) return pleaseWaitAlert();
        if (!(importFileInput instanceof Element))
            return ($dataStatus = "Something went wrong...");
        if (
            await $confirmPromise({
                text: "Are you sure you want to import your Data?",
            })
        ) {
            importFileInput.click();
        }
    }

    async function importJSONFile() {
        if (!(importFileInput instanceof Element))
            return ($dataStatus = "Something went wrong...");
        let importedFile = importFileInput.files?.[0];
        if (importedFile) {
            let filename = importedFile.name;
            if (
                await $confirmPromise(
                    `File ${
                        filename ? "named [" + filename + "] " : ""
                    }has been detected, do you want to continue the import?`
                )
            ) {
                await saveJSON(true, "shouldProcessRecommendation");
                $menuVisible = false;
                if (!$popupVisible) {
                    window.scrollY = window.scrollY;
                    window.scrollX = window.scrollX;
                    window?.scrollTo?.({ top: -9999, behavior: "smooth" });
                    $finalAnimeList = null;
                }
                importUserData({
                    importedFile: importedFile,
                })
                    .then(() => {
                        if (importFileInput instanceof Element)
                            importFileInput.value = null;
                    })
                    .catch((error) => {
                        $dataStatus = error || "Something went wrong...";
                        importFileInput.value = null;
                        importantUpdate.update((e) => !e);
                    });
            } else {
                if (importFileInput instanceof Element)
                    importFileInput.value = null;
            }
        } else {
            if (importFileInput instanceof Element)
                importFileInput.value = null;
        }
    }
    // Global Function For Android
    function handleExportFolder() {
        try {
            JSBridge.chooseExportFolder();
        } catch (e) {}
    }
    window.setExportPathAvailability = async (value = true) => {
        $exportPathIsAvailable = value;
        await saveJSON(value, "exportPathIsAvailable");
    };

    async function exportData() {
        if ($initData) return pleaseWaitAlert();
        if (!$exportPathIsAvailable && $android) return handleExportFolder();
        if (
            await $confirmPromise("Are you sure you want to export your data?")
        ) {
            $menuVisible = false;
            runExport.update((e) => !e);
        }
    }

    async function updateList() {
        if ($initData) return pleaseWaitAlert();
        else if (!navigator.onLine) {
            return $confirmPromise({
                isAlert: true,
                title: "Currently offline",
                text: "It seems that you're currently offline and unable to update.",
            });
        }
        if (
            await $confirmPromise("Are you sure you want to update your list?")
        ) {
            $menuVisible = false;
            runUpdate.update((e) => !e);
        }
    }

    async function handleUpdateEveryHour() {
        if (
            await $confirmPromise(
                `Are you sure you want to ${
                    $autoUpdate ? "disable" : "enable"
                } auto-update?`
            )
        ) {
            $autoUpdate = !$autoUpdate;
        }
    }

    async function handleExportEveryHour() {
        if (!$exportPathIsAvailable && $android) return handleExportFolder();
        if (
            await $confirmPromise(
                `Are you sure you want to ${
                    $autoExport ? "disable" : "enable"
                } auto-export?`
            )
        ) {
            $autoExport = !$autoExport;
        }
    }

    function handleMenuVisibility(event) {
        let element = event.target;
        let classList = element.classList;
        if (classList.contains("button")) return;
        $menuVisible = !$menuVisible;
    }

    async function showAllHiddenEntries() {
        if ($initData) return pleaseWaitAlert();
        if (jsonIsEmpty($hiddenEntries)) {
            // Alert No Hidden Entries
            $confirmPromise({
                isAlert: true,
                text: "There is currently no hidden entries.",
            });
            return;
        } else if (
            await $confirmPromise(
                "Are you sure you want to show all hidden anime entries?"
            )
        ) {
            if ($animeLoaderWorker) {
                $animeLoaderWorker.terminate();
                $animeLoaderWorker = null;
            }
            if (!$popupVisible) {
                $finalAnimeList = null;
            }
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
                ({ filName }) => filName === "hidden anime"
            );
            if (filterSelectionIdx >= 0 && checkBoxFilterIdx >= 0) {
                $filterOptions.filterSelection[
                    filterSelectionIdx ?? -1
                ].filters.Checkbox[checkBoxFilterIdx ?? -1].isSelected = false;
            }
            if ($activeTagFilters?.["Anime Filter"]) {
                $activeTagFilters["Anime Filter"] = $activeTagFilters[
                    "Anime Filter"
                ].filter(
                    ({ optionName, filterType }) =>
                        optionName !== "hidden" && filterType !== "checkbox"
                );
            }
            await saveJSON($filterOptions, "filterOptions");
            await saveJSON($activeTagFilters, "activeTagFilters");
            await saveJSON({}, "hiddenEntries");
            importantLoad.update((e) => !e);
        }
    }

    async function anilistSignup() {
        if (
            await $confirmPromise(
                "Are you sure want to sign-up an anilist account?"
            )
        ) {
            window.open("https://anilist.co/signup", "_blank");
        }
    }

    function switchAppMode() {
        if (!$android) return;
        try {
            JSBridge.switchApp();
        } catch (e) {}
    }

    function checkForUpdates() {
        if (!navigator.onLine) {
            return $confirmPromise({
                isAlert: true,
                title: "Currently offline",
                text: "It seems that you're currently offline and unable to check for updates.",
            });
        } else {
            if (!$android) return;
            try {
                JSBridge.checkAppID($appID, true);
            } catch (e) {}
        }
    }

    async function refresh() {
        if (await $confirmPromise("Are you sure want to refresh the app?")) {
            if (!$android) return;
            try {
                JSBridge.refreshWeb();
            } catch (e) {}
        }
    }

    function pleaseWaitAlert() {
        $confirmPromise({
            isAlert: true,
            title: "Initializing resources",
            text: "Please wait a moment...",
        });
    }

    let isGoingBack,
        touchID,
        checkPointer,
        startX,
        endX,
        startY,
        endY,
        goBackPercent;

    function itemScroll() {
        isGoingBack = false;
        goBackPercent = 0;
    }

    function handlePopupContainerDown(event) {
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        touchID = event.touches[0].identifier;
        checkPointer = true;
    }
    function handlePopupContainerMove(event) {
        if (checkPointer) {
            checkPointer = false;
            endX = event.touches[0].clientX;
            endY = event.touches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
                isGoingBack = true;
            }
        } else if (isGoingBack) {
            endX = event.touches[0].clientX;
            const deltaX = endX - startX;
            if (deltaX > 0) {
                goBackPercent = Math.min((deltaX / 48) * 100, 100);
            } else {
                goBackPercent = 0;
            }
        }
    }
    function handlePopupContainerUp(event) {
        endX = Array.from(event.changedTouches).find(
            (touch) => touch.identifier === touchID
        ).clientX;
        let xThreshold = 48;
        let deltaX = endX - startX;
        if (isGoingBack && deltaX >= xThreshold) {
            $menuVisible = false;
        }
        touchID = null;
        isGoingBack = false;
        goBackPercent = 0;
    }
    function handlePopupContainerCancel() {
        touchID = null;
        isGoingBack = false;
        goBackPercent = 0;
    }
</script>

<input
    type="file"
    style:display="none"
    accept=".json"
    bind:this={importFileInput}
    on:change={importJSONFile}
/>
{#if $menuVisible}
    <div
        class="menu-container"
        on:click={handleMenuVisibility}
        on:keydown={(e) => e.key === "Enter" && handleMenuVisibility(e)}
        on:touchstart={handlePopupContainerDown}
        on:touchmove={handlePopupContainerMove}
        on:touchend={handlePopupContainerUp}
        on:touchcancel={handlePopupContainerCancel}
    >
        <div class="menu" on:scroll={itemScroll}>
            <button
                class="button"
                on:click={updateList}
                on:keydown={(e) => e.key === "Enter" && updateList(e)}
                transition:fly={{ x: 50, duration: 300 }}>Update List</button
            >
            <button
                class="button"
                on:click={showAllHiddenEntries}
                on:keydown={(e) => e.key === "Enter" && showAllHiddenEntries(e)}
                transition:fly={{ x: 50, duration: 300 }}
                >Show All Hidden Entries</button
            >
            <button
                class="button"
                on:click={importData}
                on:keydown={(e) => e.key === "Enter" && importData(e)}
                transition:fly={{ x: 50, duration: 300 }}>Import Data</button
            >
            <button
                class="button"
                on:click={exportData}
                on:keydown={(e) => e.key === "Enter" && exportData(e)}
                transition:fly={{ x: 50, duration: 300 }}>Export Data</button
            >
            {#if $android}
                <button
                    class="button"
                    on:click={handleExportFolder}
                    on:keydown={(e) =>
                        e.key === "Enter" && handleExportFolder(e)}
                    transition:fly={{ x: 50, duration: 300 }}
                >
                    {($exportPathIsAvailable ? "Change" : "Set") +
                        " Export Folder"}
                </button>
            {/if}
            <button
                class="button selected"
                transition:fly={{ x: 50, duration: 300 }}
                on:click={stillFixing}
                on:keydown={(e) => e.key === "Enter" && stillFixing(e)}
                >Dark Mode</button
            >
            <button
                transition:fly={{ x: 50, duration: 300 }}
                class={"button " + ($autoUpdate ? "selected" : "")}
                on:click={handleUpdateEveryHour}
                on:keydown={(e) =>
                    e.key === "Enter" && handleUpdateEveryHour(e)}
                >Auto Update</button
            >
            <button
                transition:fly={{ x: 50, duration: 300 }}
                class={"button " + ($autoExport ? "selected" : "")}
                on:click={handleExportEveryHour}
                on:keydown={(e) =>
                    e.key === "Enter" && handleExportEveryHour(e)}
                >Auto Export</button
            >
            <button
                transition:fly={{ x: 50, duration: 300 }}
                class="button"
                on:click={anilistSignup}
                on:keydown={(e) => e.key === "Enter" && anilistSignup(e)}
                >Create an Anilist Account</button
            >
            {#if $android}
                <button
                    class="button"
                    on:keydown={(e) => e.key === "Enter" && switchAppMode(e)}
                    on:click={switchAppMode}
                    transition:fly={{ x: 50, duration: 300 }}
                    >Switch App Mode</button
                >
                {#if !window.location.protocol.startsWith("file:")}
                    <button
                        class="button"
                        on:keydown={(e) =>
                            e.key === "Enter" && checkForUpdates(e)}
                        on:click={checkForUpdates}
                        transition:fly={{ x: 50, duration: 300 }}
                        >Check for Updates</button
                    >
                {/if}
                <button
                    class="button"
                    on:keydown={(e) => e.key === "Enter" && refresh(e)}
                    on:click={refresh}
                    transition:fly={{ x: 50, duration: 300 }}>Refresh</button
                >
            {/if}
        </div>
    </div>
{/if}
{#if $menuVisible && isGoingBack}
    <div
        class="go-back-grid-highlight"
        style:--scale={Math.max(1, (goBackPercent ?? 1) * 0.01 * 2)}
        style:--position={"-" + (100 - (goBackPercent ?? 0)) + "%"}
        out:fly={{ x: -176, duration: 1000 }}
    >
        <div
            class={"go-back-grid" + (goBackPercent >= 100 ? " willGoBack" : "")}
        >
            <i class="fa-solid fa-arrow-left" />
        </div>
    </div>
{/if}

<style>
    .menu-container {
        position: fixed;
        padding-top: 55px;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgb(0, 0, 0, 0.7);
        z-index: 997;
    }
    .menu {
        padding: 1.5em 50px;
        display: flex;
        flex-wrap: wrap;
        gap: 1.5em;
        width: 100%;
        max-width: 1140px;
        max-height: 100%;
        margin: 0 auto;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
    }
    .menu::-webkit-scrollbar {
        display: none;
    }
    .button {
        -moz-box-shadow: 0 3px 20px 0 #2b2d42;
        -webkit-box-shadow: 0 3px 20px 0 #2b2d42;
        box-shadow: 0 3px 20px 0 #2b2d42;
        font-size: clamp(1.2rem, 1.3rem, 1.4rem);
        border-radius: 2em;
        background-color: rgb(40 69 102);
        color: #b9cadd;
        padding: 0.8em 1.6em;
        border: none;
        cursor: pointer;
        flex: 1 0 auto;
        user-select: none;
    }
    .menu:after {
        content: "";
        flex: 1000 0 auto;
    }
    @media screen and (max-width: 425px) {
        .menu {
            padding: 1em;
        }
        .button {
            flex: none;
        }
    }
    .button.selected {
        background-color: #000 !important;
        color: #b9cadd !important;
    }

    .go-back-grid-highlight {
        position: fixed;
        display: flex;
        justify-content: center;
        align-items: center;
        top: 50%;
        left: 0;
        transform: translateY(-50%) translateX(var(--position));
        background-color: rgb(103, 187, 254, 0.5);
        width: calc(44px * var(--scale));
        height: calc(44px * var(--scale));
        border-radius: 50%;
        z-index: 9000;
    }

    .go-back-grid {
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        background-color: white;
        color: black;
        cursor: pointer;
        border-radius: 50%;
        max-width: 44px;
        max-height: 44px;
        min-width: 44px;
        min-height: 44px;
    }

    .go-back-grid.willGoBack {
        background-color: black;
        color: white;
    }

    .go-back-grid i {
        font-size: 2em;
    }
</style>
