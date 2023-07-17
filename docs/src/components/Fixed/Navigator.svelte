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
    } from "../../js/globalValues.js";
    import { addClass, removeClass } from "../../js/others/helper.js";
    import { requestUserEntries } from "../../js/workerUtils.js";
    import { onMount, onDestroy } from "svelte";

    let writableSubscriptions = [];
    let typedUsername = "";
    let windowScrollY = window.scrollY;
    let animeGrid,
        popupContainer,
        navEl,
        inputUsernameEl,
        inputUsernameElFocused = false;

    onMount(() => {
        navEl = navEl || document?.getElementById("nav");
        inputUsernameEl =
            inputUsernameEl || document?.getElementById("usernameInput");
        animeGrid = animeGrid || document?.getElementById("anime-grid");
        popupContainer =
            popupContainer || document?.getElementById("popup-container");
        writableSubscriptions.push(
            username.subscribe((val) => {
                typedUsername = val || "";
            })
        );
        document.addEventListener("scroll", () => {
            windowScrollY = window.scrollY;
        });
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
                                window.scrollY = window.scrollY;
                                window.scrollX = window.scrollX;
                                window?.scrollTo?.({
                                    top: -9999,
                                    behavior: "smooth",
                                });
                                $finalAnimeList = null;
                            }
                            $dataStatus = "Getting User Entries";
                            requestUserEntries({
                                username: typedUsername,
                            })
                                .then(({ newusername }) => {
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
                                window.scrollY = window.scrollY;
                                window.scrollX = window.scrollX;
                                window?.scrollTo?.({
                                    top: -9999,
                                    behavior: "smooth",
                                });
                                $finalAnimeList = null;
                            }
                            $dataStatus = "Getting User Entries";
                            await requestUserEntries({
                                username: typedUsername,
                            })
                                .then(({ newusername }) => {
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
                popupContainer.scrollTop = popupContainer.scrollTop;
                popupContainer.scrollLeft = popupContainer.scrollLeft;
                popupContainer?.children?.[0]?.scrollIntoView?.({
                    container: popupContainer,
                    behavior: "smooth",
                    block: "center",
                });
            } else {
                if ($gridFullView) {
                    animeGrid.scrollTop = animeGrid.scrollTop;
                    animeGrid.scrollLeft = animeGrid.scrollLeft;
                    animeGrid?.children?.[0]?.scrollIntoView?.({
                        container: animeGrid,
                        behavior: "smooth",
                        block: "center",
                    });
                } else {
                    window.scrollY = window.scrollY;
                    window.scrollX = window.scrollX;
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
        <i
            class={"goback fa-solid fa-arrow-left"}
            on:click={handleGoBack}
            on:keydown={(e) => e.key === "Enter" && handleGoBack(e)}
        />
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
                class={"usernameText " +
                    ($dataStatus &&
                    ($popupVisible ||
                        $menuVisible ||
                        windowScrollY > 40 ||
                        window.scrollY > 40)
                        ? "animate"
                        : "")}
                on:click={focusInputUsernameEl}
                on:keydown={(e) => e.key === "Enter" && focusInputUsernameEl(e)}
            >
                {typedUsername || "Your Anilist Username"}
            </div>
        </div>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <img
            class="logo-icon"
            src="./images/Kanshi-Logo.png"
            alt="Kanshi Logo"
            tabindex="0"
            on:pointerdown={handleGoUp}
            on:pointerup={cancelGoUp}
            on:pointercancel={cancelGoUp}
        />
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
        z-index: 999;
        position: fixed;
        top: 0;
        width: 100%;
        height: 55px;
        background-color: #152232;
        color: white;
    }
    .nav {
        display: grid;
        grid-template-columns: calc(100% - 30px - 1.5em) 30px;
        height: 100%;
        align-items: center;
        -ms-user-select: none;
        -webkit-user-select: none;
        user-select: none;
        max-width: 1140px;
        margin: auto;
        gap: 1.5em;
        padding: 0 50px;
        border-bottom: 1px solid rgb(35 45 65);
    }
    .logo-icon {
        cursor: pointer;
        justify-self: start;
        width: 30px;
        max-width: 100%;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
    }
    .input-search {
        display: flex;
        gap: 1.5em;
        height: 35px;
        border-radius: 6px;
        justify-self: left;
        align-items: center;
        max-width: 100%;
    }
    .input-search {
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
        height: 35px;
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
        display: none;
        font-size: 25px;
        height: 25px;
        width: 25px;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
    }
    .usernameText {
        display: flex;
    }
    .nav.inputfocused .usernameText {
        display: none;
    }
    .usernameText.animate {
        animation: fadeInOut 1s ease infinite;
    }
    @keyframes fadeInOut {
        from {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
        to {
            opacity: 1;
        }
    }
    .usernameText {
        white-space: nowrap;
        max-width: 165px;
        font-family: system-ui !important;
        font-size: 13.33px;
        font-weight: 400;
        overflow: hidden;
        text-overflow: ellipsis;
        text-transform: uppercase;
        cursor: pointer;
        align-items: center;
        justify-content: start;
        height: 30px;
        max-width: min(100%, 165px);
        min-width: 30px;
    }
    #usernameInput[value=""] + .usernameText,
    #usernameInput:placeholder-shown + .usernameText {
        text-transform: none;
    }
    @media screen and (max-width: 750px) {
        .nav.popupvisible {
            padding: 0 1.5em;
            max-width: 640px;
        }
        .nav.popupvisible {
            grid-template-columns: 30px calc(100% - 60px - 3em) 30px !important;
        }
        .nav.popupvisible .input-search {
            justify-self: center !important;
        }
        .nav.popupvisible .goback {
            display: flex !important;
        }
        .nav.inputfocused .input-search {
            max-width: none !important;
            width: 100% !important;
        }
        .nav.inputfocused #usernameInput {
            max-width: none !important;
            width: 100% !important;
        }
        .nav.inputfocused {
            grid-template-columns: 30px calc(100% - 60px - 3em) 30px !important;
        }
        .nav.inputfocused .goback {
            display: flex;
        }
    }
    @media screen and (max-width: 425px) {
        .nav {
            padding: 0 1.5em;
        }
    }
</style>
