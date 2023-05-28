<script>
	import C from "./components/index.js";
	import { onMount, onDestroy } from "svelte";
	import { IDBinit, retrieveJSON, saveJSON } from "./js/indexedDB.js";
	import {
		IndexedDB,
		animeEntries,
		lastAnimeUpdate,
		username,
		userEntries,
		lastUserAnimeUpdate,
		filterOptions,
		activeTagFilters,
		recommendedAnimeList,
	} from "./js/globalValues.js";
	import {
		getIDBInfo,
		getAnimeEntries,
		getUserEntries,
		getFilterOptions,
		requestAnimeEntries,
		requestUserEntries,
		processRecommendedAnimeList,
	} from "./js/workerUtils.js";
	import { jsonIsEmpty, fetchAniListData } from "./js/others/helper.js";

	onMount(async () => {
		// Init IndexedDB
		$IndexedDB = await IDBinit();

		// Init Data
		let initDataPromises = [];
		// Check/Get/Update/Process Anime Entries
		initDataPromises.push(
			new Promise(async (resolve, reject) => {
				let animeEntriesLen = await getIDBInfo("animeEntriesLength");
				// $animeEntries = await _retrieveJSON("savedAnimeEntries");
				let _lastAnimeUpdate = await _retrieveJSON("lastAnimeUpdate");
				if (_lastAnimeUpdate) $lastAnimeUpdate = await _lastAnimeUpdate;
				if (
					animeEntriesLen < 1 ||
					!($lastAnimeUpdate instanceof Date)
				) {
					getAnimeEntries()
						.then(async (data) => {
							$lastAnimeUpdate = data.lastAnimeUpdate;
							$animeEntries = await retrieveJSON(
								"savedAnimeEntries"
							);
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
				let _username = await _retrieveJSON("username");
				if (_username) $username = _username;
				let _userEntries = await _retrieveJSON("userEntries");
				if (_userEntries) $userEntries = _userEntries;
				let _lastUserAnimeUpdate = await _retrieveJSON(
					"lastUserAnimeUpdate"
				);
				if (_lastUserAnimeUpdate)
					$lastUserAnimeUpdate = _lastUserAnimeUpdate;
				if ($username) {
					if (
						jsonIsEmpty($userEntries) ||
						!($lastUserAnimeUpdate instanceof Date)
					) {
						getUserEntries()
							.then(async (data) => {
								$lastUserAnimeUpdate = data.lastUserAnimeUpdate;
								_userEntries = await retrieveJSON(
									"userEntries"
								);
								if (_userEntries) $userEntries = _userEntries;
								resolve();
							})
							.catch((error) => reject(error));
					} else {
						fetchAniListData(
							`{User(name: "${savedUsername}"){updatedAt}}`
						)
							.then((result) => {
								let userUpdate = $lastUserAnimeUpdate;
								let recentUserUpdate = new Date(
									result.data.User.updatedAt * 1000
								);
								if (
									!($lastUserAnimeUpdate instanceof Date) ||
									isNaN(userUpdate) ||
									(recentUserUpdate instanceof Date &&
										!isNaN(recentUserUpdate) &&
										$lastUserAnimeUpdate < recentUserUpdate)
								) {
									getUserEntries()
										.then(async (data) => {
											$lastUserAnimeUpdate =
												data.lastUserAnimeUpdate;
											_userEntries = await retrieveJSON(
												"userEntries"
											);
											if (_userEntries)
												$userEntries = _userEntries;
											resolve();
										})
										.catch((error) => reject(error));
								} else {
									resolve();
								}
							})
							.catch((error) => reject(error));
						// updateUserEntries
					}
				} else {
					resolve();
				}
			})
		);

		// Check/Get Filter Options Selection
		initDataPromises.push(
			new Promise(async (resolve, reject) => {
				let _filterOptions = await _retrieveJSON("filterOptions");
				if (_filterOptions) $filterOptions = _filterOptions;
				let _activeTagFilters = await _retrieveJSON("activeTagFilters");
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
						})
						.catch((error) => reject(error));
				} else {
					resolve();
				}
			})
		);

		// Data Processing
		Promise.all(initDataPromises).then(async () => {
			console.log("yay, data processed");
			// Check/Process Saved or get it manually?
			let _recommendedAnimeList = await _retrieveJSON(
				"recommendedAnimeList"
			);
			if (_recommendedAnimeList?.length > 0)
				$recommendedAnimeList = _recommendedAnimeList;
			// Parts
			// Need Name and AnimeEntries
			// 1. Have Recommendation, and all
			// 2. Have no Recommendation, have Userlist
			// Process the Recommendation
			// 3. Have no Recommendation, have no Userlist
			// Get UserList then Process AnimeEntries
			// Promised then pass global $recommendedAnimeList
			if (!$username && false) {
				// No Name?
				// Alert User
			} else {
				new Promise(async (resolve, reject) => {
					// Check and request Anime Entries
					let animeEntriesLen = await getIDBInfo(
						"animeEntriesLength"
					);
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
						// Check UserList
						if (!$userEntries?.length) {
							await requestUserEntries()
								.then(() => {
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
						// Process List
						// await processRecommendedAnimeList(
						// )
						// 	.then(() => {
						// 		return;
						// 	})
						// 	.catch((error) => {
						// 		throw error;
						// 	});
						return;
					})
					.then(() => {
						// Show List
					})
					.catch((error) => {
						console.error(error);
					});
			}
		});
	});

	let _retrieveJSON = async (name) => await retrieveJSON(name, $IndexedDB);
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
