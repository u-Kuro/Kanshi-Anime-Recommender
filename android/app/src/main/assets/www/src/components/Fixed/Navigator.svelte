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
    import { addClass, removeClass } from "../../js/others/helper.js";
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
            })
        );
    });

    async function updateUsername(event) {
        if ($initData) {
            await pleaseWaitAlert();
            focusInputUsernameEl();
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
                    return $confirmPromise({
                        isAlert: true,
                        title: "Currently Offline",
                        text: "It seems that you're currently offline and unable to update.",
                    });
                }
                (async () => {
                    if ($username) {
                        if (
                            await $confirmPromise(
                                `Currently connected to ${$username}, do you want to change account?`
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
                            requestUserEntries({
                                username: typedUsername,
                            })
                                .then(({ newusername }) => {
                                    $userRequestIsRunning = false;
                                    if (newusername) {
                                        typedUsername = $username =
                                            newusername || "";
                                        importantUpdate.update((e) => !e);
                                    }
                                })
                                .catch((error) => {
                                    $dataStatus = "Something went wrong...";
                                    console.error(error);
                                });
                        } else {
                            focusInputUsernameEl();
                        }
                    } else {
                        if (
                            await $confirmPromise(
                                `Are you sure you want to connect to ${typedUsername}?`
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
                            await requestUserEntries({
                                username: typedUsername,
                            })
                                .then(({ newusername }) => {
                                    $userRequestIsRunning = false;
                                    if (newusername)
                                        typedUsername = $username =
                                            newusername || "";
                                    importantUpdate.update((e) => !e);
                                })
                                .catch((error) => {
                                    $dataStatus = "Something went wrong...";
                                    console.error(error);
                                });
                        } else {
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
        if (!classList.contains("nav") && !classList.contains("logo-icon"))
            return;
        if (inputUsernameElFocused && !classList.contains("logo-icon")) {
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
                popupContainer?.children?.[0]?.scrollIntoView?.({
                    container: popupContainer,
                    behavior: "smooth",
                    block: "start",
                    inline: "nearest",
                });
            } else {
                if ($gridFullView) {
                    animeGridEl.style.overflow = "hidden";
                    animeGridEl.style.overflow = "";
                    animeGridEl?.children?.[0]?.scrollIntoView?.({
                        container: animeGridEl,
                        behavior: "smooth",
                        block: "nearest",
                        inline: "start",
                    });
                } else {
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

    $: typedUsername,
        (() => {
            if (typedUsername) {
                inputUsernameEl?.setCustomValidity?.("");
            }
        })();

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
    class="nav-container"
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
            <i
                class={"goback fa-solid fa-arrow-left"}
                tabindex="0"
                on:keydown={(e) => e.key === "Enter" && handleGoBack(e)}
            />
        </div>
        <div class="input-search">
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
            <img
                class="logo-icon"
                src="./images/Kanshi-Logo.png"
                alt="Kanshi Logo"
                on:keydown={(e) => e.key === "Enter" && handleMenuVisibility(e)}
            />
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
    .nav-container {
        z-index: 995;
        position: fixed;
        top: 0;
        width: 100%;
        height: 55px;
        background-color: #152232;
        color: white;
        border-bottom: 1px solid rgb(35 45 65);
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
        min-width: 3em;
        min-height: 3em;
        max-width: 100%;
        height: 3em;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
    }
    .input-search {
        display: flex;
        gap: 1.5em;
        height: 56px;
        border-radius: 6px;
        justify-self: left;
        align-items: center;
        max-width: min(165px, 100%);
    }
    #usernameInput {
        font-family: system-ui !important;
        outline: none;
        border: none;
        background-color: rgb(35 45 65) !important;
        color: white !important;
        text-align: start;
        padding-left: 1ch;
        padding-right: 1ch;
        border-radius: 6px;
        height: 2.625em;
        max-width: 100%;
        width: 100%;
        cursor: auto;
    }
    .nav.inputfocused #usernameInput {
        transform: unset !important;
        position: unset !important;
    }
    #usernameInput {
        transform: translateY(-99999px);
        position: fixed;
    }
    #usernameInput::-webkit-search-cancel-button {
        font-size: 1.5rem;
    }
    .goback {
        display: flex;
        font-size: 25px;
        min-height: 25px;
        min-width: 25px;
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
            min-height: 56px;
            padding: 0 1em;
            justify-content: center;
            align-items: center;
            cursor: pointer;
        }
        .logo-icon-container {
            min-width: 5em;
            min-height: 56px;
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
        font-size: 13.33px;
        font-weight: 400;
        overflow: hidden;
        text-overflow: ellipsis;
        text-transform: uppercase;
        cursor: pointer;
        align-items: center;
        justify-content: start;
        height: 56px;
        max-width: min(100%, 165px);
        min-width: 30px;
    }
    #usernameInput[value=""] + .usernameText,
    #usernameInput:placeholder-shown + .usernameText {
        text-transform: none;
    }
    @media screen and (max-width: 750px) {
        .nav {
            padding: 0 1em !important;
        }
    }
    @media screen and (max-width: 750px) {
        .nav-container {
            z-index: 999 !important;
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
</style>
