<script>
	import getWebVersion from "./version";
	import C from "./components/index.js";
	import { onMount, tick } from "svelte";
	import { fade, fly } from "svelte/transition";
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
		gridFullView,
		searchedAnimeKeyword,
		dataStatus,
		userRequestIsRunning,
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
		listUpdateAvailable,
		// Reactive Functions
		runUpdate,
		runExport,
		importantLoad,
		importantUpdate,
		updateRecommendationList,
		loadAnime,
		updateFilters,
		animeOptionVisible,
		runIsScrolling,
		confirmPromise,
		hasWheel,
		numberOfNextLoadedGrid,
		progress,
		popupIsGoingBack,
		// anilistAccessToken,
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
	import { isAndroid, addClass, removeClass } from "./js/others/helper.js";

	let windowWidth = window.visualViewport.width;
	let usernameInputEl, animeGridEl;
	$android = isAndroid(); // Android/Browser Identifier

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

	new Promise(async (resolve) => {
		// Check App ID
		$appID = await getWebVersion();
		console.log();
		if ($android && navigator.onLine) {
			try {
				if ($appID) {
					JSBridge.checkAppID($appID, false);
				}
			} catch (e) {
				window.updateAppAlert?.();
			}
		}
		resolve();
	}).then(() => {
		// Get Export Folder for Android
		(async () =>
			($exportPathIsAvailable = await retrieveJSON(
				"exportPathIsAvailable"
			)))();
		// Check/Get/Update/Process Anime Entries
		initDataPromises.push(
			new Promise(async (resolve, reject) => {
				let _lastAnimeUpdate = await retrieveJSON("lastAnimeUpdate");
				let shouldGetAnimeEntries = !(
					_lastAnimeUpdate instanceof Date && !isNaN(_lastAnimeUpdate)
				);
				if (!shouldGetAnimeEntries) {
					let animeEntriesIsEmpty = await retrieveJSON(
						"animeEntriesIsEmpty"
					);
					if (animeEntriesIsEmpty) {
						shouldGetAnimeEntries = true;
					}
				}
				if (shouldGetAnimeEntries) {
					$finalAnimeList = null;
					getAnimeEntries()
						.then(() => {
							resolve();
						})
						.catch(async () => {
							reject();
						});
				} else {
					resolve();
				}
			})
		);

		// Check/Update/Process User Anime Entries
		initDataPromises.push(
			new Promise(async (resolve) => {
				// let accessToken = getAnilistAccessTokenFromURL();
				// if (accessToken) {
				// 	await saveIDBdata(accessToken, "access_token");
				// 	$anilistAccessToken = accessToken;
				// } else {
				// 	$anilistAccessToken = await retrieveJSON("access_token");
				// }
				// if ($anilistAccessToken) {
				// 	let getUsername = () => {
				// 		fetch("https://graphql.anilist.co", {
				// 			method: "POST",
				// 			headers: {
				// 				Authorization: "Bearer " + $anilistAccessToken,
				// 				"Content-Type": "application/json",
				// 				Accept: "application/json",
				// 			},
				// 			body: JSON.stringify({
				// 				query: `{Viewer{name}}`,
				// 			}),
				// 		})
				// 			.then(async (response) => {
				// 				return await response.json();
				// 			})
				// 			.then(async (result) => {
				// 				if (
				// 					typeof result?.errors?.[0]?.message === "string"
				// 				) {
				// 					setTimeout(() => {
				// 						return getUsername();
				// 					}, 60000);
				// 				} else {
				// 					let savedUsername = await retrieveJSON(
				// 						"username"
				// 					);
				// 					let _username = result.data.Viewer.name;
				// 					if (_username && savedUsername !== _username) {
				// 						requestUserEntries({
				// 							username: _username,
				// 						})
				// 							.then(({ newusername }) => {
				// 								if (newusername) {
				// 									$username = newusername || "";
				// 									importantUpdate.update(
				// 										(e) => !e
				// 									);
				// 								}
				// 							})
				// 							.catch((error) => {
				// 								$dataStatus =
				// 									"Something went wrong...";
				// 								console.error(error);
				// 							});
				// 					} else {
				// 						$username =
				// 							_username || savedUsername || "";
				// 					}
				// 					resolve();
				// 				}
				// 			})
				// 			.catch(() => {
				// 				setTimeout(() => {
				// 					return getUsername();
				// 				}, 60000);
				// 				resolve();
				// 			});
				// 	};
				// 	getUsername();
				// } else {
				let _username = await retrieveJSON("username");
				if (_username) $username = _username;
				resolve();
				// }
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
				let _gridFullView =
					(await retrieveJSON("gridFullView")) ?? true;
				if (typeof _gridFullView === "boolean")
					$gridFullView = _gridFullView;
				// Hidden Entries
				$hiddenEntries = (await retrieveJSON("hiddenEntries")) || {};
				// Get Auto Functions
				$lastRunnedAutoUpdateDate = await retrieveJSON(
					"lastRunnedAutoUpdateDate"
				);
				$lastRunnedAutoExportDate = await retrieveJSON(
					"lastRunnedAutoExportDate"
				);
				$autoUpdate = (await retrieveJSON("autoUpdate")) ?? false;
				$autoExport = (await retrieveJSON("autoExport")) ?? false;
				resolve();
			})
		);

		Promise.all(initDataPromises)
			.then(async () => {
				// Get/Show List
				let shouldProcessRecommendation = await retrieveJSON(
					"shouldProcessRecommendation"
				);
				if (!shouldProcessRecommendation) {
					let recommendedAnimeListLen = await retrieveJSON(
						"recommendedAnimeListLength"
					);
					if (recommendedAnimeListLen < 1) {
						shouldProcessRecommendation = true;
					}
				}
				new Promise(async (resolve) => {
					if (shouldProcessRecommendation) {
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
								$numberOfNextLoadedGrid =
									data.numberOfNextLoadedGrid;
								$dataStatus = null;
								checkAutoFunctions(true);
								$initData = false;
							}
							return;
						})
						.catch((error) => {
							throw error;
						});
				});
			})
			.catch(async (error) => {
				checkAutoFunctions(true);
				$initData = false;
				$dataStatus = "Something went wrong...";
				if ($android) {
					$confirmPromise?.({
						isAlert: true,
						title: "Something Went Wrong",
						text: "App may not be working properly, you may want to restart and make sure you're running the latest version.",
					});
				} else {
					$confirmPromise?.({
						isAlert: true,
						title: "Something Went Wrong",
						text: "App may not be working properly, you may want to refresh the page, or if not clear the cookies but backup your data first.",
					});
				}
				console.error(error);
			});
	});

	// function getAnilistAccessTokenFromURL() {
	// 	let urlParams = new URLSearchParams(window.location.hash.slice(1));
	// 	return urlParams.get("access_token");
	// }

	function checkAutoFunctions(initCheck = false) {
		// auto Update
		if (initCheck) {
			requestUserEntries()
				.then(() => {
					$userRequestIsRunning = false;
					requestAnimeEntries().finally(() => {
						checkAutoExportOnLoad();
					});
				})
				.catch((error) => {
					checkAutoExportOnLoad();
					$userRequestIsRunning = false;
					$dataStatus = "Something went wrong...";
					console.error(error);
				});
		} else {
			if (autoUpdateIsPastDate() && $autoUpdate) {
				requestUserEntries()
					.then(() => {
						$userRequestIsRunning = false;
						requestAnimeEntries().finally(() => {
							checkAutoExportOnLoad();
						});
					})
					.catch((error) => {
						checkAutoExportOnLoad();
						$userRequestIsRunning = false;
						$dataStatus = "Something went wrong...";
						console.error(error);
					});
			} else {
				checkAutoExportOnLoad();
			}
		}
	}
	function checkAutoExportOnLoad() {
		if ($autoExport) {
			if (autoExportIsPastDate()) {
				exportUserData();
			}
		}
	}

	initData.subscribe(async (val) => {
		if (val === false) {
			clearInterval(pleaseWaitStatusInterval);
		}
	});

	finalAnimeList.subscribe(async (val) => {
		if (!$initData) return;
		if (val?.length > 0 && $initData !== false) {
			$initData = false;
		} // Have Loaded Recommendations
	});

	// Reactive Functions
	importantLoad.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		$listUpdateAvailable = false;
		if ($animeLoaderWorker) {
			$animeLoaderWorker.terminate();
			$animeLoaderWorker = null;
		}
		animeLoader()
			.then(async (data) => {
				$animeLoaderWorker = data.animeLoaderWorker;
				$searchedAnimeKeyword = "";
				if (data?.isNew) {
					$finalAnimeList = data.finalAnimeList;
					$hiddenEntries = data.hiddenEntries;
					$numberOfNextLoadedGrid = data.numberOfNextLoadedGrid;
				}
				$dataStatus = null;
				return;
			})
			.catch((error) => {
				throw error;
			});
	});
	importantUpdate.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		await saveJSON(true, "shouldProcessRecommendation");
		$listUpdateAvailable = false;
		processRecommendedAnimeList()
			.then(async () => {
				await saveJSON(false, "shouldProcessRecommendation");
				updateFilters.update((e) => !e);
				importantLoad.update((e) => !e);
			})
			.catch((error) => {
				importantLoad.update((e) => !e);
				throw error;
			});
	});
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
		if (
			($popupVisible ||
				($gridFullView
					? animeGridEl.scrollLeft > 500
					: window.scrollY >
					  Math.max(0, animeGridEl?.offsetTop - 55))) &&
			$finalAnimeList?.length
		) {
			$listUpdateAvailable = true;
		} else {
			if ($animeLoaderWorker) {
				$animeLoaderWorker.terminate();
				$animeLoaderWorker = null;
			}
			animeLoader()
				.then(async (data) => {
					$animeLoaderWorker = data.animeLoaderWorker;
					$searchedAnimeKeyword = "";
					if (data?.isNew) {
						$finalAnimeList = data.finalAnimeList;
						$hiddenEntries = data.hiddenEntries;
						$numberOfNextLoadedGrid = data.numberOfNextLoadedGrid;
					}
					$dataStatus = null;
					return;
				})
				.catch((error) => {
					throw error;
				});
		}
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
			if (autoUpdateIsPastDate()) {
				checkAutoFunctions();
				if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
				$autoUpdateInterval = setInterval(() => {
					if ($autoUpdate) {
						checkAutoFunctions();
					}
				}, hourINMS);
			} else {
				let timeLeft =
					hourINMS -
						(new Date().getTime() -
							$lastRunnedAutoUpdateDate?.getTime()) || 0;
				setTimeout(() => {
					if ($autoUpdate === false) return;
					checkAutoFunctions();
					if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
					$autoUpdateInterval = setInterval(() => {
						if ($autoUpdate) {
							checkAutoFunctions();
						}
					}, hourINMS);
				}, timeLeft);
			}
		} else if (val === false) {
			if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
			saveJSON(false, "autoUpdate");
		}
	});
	function autoUpdateIsPastDate() {
		let isPastDate = false;
		if (!$lastRunnedAutoUpdateDate) isPastDate = true;
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
		return isPastDate;
	}
	runUpdate.subscribe((val) => {
		if (typeof val !== "boolean" || $initData || !navigator.onLine) return;
		$userRequestIsRunning = true;
		requestUserEntries()
			.then(() => {
				$userRequestIsRunning = false;
				requestAnimeEntries();
			})
			.catch((error) => {
				$userRequestIsRunning = false;
				$dataStatus = "Something went wrong...";
				console.error(error);
			});
	});
	autoExport.subscribe(async (val) => {
		if (val === true) {
			saveJSON(true, "autoExport");
			if (autoExportIsPastDate()) {
				checkAutoFunctions();
				if ($autoExportInterval) clearInterval($autoExportInterval);
				$autoExportInterval = setInterval(() => {
					if ($autoExport) {
						checkAutoFunctions();
					}
				}, hourINMS);
			} else {
				let timeLeft =
					hourINMS -
						(new Date().getTime() -
							$lastRunnedAutoExportDate?.getTime()) || 0;
				setTimeout(() => {
					if ($autoExport === false) return;
					checkAutoFunctions();
					if ($autoExportInterval) clearInterval($autoExportInterval);
					$autoExportInterval = setInterval(() => {
						if ($autoExport) {
							checkAutoFunctions();
						}
					}, hourINMS);
				}, timeLeft);
			}
		} else if (val === false) {
			if ($autoExportInterval) clearInterval($autoExportInterval);
			saveJSON(false, "autoExport");
		}
	});
	function autoExportIsPastDate() {
		// Check Run First
		let isPastDate = false;
		if (!$lastRunnedAutoExportDate) isPastDate = true;
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
		return isPastDate;
	}
	runExport.subscribe((val) => {
		if (typeof val !== "boolean" || $initData) return;
		exportUserData();
	});
	runIsScrolling.subscribe((val) => {
		if (typeof val !== "boolean") return;
		if (!$isScrolling) $isScrolling = true;
		if ($scrollingTimeout) clearTimeout($scrollingTimeout);
		$scrollingTimeout = setTimeout(() => {
			$isScrolling = false;
		}, 500);
	});

	// Global Function For Android/Browser
	document.addEventListener("visibilitychange", () => {
		if ($initData || $android) return;
		if (
			document.visibilityState === "visible" &&
			!$userRequestIsRunning &&
			!autoUpdateIsPastDate() &&
			!autoExportIsPastDate()
		) {
			requestUserEntries({ visibilityChange: true });
		}
	});

	let _showConfirm = false;
	if ("scrollRestoration" in window.history) {
		window.history.scrollRestoration = "manual"; // Disable scrolling to top when navigating back
	}
	let windowWheel = () => {
		$hasWheel = true;
		window.removeEventListener("wheel", windowWheel);
	};
	window.addEventListener("wheel", windowWheel);
	window.checkEntries = () => {
		if ($initData) return;
		if (
			!$userRequestIsRunning &&
			!autoUpdateIsPastDate() &&
			!autoExportIsPastDate()
		) {
			requestUserEntries({ visibilityChange: true });
		}
	};
	window.addEventListener("popstate", () => {
		window.backPressed();
	});

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
			} else if (
				$gridFullView
					? animeGridEl.scrollLeft > 500
					: window.scrollY > 200
			) {
				if ($gridFullView) {
					animeGridEl.scrollTop = animeGridEl.scrollTop;
					animeGridEl.scrollLeft = animeGridEl.scrollLeft;
					animeGridEl?.children?.[0]?.scrollIntoView?.({
						container: animeGridEl,
						behavior: "smooth",
						block: "nearest",
						inline: "start",
					});
				} else {
					window.scrollY = window.scrollY;
					window.scrollX = window.scrollX;
					window.scrollTo({ top: -9999, behavior: "smooth" });
				}
				window.setShouldGoBack(true);
				return;
			} else {
				if ($gridFullView) {
					animeGridEl.scrollTop = animeGridEl.scrollTop;
					animeGridEl.scrollLeft = animeGridEl.scrollLeft;
					animeGridEl?.children?.[0]?.scrollIntoView?.({
						container: animeGridEl,
						behavior: "smooth",
						block: "nearest",
						inline: "start",
					});
				} else {
					window.scrollY = window.scrollY;
					window.scrollX = window.scrollX;
					window.scrollTo({ top: -9999, behavior: "smooth" });
				}
				window.setShouldGoBack(true);
			}
		}
	};
	gridFullView.subscribe(async (val) => {
		await tick();
		if (val) {
			if (animeGridEl?.scrollLeft > 500) {
				window.setShouldGoBack(false);
			}
		} else {
			if (window?.scrollY > 200) {
				window.setShouldGoBack(false);
			}
		}
	});
	popupVisible.subscribe((val) => {
		if (val === true) window.setShouldGoBack(false);
	});
	menuVisible.subscribe((val) => {
		if (val === true) window.setShouldGoBack(false);
	});
	window.addEventListener("scroll", () => {
		if (window.scrollY !== 0 && !$gridFullView)
			window.setShouldGoBack(false);
		runIsScrolling.update((e) => !e);
	});
	window.addEventListener("resize", () => {
		windowWidth = window.visualViewport.width;
	});
	onMount(() => {
		windowWidth = window.visualViewport.width;
		usernameInputEl = document.getElementById("usernameInput");
		animeGridEl = document.getElementById("anime-grid");
		animeGridEl?.addEventListener("scroll", () => {
			if (!$gridFullView) return;
			if (animeGridEl.scrollLeft !== 0) window.setShouldGoBack(false);
			runIsScrolling.update((e) => !e);
		});
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

	let isChangingPopupVisible, isChangingPopupVisibleTimeout;
	popupIsGoingBack.subscribe(() => {
		clearTimeout(isChangingPopupVisibleTimeout);
		isChangingPopupVisible = true;
		isChangingPopupVisibleTimeout = setTimeout(() => {
			isChangingPopupVisible = false;
		}, 500);
	});
	let copytimeoutId;
	let copyhold = false;
	document.addEventListener("pointerdown", (e) => {
		if (e.pointerType === "mouse") return;
		let target = e.target;
		let classList = target.classList;
		if (!classList.contains("copy")) target = target.closest(".copy");
		if (target) {
			copyhold = true;
			if (copytimeoutId) clearTimeout(copytimeoutId);
			copytimeoutId = setTimeout(() => {
				let text = target.getAttribute("copy-value");
				if (
					text &&
					!$isScrolling &&
					copyhold &&
					!isChangingPopupVisible
				) {
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

	let updateListIconSpinningTimeout;
	async function updateList(event) {
		if (
			await $confirmPromise({
				title: "List update is available",
				text: "Are you sure you want to refresh the list?",
			})
		) {
			let element = event.target;
			let classList = element.classList;
			let updateIcon;
			if (classList.contains("list-update-container")) {
				updateIcon = element.querySelector?.(".list-update-icon");
			} else {
				updateIcon = element
					?.closest(".list-update-container")
					?.querySelector?.(".list-update-icon");
			}
			if (updateListIconSpinningTimeout)
				clearTimeout(updateListIconSpinningTimeout);
			addClass(updateIcon, "fa-spin");
			if ($animeLoaderWorker) {
				$animeLoaderWorker.terminate();
				$animeLoaderWorker = null;
			}
			animeLoader()
				.then(async (data) => {
					$listUpdateAvailable = false;
					updateListIconSpinningTimeout = setTimeout(() => {
						removeClass(updateIcon, "fa-spin");
					}, 300);
					$animeLoaderWorker = data.animeLoaderWorker;
					$searchedAnimeKeyword = "";
					if (data?.isNew) {
						$finalAnimeList = data.finalAnimeList;
						$hiddenEntries = data.hiddenEntries;
						$numberOfNextLoadedGrid = data.numberOfNextLoadedGrid;
					}
					$dataStatus = null;
					return;
				})
				.catch((error) => {
					throw error;
				});
		}
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

	let _progress = 0,
		progressFrame;
	progress.subscribe((val) => {
		cancelAnimationFrame(progressFrame);
		progressFrame = requestAnimationFrame(() => {
			_progress = val;
		});
	});
</script>

<main>
	{#if _progress > 0 && _progress < 100}
		<div
			out:fade={{ duration: 0, delay: 400 }}
			on:outrostart={(e) => {
				e.target.style.setProperty("--progress", "0%");
			}}
			class="progress"
			style:--progress={"-" + (100 - _progress) + "%"}
		/>
	{/if}
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
	{#if $listUpdateAvailable}
		<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
		<div
			class="list-update-container"
			tabindex="0"
			on:click={updateList}
			on:keydown={(e) => e.key === "Enter" && updateList(e)}
			transition:fly={{ x: 50, duration: 300 }}
		>
			<i class="list-update-icon fa-solid fa-arrows-rotate" />
			<h3 class="list-update-label">List Update Available</h3>
		</div>
	{/if}
</main>

<style>
	:global(body) {
		height: calc(100% - 55px) !important;
	}
	main {
		height: calc(100% - 55px);
		width: 100%;
	}
	.home {
		height: calc(100% - 55px);
		width: 100%;
		margin: 55px auto 0;
		max-width: 1140px;
		padding-left: 50px;
		padding-right: 50px;
	}
	.progress {
		background-color: #909cb8;
		position: fixed;
		top: 53px;
		z-index: 9999;
		height: 1px;
		width: 100%;
		transform: translateX(var(--progress));
		transition: transform 0.3s ease-in;
	}
	.list-update-container {
		position: fixed;
		bottom: 3em;
		right: 3em;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
		background-color: rgb(21, 31, 46);
		border-radius: 6px;
		cursor: pointer;
		user-select: none;
		min-width: 44px;
		min-height: 44px;
		padding: 8px;
	}
	.list-update-icon {
		color: inherit;
		font-size: 2rem;
		cursor: pointer;
	}
	.list-update-label {
		color: inherit;
		font-size: 1.5rem;
		cursor: pointer;
	}

	@media screen and (max-width: 425px) {
		.home {
			padding: 0 1em;
		}
		.list-update-container {
			border-radius: 50%;
			padding: 0px;
		}
		.list-update-icon {
			font-size: 2em;
		}
		.list-update-label {
			display: none;
		}
	}
</style>
