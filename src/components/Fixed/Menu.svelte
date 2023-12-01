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
        runUpdate,
        runExport,
        confirmPromise,
        importantUpdate,
        popupVisible,
        listUpdateAvailable,
    } from "../../js/globalValues.js";
    import { fade } from "svelte/transition";
    import { saveJSON } from "../../js/indexedDB.js";
    import { importUserData } from "../../js/workerUtils.js";
    import { jsonIsEmpty, setLocalStorage } from "../../js/others/helper.js";

    let importFileInput;

    async function importData() {
        if (!(importFileInput instanceof Element))
            return ($dataStatus = "Something went wrong");
        if (await $confirmPromise("Do you want to import your data?")) {
            importFileInput.click();
        }
    }

    async function importJSONFile() {
        if (!(importFileInput instanceof Element))
            return ($dataStatus = "Something went wrong");
        let importedFile = importFileInput.files?.[0];
        if (importedFile) {
            let filename = importedFile.name;
            let filenameToShow = filename
                ? `named <span style="color:#00cbf9;">${filename}</span> `
                : "";
            if (
                await $confirmPromise(
                    `File ${filenameToShow}has been detected, do you want to import the file?`,
                )
            ) {
                $menuVisible = false;
                if (!$popupVisible) {
                    document.documentElement.style.overflow = "hidden";
                    document.documentElement.style.overflow = "";
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
                        $dataStatus = error || "Something went wrong";
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
        setLocalStorage("exportPathIsAvailable", value);
        await saveJSON(value, "exportPathIsAvailable");
    };

    async function exportData() {
        if (!$exportPathIsAvailable && $android) return handleExportFolder();
        if (await $confirmPromise("Do you want to export your data?")) {
            $menuVisible = false;
            runExport.update((e) => !e);
        }
    }

    async function updateList() {
        if (!navigator.onLine) {
            return $confirmPromise({
                isAlert: true,
                title: "Currently offline",
                text: "It seems that you're currently offline and unable to update.",
            });
        }
        if (await $confirmPromise("Do you want to update your list?")) {
            $menuVisible = false;
            runUpdate.update((e) => !e);
        }
    }

    async function handleUpdateEveryHour() {
        if (
            await $confirmPromise(
                `Do you want to ${
                    $autoUpdate ? "disable" : "enable"
                } auto-update?`,
            )
        ) {
            $autoUpdate = !$autoUpdate;
        }
    }

    async function handleExportEveryHour() {
        if (!$exportPathIsAvailable && $android) return handleExportFolder();
        if (
            await $confirmPromise(
                `Do you want to ${
                    $autoExport ? "disable" : "enable"
                } auto-export?`,
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
        if (jsonIsEmpty($hiddenEntries)) {
            // Alert No Hidden Entries
            $confirmPromise({
                isAlert: true,
                text: "There are currently no hidden entries.",
            });
            return;
        } else if (
            await $confirmPromise(
                "Do you want to show all your hidden anime entries?",
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
            $listUpdateAvailable = false;
            animeLoader({ hiddenEntries: $hiddenEntries })
                .then(async (data) => {
                    $animeLoaderWorker = data.animeLoaderWorker;
                    if (data?.isNew) {
                        $finalAnimeList = data.finalAnimeList;
                        $hiddenEntries = data.hiddenEntries;
                    }
                    $dataStatus = null;
                    return;
                })
                .catch((error) => {
                    console.error(error);
                });
        }
    }

    async function anilistSignup() {
        if (
            await $confirmPromise({
                text: "Do you want to sign-up an AniList account?",
                isImportant: true,
            })
        ) {
            window.open("https://anilist.co/signup", "_blank");
        }
    }

    function showRecentReleases() {
        if (!$android) return;
        try {
            JSBridge.showRecentReleases();
        } catch (e) {}
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

    async function reload() {
        if (
            await $confirmPromise({
                text: "Do you want to reload the app resources?",
                isImportant: true,
            })
        ) {
            document.querySelectorAll("script")?.forEach((script) => {
                if (
                    script.src &&
                    script.src !== "https://www.youtube.com/iframe_api?v=16"
                ) {
                    script.src = script.src;
                }
            });
            document.querySelectorAll("img")?.forEach((image) => {
                if (!image.naturalHeight) {
                    image.src = image.src;
                }
            });
            window.reloadYoutube?.();
        }
    }

    async function refresh() {
        if (!$android) return;
        if (
            await $confirmPromise({
                text: "Do you want to refresh the app?",
                isImportant: true,
            })
        ) {
            try {
                JSBridge.refreshWeb();
            } catch (e) {}
        }
    }

    async function clearCache() {
        if (!$android) return;
        if (
            await $confirmPromise({
                text: "Do you want to clear your cache to receive the latest application updates?",
                isImportant: true,
            })
        ) {
            try {
                JSBridge.clearCache();
            } catch (e) {}
        }
    }
</script>

<input
    id="import-file"
    type="file"
    style:display="none"
    accept=".json"
    bind:this={importFileInput}
    on:change={importJSONFile}
/>
{#if $menuVisible}
    <div
        class="menu-container"
        on:click={(e) => {
            if (e.pointerType !== "touch") {
                handleMenuVisibility(e);
            }
        }}
        on:touchend|passive={handleMenuVisibility}
        on:keydown={(e) => e.key === "Enter" && handleMenuVisibility(e)}
        out:fade={{ duration: 200 }}
    >
        <div class="menu">
            <button
                class="button"
                on:click={updateList}
                on:keydown={(e) => e.key === "Enter" && updateList(e)}
                >Update List</button
            >
            <button
                class="button"
                on:click={showAllHiddenEntries}
                on:keydown={(e) => e.key === "Enter" && showAllHiddenEntries(e)}
                >Show All Hidden Entries</button
            >
            <button
                class="button"
                on:click={importData}
                on:keydown={(e) => e.key === "Enter" && importData(e)}
                >Import Data</button
            >
            <button
                class="button"
                on:click={exportData}
                on:keydown={(e) => e.key === "Enter" && exportData(e)}
                >Export Data</button
            >
            {#if $android}
                <button
                    class="button"
                    on:click={handleExportFolder}
                    on:keydown={(e) =>
                        e.key === "Enter" && handleExportFolder(e)}
                >
                    {($exportPathIsAvailable ? "Change" : "Set") +
                        " Export Folder"}
                </button>
            {/if}
            <button
                class={"button " + ($autoUpdate ? "selected" : "")}
                on:click={handleUpdateEveryHour}
                on:keydown={(e) =>
                    e.key === "Enter" && handleUpdateEveryHour(e)}
                >Auto Update</button
            >
            {#if $android}
                <button
                    class={"button " + ($autoExport ? "selected" : "")}
                    on:click={handleExportEveryHour}
                    on:keydown={(e) =>
                        e.key === "Enter" && handleExportEveryHour(e)}
                    >Auto Export</button
                >
            {/if}
            <button
                class="button"
                on:click={anilistSignup}
                on:keydown={(e) => e.key === "Enter" && anilistSignup(e)}
                >Create an Anilist Account</button
            >
            {#if $android}
                <button
                    class="button"
                    on:keydown={(e) =>
                        e.key === "Enter" && showRecentReleases(e)}
                    on:click={showRecentReleases}>Show Recent Releases</button
                >
                {#if !window.location.protocol.startsWith("file:")}
                    <button
                        class="button"
                        on:keydown={(e) =>
                            e.key === "Enter" && checkForUpdates(e)}
                        on:click={checkForUpdates}>Check for Updates</button
                    >
                {/if}
                <button
                    class="button"
                    on:keydown={(e) => e.key === "Enter" && switchAppMode(e)}
                    on:click={switchAppMode}>Switch App Mode</button
                >
                <button
                    class="button"
                    on:keydown={(e) => e.key === "Enter" && clearCache(e)}
                    on:click={clearCache}>Clear Cache</button
                >
                <button
                    class="button"
                    on:keydown={(e) => e.key === "Enter" && refresh(e)}
                    on:click={refresh}>Refresh</button
                >
            {/if}
            <button
                class="button"
                on:keydown={(e) => e.key === "Enter" && reload(e)}
                on:click={reload}>Reload</button
            >
        </div>
    </div>
{/if}

<style>
    .menu-container {
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
        position: fixed;
        padding-top: 48px;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgb(0, 0, 0, 0.7);
        z-index: 998;
        animation: fadeIn 0.2s ease;
    }
    .menu {
        padding: 1.5em 1em;
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
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .menu::-webkit-scrollbar {
        display: none;
    }
    .button {
        -moz-box-shadow: 0 3px 20px 0 hsl(211.3deg 51.11% 15%);
        -webkit-box-shadow: 0 3px 20px 0 hsl(211.3deg 51.11% 15%);
        box-shadow: 0 3px 20px 0 hsl(211.3deg 51.11% 15%);
        font-size: clamp(1.2rem, 1.3rem, 1.4rem);
        border-radius: 2em;
        background-color: hsl(211.3deg 51.11% 20%);
        color: white;
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
        background-color: hsl(200.55deg 20% 50%) !important;
        color: white !important;
    }

    @media screen and (min-width: 750px) {
        .menu-container {
            z-index: 992 !important;
        }
        .menu {
            padding: 1.5em 50px !important;
        }
    }
</style>
