<script>
    import { onMount, tick } from "svelte";
    import { sineOut } from "svelte/easing";
    import { fade } from "svelte/transition";
    import getWebVersion from "../../js/version.js";
    import { jsonIsEmpty } from "../../js/utils/dataUtils.js";
    import { removeClass, addClass } from "../../js/utils/domUtils.js";
    import { downloadLink, requestImmediate, showToast } from "../../js/utils/appUtils.js";
    import { getIDBData, setIDBData, setLSData, removeLSData } from "../../js/database.js";
    import { 
        mediaManager,
        importUserData,
        exportUserData,
        requestMediaEntries,
        requestUserEntries
    } from "../../js/worker.js";
    import {
        android,
        menuVisible,
        hiddenMediaEntries,
        autoUpdate,
        autoExport,
        exportPathIsAvailable,
        confirmPromise,
        popupVisible,
        listUpdateAvailable,
        showStatus,
        isBackgroundUpdateKey,
        mobile,
        keepAppRunningInBackground,
        resetProgress,
        documentScrollTop,
        loadingCategory,
        toast,
        appID,
        initList,
        initData,
        userRequestIsRunning,
        showRateLimit,
        dataStatus,
    } from "../../js/variables.js";
    

    let navContainerEl;
    let importFileInput;

    async function importData(manual) {
        if ($initList !== false) {
            if (manual) {
                pleaseWaitAlert()
            }
            return
        }
        if (!(importFileInput instanceof Element)) {
            if ($android) {
                showToast("Import feature failed")
            } else {
                $toast = "Import feature failed"
            }
            return
        }
        if (await $confirmPromise("Do you want to import your backup file?")) {
            importFileInput.value = null;
            importFileInput.click();
        }
    }
    window.importAndroidUserData = importData;

    async function importUserFile() {
        if ($android && window[$isBackgroundUpdateKey] === true) return;
        if (!(importFileInput instanceof Element)) {
            if ($android) {
                showToast("Failed to capture the backup file")
            } else {
                $toast = "Failed to capture the backup file"
            }
            return
        }
        let importedFile = importFileInput.files?.[0];
        if (importedFile) {
            let filename = importedFile.name;
            let filenameToShow = filename
                ? `named <span style="color:hsl(var(--ac-color));">${filename}</span> `
                : "";
            if (
                await $confirmPromise({
                    text: `File ${filenameToShow}was found, do you want to import the file?`,
                    isPersistent: true,
                })
            ) {
                if (!$popupVisible) {
                    document.documentElement.style.overflow = "hidden";
                    document.documentElement.style.overflow = "";
                    window.scrollTo?.({ top: -9999, behavior: "smooth" });
                }
                $loadingCategory[""] = new Date()
                importUserData({
                    importedFile: importedFile,
                })
                    .catch(() => {
                        $listUpdateAvailable = true;
                    })
                    .finally(() => {
                        if (importFileInput instanceof Element) {
                            importFileInput.value = null;
                        }
                    });
                resetProgress.update((e) => !e);
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
    function handleExportDirectory() {
        try {
            JSBridge.chooseExportDirectory();
        } catch (ex) { console.error(ex); }
    }
    window.setExportPathAvailability = async (val = true) => {
        setLSData("exportPathIsAvailable", $exportPathIsAvailable = val)
        .catch(() => removeLSData("exportPathIsAvailable"))
        .finally(() => setIDBData("exportPathIsAvailable", val));
    };

    async function exportData(e) {
        if ($android) {
            const target = e?.target
            const classList = target?.classList
            if (
                classList.contains("switch")
                || target?.closest?.(".switch")
                || classList.contains("change-directory")
                || target?.closest?.(".change-directory")
            ) {
                return
            } else if (!$exportPathIsAvailable) {
                return handleExportDirectory();
            }
        }
        if ($initList !== false) {
            return pleaseWaitAlert()
        }
        if (await $confirmPromise("Do you want to back up your data?")) {
            exportUserData({ isManual: true });
        }
    }

    async function updateList(e) {
        if ($android && window[$isBackgroundUpdateKey] === true) return;
        if (window.navigator?.onLine === false) {
            if ($android) {
                showToast("You are currently offline")
            } else {
                $toast = "You are currently offline"
            }
            return
        }

        if ($initList !== false || $initData) {
            return pleaseWaitAlert()
        }

        const target = e?.target
        const classList = target?.classList
        if (classList.contains("switch") || target?.closest?.(".switch")) return

        if (await $confirmPromise("Do you want to update existing entries?")) {
            resetProgress.update((e) => !e);
            if ($userRequestIsRunning) {
                requestMediaEntries();
            } else {
                try {
                    await requestUserEntries({ reload: true });
                } catch (ex) { console.error(ex) }
                requestMediaEntries()
            }
        }
    }

    function handleMenuVisibility(event) {
        let element = event.target;
        let classList = element.classList;
        if (classList.contains("menu") || element.closest(".menu")) return;
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
        if ($android && window[$isBackgroundUpdateKey] === true) return;
        if ($initList !== false) {
            return pleaseWaitAlert()
        }
        if (jsonIsEmpty($hiddenMediaEntries)) {
            // Alert No Hidden Entries
            if ($android) {
                showToast("No hidden entries were found")
            } else {
                $toast = "No hidden entries were found"
            }
            return;
        } else if (
            await $confirmPromise(
                "Do you want to show all your hidden entries?",
            )
        ) {
            $loadingCategory[""] = new Date()
            mediaManager({
                showId: "all",
            });
            $hiddenMediaEntries = {};
            resetProgress.update((e) => !e);
        }
    }

    function pleaseWaitAlert() {
        if ($android) {
            showToast("Please wait a moment")
        } else {
            $toast = "Please wait a moment"
        }
    }

    showStatus.subscribe((val) => {
        if (typeof val === "boolean") {
            setLSData("showStatus", val)
            .catch(() => removeLSData("showStatus"))
            .finally(() => setIDBData("showStatus", val));
        }
    })

    showRateLimit.subscribe((val) => {
        if (typeof val === "boolean") {
            if (!val && $dataStatus?.includes?.("Rate Limit:")) {
                $dataStatus = null
            }
            setLSData("showRateLimit", val)
            .catch(() => removeLSData("showRateLimit"))
            .finally(() => setIDBData("showRateLimit", val));
        }
    })

    keepAppRunningInBackground.subscribe((val) => {
        if (typeof val === "boolean") {
            try {
                JSBridge.setKeepAppRunningInBackground(val);
            } catch (ex) { console.error(ex) }
        }
    })

    window.setKeepAppRunningInBackground = (enabled) => {
        $keepAppRunningInBackground = enabled;
    };

    async function anilistSignup() {
        if (
            await $confirmPromise({
                text: "Do you want to sign up an AniList account?",
                isImportant: true,
            })
        ) {
            window.open("https://anilist.co/signup", "_blank");
        }
    }

    async function showNotice() {
        let persistent = await navigator?.storage?.persisted?.();
        let notificationGranted = window.Notification?.permission === "granted";
        if ($android) {
            await $confirmPromise({
                isAlert: true,
                title: "Possibility for Future Data Loss",
                text: `<div id="kanshi-show-notice">You may want to <span style='color:hsl(345deg, 75%, 60%);'>Regularly Back Up</span> your data or <span style='color:hsl(345deg, 75%, 60%);'>Enable Automatic Back Up</span> to prevent future data loss.\n\nCurrently, the storage can be <span style='color:hsl(345deg, 75%, 60%);'>Automatically Cleared by Chrome</span> when your <span style='color:hsl(345deg, 75%, 60%);'>Disk is Nearly Full.</span>\n\n<span ${
                    persistent
                        ? ""
                        : "tabindex='0' style='cursor:pointer;' onclick='(async()=>{await window.navigator?.storage?.persisted?.();await window.navigator?.storage?.persist?.();window.refreshKanshiNotice?.()})()'"
                }>Persistent Storage Status: ${
                    persistent
                        ? "<span style='color:hsl(185deg, 65%, 50%);'>Enabled</span>"
                        : "<span style='color:hsl(345deg, 75%, 60%);'>Disabled</span>"
                }</span></div>`,
            });
        } else {
            await $confirmPromise({
                isAlert: true,
                title: "Possibility for Future Data Loss",
                text: `<div id="kanshi-show-notice">You may want to <span style='color:hsl(345deg, 75%, 60%);'>Enable Persistent Storage</span> or <span style='color:hsl(345deg, 75%, 60%);'>Regularly Back Up</span> your data to prevent future data loss. Currently, browsers can <span style='color:hsl(345deg, 75%, 60%);'>Automatically Clear your Data</span> when your <span style='color:hsl(345deg, 75%, 60%);'>Disk is Nearly Full.</span>\n\nPersistent Storage Status: ${
                    persistent
                        ? "<span style='color:hsl(185deg, 65%, 50%);'>Enabled</span>"
                        : "<span style='color:hsl(345deg, 75%, 60%);'>Disabled</span>"
                }\n\nTo enable persistent storage:\n\n<span ${
                    persistent
                        ? ""
                        : "tabindex='0' style='cursor:pointer;' onclick='(async()=>{await window.navigator?.storage?.persisted?.();await window.navigator?.storage?.persist?.();window.refreshKanshiNotice?.()})()'"
                }>1) Grant permission for <span style="${
                    persistent ? "" : "text-decoration: underline;"
                }${
                    persistent
                        ? "color:hsl(185deg, 65%, 50%)"
                        : "color:hsl(345deg, 75%, 60%)"
                };">Persistent Storage</span></span>.\n2) OR Grant permission for <span ${
                    notificationGranted
                        ? ""
                        : "tabindex='0' style='cursor:pointer;' onclick='(async()=>{await window.Notification?.requestPermission?.();window.refreshKanshiNotice?.()})()'"
                }><span style="${
                    notificationGranted ? "" : "text-decoration: underline;"
                }${
                    notificationGranted
                        ? "color:hsl(185deg, 65%, 50%)"
                        : "color:hsl(345deg, 75%, 60%)"
                };">Notification</span></span>.\n3) OR Bookmark this Website.</div>`,
            });
        }
    }
    function refreshKanshiNotice() {
        if (document.getElementById("kanshi-show-notice")) {
            showNotice();
        }
    }
    try {
        window.navigator?.permissions
            ?.query?.({ name: "notifications" })
            ?.then?.((result) => (result.onchange = refreshKanshiNotice));
        window.navigator?.permissions
            ?.query?.({ name: "persistent-storage" })
            ?.then?.((result) => (result.onchange = refreshKanshiNotice));
    } catch (e) {}
    window.refreshKanshiNotice = refreshKanshiNotice;

    async function clearCache() {
        if (!$android) return;
        if (
            await $confirmPromise({
                text: "Do you want to clear your cache?",
                isImportant: true,
            })
        ) {
            try {
                JSBridge.clearCache();
            } catch (ex) { console.error(ex) }
        }
    }

    async function checkForUpdates() {
        if ($android) {
            if (window.navigator?.onLine === false) {
                showToast("You are currently offline")
                return
            }
            try {
                if (typeof $appID !== "number" || isNaN($appID) || !isFinite($appID)) {
                    $appID = await getWebVersion();
                }
                if (typeof $appID === "number" && !isNaN($appID) && isFinite($appID)) {
                    JSBridge.checkAppID(Math.floor($appID), true);
                }
            } catch (ex) {
                console.error(ex)
            }
        }
    }

    let menuIsGoingBack,
        touchID,
        checkPointer,
        startX,
        endX,
        startY,
        endY,
        willGoBack;

    function menuScroll() {
        let element = this 
        if (!(element instanceof Element)) {
            element = menuContainer
        }
        touchID = null;
        willGoBack = checkPointer = menuIsGoingBack = false;
    }
    function menuContainerTouchStart(event) {
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        touchID = event.touches[0].identifier;
        let element = event.target;
        let closestScrollableLeftElement = element;
        let hasScrollableLeftElement = false;
        while (
            closestScrollableLeftElement &&
            closestScrollableLeftElement !== document.body
        ) {
            const isScrollableLeft =
                closestScrollableLeftElement.scrollWidth >
                    closestScrollableLeftElement.clientWidth &&
                closestScrollableLeftElement.scrollLeft > 0;
            if (isScrollableLeft) {
                if (closestScrollableLeftElement.id === "menu") {
                    hasScrollableLeftElement = false;
                } else {
                    hasScrollableLeftElement = true;
                }
                break;
            }
            closestScrollableLeftElement =
                closestScrollableLeftElement.parentElement;
        }
        if (hasScrollableLeftElement) return;
        checkPointer = true;
    }
    function menuContainerTouchMove(event) {
        if (checkPointer) {
            checkPointer = false;
            endX = event.touches[0].clientX;
            endY = event.touches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
                menuIsGoingBack = true;
            }
        } else if (menuIsGoingBack) {
            endX = event.touches[0].clientX;
            const deltaX = endX - startX;
            if (deltaX > 48) {
                willGoBack = true;
            } else {
                willGoBack = false;
            }
        }
    }
    function menuContainerTouchEnd(event) {
        if (menuIsGoingBack) {
            endX = Array.from(event.changedTouches)?.find(
                (touch) => touch.identifier === touchID,
            )?.clientX;
            if (typeof endX === "number") {
                let deltaX = endX - startX;
                if (menuIsGoingBack && deltaX >= 48) {
                    $menuVisible = false;
                }
            }
            touchID = null;
            willGoBack = checkPointer = menuIsGoingBack = false;
        } else {
            touchID = null;
            willGoBack = checkPointer = menuIsGoingBack = false;
        }
    }

    function menuContainerTouchCancel() {
        touchID = null;
        willGoBack = checkPointer = menuIsGoingBack = false;
    }

    menuVisible.subscribe((val) => {
        if (navContainerEl == null) {
            navContainerEl = document.getElementById("nav-container");
        }
        if (val) {
            if ($documentScrollTop <= 0 || $popupVisible) {
                removeClass(navContainerEl, "hide");
            } else {
                requestAnimationFrame(() => {
                    addClass(navContainerEl, "stop-transition");
                    addClass(navContainerEl, "hide");
                    requestAnimationFrame(() => {
                        removeClass(navContainerEl, "stop-transition");
                        removeClass(navContainerEl, "hide");
                    });
                });
            }
            window.addHistory?.();
        } else {
            if (!$popupVisible && $documentScrollTop > 0) {
                addClass(navContainerEl, "hide");
            }
            requestImmediate(() => {
                removeClass(navContainerEl, "hide");
            }, 200);
        }
    });

    let isAndroidWeb,
        deferredPrompt, 
        downloadAndroidApp;
    if (!$android && $mobile) {
        isAndroidWeb = /android/i.test(
            window.navigator?.userAgent ||
            window.navigator?.vendor ||
            window.opera,
        );
        window.addEventListener("beforeinstallprompt", (e) => { deferredPrompt = e });
        downloadAndroidApp = async () => {
            if (
                await $confirmPromise({
                    text: `Do you want to ${isAndroidWeb ? "install the android application for your device" : "add the application to your device"}?`,
                    isImportant: true,
                })
            ) {
                if (isAndroidWeb) {
                    downloadLink("https://github.com/u-Kuro/Kanshi-Anime-Recommender/raw/main/Kanshi.apk", "Kanshi.apk");
                    return;
                } else if (
                    typeof deferredPrompt?.prompt === "function"
                ) {
                    try {
                        await deferredPrompt.prompt();
                    } catch {
                        if ($android) {
                            showToast("Something went wrong")
                        } else {
                            $toast = "Something went wrong"
                        }
                    }
                } else {
                    if ($android) {
                        showToast("Something went wrong")
                    } else {
                        $toast = "Something went wrong"
                    }
                }
            }
        };
    }

    onMount(async () => {
        if (
            typeof window.keepAppRunningInBackground === "boolean" &&
            typeof $keepAppRunningInBackground !== "boolean"
        ) {
            $keepAppRunningInBackground = window.keepAppRunningInBackground;
        }
        
        // Get Export Directory for Android
        $autoUpdate = $autoUpdate ?? (await getIDBData("autoUpdate"));
        if ($autoUpdate == null) {
            setLSData("autoUpdate", $autoUpdate = true)
            .catch(() => removeLSData("autoUpdate"))
            .finally(() => setIDBData("autoUpdate", true));
        }
        if ($android) {
            $exportPathIsAvailable = $exportPathIsAvailable ?? (await getIDBData("exportPathIsAvailable"));
            if ($exportPathIsAvailable == null) {
                setLSData("exportPathIsAvailable", $exportPathIsAvailable = false)
                .catch(() => removeLSData("exportPathIsAvailable"))
                .finally(() => setIDBData("exportPathIsAvailable", false));
            }
            $autoExport = $autoExport ?? (await getIDBData("autoExport"));
            if ($autoExport == null) {
                setLSData("autoExport", $autoExport = false)
                .catch(() => removeLSData("autoExport"))
                .finally(() => setIDBData("autoExport", false));
            }
        }
        $showStatus = $showStatus ?? (await getIDBData("showStatus"));
        if ($showStatus == null) {
            setLSData("showStatus", $showStatus = true)
            .catch(() => removeLSData("showStatus"))
            .finally(() => setIDBData("showStatus", true));
        }
        $showRateLimit = $showRateLimit ?? (await getIDBData("showRateLimit"));
        if ($showRateLimit == null) {
            setLSData("showRateLimit", $showRateLimit = true)
            .catch(() => removeLSData("showRateLimit"))
            .finally(() => setIDBData("showRateLimit", true));
        }
    });
</script>

{#if $menuVisible}
    <div
        class="fixed-menu-container"
        on:click="{handleMenuVisibility}"
        on:keyup="{(e) => e.key === "Enter" && handleMenuVisibility(e)}"
        in:fade="{{ duration: 200, easing: sineOut }}"
        out:fade="{{ duration: 200, easing: sineOut }}"
    >
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div class="menu"
            on:touchstart|passive="{menuContainerTouchStart}"
            on:touchmove|passive="{menuContainerTouchMove}"
            on:touchend|passive="{menuContainerTouchEnd}"
            on:touchcancel="{menuContainerTouchCancel}"
            on:scroll="{menuScroll}"
            use:isScrollableMenu
            role="menu"
        >
            <span class="menu-category">LIST ACTIONS</span>
            <div class="menu-options" role="group" aria-label="list actions">
                <div
                    class="option switchable"
                    tabindex="{$menuVisible ? "0" : "-1"}"
                    on:click="{updateList}"
                    on:keyup="{(e) => e.key === "Enter" && updateList(e)}"
                    role="menuitem"
                >
                    <!-- rotate-right -->
                    <svg viewBox="0 0 512 512">
                        <path d="M464 224h8c13 0 24-11 24-24V72a24 24 0 0 0-41-17l-42 42a224 224 0 1 0 1 317 32 32 0 0 0-45-45 160 160 0 1 1-1-227l-41 41a24 24 0 0 0 17 41h120z"/>
                    </svg>
                    <span class="option-label">Update Entries</span>
                    <label 
                        class="switch"
                        tabindex="{$menuVisible ? "0" : "-1"}"
                        on:keyup="{(e) => {
                            if(e.key === "Enter") {
                                $autoUpdate = !$autoUpdate
                                const message = `${$autoUpdate ? "Enabled" : "Disabled"} automatic update`
                                if ($android) {
                                    showToast(message)
                                } else {
                                    $toast = message
                                }
                            }
                        }}"
                    >
                        <input
                            type="checkbox"
                            class="switch-toggle"
                            bind:checked="{$autoUpdate}"
                            on:change="{() => {
                                const message = `${$autoUpdate ? "Enabled" : "Disabled"} automatic update`
                                if ($android) {
                                    showToast(message)
                                } else {
                                    $toast = message
                                }
                            }}"
                        />
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <span class="slider round">
                            <div class="round-icon"></div>
                        </span>
                    </label>
                </div>
                <div
                    class="option"
                    tabindex="{$menuVisible ? "0" : "-1"}"
                    on:click="{showAllHiddenEntries}"
                    on:keyup="{(e) => e.key === "Enter" && showAllHiddenEntries(e)}"
                    role="menuitem"
                >
                    <svg viewBox="0 0 576 512">
                        <path d="M288 32c-81 0-145 37-193 81-46 43-78 95-92 131-4 8-4 16 0 24 14 36 46 88 92 131 48 44 112 81 193 81s146-37 193-81c46-43 78-95 93-131 3-8 3-16 0-24-15-36-47-88-93-131-47-44-112-81-193-81zM144 256a144 144 0 1 1 288 0 144 144 0 1 1-288 0zm144-64a64 64 0 0 1-84 61c-6-2-12 1-12 7l3 21a96 96 0 1 0 97-121c-6 0-9 6-7 12s3 13 3 20z"/>
                    </svg>
                    <span class="option-label">Show All Hidden Entries</span>
                </div>
            </div>
            <span class="menu-category">BACKUP AND RESTORE</span>
            <div class="menu-options" role="group" aria-label="backup and restore">
                <div
                    class="option"
                    tabindex="{$menuVisible ? "0" : "-1"}"
                    on:click="{() => importData(true)}"
                    on:keyup="{(e) => e.key === "Enter" && importData(true)}"
                    role="menuitem"
                >
                    <svg 
                        viewBox="0 0 448 512"
                        style:--width={"18px"}
                    >
                        <path d="M247 9a32 32 0 0 0-46 0L73 137a32 32 0 0 0 46 46l73-74v211a32 32 0 1 0 64 0V109l73 74a32 32 0 0 0 46-46L247 9zM64 352a32 32 0 1 0-64 0v64c0 53 43 96 96 96h256c53 0 96-43 96-96v-64a32 32 0 1 0-64 0v64c0 18-14 32-32 32H96c-18 0-32-14-32-32v-64z"/>
                    </svg>
                    <span class="option-label">Restore Backup</span>
                </div>
                <div
                    class={"option " + ($android ? ($exportPathIsAvailable ? "export-switchable" : "export") : "")}
                    tabindex="{$menuVisible ? "0" : "-1"}"
                    on:click="{exportData}"
                    on:keyup="{(e) => e.key === "Enter" && exportData(e)}"
                    role="menuitem"
                >
                    <svg viewBox="0 0 512 512">
                        <path d="M288 32a32 32 0 1 0-64 0v243l-73-74a32 32 0 0 0-46 46l128 128c13 12 33 12 46 0l128-128a32 32 0 0 0-46-46l-73 74V32zM64 352c-35 0-64 29-64 64v32c0 35 29 64 64 64h384c35 0 64-29 64-64v-32c0-35-29-64-64-64H347l-46 45a64 64 0 0 1-90 0l-45-45H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/>
                    </svg>
                    <span class="option-label">Back Up Data</span>
                    {#if $android}
                        <div class="change-directory">
                            <svg 
                                viewBox="0 0 576 512"
                                tabindex="{$menuVisible ? "0" : "-1"}"
                                on:click="{handleExportDirectory}"
                                on:keyup="{(e) => e.key === "Enter" && handleExportDirectory(e)}"
                            >
                                <path d="M89 224 0 376V96c0-35 29-64 64-64h118c17 0 33 7 45 19l26 26c12 12 29 19 46 19h117c35 0 64 29 64 64v32H144c-23 0-44 12-55 32zm27 16c6-10 17-16 28-16h400c12 0 22 6 28 16s5 22 0 32L460 464c-6 10-17 16-28 16H32c-11 0-22-6-28-16s-5-22 0-32l112-192z"/>
                            </svg>
                        </div>
                        {#if $exportPathIsAvailable}
                            <label 
                                class="switch"
                                tabindex="{$menuVisible ? "0" : "-1"}"
                                on:keyup="{(e) => {
                                    if(e.key === "Enter") {
                                        $autoExport = !$autoExport
                                        const message = `${$autoExport ? "Enabled" : "Disabled"} automatic back up`
                                        if ($android) {
                                            showToast(message)
                                        } else {
                                            $toast = message
                                        }
                                    }
                                }}"
                            >
                                <input
                                    type="checkbox"
                                    class="switch-toggle"
                                    bind:checked="{$autoExport}"
                                    on:change="{() => {
                                        const message = `${$autoExport ? "Enabled" : "Disabled"} automatic back up`
                                        if ($android) {
                                            showToast(message)
                                        } else {
                                            $toast = message
                                        }
                                    }}"
                                />
                                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                <span class="slider round">
                                    <div class="round-icon"></div>
                                </span>
                            </label>
                        {/if}
                    {/if}
                </div>
            </div>
            <span class="menu-category">TOOL CONFIGS</span>
            <div class="menu-options" role="group" aria-label="tool configs">
                {#if $android}
                    <div
                        class="option switchable"
                        on:click="{(e)=>{
                            const target = e.target
                            const classList = target.classList
                            if (classList.contains("switch") || target.closest(".switch")) return
                            $keepAppRunningInBackground = !$keepAppRunningInBackground
                        }}"
                        on:keyup="{()=>{}}"
                    >
                        <svg 
                            viewBox="0 0 640 512"
                            style:--width={"25px"}
                        >
                            <path d="M309 135c7-6 9-16 6-25l-8-15-3-6-10-14c-6-8-16-10-25-7l-28 9c-10-9-23-16-36-21l-6-29c-2-9-9-17-18-18l-21-1-20 1c-10 1-17 9-19 18l-6 29c-13 5-25 12-36 21l-28-9c-9-3-19-1-25 7L16 89l-3 6-8 15c-3 9-1 19 7 25l22 20a129 129 0 0 0 0 42l-22 20c-8 6-10 16-7 25l8 15 3 6 10 14c5 8 15 10 24 7l29-9c10 9 23 16 36 21l6 29c2 9 9 17 19 18a172 172 0 0 0 40 0c10-1 17-9 19-18l6-29c13-5 25-12 36-21l28 9c9 3 19 1 25-7l10-14 3-6 8-15c3-9 0-19-7-25l-22-20a131 131 0 0 0 0-42l22-20zm-197 41a48 48 0 1 1 96 0 48 48 0 1 1-96 0zm393 325c6 7 16 9 25 6l15-8 6-3 14-10c8-6 10-16 7-25l-9-28c9-10 16-23 21-36l29-6c9-2 17-9 18-19a172 172 0 0 0 0-40c-1-10-9-17-18-19l-29-6c-5-13-12-25-21-36l9-28c3-9 1-19-7-25l-14-10-6-3-15-8c-9-3-19 0-25 7l-20 22a131 131 0 0 0-42 0l-20-22c-6-7-16-10-25-7l-15 8-6 3-14 10c-8 6-10 16-7 25l9 28c-9 11-16 23-21 36l-29 6c-9 2-17 9-18 19a172 172 0 0 0 0 40c1 10 9 17 18 19l29 6c5 13 12 25 21 36l-9 28c-3 9-1 19 7 25l15 10 5 3 15 7c9 4 19 1 25-6l20-22a131 131 0 0 0 42 0l20 22zm-41-197a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"/>
                        </svg>
                        <span class="option-label">Enable Background Updates</span>
                        <label 
                            class="switch"
                            tabindex="{$menuVisible ? "0" : "-1"}"
                            on:keyup="{(e) => {
                                if(e.key === "Enter") {
                                    $keepAppRunningInBackground = !$keepAppRunningInBackground
                                }
                            }}"
                        >
                            <input
                                type="checkbox"
                                class="switch-toggle"
                                bind:checked="{$keepAppRunningInBackground}"
                            />
                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                            <span class="slider round">
                                <div class="round-icon"></div>
                            </span>
                        </label>
                    </div>
                {/if}
                <div
                    class="option switchable"
                    on:click="{(e)=>{
                        const target = e.target
                        const classList = target.classList
                        if (classList.contains("switch") || target.closest(".switch")) return
                        $showStatus = !$showStatus
                    }}"
                    on:keyup="{()=>{}}"
                >
                    <svg 
                        viewBox="0 0 384 512"
                        style:--width={"18px"}
                    >
                        <path d="M272 384c10-32 30-59 49-86l16-22a176 176 0 1 0-289 0c4 8 10 15 15 22 20 27 40 54 49 86h160zm-80 128c44 0 80-36 80-80v-16H112v16c0 44 36 80 80 80zm-80-336c0 9-7 16-16 16s-16-7-16-16c0-62 50-112 112-112 9 0 16 7 16 16s-7 16-16 16c-44 0-80 36-80 80z"/>
                    </svg>
                    <span class="option-label">Show Status Updates</span>
                    <label 
                        class="switch"
                        tabindex="{$menuVisible ? "0" : "-1"}"
                        on:keyup="{(e) => {
                            if(e.key === "Enter") {
                                $showStatus = !$showStatus
                            }
                        }}"
                    >
                        <input
                            type="checkbox"
                            class="switch-toggle"
                            bind:checked="{$showStatus}"
                        />
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <span class="slider round">
                            <div class="round-icon"></div>
                        </span>
                    </label>
                </div>
                <div
                    class="option switchable"
                    on:click="{(e)=>{
                        const target = e.target
                        const classList = target.classList
                        if (classList.contains("switch") || target.closest(".switch")) return
                        $showRateLimit = !$showRateLimit
                    }}"
                    on:keyup="{()=>{}}"
                >
                    <svg 
                        viewBox="0 0 448 512"
                        style:--width={"18px"}
                    >
                        <path d="M176 0a32 32 0 1 0 0 64h16v34a208 208 0 1 0 207 93l24-24a32 32 0 0 0-46-46l-21 22c-28-23-63-39-100-45V64h16a32 32 0 1 0 0-64h-96zm72 192v128a24 24 0 1 1-48 0V192a24 24 0 1 1 48 0z"/>
                    </svg>
                    <span class="option-label">Show Rate Limit</span>
                    <label 
                        class="switch"
                        tabindex="{$menuVisible ? "0" : "-1"}"
                        on:keyup="{(e) => {
                            if(e.key === "Enter") {
                                $showRateLimit = !$showRateLimit
                            }
                        }}"
                    >
                        <input
                            type="checkbox"
                            class="switch-toggle"
                            bind:checked="{$showRateLimit}"
                        />
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <span class="slider round">
                            <div class="round-icon"></div>
                        </span>
                    </label>
                </div>
            </div>
            {#if $android}
                <span class="menu-category">TOOL ACTIONS</span>
                <div class="menu-options" role="group" aria-label="tool actions">
                    <div
                        class="option"
                        tabindex="{$menuVisible ? "0" : "-1"}"
                        on:keyup="{(e) => e.key === "Enter" && checkForUpdates(e)}"
                        on:click="{checkForUpdates}"
                        role="menuitem"
                    >
                        <svg viewBox="0 0 576 512">
                            <path d="M421 302a24 24 0 1 1 24-24 24 24 0 0 1-24 24m-265 0a24 24 0 1 1 24-24 24 24 0 0 1-24 24m273-145 48-83a10 10 0 1 0-17-10l-49 84a301 301 0 0 0-246 0l-49-83a10 10 0 1 0-17 10l48 83A283 283 0 0 0 0 384h576c-8-98-64-182-147-227"/>
                        </svg>
                        <span class="option-label">Check for Updates</span>
                    </div>
                    <div
                        class="option"
                        tabindex="{$menuVisible ? "0" : "-1"}"
                        on:keyup="{(e) => e.key === "Enter" && clearCache(e)}"
                        on:click="{clearCache}"
                        role="menuitem"
                    >
                        <svg
                            viewBox="0 0 448 512"
                            style:--width={"17px"}
                        >
                            <path d="m135 18-7 14H32a32 32 0 1 0 0 64h384a32 32 0 1 0 0-64h-96l-7-14c-6-11-17-18-29-18H164c-12 0-23 7-29 18zm281 110H32l21 339c2 25 23 45 48 45h246c25 0 46-20 48-45l21-339z"/>
                        </svg>
                        <span class="option-label">Clear Cache</span>
                    </div>
                </div>
            {/if}
            <span class="menu-category">OTHERS</span>
            <div class="menu-options" role="group" aria-label="other option">
                {#if $mobile && !$android && (isAndroidWeb || (deferredPrompt && typeof deferredPrompt?.prompt === "function"))}
                    <div
                        class="option"
                        tabindex="{$menuVisible ? "0" : "-1"}"
                        on:click="{() => downloadAndroidApp?.()}"
                        on:keyup="{(e) => e.key === "Enter" && downloadAndroidApp?.()}"
                        role="menuitem"
                    >
                        {#if isAndroidWeb}
                            <svg viewBox="0 0 576 512">
                                <path d="M421 302a24 24 0 1 1 24-24 24 24 0 0 1-24 24m-265 0a24 24 0 1 1 24-24 24 24 0 0 1-24 24m273-145 48-83a10 10 0 1 0-17-10l-49 84a301 301 0 0 0-246 0l-49-83a10 10 0 1 0-17 10l48 83A283 283 0 0 0 0 384h576c-8-98-64-182-147-227"/>
                            </svg>
                            <span class="option-label">Install Android App</span>
                        {:else}
                            <svg
                                viewBox="0 0 384 512"
                                style:--width={"18px"}
                            >
                                <path d="M16 64C16 29 45 0 80 0h224c35 0 64 29 64 64v384c0 35-29 64-64 64H80c-35 0-64-29-64-64V64zm208 384a32 32 0 1 0-64 0 32 32 0 1 0 64 0zm80-384H80v320h224V64z"/>
                            </svg>
                            <span class="option-label">Install Web App</span>
                        {/if}
                        
                    </div>
                {/if}
                <div
                    class="option"
                    tabindex="{$menuVisible ? "0" : "-1"}"
                    on:click="{anilistSignup}"
                    on:keyup="{(e) => e.key === "Enter" && anilistSignup(e)}"
                    role="menuitem"
                >
                    <svg viewBox="0 0 640 512">
                        <path d="M96 128a128 128 0 1 1 256 0 128 128 0 1 1-256 0zM0 482c0-98 80-178 178-178h92c98 0 178 80 178 178 0 17-13 30-30 30H30c-17 0-30-13-30-30zm504-170v-64h-64a24 24 0 1 1 0-48h64v-64a24 24 0 1 1 48 0v64h64a24 24 0 1 1 0 48h-64v64a24 24 0 1 1-48 0z"/>
                    </svg>
                    <span class="option-label">Create an AniList Account</span>
                </div>
                <div
                    class="option"
                    tabindex="{$menuVisible ? "0" : "-1"}"
                    on:keyup="{(e) => e.key === "Enter" && showNotice(e)}"
                    on:click="{showNotice}"
                    role="menuitem"
                >
                    <svg viewBox="0 0 512 512">
                        <path d="M256 32c14 0 27 8 35 20l216 368a40 40 0 0 1-35 60H40a40 40 0 0 1-34-60L222 52c7-12 20-20 34-20zm0 128c-13 0-24 11-24 24v112a24 24 0 1 0 48 0V184c0-13-11-24-24-24zm32 224a32 32 0 1 0-64 0 32 32 0 1 0 64 0z"/>
                    </svg>
                    <span class="option-label">Notice!</span>
                </div>
            </div>
        </div>
    </div>
{/if}

<input
    aria-hidden="true"
    type="file"
    style:display="none"
    accept=".gzip"
    bind:this="{importFileInput}"
    on:change="{importUserFile}"
/>

{#if $menuVisible && menuIsGoingBack}
    <div
        class="{"go-back-grid-highlight" + (willGoBack ? " will-go-back" : "")}"
        in:fade="{{ duration: 200, easing: sineOut }}"
        out:fade="{{ duration: 200, easing: sineOut }}"
    >
        <div class="go-back-grid">
            <!-- angle left -->
            <svg viewBox="0 0 320 512"
                ><path
                    d="M41 233a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L109 256l138-137a32 32 0 0 0-46-46L41 233z"
                ></path></svg
            >
        </div>
    </div>
{/if}

<style>
    .fixed-menu-container {
        position: fixed;
        top: 56px;
        width: 100%;
        height: calc(100% - 56px);
        background: var(--ol-color);
        color: var(--fg-color);
        z-index: 998;
    }
    :global(#app.max-window-height.popup-visible .fixed-menu-container) {
        touch-action: none;
    }
    .menu {
        width: 100%;
        height: 100%;
        display: grid;
        padding: 6px 6px 18px 6px;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
        -ms-overflow-style: none;
        scrollbar-width: none;
        max-width: 640px;
        margin: 0 auto;
        background: var(--bg-color);
        box-shadow: 0 0 50px 50px var(--ol-color);
        user-select: none;
    }
    .menu::-webkit-scrollbar {
        display: none;
    }
    :global(#app.max-window-height.popup-visible .menu:not(.scrollable)) {
        touch-action: none;
    }

    .menu-category {
        align-self: center;
        padding: 12px 16px;
        font-size: 13px;
        cursor: default;
    }

    .menu-options {
        display: grid;
        gap: 8px;
        background: transparent;
        border: 1px solid var(--bd-color);
        padding: 8px 16px;
        border-radius: 24px;
        align-items: center;
    }

    .option {
        width: 100%;
        background: transparent;
        border: none;
        text-align: start;
        height: 40px;
        display: grid;
        grid-template-columns: 20px auto;
        align-items: center;
        gap: 20px;
        cursor: pointer;
    }

    .option.switchable {
        grid-template-columns: 20px auto 45px;
    }

    .option.export {
        grid-template-columns: 20px auto 45px;
    }

    .option.export-switchable {
        grid-template-columns: 20px auto 45px 45px;
    }

    .option > svg,
    .change-directory > svg {
        --width: 20px;
        width: var(--width);
        margin: auto;
    }

    .change-directory {
        width: 100%;
        height: 70%;
        display: grid;
        justify-content: center;
        align-items: center;
    }
    .export-switchable .change-directory {
        border-right: 1px solid var(--fg-color);
        padding-right: 20px;
    }

    .option-label {
        height: 70%;
        align-items: center;
        display: grid;
        font-size: 14px;
    }

    .switchable > .option-label,
    .export-switchable > .option-label {
        border-right: 1px solid var(--fg-color);
        padding-right: 20px;
    }

    .switch {
        position: relative;
        display: inline-block;
        width: 45px;
        min-width: 45px;
        height: 25px;
    }

    .switch-toggle {
        display: none;
    }

    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--bg-color);
        transition: 0.16s transform ease-out;
        border: 2px solid var(--fg-color);
    }

    .slider .round-icon {
        position: absolute;
        height: 20px;
        width: 20px;
        left: 2.25px;
        bottom: 0.5px;
        background-color: var(--fg-color);
        transition: 0.16s transform ease-out;
    }

    .switch-toggle:checked + .slider .round-icon {
        background-color: var(--bg-color);
    }

    .switch-toggle:checked + .slider {
        background-color: var(--fg-color);
        border: 2px solid var(--fg-color);
    }

    .switch-toggle:focus + .slider {
        box-shadow: 0 0 1px var(--fg-color);
    }

    .switch-toggle:checked + .slider .round-icon {
        transform: translateX(19px);
    }

    .slider {
        border-radius: 34px;
    }

    .slider .round-icon {
        border-radius: 50%;
    }

    .go-back-grid-highlight {
        position: fixed;
        display: flex;
        justify-content: center;
        align-items: center;
        top: 50%;
        left: 0;
        transform: translateY(-50%) translateX(-100%);
        background-color: hsl(var(--ac-color), 0.5);
        width: 88px;
        height: 88px;
        border-radius: 50%;
        transition: transform 0.1s ease-out;
        z-index: 9000;
    }

    .go-back-grid-highlight.will-go-back {
        transform: translateY(-50%) translateX(0);
        background-color: hsl(var(--ac-color), 0.5);
        width: 88px;
        height: 88px;
    }

    .go-back-grid {
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        background-color: var(--bg-color);
        cursor: pointer;
        border-radius: 50%;
        max-width: 44px;
        max-height: 44px;
        min-width: 44px;
        min-height: 44px;
    }

    .go-back-grid svg {
        fill: var(--sfg-color);
        width: 20px;
        height: 20px;
    }

    @media screen and (min-width: 750px) {
        .fixed-menu-container {
            height: 100% !important;
            top: 0 !important;
            z-index: 992 !important;
        }
    }
    @media screen and (min-width: 640px) {
        .menu {
            padding: 15px 50px !important;
        }
    }

    .display-none {
        display: none !important;
    }
</style>
