<script>
    import { onMount, onDestroy } from "svelte";
    import { requestUserEntries } from "../../js/workerUtils.js";
    import {
        addClass,
        downloadLink,
        removeClass,
        removeLocalStorage,
        requestImmediate,
        setLocalStorage,
    } from "../../js/others/helper.js";
    import {
        username,
        dataStatus,
        menuVisible,
        initData,
        importantUpdate,
        confirmPromise,
        popupVisible,
        gridFullView,
        userRequestIsRunning,
        android,
        mobile,
        appInstallationAsked,
        isBackgroundUpdateKey,
        selectedAnimeGridEl,
        resetTypedUsername,
        resetProgress,
        windowWidth,
    } from "../../js/globalValues.js";

    let writableSubscriptions = [];

    let typedUsername = "";
    let popupContainer,
        navContainerEl,
        navEl,
        inputUsernameEl,
        inputUsernameElFocused = false;

    onMount(() => {
        navContainerEl =
            navContainerEl || document.getElementById("nav-container");
        navEl = navEl || document?.getElementById("nav");
        inputUsernameEl =
            inputUsernameEl || document?.getElementById("usernameInput");
        popupContainer =
            popupContainer || document?.getElementById("popup-container");
        writableSubscriptions.push(
            username.subscribe((val) => {
                typedUsername = val || typedUsername || "";
            }),
        );
        resetTypedUsername.subscribe((val) => {
            if (val == null) return;
            if (document?.activeElement !== inputUsernameEl) {
                typedUsername = $username || typedUsername || "";
            }
        });
    });

    let awaitForInit;
    initData.subscribe((val) => {
        if (val === false) {
            awaitForInit?.resolve?.();
        }
    });
    async function updateUsername(event, isReconfirm = false) {
        if ($android && window?.[$isBackgroundUpdateKey] === true) return;
        if ($initData) {
            pleaseWaitAlert();
            new Promise((resolve) => {
                awaitForInit = { resolve };
            }).then(() => {
                updateUsername(event, true);
            });
            return;
        }
        let element = event.target;
        let classList = element.classList;
        if (
            event.key === "Enter" ||
            (event.type === "click" &&
                (classList.contains("searchBtn") ||
                    element?.closest?.(".searchBtn")))
        ) {
            if (!typedUsername) return;
            if (typedUsername !== $username) {
                if (!navigator.onLine) {
                    if (document?.activeElement !== inputUsernameEl) {
                        typedUsername = $username || typedUsername || "";
                    }
                    return $confirmPromise({
                        isAlert: true,
                        title: "Currently Offline",
                        text: "It seems that you're currently offline and unable to update.",
                    });
                }
                let usernameToShow = `<span style="color:hsl(var(--ac-color));">${typedUsername}</span>`;
                if ($username) {
                    if (
                        await $confirmPromise(
                            `Do you${
                                isReconfirm ? " still" : ""
                            } want to connect to ${usernameToShow}?`,
                        )
                    ) {
                        $menuVisible = false;
                        if (!$popupVisible) {
                            document.documentElement.style.overflow = "hidden";
                            document.documentElement.style.overflow = "";
                            window?.scrollTo?.({
                                top: -9999,
                                behavior: "smooth",
                            });
                        }
                        $dataStatus = "Getting User Entries";
                        $userRequestIsRunning = true;
                        removeLocalStorage("username");
                        requestUserEntries({
                            username: typedUsername,
                        })
                            .then(({ newusername }) => {
                                if (newusername) {
                                    typedUsername = $username =
                                        newusername ||
                                        $username ||
                                        typedUsername ||
                                        "";
                                } else {
                                    typedUsername =
                                        $username || typedUsername || "";
                                }
                                importantUpdate.update((e) => !e);
                                return;
                            })
                            .catch((error) => {
                                if (
                                    document.activeElement !== inputUsernameEl
                                ) {
                                    typedUsername =
                                        $username || typedUsername || "";
                                }
                                $dataStatus = "Something went wrong";
                                console.error(error);
                                return;
                            })
                            .finally(() => {
                                setLocalStorage("username", $username).catch(
                                    () => {
                                        removeLocalStorage("username");
                                    },
                                );
                            });
                        resetProgress.update((e) => !e);
                    } else {
                        typedUsername = $username || typedUsername || "";
                        focusInputUsernameEl();
                    }
                } else {
                    if (
                        await $confirmPromise(
                            `Do you${
                                isReconfirm ? " still" : ""
                            } want to connect to ${usernameToShow}?`,
                        )
                    ) {
                        $menuVisible = false;
                        if (!$popupVisible) {
                            document.documentElement.style.overflow = "hidden";
                            document.documentElement.style.overflow = "";
                            window?.scrollTo?.({
                                top: -9999,
                                behavior: "smooth",
                            });
                        }
                        $dataStatus = "Getting User Entries";
                        $userRequestIsRunning = true;
                        removeLocalStorage("username");
                        requestUserEntries({
                            username: typedUsername,
                        })
                            .then(({ newusername }) => {
                                if (newusername) {
                                    typedUsername = $username =
                                        newusername ||
                                        $username ||
                                        typedUsername ||
                                        "";
                                } else {
                                    typedUsername =
                                        $username || typedUsername || "";
                                }
                                importantUpdate.update((e) => !e);
                                return;
                            })
                            .catch((error) => {
                                if (
                                    document.activeElement !== inputUsernameEl
                                ) {
                                    typedUsername =
                                        $username || typedUsername || "";
                                }
                                $dataStatus = "Something went wrong";
                                console.error(error);
                                return;
                            })
                            .finally(() => {
                                setLocalStorage("username", $username).catch(
                                    () => {
                                        removeLocalStorage("username");
                                    },
                                );
                            });
                        resetProgress.update((e) => !e);
                    } else {
                        typedUsername = $username || typedUsername || "";
                        focusInputUsernameEl();
                    }
                }
            } else {
                inputUsernameEl?.blur?.();
                inputUsernameElFocused = false;
            }
        }
    }

    let goUpTimeout, goUpIsLongPressed;
    function handleMenuVisibility(event) {
        if (goUpIsLongPressed) {
            goUpIsLongPressed = false;
            return;
        }
        let element = event.target;
        let classList = element.classList;
        if (!$android) {
            if (
                !(
                    classList.contains("nav") ||
                    classList.contains("nav-container")
                ) &&
                !(
                    classList.contains("logo-icon") ||
                    element.closest(".logo-icon")
                )
            )
                return;
        } else {
            if (
                !(
                    classList.contains("nav") ||
                    classList.contains("nav-container")
                ) &&
                !(
                    ($popupVisible || $menuVisible) &&
                    (classList.contains("input-search") ||
                        element.closest(".input-search"))
                )
            )
                return;
        }
        if (
            inputUsernameElFocused &&
            !(classList.contains("logo-icon") || element.closest(".logo-icon"))
        ) {
            inputUsernameEl?.blur?.();
            inputUsernameElFocused = false;
            return;
        }
        $menuVisible = !$menuVisible;
    }

    async function focusInputUsernameEl() {
        // if (
        //     await $confirmPromise(
        //         `Do you want to connect to your account in Anilist?`
        //     )
        // ) {
        //     let webURL = window.location.href;
        //     let clientID;
        //     if (
        //         webURL.startsWith(
        //             "https://u-kuro.github.io/Kanshi-Anime-Recommender"
        //         )
        //     ) {
        //         clientID = "13583";
        //     } else if (webURL.startsWith("file:///")) {
        //         clientID = "13584";
        //     } else if (webURL.startsWith("http://localhost:")) {
        //         clientID = "12476";
        //     } else if (webURL.startsWith("https://kanshi.vercel.app")) {
        //         clientID = "13582";
        //     }
        //     if (clientID) {
        //         window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientID}&response_type=token`;
        //     } else {
        //         inputUsernameEl?.focus?.();
        //     }
        // } else {
        inputUsernameEl?.focus?.();
        // }
    }

    function handleGoBack() {
        if (
            inputUsernameEl === document.activeElement ||
            inputUsernameElFocused
        ) {
            inputUsernameEl?.blur?.();
            inputUsernameElFocused = false;
        } else if ($menuVisible) {
            $menuVisible = !$menuVisible;
        } else if ($popupVisible) {
            $popupVisible = false;
        }
    }

    function handleGoUp() {
        if (goUpTimeout) clearTimeout(goUpTimeout);
        goUpTimeout = setTimeout(() => {
            goUpIsLongPressed = true;
            if ($popupVisible) {
                popupContainer.style.overflow = "hidden";
                popupContainer.style.overflow = "";
                popupContainer.scroll({ top: 0, behavior: "smooth" });
            } else {
                if ($gridFullView && $selectedAnimeGridEl) {
                    $selectedAnimeGridEl.style.overflow = "hidden";
                    $selectedAnimeGridEl.style.overflow = "";
                    $selectedAnimeGridEl.scroll({
                        left: 0,
                        behavior: "smooth",
                    });
                } else {
                    window?.showCategoriesNav?.(true);
                    document.documentElement.style.overflow = "hidden";
                    document.documentElement.style.overflow = "";
                    window.scrollTo({ top: -9999, behavior: "smooth" });
                }
            }
        }, 500);
    }
    function cancelGoUp() {
        if (goUpTimeout) clearTimeout(goUpTimeout);
        if (goUpIsLongPressed) {
            goUpTimeout = setTimeout(() => {
                goUpIsLongPressed = false;
            }, 50);
        }
    }

    async function handleAnimeRelease() {
        if (!$android) return;
        if ("Notification" in window) {
            if (window?.Notification?.permission !== "denied") {
                await window?.Notification?.requestPermission?.();
            }
        }
        try {
            JSBridge?.showRecentReleases?.();
        } catch (e) {}
    }

    onDestroy(() => {
        writableSubscriptions.forEach((unsub) => unsub());
    });

    async function pleaseWaitAlert() {
        return await $confirmPromise({
            isAlert: true,
            title: "Initializing resources",
            text: "Please wait a moment...",
        });
    }

    let delayedPopupVis, delayedMenuVis;
    $: navHasNoBackOption =
        !$menuVisible && !$popupVisible && !inputUsernameElFocused;
    popupVisible.subscribe((val) => {
        if (!val && !$menuVisible) {
            if (!inputUsernameElFocused) {
                addClass(navContainerEl, "layout-change");
            }
            requestImmediate(() => {
                delayedPopupVis = val;
                removeClass(navContainerEl, "layout-change");
            }, 100);
        } else {
            delayedPopupVis = val;
            if (navHasNoBackOption && (val || $menuVisible)) {
                addClass(navContainerEl, "layout-change");
                requestImmediate(() => {
                    delayedPopupVis = val;
                    removeClass(navContainerEl, "layout-change");
                }, 100);
            }
        }
    });

    menuVisible.subscribe((val) => {
        if (!val && !$popupVisible) {
            if (!inputUsernameElFocused) {
                addClass(navContainerEl, "layout-change");
            }
            requestImmediate(() => {
                delayedMenuVis = val;
                removeClass(navContainerEl, "layout-change");
            }, 100);
        } else {
            delayedMenuVis = val;
            if (navHasNoBackOption && (val || $popupVisible)) {
                addClass(navContainerEl, "layout-change");
                requestImmediate(() => {
                    removeClass(navContainerEl, "layout-change");
                }, 100);
            }
        }
    });

    let onFocusTimeout, currentUsernameInputFocusStatus;
    function onfocusUsernameInput(event) {
        let eventType = event?.type;
        let isFocusIn = eventType === "focusin";
        if (isFocusIn) {
            window?.setShouldGoBack?.(false);
        } else if (eventType === "focusout" && typedUsername === "") {
            typedUsername = $username || "";
        }
        if (
            currentUsernameInputFocusStatus != null &&
            (isFocusIn ? inputUsernameElFocused : !inputUsernameElFocused)
        ) {
            return;
        }
        currentUsernameInputFocusStatus = eventType ?? "focusout";
        onFocusTimeout?.();
        if (isFocusIn) {
            inputUsernameElFocused = true;
            if (!$menuVisible && !$popupVisible) {
                addClass(navContainerEl, "layout-change");
            }
            onFocusTimeout = requestImmediate(() => {
                addClass(navEl, "inputfocused");
                removeClass(navContainerEl, "layout-change");
                currentUsernameInputFocusStatus = null;
            }, 100);
        } else {
            if (!$menuVisible && !$popupVisible && navHasNoBackOption) {
                addClass(navContainerEl, "layout-change");
            }
            onFocusTimeout = requestImmediate(() => {
                removeClass(navEl, "inputfocused");
                inputUsernameElFocused = false;
                removeClass(navContainerEl, "layout-change");
                currentUsernameInputFocusStatus = null;
            }, 100);
        }
    }
    window.onfocusUsernameInput = onfocusUsernameInput;

    let hasAvailableApp, downloadAndroidApp;
    if (!$android && $mobile && !$appInstallationAsked) {
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
                isAndroidWeb || typeof deferredPrompt?.prompt === "function";
        });
        downloadAndroidApp = async () => {
            hasAvailableApp =
                isAndroidWeb || typeof deferredPrompt?.prompt === "function";
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
                    } else if (typeof deferredPrompt?.prompt === "function") {
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
            $appInstallationAsked = true;
            setLocalStorage("appInstallationAsked", true);
        };
    }
