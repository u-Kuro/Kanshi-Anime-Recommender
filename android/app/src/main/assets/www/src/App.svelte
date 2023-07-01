<script>
	import C from "./components/index.js";
	import { onMount, tick } from "svelte";
	import { inject } from "@vercel/analytics";
	import { retrieveJSON, saveJSON } from "./js/indexedDB.js";
	import {
		appID,
		android,
		username,
		hiddenEntries,
		filterOptions,
		activeTagFilters,
		finalAnimeList,
		animeLoaderWorker,
		initData,
		searchedAnimeKeyword,
		dataStatus,
		autoUpdate,
		autoUpdateInterval,
		lastRunnedAutoUpdateDate,
		exportPathIsAvailable,
		autoExport,
		autoExportInterval,
		lastRunnedAutoExportDate,
		autoPlay,
		popupVisible,
		menuVisible,
		shouldGoBack,
		isScrolling,
		scrollingTimeout,
		// Reactive Functions
		runUpdate,
		runExport,
		updateRecommendationList,
		loadAnime,
		updateFilters,
		animeOptionVisible,
		runIsScrolling,
		confirmPromise,
	} from "./js/globalValues.js";
	import {
		getAnimeEntries,
		getFilterOptions,
		getAnimeFranchises,
		requestAnimeEntries,
		requestUserEntries,
		processRecommendedAnimeList,
		animeLoader,
		exportUserData,
	} from "./js/workerUtils.js";
	import { isAndroid } from "./js/others/helper.js";

	$android = isAndroid(); // Android/Browser Identifier

	// Get Export Folder for Android
	(async () => {
		$exportPathIsAvailable = await retrieveJSON("exportPathIsAvailable");
	})();

	inject(); // Vercel Analytics

	window.onload = () => {
		window.dataLayer = window.dataLayer || [];
		function gtag() {
			dataLayer.push(arguments);
		}
		gtag("js", new Date());
		gtag("config", "G-PPMY92TJCE");
	}; // Google Analytics

	// For Youtube API
	const onYouTubeIframeAPIReady = new Function();
	window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

	// Init Data
	let initDataPromises = [];
	$dataStatus = "Getting Existing Data";
	let pleaseWaitStatusInterval = setInterval(() => {
		if (!$dataStatus) {
			$dataStatus = "Please Wait...";
		}
	}, 300);

	// Check/Get/Update/Process Anime Entries
	initDataPromises.push(
		new Promise(async (resolve, reject) => {
			let animeEntriesLen = await retrieveJSON("animeEntriesLength");
			let _lastAnimeUpdate = await retrieveJSON("lastAnimeUpdate");
			if (animeEntriesLen < 1 || !(_lastAnimeUpdate instanceof Date)) {
				$finalAnimeList = null;
				getAnimeEntries()
					.then(() => {
						requestAnimeEntries();
						resolve();
					})
					.catch(async () => {
						reject();
					});
			} else {
				requestAnimeEntries();
				resolve();
			}
		})
	);

	// Check/Update/Process User Anime Entries
	initDataPromises.push(
		new Promise(async (resolve) => {
			let _username = await retrieveJSON("username");
			if (_username) {
				$username = _username;
				requestUserEntries({ username: $username });
			}
			resolve();
		})
	);

	// Check/Get Anime Franchises
	initDataPromises.push(
		new Promise(async (resolve) => {
			let animeFranchisesLen = await retrieveJSON(
				"animeFranchisesLength"
			);
			if (animeFranchisesLen < 1) {
				getAnimeFranchises()
					.then(() => {
						resolve();
					})
					.catch(() => {
						reject();
					});
			} else {
				resolve();
			}
		})
	);

	// Check/Get/Update Filter Options Selection
	initDataPromises.push(
		new Promise(async (resolve) => {
			getFilterOptions()
				.then((data) => {
					$activeTagFilters = data.activeTagFilters;
					$filterOptions = data.filterOptions;
					resolve();
				})
				.catch(() => {
					reject();
				});
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
			// Get Auto Functions
			$lastRunnedAutoUpdateDate = await retrieveJSON(
				"lastRunnedAutoUpdateDate"
			);
			$lastRunnedAutoExportDate = await retrieveJSON(
				"lastRunnedAutoExportDate"
			);
			resolve();
		})
	);

	Promise.all(initDataPromises)
		.then(async () => {
			// Get/Show List
			let recommendedAnimeListLen = await retrieveJSON(
				"recommendedAnimeListLength"
			);
			let shouldProcessRecommendation = await retrieveJSON(
				"shouldProcessRecommendation"
			);
			new Promise(async (resolve) => {
				if (
					recommendedAnimeListLen < 1 ||
					shouldProcessRecommendation
				) {
					processRecommendedAnimeList()
						.then(async () => {
							await saveJSON(
								false,
								"shouldProcessRecommendation"
							);
							resolve();
						})
						.catch((error) => {
							throw error;
						});
				} else {
					resolve();
				}
			}).then(() => {
				animeLoader()
					.then(async (data) => {
						$animeLoaderWorker = data.animeLoaderWorker;
						$searchedAnimeKeyword = "";
						if (data?.isNew) {
							$finalAnimeList = data.finalAnimeList;
							$hiddenEntries = data.hiddenEntries;
							$initData = false;
							// Should be After Getting the Dates for Reactive Change
							$autoUpdate =
								(await retrieveJSON("autoUpdate")) ?? false;
							$autoExport =
								(await retrieveJSON("autoExport")) ?? false;
						}
						$dataStatus = null;
						return;
					})
					.catch((error) => {
						throw error;
					});
			});
		})
		.catch(async (error) => {
			$initData = false;
			// Should be After Getting the Dates for Reactive Change
			$autoUpdate = (await retrieveJSON("autoUpdate")) ?? false;
			$autoExport = (await retrieveJSON("autoExport")) ?? false;
			$dataStatus = "Something went wrong...";
			console.error(error);
		});

	window.focusInUsernameInput = () => {
		let usernameInput = document.getElementById("usernameInput");
		usernameInput?.setCustomValidity?.("Enter your Anilist Username");
		usernameInput?.reportValidity?.();
	};
	initData.subscribe(async (val) => {
		if (val === false) {
			if (!$username) {
				await tick();
				if ($android) {
					try {
						JSBridge.requireUsernameFocus();
					} catch (e) {}
				} else {
					window.focusInUsernameInput?.();
				}
			}
			clearInterval(pleaseWaitStatusInterval);
		}
	});

	finalAnimeList.subscribe(async (val) => {
		if (!$initData) return;
		if (val?.length > 0 && $initData !== false) {
			$initData = false;
			// Should be After Getting the Dates for Reactive Change
			$autoUpdate = (await retrieveJSON("autoUpdate")) ?? false;
			$autoExport = (await retrieveJSON("autoExport")) ?? false;
		} // Have Loaded Recommendations
	});

	// Reactive Functions
	updateRecommendationList.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		await saveJSON(true, "shouldProcessRecommendation");
		processRecommendedAnimeList()
			.then(async () => {
				await saveJSON(false, "shouldProcessRecommendation");
				updateFilters.update((e) => !e);
				loadAnime.update((e) => !e);
			})
			.catch((error) => {
				loadAnime.update((e) => !e);
				throw error;
			});
	});

	loadAnime.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		animeLoader()
			.then(async (data) => {
				if ($popupVisible || $finalAnimeList?.length > 18) {
					if (
						await $confirmPromise({
							text: "List update is available do you want to refresh the list?",
						})
					) {
						$animeLoaderWorker = data.animeLoaderWorker;
						$searchedAnimeKeyword = "";
						if (data?.isNew) {
							$finalAnimeList = data.finalAnimeList;
							$hiddenEntries = data.hiddenEntries;
						}
					}
				} else {
					$animeLoaderWorker = data.animeLoaderWorker;
					$searchedAnimeKeyword = "";
					if (data?.isNew) {
						$finalAnimeList = data.finalAnimeList;
						$hiddenEntries = data.hiddenEntries;
					}
				}
				$dataStatus = null;
				return;
			})
			.catch((error) => {
				throw error;
			});
	});
	updateFilters.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		getFilterOptions();
	});
	let hourINMS = 60 * 60 * 1000;
	autoUpdate.subscribe(async (val) => {
		if (val === true) {
			saveJSON(true, "autoUpdate");
			// Check Run First
			let isPastDate = false;
			if ($lastRunnedAutoUpdateDate === null) isPastDate = true;
			else if (
				$lastRunnedAutoUpdateDate instanceof Date &&
				!isNaN($lastRunnedAutoUpdateDate)
			) {
				if (
					new Date().getTime() - $lastRunnedAutoUpdateDate.getTime() >
					hourINMS
				) {
					isPastDate = true;
				}
			}
			if (isPastDate) {
				runUpdate.update((e) => !e);
				if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
				$autoUpdateInterval = setInterval(() => {
					if ($autoUpdate) {
						runUpdate.update((e) => !e);
					}
				}, hourINMS);
			} else {
				let timeLeft =
					hourINMS -
						(new Date().getTime() -
							$lastRunnedAutoUpdateDate?.getTime()) || 0;
				setTimeout(() => {
					if ($autoUpdate === false) return;
					runUpdate.update((e) => !e);
					if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
					$autoUpdateInterval = setInterval(() => {
						if ($autoUpdate) {
							runUpdate.update((e) => !e);
						}
					}, hourINMS);
				}, timeLeft);
			}
		} else if (val === false) {
			if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
			saveJSON(false, "autoUpdate");
		}
	});
	let userRequestIsRunning = false; // Workaround for Visibility Change
	runUpdate.subscribe((val) => {
		if (typeof val !== "boolean" || $initData || !navigator.onLine) return;
		userRequestIsRunning = true;
		requestUserEntries()
			.then(() => {
				userRequestIsRunning = false;
				requestAnimeEntries();
			})
			.catch((error) => {
				userRequestIsRunning = false;
				$dataStatus = "Something went wrong...";
				console.error(error);
			});
	});
	autoExport.subscribe(async (val) => {
		if (val === true) {
			saveJSON(true, "autoExport");
			// Check Run First
			let isPastDate = false;
			if ($lastRunnedAutoExportDate === null) isPastDate = true;
			else if (
				$lastRunnedAutoExportDate instanceof Date &&
				!isNaN($lastRunnedAutoExportDate)
			) {
				if (
					new Date().getTime() - $lastRunnedAutoExportDate.getTime() >
					hourINMS
				) {
					isPastDate = true;
				}
			}
			if (isPastDate) {
				runExport.update((e) => !e);
				if ($autoExportInterval) clearInterval($autoExportInterval);
				$autoExportInterval = setInterval(() => {
					if ($autoExport) {
						runExport.update((e) => !e);
					}
				}, hourINMS);
			} else {
				let timeLeft =
					hourINMS -
						(new Date().getTime() -
							$lastRunnedAutoExportDate?.getTime()) || 0;
				setTimeout(() => {
					if ($autoExport === false) return;
					runExport.update((e) => !e);
					if ($autoExportInterval) clearInterval($autoExportInterval);
					$autoExportInterval = setInterval(() => {
						if ($autoExport) {
							runExport.update((e) => !e);
						}
					}, hourINMS);
				}, timeLeft);
			}
		} else if (val === false) {
			if ($autoExportInterval) clearInterval($autoExportInterval);
			saveJSON(false, "autoExport");
		}
	});
	runExport.subscribe((val) => {
		if (typeof val !== "boolean" || $initData) return;
		exportUserData().then(() => {
			$lastRunnedAutoExportDate = new Date();
			saveJSON($lastRunnedAutoExportDate, "lastRunnedAutoExportDate");
		});
	});
	runIsScrolling.subscribe((val) => {
		if (typeof val !== "boolean") return;
		if (!$isScrolling) $isScrolling = true;
		if ($scrollingTimeout) clearTimeout($scrollingTimeout);
		$scrollingTimeout = setTimeout(() => {
			$isScrolling = false;
		}, 1000);
	});

	// Global Function For Android/Browser
	document.addEventListener("visibilitychange", () => {
		if ($initData) return;
		if (document.visibilityState === "visible" && !userRequestIsRunning) {
			requestUserEntries();
		}
	});

	let _showConfirm = false;
	if ("scrollRestoration" in window.history) {
		window.history.scrollRestoration = "manual"; // Disable scrolling to top when navigating back
	}
	window.checkEntries = () => {
		if ($initData) return;
		if (!userRequestIsRunning) {
			requestUserEntries();
		}
	};
	window.addEventListener("popstate", () => {
		window.backPressed();
	});
	let usernameInputEl;
	window.backPressed = () => {
		if ($shouldGoBack && !$android) {
			window.history.go(-1); // Only in Browser
		} else {
			if (!$android) {
				window.history.pushState("visited", ""); // Push Popped State
			}
			if (_showConfirm) {
				handleConfirmationCancelled();
				_showConfirm = false;
				return;
			} else if (
				usernameInputEl &&
				usernameInputEl === document?.activeElement &&
				window.visualViewport.width <= 750
			) {
				usernameInputEl?.focus?.();
				usernameInputEl?.blur?.();
			} else if ($menuVisible) {
				$menuVisible = false;
				return;
			} else if ($popupVisible) {
				$popupVisible = false;
				return;
			} else if ($animeOptionVisible) {
				$animeOptionVisible = false;
				return;
			} else if (window.checkOpenDropdown?.()) {
				window.closeDropdown?.();
				return;
			} else if (window.scrollY > 200) {
				window.scrollY = window.scrollY;
				window.scrollX = window.scrollX;
				window.scrollTo({ top: -9999, behavior: "smooth" });
				window.setShouldGoBack(true);
				return;
			} else {
				window.scrollY = window.scrollY;
				window.scrollX = window.scrollX;
				window.scrollTo({ top: -9999, behavior: "smooth" });
				window.setShouldGoBack(true);
			}
		}
	};
	popupVisible.subscribe((val) => {
		if (val === true) window.setShouldGoBack(false);
	});
	menuVisible.subscribe((val) => {
		if (val === true) window.setShouldGoBack(false);
	});
	window.addEventListener("scroll", () => {
		if (window.scrollY !== 0) window.setShouldGoBack(false);
		runIsScrolling.update((e) => !e);
	});
	onMount(() => {
		usernameInputEl = document.getElementById("usernameInput");
		document
			.getElementById("popup-container")
			.addEventListener("scroll", () => {
				runIsScrolling.update((e) => !e);
			});
	});

	window.setShouldGoBack = (_shouldGoBack) => {
		if ($android) {
			try {
				JSBridge.setShouldGoBack(_shouldGoBack);
			} catch (e) {}
		} else {
			if (window.history.state !== "visited") {
				// Only Add 1 state
				window.history.pushState("visited", "");
			}
			$shouldGoBack = _shouldGoBack;
		}
	};

	window.copyToClipBoard = (text) => {
		if ($android) {
			try {
				JSBridge.copyToClipBoard(text);
			} catch (e) {}
		} else {
			navigator?.clipboard?.writeText?.(text);
		}
	};

	let copytimeoutId;
	let copyhold = false;
	document.addEventListener("pointerdown", (e) => {
		if (e.pointerType === "mouse") return;
		let target = e.target;
		let classList = target.classList;
		if (!classList.contains("copy")) target = target.closest(".copy");
		if (target) {
			// e.preventDefault();
			copyhold = true;
			if (copytimeoutId) clearTimeout(copytimeoutId);
			copytimeoutId = setTimeout(() => {
				let text = target.getAttribute("copy-value");
				if (text && !$isScrolling && copyhold) {
					target.style.pointerEvents = "none";
					setTimeout(() => {
						target.style.pointerEvents = "";
					}, 500);
					window.copyToClipBoard(text);
				}
			}, 500);
		}
	});
	document.addEventListener("pointerup", (e) => {
		if (e.pointerType === "mouse") return;
		let target = e.target;
		let classList = target.classList;
		if (!classList.contains("copy")) target = target.closest(".copy");
		if (target) {
			copyhold = false;
			if (copytimeoutId) clearTimeout(copytimeoutId);
		}
	});
	document.addEventListener("pointercancel", (e) => {
		if (e.pointerType === "mouse") return;
		let target = e.target;
		let classList = target.classList;
		if (!classList.contains("copy")) target = target.closest(".copy");
		if (target) {
			copyhold = false;
			if (copytimeoutId) clearTimeout(copytimeoutId);
		}
	});

	let _isAlert, _confirmTitle, _confirmText, _confirmLabel, _cancelLabel;
	let _confirmModalPromise;

	$confirmPromise = window.confirmPromise = async (confirmValues) => {
		return new Promise((resolve) => {
			_isAlert = confirmValues?.isAlert || false;
			_confirmTitle =
				confirmValues?.title ||
				(_isAlert ? "Heads Up" : "Confirmation");
			_confirmText =
				(typeof confirmValues === "string"
					? confirmValues
					: confirmValues?.text) ||
				"Are you sure you want to continue";
			_confirmLabel = confirmValues?.confirmLabel || "OK";
			_cancelLabel = confirmValues?.cancelLabel || "CANCEL";
			_showConfirm = true;
			_confirmModalPromise = { resolve };
		});
	};
	function handleConfirmationConfirmed() {
		_confirmModalPromise?.resolve?.(true);
		_confirmModalPromise =
			_isAlert =
			_confirmTitle =
			_confirmText =
			_confirmLabel =
			_cancelLabel =
				undefined;
		_showConfirm = false;
	}
	function handleConfirmationCancelled() {
		_confirmModalPromise?.resolve?.(false);
		_confirmModalPromise =
			_isAlert =
			_confirmTitle =
			_confirmText =
			_confirmLabel =
			_cancelLabel =
				undefined;
		_showConfirm = false;
	}

	window.updateAppAlert = async () => {
		if (
			await $confirmPromise?.({
				title: "New updates are available",
				text: "You may want to download the new version.",
				confirmLabel: "DOWNLOAD",
			})
		) {
			try {
				JSBridge.downloadUpdate();
			} catch (e) {
				window.open(
					"https://github.com/u-Kuro/Kanshi.Anime-Recommendation/raw/main/Kanshi.apk",
					"_blank"
				);
			}
		}
	};

	window.appIsUpToDate = () => {
		$confirmPromise?.({
			isAlert: true,
			text: "There are currently no updates available.",
		});
	};

	// Check App ID
	if ($android && navigator.onLine) {
		try {
			JSBridge.checkAppID($appID, false);
		} catch (e) {
			window.updateAppAlert?.();
		}
	}
</script>

<main>
	<C.Fixed.Navigator />
	<C.Fixed.Menu />

	<div class="home">
		<C.Others.Search>
			<C.Anime.AnimeGrid />
		</C.Others.Search>
		<C.Anime.Fixed.AnimePopup />
	</div>

	<C.Anime.Fixed.AnimeOptionsPopup />
	<C.Others.Confirm
		showConfirm={_showConfirm}
		on:confirmed={handleConfirmationConfirmed}
		on:cancelled={handleConfirmationCancelled}
		isAlert={_isAlert}
		confirmTitle={_confirmTitle}
		confirmText={_confirmText}
		confirmLabel={_confirmLabel}
		cancelLabel={_cancelLabel}
	/>
</main>

<style>
	main {
		height: 100%;
		width: 100%;
	}
	.home {
		height: 100%;
		width: 100%;
		margin: 55px auto 0;
		max-width: 1140px;
		padding-left: 50px;
		padding-right: 50px;
	}
	@media screen and (max-width: 425px) {
		.home {
			padding: 0 1.5em;
		}
	}
</style>
