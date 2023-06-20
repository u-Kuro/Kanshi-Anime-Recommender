<script>
    import {
        username,
        dataStatus,
        menuVisible,
        initData,
        updateRecommendationList,
        confirmPromise,
    } from "../../js/globalValues.js";
    import { requestUserEntries } from "../../js/workerUtils.js";
    import { onMount, onDestroy } from "svelte";

    let writableSubscriptions = [];
    let typedUsername;

    onMount(() => {
        writableSubscriptions.push(
            username.subscribe((val) => {
                typedUsername = val;
                searchButtonFocusOut();
            })
        );
    });

    async function updateUsername(event) {
        if ($initData) return pleaseWaitAlert();
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
                (async () => {
                    if ($username) {
                        if (
                            await $confirmPromise(
                                `Currently connected to ${$username}, do you want to change account?`
                            )
                        ) {
                            window?.scrollTo?.({
                                top: -9999,
                                behavior: "smooth",
                            });
                            $menuVisible = false;
                            $dataStatus = "Getting User Entries";
                            requestUserEntries({
                                username: typedUsername,
                            })
                                .then(({ newusername }) => {
                                    if (newusername) {
                                        typedUsername = $username = newusername;
                                        searchButtonFocusOut();
                                        updateRecommendationList.update(
                                            (e) => !e
                                        );
                                    }
                                })
                                .catch((error) => console.error(error));
                        }
                    } else {
                        if (
                            await $confirmPromise(
                                `Are you sure you want to connect to ${typedUsername}?`
                            )
                        ) {
                            window?.scrollTo?.({
                                top: -9999,
                                behavior: "smooth",
                            });
                            $menuVisible = false;
                            $dataStatus = "Getting User Entries";
                            await requestUserEntries({
                                username: typedUsername,
                            })
                                .then(({ newusername }) => {
                                    if (newusername)
                                        typedUsername = $username = newusername;
                                    searchButtonFocusOut();
                                    updateRecommendationList.update((e) => !e);
                                })
                                .catch((error) => console.error(error));
                        }
                    }
                })();
            }
        }
    }

    function handleMenuVisibility(event) {
        let element = event.target;
        let classList = element.classList;
        if (!classList.contains("menu-icon") && !classList.contains("nav"))
            return;
        menuVisible.set(!$menuVisible);
    }

    function searchButtonFocusIn() {
        let searchBtn = document.getElementById("searchBtn");
        if (searchBtn instanceof Element) {
            searchBtn.style.display = "flex";
        }
    }

    let searchButtonFocusOutTimeout;
    function searchButtonFocusOut() {
        typedUsername = typedUsername?.trim?.() || "";
        if (typedUsername === "") {
            typedUsername = "";
        }
        let searchBtn = document.getElementById("searchBtn");
        if (searchBtn instanceof Element) {
            if (searchButtonFocusOutTimeout)
                clearTimeout(searchButtonFocusOutTimeout);
            if (typedUsername === $username || typedUsername === "") {
                searchBtn.style.display = "none";
            }
        }
    }

    onDestroy(() => {
        writableSubscriptions.forEach((unsub) => unsub());
    });

    function pleaseWaitAlert() {
        $confirmPromise({
            isAlert: true,
            title: "Initializing Resources",
            text: "Please wait a moment...",
        });
    }
</script>

<div
    class="nav-container"
    on:keydown={(e) => e.key === "Enter" && handleMenuVisibility(e)}
    on:click={handleMenuVisibility}
>
    <nav class="nav">
        <div
            class="logo-icon copy"
            copy-value="Kanshi."
            on:click={() => window.scrollTo({ top: -9999, behavior: "smooth" })}
            on:keydown={(e) =>
                e.key === "Enter" &&
                window.scrollTo({ top: -9999, behavior: "smooth" })}
        >
            <!-- <img src="/images/Kanshi-Logo-Transparent.png" alt="Kanshi Logo" /> -->
            <img src="/images/Kanshi-Text-Logo.png" alt="Kanshi Logo" />
        </div>
        <!-- <div id="fps">--</span> FPS</div> -->
        <div class="input-search">
            <input
                id="usernameInput"
                type="text"
                enterkeyhint="search"
                autocomplete="off"
                placeholder="Your Anilist Username"
                style:--min-width={Math.min(typedUsername?.length || 17, 22) +
                    1 +
                    "ch"}
                on:keydown={(e) => e.key === "Enter" && updateUsername(e)}
                bind:value={typedUsername}
                on:focusin={searchButtonFocusIn}
                on:focusout={searchButtonFocusOut}
            />
            <div
                id="searchBtn"
                class="searchBtn"
                on:keydown={(e) => e.key === "Enter" && updateUsername(e)}
                on:click={updateUsername}
            >
                <i class="fa-solid fa-magnifying-glass" />
            </div>
        </div>
        <img
            class="menu-icon"
            src="/images/Kanshi-Logo.png"
            alt="Kanshi Logo"
        />
    </nav>
</div>

<style>
    ::placeholder {
        opacity: 1 !important;
        color: #8390a0 !important;
    }

    :-ms-input-placeholder,
    ::-ms-input-placeholder {
        color: #8390a0 !important;
    }
    .nav-container {
        z-index: 2;
        position: fixed;
        top: 0;
        width: 100%;
        height: 58px;
        background-color: #152232;
        color: #b9cadd;
    }
    .nav {
        display: grid;
        grid-template-columns: 75px auto 34px;
        height: 100%;
        align-items: center;
        -ms-user-select: none;
        -webkit-user-select: none;
        user-select: none;
        max-width: 1140px;
        margin: auto;
        padding: 0 50px;
    }
    .logo-icon {
        cursor: pointer;
        justify-self: start;
        width: 75px;
        max-width: 100%;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
    }
    .logo-icon img {
        height: 25px;
        width: 75px;
    }
    .input-search {
        display: flex;
        height: 34px;
        border-radius: 6px;
        justify-self: right;
        margin-left: 2em;
        margin-right: 2em;
    }
    .input-search input {
        outline: none;
        border: none;
        background-color: #152232;
        text-align: end;
        color: white;
        padding-left: 1ch;
        padding-right: 1ch;
        height: 34px;
        max-width: 160px;
        width: 100%;
        cursor: auto;
    }
    .input-search:not(:focus-within) input {
        max-width: var(--min-width) !important;
        padding-right: 0;
        padding-left: 0;
    }
    .input-search:not(:focus-within) {
        margin-right: 10px;
        margin-left: 10px;
    }
    .input-search:not(:focus-within) input:not(:placeholder-shown) {
        font-family: system-ui !important;
        text-transform: uppercase;
    }
    .input-search:focus-within input {
        background-color: rgb(21, 31, 46);
        text-align: start;
    }
    .input-search:not(:focus-within) .searchBtn {
        background-color: #152232;
    }
    .input-search .searchBtn {
        transition: opacity 0.3s ease;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 34px;
        height: 34px;
        border: none;
        outline: none;
        background-color: rgb(21, 31, 46);
    }
    .input-search i {
        color: white;
        font-size: 1em;
        transform: translateY(1px);
    }
    .input-search .searchBtn,
    .input-search i {
        cursor: pointer;
    }
    .menu-icon {
        font-size: 22px;
        height: 34px;
        width: 34px;
        border-radius: 6px;
        cursor: pointer;
        justify-self: end;
        color: #b9cadd;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    @media screen and (max-width: 588px) {
        .input-search input {
            max-width: none;
        }
    }
    @media screen and (max-width: 425px) {
        .nav {
            padding: 0 1em;
        }
    }
</style>
