<script>
    import { menuVisible } from "../../js/globalValues.js";
    import { onMount, onDestroy } from "svelte";
    let windowWidth;
    onMount(() => {
        windowWidth = window.innerWidth;
        window.addEventListener("resize", updateWindowHeight);
    });

    function updateWindowHeight() {
        windowWidth = window.innerWidth;
    }

    function handleMenuVisibility() {
        menuVisible.set(!$menuVisible);
    }

    onDestroy(() => {
        window.removeEventListener("resize", updateWindowHeight);
    });
</script>

<div
    class="nav-container"
    on:keydown={handleMenuVisibility}
    on:click={handleMenuVisibility}
>
    <nav class="nav">
        <h1 class="textLogo copy-value" data-copy-value="Kanshi.">Kanshi.</h1>
        <!-- <div id="fps">--</span> FPS</div> -->
        <div class="input-search">
            <input
                type="text"
                placeholder="{windowWidth > 415 ? 'Your ' : ''}Anilist Username"
            />
            <button>
                <i class="fa-solid fa-magnifying-glass" />
            </button>
        </div>
        <img class="menu-icon" src="./images/Kanshi-logo.png" alt="menubar" />
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
        column-gap: 1.5em;
        grid-template-columns: 87px auto 34px;
        height: 100%;
        align-items: center;
        -ms-user-select: none;
        -webkit-user-select: none;
        user-select: none;
        max-width: 1140px;
        margin: auto;
        padding: 0 50px;
    }
    .input-search {
        display: flex;
        height: 25px;
        border-radius: 6px;
        justify-content: right;
    }
    .input-search input {
        overflow: auto;
        outline: none;
        border: none;
        background-color: rgb(21, 31, 46);
        color: white;
        padding-left: 1ch;
        padding-right: 1ch;
        max-width: 142px;
        width: 100%;
    }
    .input-search button {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 30px;
        border: none;
        outline: none;
        background-color: rgb(21, 31, 46);
    }
    .input-search i {
        color: white;
    }
    .menu-icon {
        height: 34px;
        cursor: pointer;
    }
    @media screen and (orientation: portrait) {
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
