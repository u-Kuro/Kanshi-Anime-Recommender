<script>
</script>

<div
    id="warnAnimeContainer"
    class="swal2-container-custom swal2-center-custom swal2-backdrop-show-custom"
    style="display: none; overflow-y: auto;"
    style:display={"none"}
>
    <div
        id="warnAnimeModal"
        class="swal2-popup-custom swal2-modal-custom swal2-hide-custom darkMode"
        style="display: grid;"
    >
        <div class="swal2-html-container-custom" style="display: block;">
            Customize Content Caution
        </div>
        <div class="swal2-html-container-custom" style="display: block;">
            <div class="filter-container-custom">
                <input
                    type="text"
                    placeholder="Add Anime Caution (Yellow: Content, Red: !Content)"
                    class="flexdatalistWarnAnime"
                    data-search-in="info"
                    multiple="multiple"
                    data-min-length="1"
                    data-search-by-word="true"
                    data-max-shown-results="7"
                    name="filter"
                />
            </div>
        </div>
        <div class="swal2-actions-custom" style="display: flex;">
            <button
                id="cancelWarnAnime"
                type="button"
                class="darkMode swal2-deny-custom swal2-styled-custom swal2-default-outline-custom"
                style="display: inline-block; background-color: rgb(226, 125, 129);"
                >Later</button
            >
            <button
                id="submitWarnAnime"
                type="button"
                class="darkMode swal2-confirm-custom swal2-styled-custom swal2-default-outline-custom"
                style="display: inline-block; background-color: rgb(0, 0, 0);"
                >Submit</button
            >
        </div>
        <div class="swal2-timer-progress-bar-container-custom" />
    </div>
</div>

<div
    id="filterAlgoContainer"
    class="swal2-container-custom swal2-center-custom swal2-backdrop-show-custom"
    style="display: none; overflow-y: auto;"
    style:display={"none"}
>
    <div
        id="filterAlgoModal"
        class="darkMode swal2-popup-custom swal2-modal-custom"
        style="display: grid;"
    >
        <div class="swal2-html-container-custom" style="display: block;">
            Customize Recommendation Algorithm
        </div>
        <div class="swal2-html-container-custom" style="display: block;">
            <div class="filter-container-custom">
                <input
                    type="text"
                    placeholder="Edit Recs (Include: Content, Exclude: !Content, WScore>=N)"
                    class="flexdatalistFilterAlgo"
                    data-search-in="info"
                    multiple="multiple"
                    data-min-length="1"
                    data-search-by-word="true"
                    data-max-shown-results="7"
                    name="filter"
                />
            </div>
        </div>
        <div
            class="darkMode swal2-validation-message"
            id="filterAlgo-validation"
            style="display: none;"
        >
            <div
                id="UsernameValidation"
                style="display:flex; align-items:center; justify-content:center; "
            >
                <div>
                    <div
                        style="margin-right:0.5ch;"
                        class="dataStatusSpinner spinner darkMode"
                    />
                </div>
                <div>Checking Username...</div>
            </div>
        </div>
        <div class="swal2-actions-custom" style="display: flex;">
            <button
                id="cancelFilterAlgo"
                type="button"
                class="darkMode swal2-deny-custom swal2-styled-custom swal2-default-outline-custom"
                style="display: inline-block; background-color: rgb(226, 125, 129);"
                >Later</button
            >
            <button
                id="submitFilterAlgo"
                type="button"
                class="darkMode swal2-confirm-custom swal2-styled-custom swal2-default-outline-custom"
                style="display: inline-block; background-color: rgb(0, 0, 0);"
                >Submit</button
            >
        </div>
        <div class="swal2-timer-progress-bar-container-custom" />
    </div>
</div>

<style>
</style>
