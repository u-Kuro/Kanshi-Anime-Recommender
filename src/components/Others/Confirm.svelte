<script>
    import { createEventDispatcher, afterUpdate, tick } from "svelte";
    import { fade } from "svelte/transition";
    import { sineOut } from "svelte/easing";
    import { initData } from "../../js/globalValues.js";
    import { addClass, removeClass, requestImmediate } from "../../js/others/helper.js";

    const dispatch = createEventDispatcher();

    export let showConfirm = false;
    export let isAlert = false;
    export let confirmTitle = "Confirmation";
    export let confirmText = "Do you want to continue?";
    export let confirmLabel = "OK";
    export let cancelLabel = "CANCEL";
    export let isImportant = false;
    let confirmButtonEl;
    let shouldNotDispatch;

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
        if (shouldNotDispatch) return;
        if (isRecentlyOpened && e.type !== "keydown") return;
        showConfirm = false;
        if (shouldShowPleaseWait) {
            dispatch("cancelled");
        } else {
            dispatch("confirmed");
        }
    }

    function handleCancel(e) {
        if (shouldNotDispatch) return;
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

    let confirmInfoContainer;
    async function isScrollableConfirmContainer(node) {
        await tick();
        confirmInfoContainer = node || confirmInfoContainer;
        if (confirmInfoContainer instanceof Element) {
            if (
                confirmInfoContainer?.scrollHeight >
                confirmInfoContainer?.clientHeight
            ) {
                addClass(confirmInfoContainer, "scrollable");
            } else {
                removeClass(confirmInfoContainer, "scrollable");
            }
        } else {
            addClass(confirmInfoContainer, "scrollable");
        }
    }

    window.addEventListener("keydown", (e) => {
        if (shouldNotDispatch == null) {
            let element = e?.target;
            let classList = element?.classList;
            shouldNotDispatch =
                !classList?.contains?.("confirm-button-container") &&
                !element?.closest?.(".confirm-button-container");
        }
    });
    window.addEventListener("keyup", () => {
        shouldNotDispatch = null;
    });

    $: {
        shouldShowPleaseWait, confirmText, isScrollableConfirmContainer();
    }

    afterUpdate(() => {
        if (showConfirm) {
            window.setShouldGoBack?.(false);
            confirmButtonEl?.focus?.();
            isRecentlyOpened = true;
            isRecentlyOpenedTimeout = requestImmediate(() => {
                isRecentlyOpened = false;
            }, 200);
        } else {
            isRecentlyOpenedTimeout?.();
            isRecentlyOpened = false;
        }
    });
</script>

{#if showConfirm}
    <div
        class="confirm"
        on:click="{handleConfirmVisibility}"
        on:touchend|passive="{handleConfirmVisibility}"
        on:keydown="{(e) => e.key === 'Enter' && handleConfirmVisibility(e)}"
        in:fade="{{ duration: 200, easing: sineOut }}"
        out:fade="{{ duration: 200, easing: sineOut }}"
    >
        <div class="confirm-wrapper">
            <div class="confirm-container">
                <div class="confirm-title-wrapper">
                    <h2 class="confirm-title">
                        {shouldShowPleaseWait
                            ? "Initializing resources"
                            : confirmTitle}
                    </h2>
                </div>
                <div
                    class="confirm-info-container"
                    use:isScrollableConfirmContainer
                >
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
                            on:click="{handleCancel}"
                            on:keydown="{(e) =>
                                e.key === 'Enter' && handleCancel(e)}"
                            >{cancelLabel}</button
                        >
                    {/if}
                    <button
                        class="button"
                        bind:this="{confirmButtonEl}"
                        on:click="{handleConfirm}"
                        on:keydown="{(e) =>
                            e.key === 'Enter' && handleConfirm(e)}"
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

    :global(#main.maxwindowheight.popupvisible .confirm) {
        touch-action: none;
    }

    .confirm-wrapper {
        width: 100%;
        height: 100%;
        justify-content: center;
        align-items: center;
        display: flex;
    }

    .confirm-container {
        display: grid;
        grid-template-rows: 23px 1fr 20px;
        background-color: var(--bg-color);
        border: 1px solid var(--bd-color);
        width: 350px;
        min-height: 155px;
        max-width: 95%;
        max-height: 95%;
        border-radius: 6px;
        gap: 15px;
        padding: 20px 10px 20px 25px;
        cursor: default;
    }

    :global(#main.maxwindowheight.popupvisible .confirm-info-container:not(.scrollable)) {
        touch-action: none;
    }

    .confirm-info-container {
        display: grid;
        grid-template-rows: auto auto;
        align-content: flex-start;
        padding-right: 15px;
        gap: 12px;
        overflow-x: hidden;
        overflow-y: auto;
        -ms-overflow-style: none;
        scrollbar-width: none;
        overscroll-behavior: contain;
    }

    .confirm-info-container::-webkit-scrollbar {
        display: none;
    }

    .confirm-title-wrapper {
        height: 23px;
        width: calc(100% - 15px);
        overflow-x: auto;
        overflow-y: hidden;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    :global(#main.maxwindowheight.popupvisible .confirm-title-wrapper) {
        touch-action: pan-x;
        overscroll-behavior: contain;
    }

    .confirm-title-wrapper::-webkit-scrollbar {
        display: none;
    }

    .confirm-title {
        align-self: center;
        font-size: 20px;
        font-weight: 500;
        color: var(--fg-color);
        white-space: nowrap;
    }

    .confirm-text {
        font-size: 16px;
        height: fit-content;
        color: var(--fg-color);
        font-weight: 500;
    }

    .confirm-button-container {
        justify-self: end;
        column-gap: 2px;
        align-items: center;
        display: flex;
        justify-content: center;
    }

    .button {
        color: var(--fg-color) !important;
        background-color: transparent;
        outline: none;
        border: none;
        font-size: 12px;
        font-weight: 425;
        letter-spacing: 1px;
        padding: 9px 6px;
        min-width: 65px;
        cursor: pointer;
    }

    @media screen and (pointer: fine) {
        .button:hover,
        .button:focus {
            background-color: hsl(0, 0%, 6.4%);
            border-radius: 6px;
        }
    }

    @media screen and (min-width: 768px) {
        .confirm-container {
            width: 400px;
            min-height: 164px;
            border-radius: 6px !important;
        }

        .confirm-title {
            font-size: 20px;
        }

        .button {
            font-size: 12px;
        }
    }
</style>