</script>

<div
    id="nav-container"
    bind:this="{navContainerEl}"
    class="{'nav-container' +
        (delayedMenuVis ? ' menu-visible' : '') +
        (delayedMenuVis ||
        delayedPopupVis ||
        (!navHasNoBackOption && ($popupVisible || $menuVisible))
            ? ' delayed-full-screen-popup'
            : '')}"
    on:keyup="{(e) => e.key === 'Enter' && handleMenuVisibility(e)}"
    on:click="{handleMenuVisibility}"
>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <nav
        id="nav"
        class="{'nav ' +
            (delayedPopupVis ? ' popupvisible' : '') +
            (!$appInstallationAsked && $mobile && hasAvailableApp && !$android
                ? ' hasavailableapp'
                : '') +
            (inputUsernameEl === document?.activeElement
                ? ' inputfocused'
                : '')}"
        bind:this="{navEl}"
    >
        <div class="go-back-container" on:click="{handleGoBack}">
            <!-- x-close -->
            <svg
                class="closing-x"
                viewBox="0 0 24 24"
                tabindex="0"
                on:keyup="{(e) => e.key === 'Enter' && handleGoBack(e)}"
                ><path d="m19 6-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6Z"
                ></path></svg
            >
            <!-- arrow left -->
            <svg
                class="goback"
                tabindex="0"
                viewBox="0 0 500 500"
                on:keyup="{(e) => e.key === 'Enter' && handleGoBack(e)}"
            >
                <path
                    d="M 30.047 225.832 C 17.045 238.409 17.045 259.255 30.047 271.832 L 190.047 431.832 C 207.752 449.537 237.985 441.437 244.465 417.251 C 247.473 406.026 244.264 394.049 236.047 385.832 L 130.047 280.832 L 437.047 280.832 C 461.68 280.832 477.076 254.165 464.76 232.832 C 459.043 222.931 448.479 216.832 437.047 216.832 L 130.047 216.832 L 236.047 111.832 C 253.752 94.127 245.651 63.894 221.465 57.413 C 210.241 54.406 198.264 57.615 190.047 65.832 L 30.047 225.832 Z"
                ></path>
            </svg>
        </div>
        <div class="input-search">
            <label class="disable-interaction" for="usernameInput">
                Anilist Username
            </label>
            <input
                id="usernameInput"
                type="search"
                tabindex="{$popupVisible && $windowWidth > 750 ? '-1' : '0'}"
                enterkeyhint="search"
                autocomplete="off"
                placeholder="Your Anilist Username"
                class="{$android ? 'android' : ''}"
                on:keyup="{(e) => e.key === 'Enter' && updateUsername(e)}"
                on:focusin="{onfocusUsernameInput}"
                on:focusout="{onfocusUsernameInput}"
                bind:value="{typedUsername}"
                bind:this="{inputUsernameEl}"
            />
            <div
                class="{'usernameText'}"
                on:click="{() => {
                    if (!$android || (!$popupVisible && !$menuVisible)) {
                        focusInputUsernameEl();
                    }
                }}"
                on:keyup="{(e) => {
                    if (e.key !== 'Enter') return;
                    if (!$android || (!$popupVisible && !$menuVisible)) {
                        focusInputUsernameEl();
                    }
                }}"
            >
                {typedUsername || "Your Anilist Username"}
            </div>
        </div>
        {#if $appInstallationAsked !== true && !$android && $mobile && hasAvailableApp}
            <button
                class="app-installer"
                on:keyup="{(e) => e.key === 'Enter' && downloadAndroidApp?.(e)}"
                on:click="{(e) => downloadAndroidApp?.(e)}">Install App</button
            >
        {/if}
        {#if $android}
            <div
                class="anime-release-icon-container"
                on:click="{handleAnimeRelease}"
                on:pointerdown="{handleGoUp}"
                on:pointerup="{cancelGoUp}"
                on:pointercancel="{cancelGoUp}"
            >
                <svg
                    viewBox="0 0 512 512"
                    class="anime-release-icon"
                    aria-label="Anime Releases"
                    tabindex="{$popupVisible && $windowWidth > 750 ? '-1' : '0'}"
                    on:keyup="{(e) => {
                        if (e.key === 'Enter') {
                            e.stopPropagation();
                            handleAnimeRelease();
                        }
                    }}"
                >
                    <path
                        d="M75 75 41 41C26 26 0 37 0 58v110c0 13 11 24 24 24h110c21 0 32-26 17-41l-31-31a191 191 0 0 1 328 136 192 192 0 0 1-302 158 32 32 0 0 0-36 52A256 256 0 1 0 75 75zm181 53c-13 0-24 11-24 24v104c0 6 3 13 7 17l72 72c9 9 25 9 34 0s9-25 0-34l-65-65v-94c0-13-11-24-24-24z"
                    ></path>
                </svg>
            </div>
        {:else}
            <div
                class="logo-icon-container"
                on:pointerdown="{handleGoUp}"
                on:pointerup="{cancelGoUp}"
                on:pointercancel="{cancelGoUp}"
            >
                <!-- Kanshi Logo -->
                <svg
                    viewBox="0 0 500 500"
                    class="logo-icon"
                    aria-label="Kanshi Logo"
                    tabindex="{$popupVisible && $windowWidth > 750 ? '-1' : '0'}"
                    on:keyup="{(e) => {
                        if (e.key === 'Enter') {
                            e.stopPropagation();
                            $menuVisible = !$menuVisible;
                        } else if (e.key !== 'Escape') {
                            e.stopPropagation();
                        }
                    }}"
                >
                    <path
                        d="m144 7-2 2-1 1c-2 0-9 7-9 9l-2 2-1 1-1 2-3 5c-1 3-3 4-4 5l-1 3-1 1v1l-1 1-15 1-12 1c-11 1-12 1-18-4l-7-6-6-6-4-2s-2-1-2-3-3-2-3-2l-2-2-2-1-1-1-2-1-2-1-8-4c-3 0-7 5-6 6l-1 1v24a350 350 0 0 0 7 36c0 2-1 3-2 3v2l-1 1-3 7-1 2-3 9a61 61 0 0 0 4 30v2l2 3 3 7 1 1v1l1 2 1 1 1 1c0 1 0 2 2 3l2 4 2 2 2 2 6 7 5 7 1 1 1 1v3l4 10 1 14a75 75 0 0 0 2 19l1 4v2l2 3v2a205 205 0 0 0 15 29l1 1v1a128 128 0 0 1 11 22v1l1 1 1 1v3l1 2 2 5a480 480 0 0 1-2 93c0 1-4 6-6 6l-11 11-1 4c-2 3 0 7 8 14 1 1 2 2 1 3l1 3v1l1 2 1 2 3 3h3l1 1 4 1 2 1c0 1 16 2 19 1l2-1h2l7-5 1-1c2 0 11-10 12-13l1-2 1-1c-1-3 0-3 8-2l5 1 2 1-1 3-1 9 2 3 1 2 1 2 3 3 2 1 2 1 4 2 14 1a232 232 0 0 0 56-9l4-1 4-1h8l3 2h1l2 1a93 93 0 0 0 30-1l6-3 4-1 1-1 1-1h2l1-1 1-1 3-1 4-2h3l1-1h2l1-1h2l2-1h2l2-1h2l2-1 3-1h6c12-2 16-2 30-2a174 174 0 0 1 45 5l2 1h3l5 3 5 2 1 1 3 3 3 3 1 1 1 4c0 3-1 4-4 7l-4 3-1 1-8 4-5 2-8 2-5 2h-1l-2 1h-2l-3 1-1 1h-2l-3 1h-4l-10 2c-2 1-11 9-11 11-1 5 0 8 2 10l4 3 2 1 16 1 18-1 5-1 2-1h2l2-1h2l2-1h2l1-1h2l1-1 2-1h2l3-1 3-2h2l1-1 1-1c1 1 13-5 13-6h1l1-1 2-1 1-1h1l2-1 2-2 2-1 1-2c2 0 9-7 9-9l2-1 1-2v-1l1-1v-1l1-1v-1l1-2v-2c1-2 1-8-1-12v-1l-1-1-1-1c0-2-11-14-13-14l-2-2-2-2-2-1-5-3c-3-1-4-3-5-4l-3-1-1-1h-1l-1-1c0-1-4-3-5-2l-1-1h-1l-1-1-1-1-4-1-3-1-1-1h-1l-1-1h-2c-1 1-1 0-1-1h-2l-1-1-1-1h-2l-2-1h-2l-4-1-6-2-6-1-4-1-3-1-12-1a252 252 0 0 0-76 1v-2l1-3 1-5 1-2v-1l1-3 1-4 2-11 1-6c4-24 4-56 1-78l-1-5-1-3-1-7-1-2-1-3-1-5v-1l-1-1v-2l-1-1v-2l-1-2-1-3-1-2-1-3-1-1v-1l-1-1v-1l-1-1-2-4-3-5-1-1-1-2-1-1-1-2-1-1-1-3-2-1-9-11a68 68 0 0 0-15-12l-4-3-1-1-1-1-2-1-2-2-3-1-5-2-1-1h-1l-1-1-1-1-4-1-3-1-2-2h-3l-1-1h-2l-1-1h-2l-1-1h-2l-1-1-3-1h-3l-1-2-2-1-1-1-2-1h-1l-2-2-2-1-2-2c-1 0-10-9-10-11l-2-2-1-1-1-3a66 66 0 0 0-16-15l-1-1-2-1-1-1-3-1v-2l-1-1v-2l-1-1-1-2v-2l-2-3v-3l-1-1-1-1-4-9-2-2c-1-2-1-4 1-12a233 233 0 0 0 1-52v-2l-2-5c-2-3-3-3-6-3h-7z"
                    ></path>
                </svg>
            </div>
        {/if}
    </nav>
