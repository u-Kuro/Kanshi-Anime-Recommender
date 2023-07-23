<script>
    import { fly } from "svelte/transition";
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
            }, 500);
            confirmButtonEl?.focus?.();
        } else {
            if (isRecentlyOpenedTimeout) clearTimeout(isRecentlyOpenedTimeout);
            isRecentlyOpened = false;
        }
    });

    let isGoingBack,
        touchID,
        checkPointer,
        startX,
        endX,
        startY,
        endY,
        goBackPercent;

    function itemScroll() {
        isGoingBack = false;
        goBackPercent = 0;
    }

    function handlePopupContainerDown(event) {
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        touchID = event.touches[0].identifier;
        checkPointer = true;
    }
    function handlePopupContainerMove(event) {
        if (checkPointer) {
            checkPointer = false;
            endX = event.touches[0].clientX;
            endY = event.touches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
                isGoingBack = true;
            }
        } else if (isGoingBack) {
            endX = event.touches[0].clientX;
            const deltaX = endX - startX;
            if (deltaX > 0) {
                goBackPercent = Math.min((deltaX / 48) * 100, 100);
            } else {
                goBackPercent = 0;
            }
        }
    }
    function handlePopupContainerUp(event) {
        endX = Array.from(event.changedTouches).find(
            (touch) => touch.identifier === touchID
        ).clientX;
        let xThreshold = 48;
        let deltaX = endX - startX;
        if (isGoingBack && deltaX >= xThreshold) {
            touchID = null;
            isGoingBack = false;
            goBackPercent = 0;
            showConfirm = false;
            dispatch("cancelled");
        } else {
            touchID = null;
            isGoingBack = false;
            goBackPercent = 0;
        }
    }
    function handlePopupContainerCancel() {
        touchID = null;
        isGoingBack = false;
        goBackPercent = 0;
    }
</script>

{#if showConfirm}
    <div
        class="confirm"
        on:click={handleConfirmVisibility}
        on:keydown={(e) => e.key === "Enter" && handleConfirmVisibility(e)}
        on:touchstart={handlePopupContainerDown}
        on:touchmove={handlePopupContainerMove}
        on:touchend={handlePopupContainerUp}
        on:touchcancel={handlePopupContainerCancel}
        on:scroll={itemScroll}
    >
        <div
            class="confirm-wrapper"
            style:--height={$popupVisible ? "calc(100% + 1px)" : "100%"}
        >
            <div
                class="confirm-container"
                transition:fly={{ y: 20, duration: 300 }}
            >
                <div class="confirm-info-container">
                    <h2 class="confirm-title">{confirmTitle}</h2>
                    <h2 class="confirm-text" on:scroll={itemScroll}>
                        {confirmText}
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
{#if showConfirm && isGoingBack}
    <div
        class="go-back-grid-highlight"
        style:--scale={Math.max(1, (goBackPercent ?? 1) * 0.01 * 2)}
        style:--position={"-" + (100 - (goBackPercent ?? 0)) + "%"}
        out:fly={{ x: -176, duration: 1000 }}
    >
        <div
            class={"go-back-grid" + (goBackPercent >= 100 ? " willGoBack" : "")}
        >
            <i class="fa-solid fa-arrow-left" />
        </div>
    </div>
{/if}

<style>
    .confirm {
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.4);
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        user-select: none;
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
    }

    .confirm-wrapper::-webkit-scrollbar {
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

    .go-back-grid-highlight {
        position: fixed;
        display: flex;
        justify-content: center;
        align-items: center;
        top: 50%;
        left: 0;
        transform: translateY(-50%) translateX(var(--position));
        background-color: rgb(103, 187, 254, 0.5);
        width: calc(44px * var(--scale));
        height: calc(44px * var(--scale));
        border-radius: 50%;
        z-index: 9000;
    }

    .go-back-grid {
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        background-color: white;
        color: black;
        cursor: pointer;
        border-radius: 50%;
        max-width: 44px;
        max-height: 44px;
        min-width: 44px;
        min-height: 44px;
    }

    .go-back-grid.willGoBack {
        background-color: black;
        color: white;
    }

    .go-back-grid i {
        font-size: 2em;
    }
</style>
