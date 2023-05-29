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
		getAnimeEntries,
		getUserEntries,
		getFilterOptions,
		getAnimeFranchises,
		requestAnimeEntries,
		requestUserEntries,
		processRecommendedAnimeList,
	} from "./js/workerUtils.js";
	import { jsonIsEmpty, fetchAniListData } from "./js/others/helper.js";

	onMount(async () => {
		// Init Data
		let initDataPromises = [];
		// Check/Get/Update/Process Anime Entries
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
							$animeEntries = await retrieveJSON("animeEntries");
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
				if (_username) $username = _username;
				let _userEntries = await retrieveJSON("userEntries");
				if (_userEntries) $userEntries = _userEntries;
				let _lastUserAnimeUpdate = await retrieveJSON(
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
							`{User(name: "${$username}"){updatedAt}}`
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

		// Data Processing
		Promise.all(initDataPromises).then(async () => {
			console.log("yay, data processed");
			// Check/Process Saved or get it manually?
			let _recommendedAnimeList = await retrieveJSON(
				"recommendedAnimeList"
			);
			if (!jsonIsEmpty(_recommendedAnimeList))
				$recommendedAnimeList = _recommendedAnimeList;
			console.log($recommendedAnimeList);
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
					let animeEntriesLen = await retrieveJSON(
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
						await processRecommendedAnimeList();
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
