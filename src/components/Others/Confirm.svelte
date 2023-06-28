<script>
    import { fly } from "svelte/transition";
    import { createEventDispatcher, afterUpdate } from "svelte";

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
            }, 500);
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
        on:keydown={(e) => e.key === "Enter" && handleConfirmVisibility(e)}
    >
        <div
            class="confirm-container"
            transition:fly={{ y: 20, duration: 300 }}
        >
            <div class="confirm-info-container">
                <h2 class="confirm-title">{confirmTitle}</h2>
                <h2 class="confirm-text">{confirmText}</h2>
            </div>
            <div class="confirm-button-container">
                {#if !isAlert}
                    <button
                        class="button"
                        on:click={handleCancel}
                        on:keydown={(e) => e.key === "Enter" && handleCancel(e)}
                        >{cancelLabel}</button
                    >
                {/if}
                <button
                    class="button"
                    bind:this={confirmButtonEl}
                    on:click={handleConfirm}
                    on:keydown={(e) => e.key === "Enter" && handleConfirm(e)}
                    >{confirmLabel}</button
                >
            </div>
        </div>
    </div>
{/if}

<style>
    .confirm {
        position: fixed;
        display: flex;
        z-index: 996;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.4);
        justify-content: center;
        align-items: center;
        overflow-y: scroll;
        overflow-x: hidden;
        overscroll-behavior: contain;
        user-select: none;
    }

    .confirm::-webkit-scrollbar {
        display: none;
    }

    .confirm::-webkit-scrollbar {
        display: none;
    }

    .confirm-container {
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
