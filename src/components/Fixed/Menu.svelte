<script>
    import { onMount, tick } from "svelte";
    import { saveJSON } from "../../js/indexedDB.js";
    import { animeManager, importUserData } from "../../js/workerUtils.js";
    import {
        jsonIsEmpty,
        removeLocalStorage,
        setLocalStorage,
        removeClass,
        addClass,
        downloadLink,
    } from "../../js/others/helper.js";
    import {
        android,
        menuVisible,
        hiddenEntries,
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
        showStatus,
        username,
        isBackgroundUpdateKey,
        mobile,
        appInstallationAsked,
        selectedCategory,
    } from "../../js/globalValues.js";

    let menuContainerEl, navContainerEl;
    let importFileInput;

    async function importData() {
        if (!(importFileInput instanceof Element))
            return ($dataStatus = "Something went wrong");
        if (await $confirmPromise("Do you want to import your data?")) {
            importFileInput.value = null;
            importFileInput.click();
        }
    }
    window.importAndroidUserData = importData;

    async function importJSONFile() {
        if ($android && window?.[$isBackgroundUpdateKey] === true) return;
        if (!(importFileInput instanceof Element))
            return ($dataStatus = "Something went wrong");
        let importedFile = importFileInput.files?.[0];
        if (importedFile) {
            let filename = importedFile.name;
            let filenameToShow = filename
                ? `named <span style="color:hsl(var(--ac-color));">${filename}</span> `
                : "";
            if (
                await $confirmPromise({
                    text: `File ${filenameToShow}has been detected, do you want to import the file?`,
                    isPersistent: true,
                })
            ) {
                $menuVisible = false;
                if (!$popupVisible) {
                    document.documentElement.style.overflow = "hidden";
                    document.documentElement.style.overflow = "";
                    window?.scrollTo?.({ top: -9999, behavior: "smooth" });
                }
                importUserData({
                    importedFile: importedFile,
                })
                    .catch((error) => {
                        $dataStatus = error || "Something went wrong";
                        importantUpdate.update((e) => !e);
                        return;
                    })
                    .finally(() => {
                        setLocalStorage("username", $username).catch(() => {
                            removeLocalStorage("username");
                        });
                        if (importFileInput instanceof Element) {
                            importFileInput.value = null;
                        }
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
            JSBridge?.chooseExportFolder?.();
        } catch (e) {}
    }
    window.setExportPathAvailability = async (value = true) => {
        $exportPathIsAvailable = value;
        setLocalStorage("exportPathIsAvailable", value)
            .catch(() => {
                removeLocalStorage("exportPathIsAvailable");
            })
            .finally(() => {
                saveJSON(value, "exportPathIsAvailable");
            });
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
            window.alreadyShownNoNetworkAlert = false;
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
            if ($autoUpdate) {
                window.alreadyShownNoNetworkAlert = false;
            }
            setLocalStorage("autoUpdate", $autoUpdate)
                .catch(() => {
                    removeLocalStorage("autoUpdate");
                })
                .finally(() => {
                    saveJSON($autoUpdate, "autoUpdate");
                });
        }
    }

    async function handleExportEveryHour() {
        if (!$android) return;
        if (!$exportPathIsAvailable) return handleExportFolder();
        if (
            await $confirmPromise(
                `Do you want to ${
                    $autoExport ? "disable" : "enable"
                } auto-export?`,
            )
        ) {
            $autoExport = !$autoExport;
            setLocalStorage("autoExport", $autoExport)
                .catch(() => {
                    removeLocalStorage("autoExport");
                })
                .finally(() => {
                    saveJSON($autoExport, "autoExport");
                });
        }
    }

    function handleMenuVisibility(event) {
        let element = event.target;
        let classList = element.classList;
        if (classList.contains("button")) return;
        $menuVisible = !$menuVisible;
    }

    let menuEl;
    async function isScrollableMenu(node) {
        await tick();
        menuEl = node || menuEl;
        if (menuEl instanceof Element) {
            if (menuEl?.scrollHeight > menuEl?.clientHeight) {
                addClass(menuEl, "scrollable");
            } else {
                removeClass(menuEl, "scrollable");
            }
        } else {
            addClass(menuEl, "scrollable");
        }
    }

    async function showAllHiddenEntries() {
        if (
            $android &&
            $isBackgroundUpdateKey &&
            window?.[$isBackgroundUpdateKey] === true
        )
            return;
        if (jsonIsEmpty($hiddenEntries)) {
            // Alert No Hidden Entries
            $confirmPromise({
                isAlert: true,
                text: "There are currently no hidden entries.",
            });
            return;
        } else if (
            await $confirmPromise(
                "Do you want to show all your hidden entries?",
            )
        ) {
            $dataStatus = "Updating List";
            $menuVisible = false;
            $listUpdateAvailable = false;
            animeManager({
                selectedCategory: $selectedCategory,
                removeId: "all",
                isHiding: false,
            });
            $hiddenEntries = {};
        }
    }

    async function showDataStatus() {
        if (
            await $confirmPromise({
                text: `Do you want ${
                    $showStatus ? "hide" : "show"
                } the status information in your home page?`,
                isImportant: true,
            })
        ) {
            $showStatus = !$showStatus;
            setLocalStorage("showStatus", $showStatus)
                .catch(() => {
                    removeLocalStorage("showStatus");
                })
                .finally(() => {
                    saveJSON($showStatus, "showStatus");
                });
        }
    }

    let keepAppRunningInBackground;
    async function persistentBackgroundUpdates() {
        if (!$android) return;
        if (
            await $confirmPromise({
                text: `Do you want ${
                    keepAppRunningInBackground ? "prevent" : "allow"
                } persistent background updates?${
                    keepAppRunningInBackground
                        ? ""
                        : " Note that this will run every hour and use ram/power usage while the update is running."
                }`,
                isImportant: true,
            })
        ) {
            keepAppRunningInBackground = window.keepAppRunningInBackground =
                !window.keepAppRunningInBackground;
            try {
                JSBridge?.setKeepAppRunningInBackground?.(
                    keepAppRunningInBackground,
                );
            } catch (e) {}
        }
    }
    window.setKeepAppRunningInBackground = (enabled) => {
        keepAppRunningInBackground = window.keepAppRunningInBackground =
            enabled;
    };

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

    async function showNotice() {
        let persistent = await navigator?.storage?.persisted?.();
        let notificationGranted =
            window?.Notification?.permission === "granted";
        if ($android) {
            await $confirmPromise({
                isAlert: true,
                title: "Possiblity for Future Data Loss",
                text: `<div id="kanshi-show-notice"><span style='color:hsl(345deg, 75%, 60%);'>NOTICE!</span> You may want to regularly <span style='color:hsl(345deg, 75%, 60%);'>Back Up</span> your data or use auto-export to prevent future data loss.\n\nCurrently, the storage might be <span style='color:hsl(345deg, 75%, 60%);'>Automatically Cleared by Chrome</span> when your <span style='color:hsl(345deg, 75%, 60%);'>Disk is Nearly Full.</span>\n\n<span ${
                    persistent
                        ? ""
                        : "onclick='(async()=>{await window?.navigator?.storage?.persisted?.();await window?.navigator?.storage?.persist?.();window?.refreshKanshiNotice?.()})()'"
                }>Persistent Storage Status: ${
                    persistent
                        ? "<span style='color:hsl(185deg, 65%, 50%);'>Enabled</span>"
                        : "<span style='color:hsl(345deg, 75%, 60%);'>Disabled</span>"
                }</span></div>`,
            });
        } else {
            await $confirmPromise({
                isAlert: true,
                title: "Possiblity for Future Data Loss",
                text: `<div id="kanshi-show-notice"><span style='color:hsl(345deg, 75%, 60%);'>NOTICE!</span> You may want to <span style='color:hsl(345deg, 75%, 60%);'>Back Up</span> your data or enable persistent storage to prevent future data loss. Currently, browsers might <span style='color:hsl(345deg, 75%, 60%);'>Automatically Clear your Data</span> when your <span style='color:hsl(345deg, 75%, 60%);'>Disk is Nearly Full.</span>\n\nPersistent Storage Status: ${
                    persistent
                        ? "<span style='color:hsl(185deg, 65%, 50%);'>Enabled</span>"
                        : "<span style='color:hsl(345deg, 75%, 60%);'>Disabled</span>"
                }\n\nTo enable persistent storage:\n\n<span ${
                    persistent
                        ? ""
                        : "onclick='(async()=>{await window?.navigator?.storage?.persisted?.();await window?.navigator?.storage?.persist?.();window?.refreshKanshiNotice?.()})()'"
                }>1) Grant permission for <span style="${
                    persistent ? "" : "text-decoration: underline;"
                }${
                    persistent
                        ? "color:hsl(185deg, 65%, 50%)"
                        : "color:hsl(345deg, 75%, 60%)"
                };">Persistent Storage</span></span>.\n2) OR Grant permission for <span ${
                    notificationGranted
                        ? ""
                        : "onclick='(async()=>{await window?.Notification?.requestPermission?.();window?.refreshKanshiNotice?.()})()'"
                }><span style="${
                    notificationGranted ? "" : "text-decoration: underline;"
                }${
                    notificationGranted
                        ? "color:hsl(185deg, 65%, 50%)"
                        : "color:hsl(345deg, 75%, 60%)"
                };">Notification</span></span>.\n3) Bookmark this Website.</div>`,
            });
        }
        if (!notificationGranted) {
            await window?.Notification?.requestPermission?.();
        }
        if (!persistent) {
            await window?.navigator?.storage?.persist?.();
        }
    }
    function refreshKanshiNotice() {
        if (document?.getElementById?.("kanshi-show-notice")) {
            showNotice();
        }
    }
    try {
        window?.navigator?.permissions
            ?.query?.({ name: "notifications" })
            ?.then?.((result) => (result.onchange = refreshKanshiNotice));
        window?.navigator?.permissions
            ?.query?.({ name: "persistent-storage" })
            ?.then?.((result) => (result.onchange = refreshKanshiNotice));
    } catch (e) {}
    window.refreshKanshiNotice = refreshKanshiNotice;

    function switchAppMode() {
        if (!$android) return;
        try {
            JSBridge?.switchApp?.();
        } catch (e) {}
    }

    async function reload() {
        if (
            await $confirmPromise({
                text: "Do you want to reload the app resources?",
                isImportant: true,
            })
        ) {
            if ($android) {
                if ($username) {
                    try {
                        JSBridge?.callUpdateNotifications?.();
                    } catch (e) {}
                }
            }
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
                JSBridge?.refreshWeb?.();
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
                JSBridge?.clearCache?.();
            } catch (e) {}
        }
    }

    onMount(() => {
        menuContainerEl =
            menuContainerEl ?? document.getElementById("menu-container");
        navContainerEl = document.getElementById("nav-container");
    });

    menuVisible.subscribe((val) => {
        if (val) {
            if (document?.documentElement?.scrollTop <= 0 || $popupVisible) {
                removeClass(navContainerEl, "hide");
                addClass(menuContainerEl, "visible");
                removeClass(menuContainerEl, "hide");
            } else {
                requestAnimationFrame(() => {
                    addClass(navContainerEl, "stop-transition");
                    addClass(navContainerEl, "hide");
                    requestAnimationFrame(() => {
                        removeClass(navContainerEl, "stop-transition");
                        removeClass(navContainerEl, "hide");
                        addClass(menuContainerEl, "visible");
                        removeClass(menuContainerEl, "hide");
                    });
                });
            }
            window?.setShouldGoBack?.(false);
        } else {
            if (!$popupVisible && document.documentElement.scrollTop > 0) {
                addClass(navContainerEl, "hide");
            }
            addClass(menuContainerEl, "hide");
            setTimeout(() => {
                removeClass(menuContainerEl, "visible");
                removeClass(navContainerEl, "hide");
            }, 200);
        }
    });

    let hasAvailableApp, downloadAndroidApp;
    appInstallationAsked.subscribe((val) => {
        if (val === true) {
            if (!$android && $mobile) {
                const isAndroidWeb = /android/i.test(
                    window?.navigator?.userAgent ||
                        window?.navigator?.vendor ||
                        window?.opera,
                );
                hasAvailableApp = isAndroidWeb;
                let deferredPrompt;
                window.addEventListener("beforeinstallprompt", (e) => {
                    deferredPrompt = e;
                    hasAvailableApp =
                        isAndroidWeb ||
                        typeof deferredPrompt?.prompt === "function";
                });
                downloadAndroidApp = async () => {
                    hasAvailableApp =
                        isAndroidWeb ||
                        typeof deferredPrompt?.prompt === "function";
                    if (!hasAvailableApp) return;
                    if (
                        await $confirmPromise({
                            text: "Do you want to install Kanshi for your device?",
                            isImportant: true,
                        })
                    ) {
                        try {
                            if (isAndroidWeb) {
                                const appName = "Kanshi.apk";
                                const appLocation = `./${appName}`;
                                const response = await fetch(appLocation, {
                                    method: "HEAD",
                                });
                                if (response?.ok) {
                                    downloadLink(appLocation, appName);
                                } else {
                                    window.open?.(
                                        "https://github.com/u-Kuro/Kanshi-Anime-Recommender/raw/main/Kanshi.apk",
                                        "_blank",
                                    );
                                }
                            } else if (
                                typeof deferredPrompt?.prompt === "function"
                            ) {
                                await deferredPrompt.prompt();
                            } else {
                                $confirmPromise({
                                    isAlert: true,
                                    text: "App installer was not found.",
                                });
                            }
                        } catch (e) {
                            $confirmPromise({
                                isAlert: true,
                                text: "App installer was not found.",
                            });
                        }
                    }
                };
            }
        }
    });
</script>

<input
    id="import-file"
    type="file"
    style:display="none"
    accept=".json"
    bind:this="{importFileInput}"
    on:change="{importJSONFile}"
/>
<div
    id="menu-container"
    class="menu-container"
    on:click="{(e) => {
        if (e.pointerType !== 'touch') {
            handleMenuVisibility(e);
        }
    }}"
    on:touchend|passive="{handleMenuVisibility}"
    on:keyup="{(e) => e.key === 'Enter' && handleMenuVisibility(e)}"
    bind:this="{menuContainerEl}"