</div>

<style>
    ::placeholder {
        opacity: 1 !important;
        color: var(--fg-color) !important;
    }

    :-ms-input-placeholder,
    ::-ms-input-placeholder {
        color: var(--fg-color) !important;
    }
    .nav-container.menu-visible {
        z-index: 993 !important;
        position: fixed !important;
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
    }
    .nav-container {
        z-index: 0;
        position: absolute;
        top: 0;
        width: 100%;
        height: 57px;
        background-color: var(--bg-color);
        color: var(--fg-color);
        opacity: 1;
        transition: opacity 0.2s ease-out;
        cursor: pointer;
    }
    .nav-container.stop-transition {
        transition: unset !important;
    }
    .nav-container.hide {
        opacity: 0;
    }
    .nav {
        display: grid;
        grid-template-columns: calc(100% - 30px - 15px) 30px;
        height: 100%;
        align-items: center;
        -ms-user-select: none;
        -webkit-user-select: none;
        user-select: none;
        max-width: 1140px;
        margin: auto;
        gap: 15px;
        padding: 0 50px;
    }
    .nav.hasavailableapp {
        grid-template-columns: calc(100% - 80px - 30px - calc(15px * 2)) 80px 30px;
    }
    .logo-icon,
    .anime-release-icon {
        justify-self: start;
        width: 25px;
        height: 25px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        fill: var(--fg-color);
    }
    .anime-release-icon {
        width: 20px !important;
        height: 20px !important;
    }
    .input-search {
        display: flex;
        gap: 15px;
        height: 57px;
        border-radius: 6px;
        justify-self: start;
        align-items: center;
        max-width: min(185px, 100%);
        opacity: 1;
    }
    #usernameInput {
        outline: none;
        border: none;
        background-color: var(--bg-color) !important;
        color: var(--fg-color) !important;
        text-align: start;
        border-radius: 6px;
        height: 40px;
        max-width: 100%;
        min-width: 185px;
        width: 100%;
        cursor: auto;
        padding-bottom: 1px;
    }
    .nav.inputfocused #usernameInput {
        transform: translateZ(0) !important;
        -webkit-transform: translateZ(0) !important;
        -ms-transform: translateZ(0) !important;
        -moz-transform: translateZ(0) !important;
        -o-transform: translateZ(0) !important;
        position: unset !important;
        opacity: 1 !important;
    }
    #usernameInput {
        transform: translateY(-99999px) translateZ(0);
        -webkit-transform: translateY(-99999px) translateZ(0);
        -ms-transform: translateY(-99999px) translateZ(0);
        -moz-transform: translateY(-99999px) translateZ(0);
        -o-transform: translateY(-99999px) translateZ(0);
        position: fixed;
    }
    input[type="search"]::-webkit-search-cancel-button {
        opacity: 1;
        transition: opacity 0.1s ease-out;
        animation: fadeIn 0.1s ease-out;
    }
    .nav-container.layout-change input[type="search"]::-webkit-search-cancel-button {
        opacity: 0;
    }
    .goback path {
        stroke-width: 25px;
        stroke: black;
        mix-blend-mode: lighten;
    }
    .goback,
    .closing-x {
        display: none;
        height: 24px;
        width: 24px;
        align-items: center;
        color: var(--fg-color);
        cursor: pointer;
        animation: fadeIn 0.1s ease-out;
    }
    .nav.popupvisible .closing-x,
    .nav-container.menu-visible .closing-x {
        display: flex;
    }
    .nav.inputfocused .closing-x {
        display: none;
    }
    .nav.inputfocused .goback {
        display: flex;
    }
    .go-back-container {
        display: none;
        justify-content: center;
        opacity: 1;
        transition: opacity 0.1s ease-out;
    }
    .app-installer {
        width: 80px;
        height: 36px;
        font-size: 13px;
        background-color: var(--bg-color);
        color: var(--fg-color);
        white-space: nowrap;
        padding: 4px;
        border-radius: 30px;
        border: 1px solid var(--bd-color);
        cursor: pointer;
        animation: fadeIn 0.1s ease-out;
        display: block;
    }
    @media screen and (max-width: 425px) {
        .go-back-container {
            min-width: 48px;
            min-height: 48px;
            padding: 0 10px;
            justify-content: center;
            align-items: center;
            cursor: pointer;
        }
        .logo-icon-container,
        .anime-release-icon-container {
            min-width: 48px;
            min-height: 48px;
            padding: 0 10px;
            justify-content: center;
            align-items: center;
            cursor: pointer;
        }
    }
    .nav.inputfocused .usernameText {
        display: none !important;
    }
    #usernameInput {
        font-family: system-ui;
        font-size: 13.33px;
        font-weight: 400;
    }
    #usernameInput.android {
        font-size: 16.5px;
        font-weight: 500;
    }
    .usernameText {
        font-family: system-ui;
        font-size: 13.33px;
        font-weight: 400;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-transform: uppercase;
        cursor: pointer;
        padding-block: 19px;
        max-width: min(100%, 170px, calc(50vw - 48px));
        min-width: 30px;
    }
    #usernameInput[value=""] + .usernameText,
    #usernameInput:placeholder-shown + .usernameText {
        text-transform: none;
    }

    input[type="search"]::-webkit-textfield-decoration-container {
        gap: 1ch;
    }

    @supports (-webkit-appearance: none) and (appearance: none) {
        #usernameInput[type="search"]::-webkit-search-cancel-button {
            -webkit-appearance: none;
            appearance: none;
            height: 17px;
            width: 17px;
            background-image: var(--x-close-icon);
            background-size: 17px;
            translate: 0 1px;
        }
    }

    @media screen and (max-width: 750px) {
        .usernameText {
            animation: fadeIn 0.1s ease-out;
            font-size: 15px;
            font-weight: 1000;
        }
        .nav-container.layout-change .go-back-container {
            opacity: 0;
        }
        .nav-container.layout-change .input-search {
            opacity: 0;
        }
        .nav-container.delayed-full-screen-popup {
            position: fixed !important;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
            -ms-transform: translateZ(0);
            -moz-transform: translateZ(0);
            -o-transform: translateZ(0);
            z-index: 999 !important;
        }
        .nav-container {
            border-bottom: 1px solid var(--bd-color) !important;
        }
        .nav {
            grid-template-columns: calc(100% - 48px) 48px;
            padding: 0 !important;
            gap: 0 !important;
        }
        .nav.hasavailableapp {
            grid-template-columns: calc(100% - 80px - 48px - calc(12px * 2)) 80px 48px;
            padding: 0 !important;
            gap: 12px !important;
        }
        #usernameInput {
            opacity: 0;
            transition: opacity 0.1s ease-out;
            font-size: 15px;
            font-weight: 500;
            min-width: 0;
        }
        .input-search {
            transition: opacity 0.1s ease-out;
            justify-self: start !important;
            padding-left: 15px !important;
        }
        .logo-icon-container,
        .anime-release-icon-container {
            display: flex;
            justify-content: center;
        }
        .nav.inputfocused .app-installer,
        .nav.popupvisible .app-installer,
        .nav-container.menu-visible .app-installer {
            display: none !important;
        }
        .nav.inputfocused,
        .nav.popupvisible,
        .nav-container.menu-visible .nav {
            gap: 0 !important;
            grid-template-columns: 48px calc(100% - 96px) 48px;
        }
        .nav.popupvisible .input-search,
        .nav-container.menu-visible .nav .input-search {
            justify-self: center !important;
            padding-left: 0 !important;
        }
        .nav.inputfocused input[type="search"]::-webkit-textfield-decoration-container {
            gap: 15px;
        }
        .nav.inputfocused .input-search {
            max-width: none !important;
            width: 100% !important;
            padding-right: 10px !important;
        }
        .nav.popupvisible .usernameText,
        .nav-container.menu-visible .usernameText {
            display: flex;
            align-items: center;
            justify-content: start;
            height: 57px !important;
            padding-block: unset !important;
            max-width: min(100%, 165px) !important;
        }
        .nav.inputfocused #usernameInput {
            max-width: none !important;
            width: 100% !important;
            padding-left: 15px !important;
            opacity: 1 !important;
        }
        @supports (-webkit-appearance: none) and (appearance: none) {
            #usernameInput[type="search"]::-webkit-search-cancel-button {
                -webkit-appearance: none;
                appearance: none;
                height: 24px;
                width: 24px;
                background-image: var(--x-close-icon);
                background-size: 24px;
            }
        }
        .nav.popupvisible .go-back-container,
        .nav.inputfocused .go-back-container,
        .nav-container.menu-visible .go-back-container {
            display: flex;
        }
    }

    @media screen and (max-width: 275px) {
        .nav.inputfocused #usernameInput {
            padding-left: 0 !important;
            padding-right: 0 !important;
            min-width: 25px !important;
            opacity: 1 !important;
        }
        .nav.inputfocused .input-search {
            padding: 0 !important;
        }
    }

    @media screen and (max-width: 250px) {
        .app-installer {
            display: none !important;
        }
        .nav-container:not(.menu-visible) .nav:not(.nav.popupvisible):not(.inputfocused) {
            grid-template-columns: calc(100% - 48px) 48px;
            gap: 0 !important;
        }
    }

    @media screen and (max-width: 199px) {
        #usernameInput::-webkit-search-cancel-button {
            display: none !important;
        }
    }
    .disable-interaction {
        pointer-events: none !important;
        position: fixed !important;
        transform: translateY(-99999px) translateZ(0) !important;
        -webkit-transform: translateY(-99999px) translateZ(0) !important;
        -ms-transform: translateY(-99999px) translateZ(0) !important;
        -moz-transform: translateY(-99999px) translateZ(0) !important;
        -o-transform: translateY(-99999px) translateZ(0) !important;
        user-select: none !important;
        touch-action: none !important;
        -webkit-user-drag: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        height: 0 !important;
        width: 0 !important;
        max-width: 0 !important;
        max-height: 0 !important;
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        opacity: 0 !important;
    }
    .display-none {
        display: none !important;
    }
</style>
