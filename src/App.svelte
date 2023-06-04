<script>
	import C from "./components/index.js";
	import { onMount, onDestroy } from "svelte";
	import { IDBinit, retrieveJSON, saveJSON } from "./js/indexedDB.js";
	import {
		animeEntries,
		lastAnimeUpdate,
		username,
		userEntries,
		lastUserAnimeUpdate,
		hiddenEntries,
		filterOptions,
		activeTagFilters,
		recommendedAnimeList,
		finalAnimeList,
		animeLoaderWorker,
		searchedAnimeKeyword,
		dataStatus,
		autoPlay,
		popupVisible,
		menuVisible,
	} from "./js/globalValues.js";
	import {
		getAnimeEntries,
		getFilterOptions,
		getAnimeFranchises,
		requestAnimeEntries,
		requestUserEntries,
		processRecommendedAnimeList,
		animeLoader,
	} from "./js/workerUtils.js";
	import { isJsonObject, jsonIsEmpty } from "./js/others/helper.js";
	// For Youtube API
	const onYouTubeIframeAPIReady = new Function();

	onMount(async () => {
		// Init Data
		let initDataPromises = [];
		let shouldProcessRecommendation, shouldLoadAnime;
		// Check/Get/Update/Process Anime Entries
		$dataStatus = "Getting Existing Data";
		initDataPromises.push(
			new Promise(async (resolve, reject) => {
				let animeEntriesLen = await retrieveJSON("animeEntriesLength");
				let _lastAnimeUpdate = await retrieveJSON("lastAnimeUpdate");
				if (_lastAnimeUpdate) $lastAnimeUpdate = await _lastAnimeUpdate;
				if (
					animeEntriesLen < 1 ||
					!($lastAnimeUpdate instanceof Date)
				) {
					$finalAnimeList = null;
					getAnimeEntries()
						.then(async (data) => {
							$lastAnimeUpdate = data.lastAnimeUpdate;
							resolve();
						})
						.catch((error) => reject(error));
				} else {
					resolve();
				}
			})
		);

		// Check/Update/Process User Anime Entries
		initDataPromises.push(
			new Promise(async (resolve, reject) => {
				let _username = await retrieveJSON("username");
				if (_username) {
					$username = _username;
					requestUserEntries({ username: $username })
						.then(async (data) => {
							resolve();
						})
						.catch((error) => reject(error));
				} else {
					resolve();
				}
			})
		);

		// Check/Get Filter Options Selection
		initDataPromises.push(
			new Promise(async (resolve, reject) => {
				let _filterOptions = await retrieveJSON("filterOptions");
				if (_filterOptions) $filterOptions = _filterOptions;
				let _activeTagFilters = await retrieveJSON("activeTagFilters");
				if (_activeTagFilters) {
					$activeTagFilters = _activeTagFilters;
				} else if (!jsonIsEmpty($filterOptions)) {
					// Add Default Active Filters
					$activeTagFilters =
						$filterOptions.filterSelection.reduce(
							(r, { filterSelectionName }) => {
								r[filterSelectionName] = [];
								return r;
							},
							{}
						) || {};
				}
				if (jsonIsEmpty($filterOptions)) {
					await getFilterOptions()
						.then(async (data) => {
							$filterOptions = data.filterOptions;
							$activeTagFilters = data.activeTagFilters;
							resolve();
						})
						.catch((error) => reject(error));
				} else {
					resolve();
				}
			})
		);

		// Check/Get Anime Franchises
		initDataPromises.push(
			new Promise(async (resolve, reject) => {
				let animeFranchisesLen = await retrieveJSON(
					"animeFranchisesLength"
				);
				if (animeFranchisesLen < 1) {
					await getAnimeFranchises()
						.then(async (data) => {
							resolve();
						})
						.catch((error) => reject(error));
				} else {
					resolve();
				}
			})
		);

		// Get Existing Data If there are any
		initDataPromises.push(
			new Promise(async (resolve) => {
				// Auto Play
				let _autoPlay = await retrieveJSON("autoPlay");
				if (typeof _autoPlay === "boolean") $autoPlay = _autoPlay;
				// Hidden Entries
				$hiddenEntries = (await retrieveJSON("hiddenEntries")) || {};
				shouldProcessRecommendation = await retrieveJSON(
					"shouldProcessRecommendation"
				);
				if (shouldProcessRecommendation) {
					await animeLoader()
						.then(async (data) => {
							if (shouldLoadAnime)
								await saveJSON(false, "shouldLoadAnime");
							$animeLoaderWorker = data.animeLoaderWorker;
							$searchedAnimeKeyword = "";
							$finalAnimeList = data.finalAnimeList;
							return;
						})
						.catch((error) => {
							throw error;
						});
				}
				resolve();
			})
		);

		// Data Processing
		Promise.all(initDataPromises).then(async () => {
			new Promise(async (resolve, reject) => {
				// Check and request Anime Entries
				let animeEntriesLen = await retrieveJSON("animeEntriesLength");
				if (animeEntriesLen < 1) {
					await requestAnimeEntries()
						.then(() => {
							return;
						})
						.catch((error) => {
							reject(error);
						});
				} else {
					resolve();
				}
			})
				.then(async () => {
					// Process List
					let recommendedAnimeListLen = await retrieveJSON(
						"recommendedAnimeListLength"
					);
					let shouldProcessRecommendation = await retrieveJSON(
						"shouldProcessRecommendation"
					);
					if (
						recommendedAnimeListLen < 1 ||
						shouldProcessRecommendation
					) {
						$finalAnimeList = null;
						await processRecommendedAnimeList()
							.then(async () => {
								if (shouldProcessRecommendation)
									await saveJSON(
										false,
										"shouldProcessRecommendation"
									);
								return;
							})
							.catch((error) => {
								throw error;
							});
					} else {
						return;
					}
				})
				.then(async () => {
					// Create/Filter Processed List for Final List and Shown the List
					if (!$finalAnimeList?.length || shouldLoadAnime) {
						$finalAnimeList = null;
						await animeLoader()
							.then(async (data) => {
								if (shouldLoadAnime)
									await saveJSON(false, "shouldLoadAnime");
								$animeLoaderWorker = data.animeLoaderWorker;
								$searchedAnimeKeyword = "";
								$finalAnimeList = data.finalAnimeList;
								return;
							})
							.catch((error) => {
								throw error;
							});
					} else {
						return;
					}
				})
				.then(() => {
					console.log("why", !$username, $username);
					if (!$username) {
						$dataStatus = "No Anilist Username Found";
						let usernameInput =
							document.getElementById("usernameInput");
						usernameInput.setCustomValidity(
							"Enter your Anilist Username"
						);
						usernameInput.reportValidity();
					}
				})
				.catch((error) => {
					console.error(error);
				});
		});
	});

	let currentScrollTop;
	popupVisible.subscribe((val) => {
		documentScroll(val);
	});
	menuVisible.subscribe((val) => {
		documentScroll(val);
	});
	function documentScroll(val) {
		if (val === true) {
			currentScrollTop = document.documentElement.scrollTop;
			document.documentElement.classList.add("noscroll");
			document.body.classList.add("noscroll");
			document.body.style.top = -currentScrollTop + "px";
		} else if (val === false) {
			document.documentElement.classList.remove("noscroll");
			document.body.classList.remove("noscroll");
			document.body.style.top = "";
			document.documentElement.scrollTop = currentScrollTop;
		}
	}

	onDestroy(() => {});
</script>

<main>
	<C.Fixed.Navigator />
	<C.Fixed.Menu />

	<C.Others.Header />
	<div class="home">
		<C.Others.Search />
		<C.Anime.AnimeGrid />
		<C.Anime.Fixed.AnimePopup />
	</div>

	<C.Fixed.FilterPopup />
	<C.Anime.Fixed.AnimeOptionsPopup />

	<C.Fixed.Toast />
	<C.Fixed.Loader />
</main>

<style>
	main {
		height: 100%;
		width: 100%;
	}
	.home {
		height: 100%;
		width: 100%;
		margin: 58px auto 0;
		max-width: 1140px;
		padding-left: 50px;
		padding-right: 50px;
	}
	@media screen and (orientation: portrait) {
		.home {
			padding: 0 1em;
		}
	}
</style>