>
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div class="menu" use:isScrollableMenu>
        <button
            class="button"
            tabindex="{$menuVisible ? '0' : '-1'}"
            on:click="{updateList}"
            on:keyup="{(e) => e.key === 'Enter' && updateList(e)}"
            >Update List</button
        >
        <button
            class="button"
            tabindex="{$menuVisible ? '0' : '-1'}"
            on:click="{showAllHiddenEntries}"
            on:keyup="{(e) => e.key === 'Enter' && showAllHiddenEntries(e)}"
            >Show All Hidden Entries</button
        >
        <button
            class="button"
            tabindex="{$menuVisible ? '0' : '-1'}"
            on:click="{() => importData()}"
            on:keyup="{(e) => e.key === 'Enter' && importData()}"
            >Import Data</button
        >
        <button
            class="button"
            tabindex="{$menuVisible ? '0' : '-1'}"
            on:click="{exportData}"
            on:keyup="{(e) => e.key === 'Enter' && exportData(e)}"
            >Export Data</button
        >
        {#if $android}
            <button
                class="button"
                tabindex="{$menuVisible ? '0' : '-1'}"
                on:click="{handleExportFolder}"
                on:keyup="{(e) => e.key === 'Enter' && handleExportFolder(e)}"
            >
                {($exportPathIsAvailable ? "Change" : "Set") + " Export Folder"}
            </button>
        {/if}
        <button
            class="{'button ' + ($showStatus ? 'selected' : '')}"
            tabindex="{$menuVisible ? '0' : '-1'}"
            on:click="{showDataStatus}"
            on:keyup="{(e) => e.key === 'Enter' && showDataStatus(e)}"
            >Show Status</button
        >
        <button
            class="{'button ' + ($autoUpdate ? 'selected' : '')}"
            tabindex="{$menuVisible ? '0' : '-1'}"
            on:click="{handleUpdateEveryHour}"
            on:keyup="{(e) => e.key === 'Enter' && handleUpdateEveryHour(e)}"
            >Auto Update</button
        >
        {#if $android}
            <button
                class="{'button ' + ($autoExport ? 'selected' : '')}"
                tabindex="{$menuVisible ? '0' : '-1'}"
                on:click="{handleExportEveryHour}"
                on:keyup="{(e) =>
                    e.key === 'Enter' && handleExportEveryHour(e)}"
                >Auto Export</button
            >
            {#if typeof keepAppRunningInBackground === "boolean"}
                <button
                    class="{'button' +
                        (keepAppRunningInBackground ? ' selected' : '')}"
                    tabindex="{$menuVisible ? '0' : '-1'}"
                    on:keyup="{(e) =>
                        e.key === 'Enter' && persistentBackgroundUpdates(e)}"
                    on:click="{persistentBackgroundUpdates}"
                    >Persistent Background Updates</button
                >
            {/if}
            <button
                class="button"
                tabindex="{$menuVisible ? '0' : '-1'}"
                on:keyup="{(e) => e.key === 'Enter' && switchAppMode(e)}"
                on:click="{switchAppMode}">Switch App Mode</button
            >
            <button
                class="button"
                tabindex="{$menuVisible ? '0' : '-1'}"
                on:keyup="{(e) => e.key === 'Enter' && clearCache(e)}"
                on:click="{clearCache}">Clear Cache</button
            >
            <button
                class="button"
                tabindex="{$menuVisible ? '0' : '-1'}"
                on:keyup="{(e) => e.key === 'Enter' && refresh(e)}"
                on:click="{refresh}">Refresh</button
            >
        {/if}
        <button
            class="button"
            tabindex="{$menuVisible ? '0' : '-1'}"
            on:keyup="{(e) => e.key === 'Enter' && reload(e)}"
            on:click="{reload}">Reload</button
        >
        <button
            class="button"
            tabindex="{$menuVisible ? '0' : '-1'}"
            on:click="{anilistSignup}"
            on:keyup="{(e) => e.key === 'Enter' && anilistSignup(e)}"
            >Create an Anilist Account</button
        >
        {#if $appInstallationAsked && $mobile && hasAvailableApp && !$android}
            <button
                class="button"
                tabindex="{$menuVisible ? '0' : '-1'}"
                on:keyup="{(e) => e.key === 'Enter' && downloadAndroidApp(e)}"
                on:click="{downloadAndroidApp}">Install App</button
            >
        {/if}
        <button
            class="button"
            tabindex="{$menuVisible ? '0' : '-1'}"
            on:keyup="{(e) => e.key === 'Enter' && showNotice(e)}"
            on:click="{showNotice}">Notice!</button
        >
    </div>
</div>

<style>
    .menu-container {
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
        position: fixed;
        top: 57px;
        width: 100%;
        height: 100%;
        background-color: var(--ol-color);
        z-index: 998;
        opacity: 1;
        transform: translateY(-99999px) translateZ(0);
        -webkit-transform: translateY(-99999px) translateZ(0);
        -ms-transform: translateY(-99999px) translateZ(0);
        -moz-transform: translateY(-99999px) translateZ(0);
        -o-transform: translateY(-99999px) translateZ(0);
        transition: opacity 0.2s ease-out;
    }
    .menu-container.visible {
        transform: translateY(0) translateZ(0);
        -webkit-transform: translateY(0) translateZ(0);
        -ms-transform: translateY(0) translateZ(0);
        -moz-transform: translateY(0) translateZ(0);
        -o-transform: translateY(0) translateZ(0);
    }
    .menu-container.hide {
        opacity: 0;
    }
    :global(#main.maxwindowheight.popupvisible .menu-container) {
        touch-action: none;
    }
    .menu {
        padding: 15px 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        width: 100%;
        max-width: 1140px;
        max-height: calc(100% - 57px);
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
    :global(#main.maxwindowheight.popupvisible .menu:not(.scrollable)) {
        touch-action: none;
    }
    .button {
        -moz-box-shadow: 0 3px 20px 0 var(--bd-color);
        -webkit-box-shadow: 0 3px 20px 0 var(--bd-color);
        box-shadow: 0 3px 20px 0 var(--bd-color);
        font-size: clamp(12px, 13px, 14px);
        border-radius: 20px;
        background-color: var(--bg-color);
        border: 1px solid var(--bd-color);
        color: var(--fg-color);
        padding: 10.4px 20.8px;
        cursor: pointer;
        flex: 1 0 auto;
        user-select: none;
        width: fit-content;
        min-height: 37.6px;
    }
    .menu:after {
        content: "";
        flex: 1000 0 auto;
    }
    @media screen and (max-width: 425px) {
        .menu {
            padding: 10px;
        }
        .button {
            flex: none;
        }
    }
    .button.selected {
        border: 1px solid hsl(0, 0%, 35%) !important;
        background-color: hsl(0, 0%, 35%) !important;
        color: var(--fg-color) !important;
    }

    @media screen and (min-width: 750px) {
        .menu-container {
            z-index: 992 !important;
        }
        .menu {
            padding: 15px 50px !important;
        }
    }
    @media screen and (max-width: 207px) {
        .button {
            width: 100% !important;
        }
    }

    .display-none {
        display: none !important;
    }
</style>
