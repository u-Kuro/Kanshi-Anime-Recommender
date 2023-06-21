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
            })
        );
    });

    async function updateUsername(event) {
        if ($initData) {
            await pleaseWaitAlert();
            document?.getElementById("usernameInput")?.focus?.();
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
                        } else {
                            document
                                ?.getElementById("usernameInput")
                                ?.focus?.();
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
                        } else {
                            document
                                ?.getElementById("usernameInput")
                                ?.focus?.();
                        }
                    }
                })();
            }
        }
    }

    function handleMenuVisibility(event) {
        let element = event.target;
        let classList = element.classList;
        if (!classList.contains("nav") && !classList.contains("logo-icon"))
            return;
        menuVisible.set(!$menuVisible);
    }

    function handleInputUsernameFocus() {
        let element = document?.getElementById("usernameInput");
        element?.focus?.();
        element?.blur?.();
    }

    onDestroy(() => {
        writableSubscriptions.forEach((unsub) => unsub());
    });

    async function pleaseWaitAlert() {
        return await $confirmPromise({
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
        <div class="input-search">
            <i
                class="goback fa-solid fa-arrow-left"
                on:click={handleInputUsernameFocus}
                on:keydown={(e) =>
                    e.key === "Enter" && handleInputUsernameFocus(e)}
            />
            <input
                id="usernameInput"
                type="search"
                enterkeyhint="search"
                autocomplete="off"
                placeholder="Your Anilist Username"
                on:keydown={(e) => e.key === "Enter" && updateUsername(e)}
                bind:value={typedUsername}
            />
        </div>
        <img
            class="logo-icon copy"
            copy-value="Kanshi."
            src="./images/Kanshi-Logo.png"
            alt="Kanshi Logo"
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
        z-index: 2;
        position: fixed;
        top: 0;
        width: 100%;
        height: 55px;
        background-color: #152232;
        color: white;
    }
    .nav {
        display: grid;
        grid-template-columns: auto 30px;
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
    }
    .input-search input::-webkit-search-cancel-button {
        font-size: 1.5rem;
    }
    .input-search input {
        font-family: system-ui !important;
        outline: none;
        border: none;
        background-color: #152232;
        text-align: start;
        color: white;
        padding-left: 1ch;
        padding-right: 1ch;
        border-radius: 6px;
        height: 35px;
        max-width: 200px;
        width: 100%;
        cursor: auto;
    }
    .goback {
        display: none;
        font-size: 25px;
        height: 25px;
        width: 25px;
        align-items: center;
        justify-content: center;
    }
    .input-search:not(:focus-within) input {
        padding-right: 0;
        padding-left: 0;
    }
    .input-search:not(:focus-within) input:not(:placeholder-shown) {
        text-transform: uppercase;
    }
    .input-search:focus-within input {
        background-color: rgb(35 45 65);
        text-align: start;
    }
    .input-search:not(:focus-within) input::-webkit-search-cancel-button {
        -webkit-appearance: none;
    }
    .input-search i {
        color: white;
        cursor: pointer;
    }
    @media screen and (max-width: 425px) {
        .input-search:focus-within {
            width: 100%;
        }
        .input-search:focus-within input {
            max-width: none;
            width: 100%;
        }
        .input-search:focus-within .goback {
            display: flex;
        }
        .nav {
            padding: 0 1.5em;
        }
    }
</style>
