<script>
    import { onMount, tick } from "svelte";
    import { mediaManager, getIDBdata, importUserData, saveIDBdata, exportUserData } from "../../js/workerUtils.js";
    import {
        jsonIsEmpty,
        removeLocalStorage,
        setLocalStorage,
        removeClass,
        addClass,
        downloadLink,
        requestImmediate,
        showToast,
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
        confirmPromise,
        popupVisible,
        listUpdateAvailable,
        showStatus,
        username,
        isBackgroundUpdateKey,
        mobile,
        appInstallationAsked,
        keepAppRunningInBackground,
        resetProgress,
        documentScrollTop,
        loadingCategory,
        toast,
        appID,
    } from "../../js/globalValues.js";
    import getWebVersion from "../../version.js"
    import { fade } from "svelte/transition";
    import { sineOut } from "svelte/easing";

    let navContainerEl;
    let importFileInput;

    async function importData() {
        if (!(importFileInput instanceof Element)) {
            $dataStatus = "Something went wrong"
            return;
        }
        if (await $confirmPromise("Do you want to import your backup file?")) {
            importFileInput.value = null;
            importFileInput.click();
        }
    }
    window.importAndroidUserData = importData;

    async function importJSONFile() {
        if ($android && window[$isBackgroundUpdateKey] === true) return;
        if (!(importFileInput instanceof Element)) {
            $dataStatus = "Something went wrong"
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
                        setLocalStorage("username", $username).catch(() => {
                            removeLocalStorage("username");
                        });
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
    function handleExportFolder() {
        try {
            JSBridge.chooseExportFolder();
        } catch (ex) { console.error(ex); }
    }
    window.setExportPathAvailability = async (value = true) => {
        $exportPathIsAvailable = value;
        setLocalStorage("exportPathIsAvailable", value)
            .catch(() => {
                removeLocalStorage("exportPathIsAvailable");
            })
            .finally(() => {
                saveIDBdata(value, "exportPathIsAvailable");
            });
    };

    async function exportData(e) {
        if ($android) {
            const target = e?.target
            const classList = target?.classList
            if (
                classList.contains("switch")
                || target?.closest?.(".switch")
                || classList.contains("change-folder")
                || target?.closest?.(".change-folder")
            ) {
                return
            } else if (!$exportPathIsAvailable) {
                return handleExportFolder();
            }
        }
        if (await $confirmPromise("Do you want to back up your data?")) {
            exportUserData({ isManual: true });
        }
    }

    async function updateList(e) {
        if (window.navigator?.onLine === false) {
            if ($android) {
                showToast("You are currently offline")
            } else {
                $toast = "You are currently offline"
            }
            return
        }
        const target = e?.target
        const classList = target?.classList
        if (classList.contains("switch") || target?.closest?.(".switch")) return
        if (await $confirmPromise("Do you want to update existing entries?")) {
            runUpdate.update((e) => !e);
            resetProgress.update((e) => !e);
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
        if (jsonIsEmpty($hiddenEntries)) {
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
            $hiddenEntries = {};
            resetProgress.update((e) => !e);
        }
    }

    showStatus.subscribe((val) => {
        if (typeof val === "boolean") {
            setLocalStorage("showStatus", val)
                .catch(() => {
                    removeLocalStorage("showStatus");
                })
                .finally(() => {
                    saveIDBdata(val, "showStatus");
                });
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
                text: "Do you want to sign-up an AniList account?",
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
                title: "Possiblity for Future Data Loss",
                text: `<div id="kanshi-show-notice">You may want to regularly <span style='color:hsl(345deg, 75%, 60%);'>Back Up</span> your data or use auto-export to prevent future data loss.\n\nCurrently, the storage can be <span style='color:hsl(345deg, 75%, 60%);'>Automatically Cleared by Chrome</span> when your <span style='color:hsl(345deg, 75%, 60%);'>Disk is Nearly Full.</span>\n\n<span ${
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
                title: "Possiblity for Future Data Loss",
                text: `<div id="kanshi-show-notice">You may want to <span style='color:hsl(345deg, 75%, 60%);'>Back Up</span> your data or enable persistent storage to prevent future data loss. Currently, browsers can <span style='color:hsl(345deg, 75%, 60%);'>Automatically Clear your Data</span> when your <span style='color:hsl(345deg, 75%, 60%);'>Disk is Nearly Full.</span>\n\nPersistent Storage Status: ${
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
                };">Notification</span></span>.\n3) Bookmark this Website.</div>`,
            });
        }
        if (!persistent) {
            await window.navigator?.storage?.persist?.();
        }
    }
    function refreshKanshiNotice() {
        if (document?.getElementById?.("kanshi-show-notice")) {
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

    let hasAvailableApp, downloadAndroidApp;
    appInstallationAsked.subscribe((val) => {
        if (val === true) {
            if (!$android && $mobile) {
                const isAndroidWeb = /android/i.test(
                    window.navigator?.userAgent ||
                    window.navigator?.vendor ||
                    window.opera,
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
                                if ($android) {
                                    showToast("App installer was not found")
                                } else {
                                    $toast = "App installer was not found"
                                }
                            }
                        } catch {
                            if ($android) {
                                showToast("App installer was not found")
                            } else {
                                $toast = "App installer was not found"
                            }
                        }
                    }
                };
            }
        }
    });

    onMount(async () => {
        navContainerEl = document.getElementById("nav-container");
        if (
            typeof window.keepAppRunningInBackground === "boolean" &&
            typeof $keepAppRunningInBackground !== "boolean"
        ) {
            $keepAppRunningInBackground = window.keepAppRunningInBackground;
        }
        
        // Get Export Folder for Android
        if ($android) {
            $exportPathIsAvailable = $exportPathIsAvailable ?? (await getIDBdata("exportPathIsAvailable"));
            if ($exportPathIsAvailable == null) {
                setLocalStorage("exportPathIsAvailable", $exportPathIsAvailable = false)
                .catch(() => removeLocalStorage("exportPathIsAvailable"))
                .finally(() => saveIDBdata(false, "exportPathIsAvailable"));
            }
            $autoExport = $autoExport ?? (await getIDBdata("autoExport"));
            if ($autoExport == null) {
                setLocalStorage("autoExport", $autoExport = false)
                .catch(() => removeLocalStorage("autoExport"))
                .finally(() => saveIDBdata(false, "autoExport"));
            }
        }
        $showStatus = $showStatus ?? (await getIDBdata("showStatus"));
        if ($showStatus == null) {
            setLocalStorage("showStatus", $showStatus = true)
            .catch(() => removeLocalStorage("showStatus"))
            .finally(() => saveIDBdata(true, "showStatus"));
        }
        $autoUpdate = $autoUpdate ?? (await getIDBdata("autoUpdate"));
        if ($autoUpdate == null) {
            setLocalStorage("autoUpdate", $autoUpdate = true)
            .catch(() => removeLocalStorage("autoUpdate"))
            .finally(() => saveIDBdata(true, "autoUpdate"));
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
{#if $menuVisible}
    <div
        class="menu-container"
        on:click="{handleMenuVisibility}"
        on:keyup="{(e) => e.key === 'Enter' && handleMenuVisibility(e)}"
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
        >
            <span class="menu-category">LIST ACTIONS</span>
            <div class="menu-options">
                <div
                    class="option switchable"
                    tabindex="{$menuVisible ? '0' : '-1'}"
                    on:click="{updateList}"
                    on:keyup="{(e) => e.key === 'Enter' && updateList(e)}"
                >
                    <!-- rotate-right -->
                    <svg viewBox="0 0 512 512">
                        <path d="M463.5 224l8.5 0c13.3 0 24-10.7 24-24l0-128c0-9.7-5.8-18.5-14.8-22.2s-19.3-1.7-26.2 5.2L413.4 96.6c-87.6-86.5-228.7-86.2-315.8 1c-87.5 87.5-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3c62.2-62.2 162.7-62.5 225.3-1L327 183c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8l119.5 0z"/>
                    </svg>
                    <span class="option-label">Update Entries</span>
                    <label 
                        class="switch"
                        tabindex="{$menuVisible ? '0' : '-1'}"
                        on:keyup="{(e) => {
                            if(e.key === 'Enter') {
                                $autoUpdate = !$autoUpdate
                                const message = `${$autoUpdate ? 'Enabled' : 'Disabled'} automatic update`
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
                                const message = `${$autoUpdate ? 'Enabled' : 'Disabled'} automatic update`
                                if ($android) {
                                    showToast(message)
                                } else {
                                    $toast = message
                                }
                            }}"
                        />
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <span class="slider round"></span>
                    </label>
                </div>
                <div
                    class="option"
                    tabindex="{$menuVisible ? '0' : '-1'}"
                    on:click="{showAllHiddenEntries}"
                    on:keyup="{(e) => e.key === 'Enter' && showAllHiddenEntries(e)}"
                >
                    <svg viewBox="0 0 576 512">
                        <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z"/>
                    </svg>
                    <span class="option-label">Show All Hidden Entries</span>
                </div>
            </div>
            <span class="menu-category">BACKUP AND RESTORE</span>
            <div class="menu-options">
                <div
                    class="option"
                    tabindex="{$menuVisible ? '0' : '-1'}"
                    on:click="{() => importData()}"
                    on:keyup="{(e) => e.key === 'Enter' && importData()}"
                >
                    <svg 
                        viewBox="0 0 448 512"
                        style:--width={"18px"}
                    >
                        <path d="M246.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 109.3 192 320c0 17.7 14.3 32 32 32s32-14.3 32-32l0-210.7 73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-64z"/>
                    </svg>
                    <span class="option-label">Restore Backup</span>
                </div>
                <div
                    class={"option " + ($android ? ($exportPathIsAvailable ? 'export-switchable' : 'export') : '')}
                    tabindex="{$menuVisible ? '0' : '-1'}"
                    on:click="{exportData}"
                    on:keyup="{(e) => e.key === 'Enter' && exportData(e)}"
                >
                    <svg viewBox="0 0 512 512">
                        <path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 242.7-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7 288 32zM64 352c-35.3 0-64 28.7-64 64l0 32c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-32c0-35.3-28.7-64-64-64l-101.5 0-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352 64 352zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/>
                    </svg>
                    <span class="option-label">Back Up Data</span>
                    {#if $android}
                        <div class="change-folder">
                            <svg 
                                viewBox="0 0 576 512"
                                tabindex="{$menuVisible ? '0' : '-1'}"
                                on:click="{handleExportFolder}"
                                on:keyup="{(e) => e.key === 'Enter' && handleExportFolder(e)}"
                            >
                                <path d="M88.7 223.8L0 375.8 0 96C0 60.7 28.7 32 64 32l117.5 0c17 0 33.3 6.7 45.3 18.7l26.5 26.5c12 12 28.3 18.7 45.3 18.7L416 96c35.3 0 64 28.7 64 64l0 32-336 0c-22.8 0-43.8 12.1-55.3 31.8zm27.6 16.1C122.1 230 132.6 224 144 224l400 0c11.5 0 22 6.1 27.7 16.1s5.7 22.2-.1 32.1l-112 192C453.9 474 443.4 480 432 480L32 480c-11.5 0-22-6.1-27.7-16.1s-5.7-22.2 .1-32.1l112-192z"/>
                            </svg>
                        </div>
                        {#if $exportPathIsAvailable}
                            <label 
                                class="switch"
                                tabindex="{$menuVisible ? '0' : '-1'}"
                                on:keyup="{(e) => {
                                    if(e.key === 'Enter') {
                                        $autoExport = !$autoExport
                                        const message = `${$autoExport ? 'Enabled' : 'Disabled'} automatic back up`
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
                                        const message = `${$autoExport ? 'Enabled' : 'Disabled'} automatic back up`
                                        if ($android) {
                                            showToast(message)
                                        } else {
                                            $toast = message
                                        }
                                    }}"
                                />
                                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                <span class="slider round"></span>
                            </label>
                        {/if}
                    {/if}
                </div>
            </div>
            <span class="menu-category">TOOL CONFIGS</span>
            <div class="menu-options">
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
                            <path d="M308.5 135.3c7.1-6.3 9.9-16.2 6.2-25c-2.3-5.3-4.8-10.5-7.6-15.5L304 89.4c-3-5-6.3-9.9-9.8-14.6c-5.7-7.6-15.7-10.1-24.7-7.1l-28.2 9.3c-10.7-8.8-23-16-36.2-20.9L199 27.1c-1.9-9.3-9.1-16.7-18.5-17.8C173.9 8.4 167.2 8 160.4 8l-.7 0c-6.8 0-13.5 .4-20.1 1.2c-9.4 1.1-16.6 8.6-18.5 17.8L115 56.1c-13.3 5-25.5 12.1-36.2 20.9L50.5 67.8c-9-3-19-.5-24.7 7.1c-3.5 4.7-6.8 9.6-9.9 14.6l-3 5.3c-2.8 5-5.3 10.2-7.6 15.6c-3.7 8.7-.9 18.6 6.2 25l22.2 19.8C32.6 161.9 32 168.9 32 176s.6 14.1 1.7 20.9L11.5 216.7c-7.1 6.3-9.9 16.2-6.2 25c2.3 5.3 4.8 10.5 7.6 15.6l3 5.2c3 5.1 6.3 9.9 9.9 14.6c5.7 7.6 15.7 10.1 24.7 7.1l28.2-9.3c10.7 8.8 23 16 36.2 20.9l6.1 29.1c1.9 9.3 9.1 16.7 18.5 17.8c6.7 .8 13.5 1.2 20.4 1.2s13.7-.4 20.4-1.2c9.4-1.1 16.6-8.6 18.5-17.8l6.1-29.1c13.3-5 25.5-12.1 36.2-20.9l28.2 9.3c9 3 19 .5 24.7-7.1c3.5-4.7 6.8-9.5 9.8-14.6l3.1-5.4c2.8-5 5.3-10.2 7.6-15.5c3.7-8.7 .9-18.6-6.2-25l-22.2-19.8c1.1-6.8 1.7-13.8 1.7-20.9s-.6-14.1-1.7-20.9l22.2-19.8zM112 176a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zM504.7 500.5c6.3 7.1 16.2 9.9 25 6.2c5.3-2.3 10.5-4.8 15.5-7.6l5.4-3.1c5-3 9.9-6.3 14.6-9.8c7.6-5.7 10.1-15.7 7.1-24.7l-9.3-28.2c8.8-10.7 16-23 20.9-36.2l29.1-6.1c9.3-1.9 16.7-9.1 17.8-18.5c.8-6.7 1.2-13.5 1.2-20.4s-.4-13.7-1.2-20.4c-1.1-9.4-8.6-16.6-17.8-18.5L583.9 307c-5-13.3-12.1-25.5-20.9-36.2l9.3-28.2c3-9 .5-19-7.1-24.7c-4.7-3.5-9.6-6.8-14.6-9.9l-5.3-3c-5-2.8-10.2-5.3-15.6-7.6c-8.7-3.7-18.6-.9-25 6.2l-19.8 22.2c-6.8-1.1-13.8-1.7-20.9-1.7s-14.1 .6-20.9 1.7l-19.8-22.2c-6.3-7.1-16.2-9.9-25-6.2c-5.3 2.3-10.5 4.8-15.6 7.6l-5.2 3c-5.1 3-9.9 6.3-14.6 9.9c-7.6 5.7-10.1 15.7-7.1 24.7l9.3 28.2c-8.8 10.7-16 23-20.9 36.2L315.1 313c-9.3 1.9-16.7 9.1-17.8 18.5c-.8 6.7-1.2 13.5-1.2 20.4s.4 13.7 1.2 20.4c1.1 9.4 8.6 16.6 17.8 18.5l29.1 6.1c5 13.3 12.1 25.5 20.9 36.2l-9.3 28.2c-3 9-.5 19 7.1 24.7c4.7 3.5 9.5 6.8 14.6 9.8l5.4 3.1c5 2.8 10.2 5.3 15.5 7.6c8.7 3.7 18.6 .9 25-6.2l19.8-22.2c6.8 1.1 13.8 1.7 20.9 1.7s14.1-.6 20.9-1.7l19.8 22.2zM464 304a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"/>
                        </svg>
                        <span class="option-label">Enable Background Updates</span>
                        <label 
                            class="switch"
                            tabindex="{$menuVisible ? '0' : '-1'}"
                            on:keyup="{(e) => {
                                if(e.key === 'Enter') {
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
                            <span class="slider round"></span>
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
                        <path d="M272 384c9.6-31.9 29.5-59.1 49.2-86.2c0 0 0 0 0 0c5.2-7.1 10.4-14.2 15.4-21.4c19.8-28.5 31.4-63 31.4-100.3C368 78.8 289.2 0 192 0S16 78.8 16 176c0 37.3 11.6 71.9 31.4 100.3c5 7.2 10.2 14.3 15.4 21.4c0 0 0 0 0 0c19.8 27.1 39.7 54.4 49.2 86.2l160 0zM192 512c44.2 0 80-35.8 80-80l0-16-160 0 0 16c0 44.2 35.8 80 80 80zM112 176c0 8.8-7.2 16-16 16s-16-7.2-16-16c0-61.9 50.1-112 112-112c8.8 0 16 7.2 16 16s-7.2 16-16 16c-44.2 0-80 35.8-80 80z"/>
                    </svg>
                    <span class="option-label">Show Extra Info</span>
                    <label 
                        class="switch"
                        tabindex="{$menuVisible ? '0' : '-1'}"
                        on:keyup="{(e) => {
                            if(e.key === 'Enter') {
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
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>
            {#if $android}
                <span class="menu-category">TOOL ACTIONS</span>
                <div class="menu-options">
                    <div
                        class="option"
                        tabindex="{$menuVisible ? '0' : '-1'}"
                        on:keyup="{(e) => e.key === 'Enter' && checkForUpdates(e)}"
                        on:click="{checkForUpdates}"
                    >
                        <svg viewBox="0 0 576 512">
                            <path d="M420.6 301.9a24 24 0 1 1 24-24 24 24 0 0 1 -24 24m-265.1 0a24 24 0 1 1 24-24 24 24 0 0 1 -24 24m273.7-144.5 47.9-83a10 10 0 1 0 -17.3-10h0l-48.5 84.1a301.3 301.3 0 0 0 -246.6 0L116.2 64.5a10 10 0 1 0 -17.3 10h0l47.9 83C64.5 202.2 8.2 285.6 0 384H576c-8.2-98.5-64.5-181.8-146.9-226.6"/>
                        </svg>
                        <span class="option-label">Check for Updates</span>
                    </div>
                    <div
                        class="option"
                        tabindex="{$menuVisible ? '0' : '-1'}"
                        on:keyup="{(e) => e.key === 'Enter' && clearCache(e)}"
                        on:click="{clearCache}"
                    >
                        <svg
                            viewBox="0 0 448 512"
                            style:--width={"17px"}
                        >
                            <path d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                        </svg>
                        <span class="option-label">Clear Cache</span>
                    </div>
                </div>
            {/if}
            <span class="menu-category">OTHERS</span>
            <div class="menu-options">
                <div
                    class="option"
                    tabindex="{$menuVisible ? '0' : '-1'}"
                    on:click="{anilistSignup}"
                    on:keyup="{(e) => e.key === 'Enter' && anilistSignup(e)}"
                >
                    <svg viewBox="0 0 640 512">
                        <path d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304l91.4 0C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7L29.7 512C13.3 512 0 498.7 0 482.3zM504 312l0-64-64 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l64 0 0-64c0-13.3 10.7-24 24-24s24 10.7 24 24l0 64 64 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-64 0 0 64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"/>
                    </svg>
                    <span class="option-label">Create an AniList Account</span>
                </div>
                <div
                    class="option"
                    tabindex="{$menuVisible ? '0' : '-1'}"
                    on:keyup="{(e) => e.key === 'Enter' && showNotice(e)}"
                    on:click="{showNotice}"
                >
                    <svg viewBox="0 0 512 512">
                        <path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480L40 480c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24l0 112c0 13.3 10.7 24 24 24s24-10.7 24-24l0-112c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/>
                    </svg>
                    <span class="option-label">Notice!</span>
                </div>
            </div>
        </div>
    </div>
{/if}

{#if $menuVisible && menuIsGoingBack}
    <div
        class="{'go-back-grid-highlight' + (willGoBack ? ' will-go-back' : '')}"
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
    .menu-container {
        transform: translateZ(0);
        position: fixed;
        top: 56px;
        width: 100%;
        height: calc(100% - 56px);
        background: var(--ol-color);
        color: var(--fg-color);
        z-index: 998;
    }
    :global(#main.max-window-height.popup-visible .menu-container) {
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
    :global(#main.max-window-height.popup-visible .menu:not(.scrollable)) {
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
    .change-folder > svg {
        --width: 20px;
        width: var(--width);
        margin: auto;
    }

    .change-folder {
        width: 100%;
        height: 70%;
        display: grid;
        justify-content: center;
        align-items: center;
    }
    .export-switchable .change-folder {
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

    .slider:before {
        position: absolute;
        content: "";
        height: 20px;
        width: 20px;
        left: 2.25px;
        bottom: 0.5px;
        background-color: var(--fg-color);
        transition: 0.16s transform ease-out;
    }

    .switch-toggle:checked + .slider:before {
        background-color: var(--bg-color);
    }

    .switch-toggle:checked + .slider {
        background-color: var(--fg-color);
        border: 2px solid var(--fg-color);
    }

    .switch-toggle:focus + .slider {
        box-shadow: 0 0 1px var(--fg-color);
    }

    .switch-toggle:checked + .slider:before {
        transform: translateX(19px) translateZ(0);
    }

    .slider {
        border-radius: 34px;
    }

    .slider:before {
        border-radius: 50%;
    }

    .go-back-grid-highlight {
        position: fixed;
        display: flex;
        justify-content: center;
        align-items: center;
        top: 50%;
        left: 0;
        transform: translateY(-50%) translateX(-100%) translateZ(0);
        background-color: hsl(var(--ac-color), 0.5);
        width: 88px;
        height: 88px;
        border-radius: 50%;
        transition: transform 0.1s ease-out;
        z-index: 9000;
    }

    .go-back-grid-highlight.will-go-back {
        transform: translateY(-50%) translateX(0) translateZ(0);
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

    .menu:after {
        content: "";
        flex: 1000 0 auto;
    }

    @media screen and (min-width: 750px) {
        .menu-container {
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
