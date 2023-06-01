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
		filterOptions,
		activeTagFilters,
		recommendedAnimeList,
		finalAnimeList,
		animeLoaderWorker,
		searchedAnimeKeyword,
		dataStatus,
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
	import { jsonIsEmpty } from "./js/others/helper.js";

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
							console.log(data.message);
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
				} else if ($filterOptions) {
					// Add Default Active Filters
					$activeTagFilters =
						$filterOptions.filterSelection.reduce(
							(r, { filterSelectionName }) => {
								r[filterSelectionName] = [];
								return r;
							},
							{}
						) || {};
					resolve();
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

		initDataPromises.push(
			new Promise(async (resolve) => {
				shouldProcessRecommendation = await retrieveJSON(
					"shouldProcessRecommendation"
				);
				if (!shouldProcessRecommendation) {
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
					if (!$username) {
						$dataStatus = "No Username Found";
						// No Name?
						// Alert User
					}
				})
				.catch((error) => {
					console.error(error);
				});
		});
	});

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
