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
		recommendedAnimeList,
	} from "./js/globalValues.js";
	import {
		getAnimeEntries,
		getUserEntries,
		getFilterOptions,
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
				$animeEntries = await _retrieveJSON("savedAnimeEntries");
				$lastAnimeUpdate = await _retrieveJSON("lastAnimeUpdate");
				if (
					jsonIsEmpty($animeEntries) ||
					!$lastAnimeUpdate instanceof Date
				) {
					getAnimeEntries(
						new Worker("./webapi/worker/getAnimeEntries.js")
					)
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
				$username = await _retrieveJSON("username");
				$userEntries = await _retrieveJSON("savedUserEntries");
				$lastUserAnimeUpdate = await _retrieveJSON(
					"lastUserAnimeUpdate"
				);
				if ($username) {
					if (
						jsonIsEmpty($userEntries) ||
						!$lastUserAnimeUpdate instanceof Date
					) {
						getUserEntries(
							new Worker("./webapi/worker/getUserEntries.js")
						)
							.then(async (data) => {
								$lastUserAnimeUpdate = data.lastUserAnimeUpdate;
								$userEntries = await retrieveJSON(
									"savedUserEntries"
								);
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
									!$lastUserAnimeUpdate instanceof Date ||
									isNaN(userUpdate) ||
									(recentUserUpdate instanceof Date &&
										!isNaN(recentUserUpdate) &&
										$lastUserAnimeUpdate < recentUserUpdate)
								) {
									getUserEntries(
										new Worker(
											"./webapi/worker/getUserEntries.js"
										)
									)
										.then(async (data) => {
											$lastUserAnimeUpdate =
												data.lastUserAnimeUpdate;
											$userEntries = await retrieveJSON(
												"savedUserEntries"
											);
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
				$filterOptions = await _retrieveJSON("filterOptions");
				if (jsonIsEmpty($filterOptions)) {
					await getFilterOptions(
						new Worker("./webapi/worker/getFilterOptions")
					)
						.then(async (data) => {
							$filterOptions = data.filterOptions;
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
			// Check/Process Saved
			$recommendedAnimeList = await _retrieveJSON("recommendedAnimeList");
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
