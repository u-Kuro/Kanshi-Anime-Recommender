<script>
    import { menuVisible } from "../../js/globalValues.js";
    import { onMount, onDestroy } from "svelte";
    let handleMenuVisibility;
    onMount(() => {
        handleMenuVisibility = (event) => {
            let element = event.target;
            let classList = element.classList;
            if (classList.contains("button")) return;
            menuVisible.set(!$menuVisible);
        };
    });
</script>

{#if $menuVisible}
    <div
        class="menu-container"
        on:click={handleMenuVisibility}
        on:keydown={handleMenuVisibility}
    >
        <div class="menu">
            <button class="button" id="updateBtn">Update</button>
            <button class="button" id="showAllAnime">Show All</button>
            <input
                class="darkMode"
                type="file"
                id="importFile"
                style="display: none;"
                accept=".json"
            />
            <button class="button" id="importBtn">Import</button>
            <button class="button" id="exportBtn">Export</button>
            <!-- <button class="button" id="warnAnimeBtn"
                >Choose Content to Warn</button
            > -->
            <!-- <button class="button" id="filterAlgoBtn"
                >Filter Algorithm Contents</button
            > -->
            <button class="button" id="themeBtn">Dark Mode</button>
            <!-- <button class="button" id="hideKidsAnimeBtn">Hide Kids Anime</button
            > -->
            <!-- <button class="button" id="hideUnwatchedSequelsBtn"
                >Hide Unwatched Sequels</button
            > -->
            <button class="button" id="updateIntervalBtn"
                >Update Every Hour</button
            >
            <button class="button" id="exportIntervalBtn"
                >Export Every Hour</button
            >
            <button class="button" id="sign-up">Create Another Account</button>
        </div>
    </div>
{/if}

<style>
    .menu-container {
        position: fixed;
        padding-top: 58px;
        top: 0;
        display: flex;
        width: 100%;
        height: 100%;
        background-color: rgb(0, 0, 0, 0.925);
        z-index: 1;
    }
    .menu {
        margin: 0 auto;
        padding: 1.5em 50px 0;
        width: 100vw;
        height: max-content;
        display: flex;
        flex-wrap: wrap;
        gap: 1.5em;
        max-width: 1140px;
    }
    .menu > .button {
        -moz-box-shadow: 0 3px 20px 0 #2b2d42;
        -webkit-box-shadow: 0 3px 20px 0 #2b2d42;
        box-shadow: 0 3px 20px 0 #2b2d42;
        font-size: clamp(1.2rem, 1.3rem, 1.4rem);
        border-radius: 2em;
        background-color: rgb(40 69 102);
        color: #b9cadd;
        padding: 0.8em 1.6em;
        height: fit-content;
        border: none;
    }
    @media screen and (orientation: portrait) {
        .menu {
            padding: 1.5em 1em 0;
        }
    }
    /* .menu > button.selected {
        background-color: #000 !important;
        color: #b9cadd !important;
    } */
    /* Light */
    /* .light {
        background-color: rgb(0, 0, 0, 0.925);
        color: #f0f0f0;
    }
    .light.selected {
        background-color: #f0f0f0 !important;
        color: #000 !important;
    } */
</style>
