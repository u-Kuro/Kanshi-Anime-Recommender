<script>
    import {
        username,
        dataStatus,
        menuVisible,
        initData,
        importantUpdate,
        confirmPromise,
        popupVisible,
        finalAnimeList,
        gridFullView,
        userRequestIsRunning,
    } from "../../js/globalValues.js";
    import {
        addClass,
        removeClass,
        removeLocalStorage,
        setLocalStorage,
    } from "../../js/others/helper.js";
    import { requestUserEntries } from "../../js/workerUtils.js";
    import { onMount, onDestroy } from "svelte";

    let writableSubscriptions = [];
    let typedUsername = "";
    let animeGridEl,
        popupContainer,
        navEl,
        inputUsernameEl,
        inputUsernameElFocused = false;

    onMount(() => {
        navEl = navEl || document?.getElementById("nav");
        inputUsernameEl =
            inputUsernameEl || document?.getElementById("usernameInput");
        animeGridEl = animeGridEl || document?.getElementById("anime-grid");
        popupContainer =
            popupContainer || document?.getElementById("popup-container");
        writableSubscriptions.push(
            username.subscribe((val) => {
                typedUsername = val || "";
            }),
        );
    });

    let awaitForInit;
    initData.subscribe((val) => {
        if (val === false) {
            awaitForInit?.resolve?.();
        }
    });
    async function updateUsername(event, isReconfirm = false) {
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
                    typedUsername = $username || "";
                    return $confirmPromise({
                        isAlert: true,
                        title: "Currently Offline",
                        text: "It seems that you're currently offline and unable to update.",
                    });
                }
                (async () => {
                    let usernameToShow = `<span style="color:#00cbf9;">${typedUsername}</span>`;
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
                                document.documentElement.style.overflow =
                                    "hidden";
                                document.documentElement.style.overflow = "";
                                window?.scrollTo?.({
                                    top: -9999,
                                    behavior: "smooth",
                                });
                                $finalAnimeList = null;
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
                                            newusername || "";
                                        importantUpdate.update((e) => !e);
                                    } else {
                                        typedUsername = $username || "";
                                    }
                                    return;
                                })
                                .catch((error) => {
                                    typedUsername = $username || "";
                                    $dataStatus = "Something went wrong";
                                    console.error(error);
                                    return;
                                })
                                .finally(() => {
                                    setLocalStorage(
                                        "username",
                                        $username,
                                    ).catch(() => {
                                        removeLocalStorage("username");
                                    });
                                });
                        } else {
                            typedUsername = $username || "";
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
                                document.documentElement.style.overflow =
                                    "hidden";
                                document.documentElement.style.overflow = "";
                                window?.scrollTo?.({
                                    top: -9999,
                                    behavior: "smooth",
                                });
                                $finalAnimeList = null;
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
                                            newusername || "";
                                    } else {
                                        typedUsername = $username || "";
                                    }
                                    importantUpdate.update((e) => !e);
                                    return;
                                })
                                .catch((error) => {
                                    typedUsername = $username || "";
                                    $dataStatus = "Something went wrong";
                                    console.error(error);
                                    return;
                                })
                                .finally(() => {
                                    setLocalStorage(
                                        "username",
                                        $username,
                                    ).catch(() => {
                                        removeLocalStorage("username");
                                    });
                                });
                        } else {
                            typedUsername = $username || "";
                            focusInputUsernameEl();
                        }
                    }
                })();
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
        if (
            !(
                classList.contains("nav") || classList.contains("nav-container")
            ) &&
            !(classList.contains("logo-icon") || element.closest(".logo-icon"))
        )
            return;
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
        //             "https://u-kuro.github.io/Kanshi.Anime-Recommendation"
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
                if ($gridFullView) {
                    animeGridEl.style.overflow = "hidden";
                    animeGridEl.style.overflow = "";
                    animeGridEl.scroll({ left: 0, behavior: "smooth" });
                } else {
                    window.showCustomFilter?.();
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

    function onfocusUsernameInput(event) {
        if (event.type === "focusin") {
            inputUsernameElFocused = true;
            addClass(navEl, "inputfocused");
        } else {
            setTimeout(() => {
                removeClass(navEl, "inputfocused");
                inputUsernameElFocused = false;
            }, 100);
        }
    }
</script>

<div
    class={"nav-container" + ($menuVisible ? " menu-visible" : "")}
    on:keydown={(e) => e.key === "Enter" && handleMenuVisibility(e)}
    on:click={handleMenuVisibility}
>
    <nav
        id="nav"
        class={"nav " +
            ($popupVisible || $menuVisible
                ? "popupvisible"
                : inputUsernameEl === document?.activeElement
                  ? "inputfocused"
                  : "")}
        bind:this={navEl}
    >
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="go-back-container" on:click={handleGoBack}>
            <!-- arrow left -->
            <svg
                class="goback"
                tabindex="0"
                viewBox="0 0 448 512"
                on:keydown={(e) => e.key === "Enter" && handleGoBack(e)}
                ><path
                    d="M9 233a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L109 288h307a32 32 0 1 0 0-64H109l106-105a32 32 0 0 0-46-46L9 233z"
                /></svg
            >
        </div>
        <div class="input-search">
            <label class="disable-interaction" for="usernameInput">
                Anilist Username
            </label>
            <input
                id="usernameInput"
                type="search"
                enterkeyhint="search"
                autocomplete="off"
                placeholder="Your Anilist Username"
                on:keydown={(e) => e.key === "Enter" && updateUsername(e)}
                on:focusin={onfocusUsernameInput}
                on:focusout={onfocusUsernameInput}
                bind:value={typedUsername}
                bind:this={inputUsernameEl}
            />
            <div
                class={"usernameText"}
                on:click={focusInputUsernameEl}
                on:keydown={(e) => e.key === "Enter" && focusInputUsernameEl(e)}
            >
                {typedUsername || "Your Anilist Username"}
            </div>
        </div>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div
            class="logo-icon-container"
            on:pointerdown={handleGoUp}
            on:pointerup={cancelGoUp}
            on:pointercancel={cancelGoUp}
        >
            <!-- Kanshi Logo -->
            <svg
                viewBox="0 0 500 500"
                class="logo-icon"
                aria-label="Kanshi Logo"
                tabindex="0"
                on:keydown={(e) => {
                    if (e.key === "Enter") {
                        e.stopPropagation();
                        $menuVisible = !$menuVisible;
                    } else if (e.key !== "Escape") {
                        e.stopPropagation();
                    }
                }}
            >
                <path
                    d="m144 7-2 2-1 1c-2 0-9 7-9 9l-2 2-1 1-1 2-3 5c-1 3-3 4-4 5l-1 3-1 1v1l-1 1-15 1-12 1c-11 1-12 1-18-4l-7-6-6-6-4-2s-2-1-2-3-3-2-3-2l-2-2-2-1-1-1-2-1-2-1-8-4c-3 0-7 5-6 6l-1 1v24a350 350 0 0 0 7 36c0 2-1 3-2 3v2l-1 1-3 7-1 2-3 9a61 61 0 0 0 4 30v2l2 3 3 7 1 1v1l1 2 1 1 1 1c0 1 0 2 2 3l2 4 2 2 2 2 6 7 5 7 1 1 1 1v3l4 10 1 14a75 75 0 0 0 2 19l1 4v2l2 3v2a205 205 0 0 0 15 29l1 1v1a128 128 0 0 1 11 22v1l1 1 1 1v3l1 2 2 5a480 480 0 0 1-2 93c0 1-4 6-6 6l-11 11-1 4c-2 3 0 7 8 14 1 1 2 2 1 3l1 3v1l1 2 1 2 3 3h3l1 1 4 1 2 1c0 1 16 2 19 1l2-1h2l7-5 1-1c2 0 11-10 12-13l1-2 1-1c-1-3 0-3 8-2l5 1 2 1-1 3-1 9 2 3 1 2 1 2 3 3 2 1 2 1 4 2 14 1a232 232 0 0 0 56-9l4-1 4-1h8l3 2h1l2 1a93 93 0 0 0 30-1l6-3 4-1 1-1 1-1h2l1-1 1-1 3-1 4-2h3l1-1h2l1-1h2l2-1h2l2-1h2l2-1 3-1h6c12-2 16-2 30-2a174 174 0 0 1 45 5l2 1h3l5 3 5 2 1 1 3 3 3 3 1 1 1 4c0 3-1 4-4 7l-4 3-1 1-8 4-5 2-8 2-5 2h-1l-2 1h-2l-3 1-1 1h-2l-3 1h-4l-10 2c-2 1-11 9-11 11-1 5 0 8 2 10l4 3 2 1 16 1 18-1 5-1 2-1h2l2-1h2l2-1h2l1-1h2l1-1 2-1h2l3-1 3-2h2l1-1 1-1c1 1 13-5 13-6h1l1-1 2-1 1-1h1l2-1 2-2 2-1 1-2c2 0 9-7 9-9l2-1 1-2v-1l1-1v-1l1-1v-1l1-2v-2c1-2 1-8-1-12v-1l-1-1-1-1c0-2-11-14-13-14l-2-2-2-2-2-1-5-3c-3-1-4-3-5-4l-3-1-1-1h-1l-1-1c0-1-4-3-5-2l-1-1h-1l-1-1-1-1-4-1-3-1-1-1h-1l-1-1h-2c-1 1-1 0-1-1h-2l-1-1-1-1h-2l-2-1h-2l-4-1-6-2-6-1-4-1-3-1-12-1a252 252 0 0 0-76 1v-2l1-3 1-5 1-2v-1l1-3 1-4 2-11 1-6c4-24 4-56 1-78l-1-5-1-3-1-7-1-2-1-3-1-5v-1l-1-1v-2l-1-1v-2l-1-2-1-3-1-2-1-3-1-1v-1l-1-1v-1l-1-1-2-4-3-5-1-1-1-2-1-1-1-2-1-1-1-3-2-1-9-11a68 68 0 0 0-15-12l-4-3-1-1-1-1-2-1-2-2-3-1-5-2-1-1h-1l-1-1-1-1-4-1-3-1-2-2h-3l-1-1h-2l-1-1h-2l-1-1h-2l-1-1-3-1h-3l-1-2-2-1-1-1-2-1h-1l-2-2-2-1-2-2c-1 0-10-9-10-11l-2-2-1-1-1-3a66 66 0 0 0-16-15l-1-1-2-1-1-1-3-1v-2l-1-1v-2l-1-1-1-2v-2l-2-3v-3l-1-1-1-1-4-9-2-2c-1-2-1-4 1-12a233 233 0 0 0 1-52v-2l-2-5c-2-3-3-3-6-3h-7z"
                />
            </svg>
        </div>
    </nav>
</div>

<style>
    ::placeholder {
        opacity: 1 !important;
        color: white !important;
    }

    :-ms-input-placeholder,
    ::-ms-input-placeholder {
        color: white !important;
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
        height: 48px;
        background-color: #0b1622;
        color: white;
    }
    .nav {
        display: grid;
        grid-template-columns: calc(100% - 3em - 1.5em) 3em;
        height: 100%;
        align-items: center;
        -ms-user-select: none;
        -webkit-user-select: none;
        user-select: none;
        max-width: 1140px;
        margin: auto;
        gap: 1.5em;
        padding: 0 50px;
    }
    .logo-icon {
        cursor: pointer;
        justify-self: start;
        width: 2.5em;
        height: 2.5em;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        fill: white;
    }
    .input-search {
        display: flex;
        gap: 1.5em;
        height: 49px;
        border-radius: 6px;
        justify-self: left;
        align-items: center;
        max-width: min(185px, 100%);
    }
    #usernameInput {
        font-family: system-ui !important;
        font-size: 1.33rem;
        font-weight: 400;
        outline: none;
        border: none;
        background-color: #0b1622 !important;
        color: white !important;
        text-align: start;
        padding-left: 1ch;
        padding-right: 1ch;
        border-radius: 6px;
        height: 2.625em;
        max-width: 100%;
        min-width: 185px;
        width: 100%;
        cursor: auto;
    }
    .nav.inputfocused #usernameInput {
        transform: translateZ(0) !important;
        -webkit-transform: translateZ(0) !important;
        -ms-transform: translateZ(0) !important;
        -moz-transform: translateZ(0) !important;
        -o-transform: translateZ(0) !important;
        position: unset !important;
    }
    #usernameInput {
        transform: translateY(-99999px) translateZ(0);
        -webkit-transform: translateY(-99999px) translateZ(0);
        -ms-transform: translateY(-99999px) translateZ(0);
        -moz-transform: translateY(-99999px) translateZ(0);
        -o-transform: translateY(-99999px) translateZ(0);
        position: fixed;
    }
    #usernameInput::-webkit-search-cancel-button {
        font-size: 1.5rem;
    }
    .goback {
        display: flex;
        height: 2em;
        width: 2em;
        align-items: center;
        justify-content: start;
        color: white;
        cursor: pointer;
    }
    .logo-icon-container {
        display: flex;
        justify-content: end;
    }
    .go-back-container {
        display: none;
        justify-content: start;
    }
    @media screen and (max-width: 425px) {
        .go-back-container {
            min-width: 5em;
            min-height: 49px;
            padding: 0 1em;
            justify-content: center;
            align-items: center;
            cursor: pointer;
        }
        .logo-icon-container {
            min-width: 5em;
            min-height: 49px;
            padding: 0 1em;
            justify-content: center;
            align-items: center;
            cursor: pointer;
        }
    }
    .usernameText {
        display: flex;
    }
    .nav.inputfocused .usernameText {
        display: none;
    }
    .usernameText {
        white-space: nowrap;
        font-family: system-ui !important;
        font-size: 1.333rem;
        font-weight: 400;
        overflow: hidden;
        text-overflow: ellipsis;
        text-transform: uppercase;
        cursor: pointer;
        align-items: center;
        justify-content: start;
        height: 49px;
        max-width: min(100%, 165px);
        min-width: 30px;
    }
    #usernameInput[value=""] + .usernameText,
    #usernameInput:placeholder-shown + .usernameText {
        text-transform: none;
    }
    @media screen and (max-width: 750px) {
        :global(#main.full-screen-popup) > .nav-container {
            position: fixed !important;
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
            -ms-transform: translateZ(0);
            -moz-transform: translateZ(0);
            -o-transform: translateZ(0);
            z-index: 999 !important;
        }
        .nav-container {
            border-bottom: 1px solid rgb(35 45 65) !important;
        }
        .nav {
            padding: 0 1em !important;
        }
        .nav.popupvisible {
            grid-template-columns: 3em calc(100% - 3em - 6em) 3em !important;
            gap: 1.5em !important;
        }
        .nav.popupvisible .input-search {
            justify-self: center !important;
        }
        .nav.popupvisible .go-back-container {
            display: flex !important;
        }
        .nav.inputfocused .input-search {
            max-width: none !important;
            width: 100% !important;
            padding-right: 0.5em !important;
        }
        .nav.inputfocused #usernameInput {
            max-width: none !important;
            width: 100% !important;
            padding-left: 1.5em !important;
        }
        .nav.inputfocused {
            grid-template-columns: 3em calc(100% - 3em - 6em) 3em !important;
            gap: 1.5em !important;
        }
        .nav.inputfocused .go-back-container {
            display: flex;
        }
    }
    @media screen and (max-width: 425px) {
        .nav {
            grid-template-columns: calc(100% - 5em - 1.5em) 5em;
            padding: 0 !important;
        }
        .nav.popupvisible .usernameText {
            padding-left: 0em !important;
        }
        .nav.popupvisible .usernameText {
            padding-left: 0em !important;
        }
        .usernameText {
            padding-left: 1em !important;
        }
        .nav.popupvisible {
            grid-template-columns: 5em calc(100% - 10em) 5em !important;
            gap: 0em !important;
        }
        .nav.inputfocused {
            grid-template-columns: 5em calc(100% - 10em) 5em !important;
            gap: 0em !important;
        }
        .nav.inputfocused .input-search {
            padding-right: 0.812em !important;
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
        cursor: not-allowed !important;
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
    }
    @media screen and (max-width: 275px) {
        .nav.inputfocused #usernameInput {
            padding-left: 0 !important;
            padding-right: 0 !important;
            min-width: 25px !important;
        }
    }
</style>
