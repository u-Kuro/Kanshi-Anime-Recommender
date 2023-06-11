<script>
    import { fly } from "svelte/transition";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let showConfirm = false;
    export let isAlert = false;
    export let confirmTitle = "Confirmation";
    export let confirmText = "Do you want to continue?";
    export let confirmLabel = "OK";
    export let cancelLabel = "CANCEL";

    function handleConfirm() {
        showConfirm = false;
        dispatch("confirmed");
    }

    function handleCancel() {
        showConfirm = false;
        dispatch("cancelled");
    }

    function handleConfirmVisibility(e) {
        let target = e.target;
        let classList = target.classList;
        if (
            target.closest(".confirm-container") ||
            classList.contains("confirm-container")
        )
            return;
        handleCancel();
    }
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
                <span class="confirm-title">{confirmTitle}</span>
                <span class="confirm-text">{confirmText}</span>
            </div>
            <div class="confirm-button-container">
                {#if !isAlert}
                    <button
                        on:click={handleCancel}
                        on:keydown={(e) => e.key === "Enter" && handleCancel(e)}
                        >{cancelLabel}</button
                    >
                {/if}
                <button
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
        overscroll-behavior: contain;
        user-select: none;
    }

    .confirm::-webkit-scrollbar {
        display: none;
    }

    .confirm-container {
        display: grid;
        grid-template-rows: auto 20px;
        background-color: #151f2e;
        width: 30em;
        height: 12.4em;
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
    }

    .confirm-button-container {
        justify-self: end;
        column-gap: 0.5em;
        align-items: center;
        display: flex;
        justify-content: end;
    }

    .confirm-button-container > button {
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

    .confirm-button-container > button:hover {
        background-color: rgba(0, 0, 0, 0.4);
    }

    @media screen and (min-width: 768px) {
        .confirm-container {
            width: 40em;
            height: 16.4em;
        }

        .confirm-title {
            font-size: 2rem;
        }

        .confirm-button-container > button {
            font-size: 1.2rem;
        }
    }
</style>
