<script>
    import { createEventDispatcher, afterUpdate } from "svelte";
    import { fade } from "svelte/transition";
    import { initData } from "../../js/globalValues.js";

    const dispatch = createEventDispatcher();

    export let showConfirm = false;
    export let isAlert = false;
    export let confirmTitle = "Confirmation";
    export let confirmText = "Do you want to continue?";
    export let confirmLabel = "OK";
    export let cancelLabel = "CANCEL";
    export let isImportant = false;
    let confirmButtonEl;

    $: shouldShowPleaseWait = $initData && !isAlert && !isImportant;

    let isRecentlyOpened = false,
        isRecentlyOpenedTimeout;

    function isPleaseWaitAlert() {
        return confirmTitle === "Initializing resources" && isAlert;
    }

    initData.subscribe((val) => {
        if (val === false && isPleaseWaitAlert()) {
            showConfirm = false;
            dispatch("cancelled");
        }
    });

    function handleConfirm(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        showConfirm = false;
        if (shouldShowPleaseWait) {
            dispatch("cancelled");
        } else {
            dispatch("confirmed");
        }
    }

    function handleCancel(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        showConfirm = false;
        dispatch("cancelled");
    }

    function handleConfirmVisibility(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        let target = e.target;
        let classList = target.classList;
        if (
            target.closest(".confirm-container") ||
            classList.contains("confirm-container")
        )
            return;
        showConfirm = false;
        dispatch("cancelled");
    }

    function keyDown(e) {
        if (e.key === "Tab") {
            e.preventDefault();
            e.stopPropagation();
            confirmButtonEl?.focus?.();
            window.removeEventListener("keydown", keyDown);
        }
    }

    afterUpdate(() => {
        if (showConfirm) {
            window.addEventListener("keydown", keyDown);
            isRecentlyOpened = true;
            isRecentlyOpenedTimeout = setTimeout(() => {
                isRecentlyOpened = false;
            }, 200);
        } else {
            window.removeEventListener("keydown", keyDown);
            if (isRecentlyOpenedTimeout) clearTimeout(isRecentlyOpenedTimeout);
            isRecentlyOpened = false;
        }
    });
</script>

{#if showConfirm}
    <div
        class="confirm"
        on:click={handleConfirmVisibility}
        on:touchend|passive={handleConfirmVisibility}
        on:keydown={(e) => e.key === "Enter" && handleConfirmVisibility(e)}
    >
        <div class="confirm-wrapper">
            <div class="confirm-container" out:fade={{ duration: 200 }}>
                <div class="confirm-info-container">
                    <h2 class="confirm-title">
                        {shouldShowPleaseWait
                            ? "Initializing resources"
                            : confirmTitle}
                    </h2>
                    <h2 class="confirm-text">
                        {@html shouldShowPleaseWait
                            ? "Please wait a moment..."
                            : confirmText}
                    </h2>
                </div>
                <div class="confirm-button-container">
                    {#if !isAlert && !shouldShowPleaseWait}
                        <button
                            class="button"
                            on:click={handleCancel}
                            on:keydown={(e) =>
                                e.key === "Enter" && handleCancel(e)}
                            >{cancelLabel}</button
                        >
                    {/if}
                    <button
                        class="button"
                        bind:this={confirmButtonEl}
                        on:click={handleConfirm}
                        on:keydown={(e) =>
                            e.key === "Enter" && handleConfirm(e)}
                        >{confirmLabel}</button
                    >
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .confirm {
        position: fixed;
        z-index: 1002;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: var(--ol-color);
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        user-select: none;
        -ms-overflow-style: none;
        scrollbar-width: none;
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        -moz-transform: translateZ(0);
        -o-transform: translateZ(0);
    }

    .confirm::-webkit-scrollbar {
        display: none;
    }

    .confirm-wrapper {
        width: 100%;
        height: 100%;
        justify-content: center;
        align-items: center;
        display: flex;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .confirm-wrapper::-webkit-scrollbar {
        display: none;
    }

    .confirm-container {
        animation: fadeIn 0.2s ease;
        display: grid;
        grid-template-rows: auto 20px;
        background-color: var(--bg-color);
        border: 1px solid var(--bd-color);
        width: 35em;
        min-height: 15.5em;
        max-width: 95%;
        max-height: 95%;
        border-radius: 6px;
        gap: 1.5em;
        padding: 2em 1em 2em 2.5em;
        cursor: default;
        overflow: auto;
    }

    .confirm-info-container {
        display: grid;
        grid-template-rows: auto auto;
        align-content: flex-start;
        padding-right: 1.5em;
        gap: 1.2em;
    }

    .confirm-title {
        align-self: center;
        font-size: 2rem;
        font-weight: 500;
        color: var(--fg-color);
    }

    .confirm-text {
        font-size: 1.6rem;
        height: fit-content;
        color: var(--fg-color);
        font-weight: 500;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .confirm-text::-webkit-scrollbar {
        display: none;
    }

    .confirm-button-container {
        justify-self: end;
        column-gap: 0.2em;
        align-items: center;
        display: flex;
        justify-content: center;
    }

    .button {
        color: var(--fg-color) !important;
        background-color: transparent;
        outline: none;
        border: none;
        font-size: 1.41rem;
        font-weight: 425;
        letter-spacing: 1px;
        padding: 0.75em 0.5em;
        min-width: 65px;
        cursor: pointer;
    }

    @media (pointer: fine) {
        .button:hover,
        .button:focus {
            background-color: var(--ol-color);
            border-radius: 6px;
        }
    }

    @media screen and (min-width: 768px) {
        .confirm-container {
            width: 40em;
            min-height: 16.4em;
            border-radius: 6px !important;
        }

        .confirm-title {
            font-size: 2rem;
        }

        .button {
            font-size: 1.2rem;
        }
    }
</style>
