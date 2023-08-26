<script>
    import { fade } from "svelte/transition";
    import { createEventDispatcher, afterUpdate } from "svelte";
    import { popupVisible } from "../../js/globalValues";

    const dispatch = createEventDispatcher();

    export let showConfirm = false;
    export let isAlert = false;
    export let confirmTitle = "Confirmation";
    export let confirmText = "Do you want to continue?";
    export let confirmLabel = "OK";
    export let cancelLabel = "CANCEL";
    let confirmButtonEl;

    let isRecentlyOpened = false,
        isRecentlyOpenedTimeout;
    function handleConfirm(e) {
        if (isRecentlyOpened && e.type !== "keydown") return;
        showConfirm = false;
        dispatch("confirmed");
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
        handleCancel(e);
    }

    afterUpdate(() => {
        if (showConfirm) {
            isRecentlyOpened = true;
            isRecentlyOpenedTimeout = setTimeout(() => {
                isRecentlyOpened = false;
            }, 200);
            confirmButtonEl?.focus?.();
        } else {
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
        <div
            class="confirm-wrapper"
            style:--height={$popupVisible ? "calc(100% + 1px)" : "100%"}
        >
            <div class="confirm-container" out:fade={{ duration: 200 }}>
                <div class="confirm-info-container">
                    <h2 class="confirm-title">{confirmTitle}</h2>
                    <h2 class="confirm-text">
                        {@html confirmText}
                    </h2>
                </div>
                <div class="confirm-button-container">
                    {#if !isAlert}
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
        background-color: rgba(0, 0, 0, 0.4);
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
        height: var(--height);
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
        background-color: #151f2e;
        width: 35em;
        min-height: 15em;
        max-width: 90%;
        max-height: 90%;
        border-radius: 6px;
        gap: 1.5em;
        padding: 1em 1em 1em 1.5em;
        cursor: default;
    }

    .confirm-info-container {
        display: grid;
        grid-template-rows: auto auto;
        gap: 1em;
    }

    .confirm-title {
        align-self: center;
        font-size: clamp(1.5697rem, 1.7rem, 1.791rem);
    }

    .confirm-text {
        font-size: clamp(1.3757rem, 1.48785rem, 1.6rem);
        overflow-y: auto;
        max-height: 75px;
        overflow-x: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .confirm-text::-webkit-scrollbar {
        display: none;
    }

    .confirm-button-container {
        justify-self: end;
        column-gap: 0.5em;
        align-items: center;
        display: flex;
        justify-content: center;
    }

    .button {
        background-color: transparent;
        outline: none;
        color: inherit;
        border: none;
        font-size: 1.1rem;
        letter-spacing: 2px;
        padding: 0.75em 0.5em;
        min-width: 65px;
        cursor: pointer;
    }

    @media (pointer: fine) {
        .button:hover,
        .button:focus {
            background-color: rgba(0, 0, 0, 0.4);
            border-radius: 6px;
        }
    }

    @media screen and (min-width: 768px) {
        .confirm-container {
            width: 40em;
            min-height: 16.4em;
        }

        .confirm-title {
            font-size: 2rem;
        }

        .button {
            font-size: 1.2rem;
        }
    }
</style>
