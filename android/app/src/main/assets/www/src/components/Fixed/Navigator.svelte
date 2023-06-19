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
    let windowWidth;
    let typedUsername;

    onMount(() => {
        windowWidth = window.innerWidth;
        window.addEventListener("resize", updateWindowHeight);
        writableSubscriptions.push(
            username.subscribe((val) => {
                typedUsername = val;
            })
        );
    });

    function updateWindowHeight() {
        windowWidth = window.innerWidth;
    }

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

    onDestroy(() => {
        writableSubscriptions.forEach((unsub) => unsub());
        window.removeEventListener("resize", updateWindowHeight);
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
            <img src="/images/Kanshi-Logo.png" alt="Kanshi Logo" />
        </div>
        <!-- <div id="fps">--</span> FPS</div> -->
        <div class="input-search">
            <input
                id="usernameInput"
                type="search"
                enterkeyhint="search"
                autocomplete="off"
                placeholder="{windowWidth > 415 ? 'Your ' : ''}Anilist Username"
                on:keydown={(e) => e.key === "Enter" && updateUsername(e)}
                bind:value={typedUsername}
            />
            <div
                class="searchBtn"
                on:keydown={(e) => e.key === "Enter" && updateUsername(e)}
                on:click={updateUsername}
            >
                <i class="fa-solid fa-magnifying-glass" />
            </div>
        </div>
        <i class="menu-icon fa-solid fa-bars" />
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
        column-gap: 1em;
        grid-template-columns: minmax(34px, 1fr) auto 34px;
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
        width: 86px;
        max-width: 100%;
        height: 34px;
    }
    .logo-icon img {
        height: 34px;
        width: 34px;
        border-radius: 6px;
    }
    .input-search {
        display: flex;
        height: 25px;
        border-radius: 6px;
        justify-self: right;
    }
    .input-search input {
        outline: none;
        border: none;
        background-color: rgb(21, 31, 46);
        color: white;
        padding-left: 1ch;
        padding-right: 1ch;
        height: 25px;
        max-width: 160px;
        width: 100%;
        cursor: auto;
    }
    .input-search .searchBtn {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 30px;
        height: 25px;
        border: none;
        outline: none;
        background-color: rgb(21, 31, 46);
    }
    .input-search i {
        color: white;
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
    @media screen and (max-width: 425px) {
        .nav {
            padding: 0 1em;
        }
    }
    /* Light */
    /* .nav.light {
        background-color: rgb(43, 45, 66, 0.925);
        color: #f0f0f0;
    } */
</style>
