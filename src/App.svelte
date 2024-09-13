<script>
	import { onMount, tick } from "svelte";
	import { fade } from "svelte/transition";
	import { inject } from "@vercel/analytics";
	import C from "./components/index.js";
	import getWebVersion from "./version.js";
	import {
		getMediaEntries,
		getFilterOptions,
		requestMediaEntries,
		requestUserEntries,
		processRecommendedMediaList,
		mediaManager,
		exportUserData,
		getExtraInfo,
		mediaLoader,
        updateTagInfo,
		saveIDBdata,
		getIDBdata,
        initMediaLoader
	} from "./js/workerUtils.js";
	import {
		getLocalStorage,
		removeLocalStorage,
		requestImmediate,
		setLocalStorage,
	} from "./js/others/helper.js";
	import {
		appID,
		android,
		username,
		initData,
		gridFullView,
		dataStatus,
		userRequestIsRunning,
		autoUpdate,
		autoUpdateInterval,
		runnedAutoUpdateAt,
		exportPathIsAvailable,
		autoExport,
		autoExportInterval,
		runnedAutoExportAt,
		popupVisible,
		menuVisible,
		listUpdateAvailable,
		confirmIsVisible,
		mediaOptionVisible,
		runUpdate,
		shouldUpdateList,
		shouldUpdateRecommendationList,
		updateRecommendationList,
		updateList,
		confirmPromise,
		hasWheel,
		progress,
		dropdownIsVisible,
		isBackgroundUpdateKey,
		visitedKey,
		orderedFilters,
		algorithmFilters,
		nonOrderedFilters,
		filterConfig,
		categories,
		selectedCategory,
		loadedMediaLists,
		categoriesKeys,
		selectedMediaGridEl,
		resetProgress,
        tagInfo,
        windowWidth,
        windowHeight,
        trueWindowHeight,
        documentScrollTop,
        loadingCategory,
        toast,
        initList,
        webCrawler,
	} from "./js/globalValues.js";

	(async () => {
		try {
			// Check App ID (Not for Android allow Fast Start on Slow Network)
			if (!$android) {
				$appID = await getWebVersion();
			}

			// Check Data Loss
			if ($android) {
				if (window[$visitedKey] === true) {
					const isAlreadyVisited = await getIDBdata($visitedKey);
					if (!isAlreadyVisited) {
						window[".androidDataIsEvicted"] = true;
						try {
							JSBridge.notifyDataEviction();
							if (window[$isBackgroundUpdateKey] === true) {
								JSBridge.backgroundUpdateIsFinished(false);
							}
						} catch (ex) { console.error(ex) }
					}
				} else if (window[$visitedKey] === false) {
					saveIDBdata(true, $visitedKey, true)
					.then(() => {
						try {
							JSBridge.pageVisited()
						} catch (ex) { console.error(ex) }
					})
					.catch((ex) => console.error(ex))
				}
			}

			if (!$android || window[$isBackgroundUpdateKey] !== true) {
				try {
					$initList = (await mediaLoader({
						loadAll: true, 
						selectedCategory: ($selectedCategory ?? getLocalStorage("selectedCategory") ?? await getIDBdata("selectedCategory")),
						initList: true
					}))?.shouldReloadList
					if ($initList === false) {
						loadYoutube();
						getExtraInfo();
						loadAnalytics();
					}
				} catch (ex) { console.error(ex) }
			}

			await Promise.all([
				// Check/Get/Update/Process Media Entries
				(async () => {
					const shouldGetMediaEntries = await getIDBdata("mediaEntriesIsEmpty");
					if (shouldGetMediaEntries === true) {
						// if ($initList !== false) {
						// 	try {
								
						// 	} catch (ex) { console.error(ex) }
						// }
						throw new Error(navigator.userAgent)
						await initMediaLoader()
						// await getMediaEntries()
					} else if (shouldGetMediaEntries !== false) {
						throw "Unexpected Error"
					}
				})(),
				// Check/Update/Process User Media Entries
				(async () => {
					const savedUsername = await getIDBdata("username");
					if (savedUsername !== $username) {
						setLocalStorage("username", savedUsername || "")
						.catch((ex) => {
							removeLocalStorage("username");
							console.error(ex)
						})
						$username = savedUsername;
					}
					if (
						$android &&
						window.shouldUpdateNotifications === true &&
						window[$isBackgroundUpdateKey] !== true
					) {
						window.shouldUpdateNotifications = false;
						try {
							JSBridge.callUpdateNotifications();
						} catch (ex) { console.error(ex) }
					}
				})(),
				// Check/Get/Update Filter Options Selection
				(async () => {
					if ($android && window[$isBackgroundUpdateKey] === true) {
						updateTagInfo();
					} else {
						const response = await getFilterOptions()
						if (response) {
							$orderedFilters = response.orderedFilters;
							$nonOrderedFilters = response.nonOrderedFilters;
							$filterConfig = response.filterConfig;
							$algorithmFilters = response.algorithmFilters;
							$tagInfo = response.tagInfo;
						}
						try {
							updateTagInfo();
						} catch (ex) { console.error(ex) }
					}
				})()
			])

			$initData = false;
						
			if ($android && window[$isBackgroundUpdateKey] === true) {
				try {
					let sendBackgroundStatusIsRunning;
					dataStatus.subscribe((val) => {
						if (sendBackgroundStatusIsRunning || typeof val !== "string") return;
						sendBackgroundStatusIsRunning = true;
						setTimeout(() => {
							try {
								JSBridge.sendBackgroundStatus(val);
							} catch (ex) { console.error(ex) }
							sendBackgroundStatusIsRunning = false;
						}, 750);
					});

					let shouldExport = await autoExportIsPastDate();
					$exportPathIsAvailable = $exportPathIsAvailable ?? (await getIDBdata("exportPathIsAvailable"));
					$autoExport = $autoExport ?? (await getIDBdata("autoExport"));
					if (shouldExport && $exportPathIsAvailable && $autoExport) {
						try {
							await exportUserData()
							shouldExport = false
						} catch (ex) { console.error(ex) }
					}

					let dataIsUpdated;
					try {
						JSBridge.setShouldProcessRecommendation(true);
					} catch (ex) { console.error (ex) }

					try {
						await requestUserEntries()
					} catch (ex) { console.error (ex) }
					dataIsUpdated = window.KanshiBackgroundShouldProcessRecommendation;

					try {
						await requestMediaEntries()
					} catch (ex) { console.error(ex) }
					dataIsUpdated = dataIsUpdated || window.KanshiBackgroundShouldProcessRecommendation;

					let recommendationListIsProcessed
					if (dataIsUpdated) {
						try {
							await processRecommendedMediaList({ initList: true })
							try {
								JSBridge.setShouldProcessRecommendation(false)
							} catch (ex) { console.error(ex) }
							recommendationListIsProcessed = true
						} catch (ex) { console.error(ex) }
					} else {
						try {
							JSBridge.setShouldProcessRecommendation(false)
						} catch (ex) { console.error(ex) }
					}
					
					try {
						if (recommendationListIsProcessed) {
							try {
								await mediaManager({ updateRecommendedMediaList: true, initList: true })
								try {
									JSBridge.setShouldLoadMedia(false);
								} catch (ex) { console.error(ex) }
							} catch (ex) { console.error(ex) }
						} else {
							try {
								JSBridge.setShouldLoadMedia(false);
							} catch (ex) { console.error(ex) }
						}
					} catch (ex) { console.error(ex) }

					shouldExport = shouldExport || dataIsUpdated;
					if (shouldExport && $exportPathIsAvailable && $autoExport) {
						try {
							await exportUserData()
							shouldExport = false
						} catch (ex) { console.error(ex) }
					}
					JSBridge.backgroundUpdateIsFinished(true);
				} catch (ex) {
					try {
						JSBridge.backgroundUpdateIsFinished(false);
					} catch (ex) { console.error(ex) }
					console.error(ex)
				}
			} else {
				// Get/Show List
				let shouldProcessRecommendation;
				const neareastMediaReleaseAiringAt = getLocalStorage("neareastMediaReleaseAiringAt") ?? (await getIDBdata("neareastMediaReleaseAiringAt"));
				if (
					typeof neareastMediaReleaseAiringAt === "number" &&
					!isNaN(neareastMediaReleaseAiringAt)
				) {
					const neareastMediaReleaseAiringDate = new Date(neareastMediaReleaseAiringAt * 1000);
					if (
						!isNaN(neareastMediaReleaseAiringDate) &&
						neareastMediaReleaseAiringDate <= new Date()
					) {
						shouldProcessRecommendation = true;
					} else {
						window.setMediaReleaseUpdateTimeout?.(neareastMediaReleaseAiringAt);
					}
				}
				if (!shouldProcessRecommendation) {
					shouldProcessRecommendation = (await getIDBdata("shouldProcessRecommendation")) || (await getIDBdata("recommendedMediaListIsEmpty"));
				}

				let shouldLoadMedia
				if (shouldProcessRecommendation) {
					$loadingCategory[""] = new Date()
					await processRecommendedMediaList({ initList: true })
					shouldLoadMedia = true
				}

				shouldLoadMedia = shouldLoadMedia || $initList !== false || (await getIDBdata("shouldLoadMedia"));
				if (shouldLoadMedia) {
					if ($initList !== false) {
						await mediaManager({ updateRecommendedMediaList: true, initList: true })
						await mediaLoader({
							loadAll: true,
							selectedCategory: ($selectedCategory ?? getLocalStorage("selectedCategory") ?? await getIDBdata("selectedCategory")),
							initList: true
						})
						$initList = false;
						
						loadYoutube();
						loadAnalytics();

						checkAutoFunctions("first-visit");

						getExtraInfo();
					} else {
						$loadingCategory[""] = new Date()
						await mediaManager({ updateRecommendedMediaList: true })
						checkAutoFunctions(true);
					}
				} else {
					checkAutoFunctions(true);
				}
				
			}
		} catch (ex) {
			if ($android) {
				try {
					JSBridge.backgroundUpdateIsFinished(false);
				} catch (ex) { console.error(ex) }
				$confirmPromise?.({
					isAlert: true,
					title: "Something went wrong",
					text: "App may not be working properly, restart the app or clear your cache, if it still fails you may want to reinstall the app.",
				});
			} else {
				$confirmPromise?.({
					isAlert: true,
					title: "Something went wrong",
					text: "App may not be working properly, refresh the page or clear this website data, this also does not run in incognito.",
				});
			}
			if ($initData) {
				$initData = false;
			}
			if ($initList !== false) {
				$initList = false;
			}
			
			loadYoutube();

			$dataStatus = "Something went wrong";
			checkAutoFunctions(true);
			loadAnalytics();
			console.error(ex);
		}

		function loadYoutube() {
			// For Youtube API
			window.onYouTubeIframeAPIReady = () => {
				window.playMostVisibleTrailer?.();
			};
			const YTscript = document.createElement("script");
			YTscript.onload = () => {
				window.onYouTubeIframeAPIReady();
			};
			YTscript.src = "https://www.youtube.com/iframe_api?v=16";
			YTscript.id = "www-widgetapi-script";
			YTscript.defer = true;
			document.head.appendChild(YTscript);
		}

		function loadAnalytics() {
			const isVercel = window.location?.origin === "https://kanshi.vercel.app";
			// Google Analytics
			const GAscript = document.createElement("script");
			GAscript.onload = () => {
				window.dataLayer = window.dataLayer || [];
				function gtag() {
					dataLayer.push(arguments);
				}
				gtag("js", new Date());
				if (isVercel) {
					gtag("config", "G-F5E8XNQS20");
				} else {
					gtag("config", "G-PPMY92TJCE");
				}
			};
			if (isVercel) {
				inject?.(); // Vercel Analytics
				GAscript.src = "https://www.googletagmanager.com/gtag/js?id=G-F5E8XNQS20";
			} else {
				GAscript.src = "https://www.googletagmanager.com/gtag/js?id=G-PPMY92TJCE";
			}
			GAscript.defer = true;
			document.head.appendChild(GAscript);
		}
	})();
	
	let mediaListPagerEl, mediaListPagerPad
		
	// WINDOW SIZE EVENT LISTENERS
	const maxWindowHeight = {}
	let lastWindowHeight = $windowHeight,
		isMaxWindowHeight
	window.addEventListener("resize", () => {
		$windowHeight = Math.max(
			window.visualViewport?.height || 0,
			window.innerHeight || 0,
		);
		$windowWidth = Math.max(
			window.document?.documentElement?.getBoundingClientRect?.()?.width || 0,
			window.visualViewport?.width || 0,
			window.innerWidth || 0,
		);

		// To Show the Selected Category in center
		window.scrollToSelectedCategory?.();

		// Set True Window Size if its not in full screen
		if (
			!(document.fullScreen ||
			document.mozFullScreen ||
			document.webkitIsFullScreen ||
			document.msFullscreenElement)
		) {
			$trueWindowHeight = $windowHeight
			// $trueWindowWidth = $windowWidth
		}
	});	
	windowHeight.subscribe((val) => {
		// Virtual Keyboard Listener
		const currentMaxWindowHeight = maxWindowHeight[window.screen?.orientation?.type]
		if (currentMaxWindowHeight > 0) {
			// Possibly a virtual keyboard change
			if (Math.abs(lastWindowHeight - val) > Math.max(100, currentMaxWindowHeight * 0.15)) {
				const isPossiblyHid = val > lastWindowHeight;
				window.showCategoriesNav(isPossiblyHid, !isPossiblyHid);
				const activeElement = document.activeElement;
				const activeElementTagName = activeElement?.tagName
				if (
					isPossiblyHid &&
					activeElement &&
					(activeElementTagName === "INPUT" || activeElementTagName === "TEXTAREA")
				) {
					activeElement.blur?.();
					if (activeElement.id === "username-input") {
						window.onfocusUsernameInput();
					}
				}
			}
		}
		lastWindowHeight = $windowHeight
	})	
	trueWindowHeight.subscribe((val) => {
		if (val == null) return
		const orientation = window.screen?.orientation?.type
		if (orientation) {
			const currentMaxWindowHeight = maxWindowHeight[orientation]
			isMaxWindowHeight = val >= (currentMaxWindowHeight || 0)
			if (currentMaxWindowHeight == null || val > currentMaxWindowHeight) {
				maxWindowHeight[orientation] = val
			}
		}
	})
	windowWidth.subscribe((val) => {
		mediaListPagerPad = val > 660 ? 70 : 0
	})

	// DOCUMENT SCROLL
	let panningIdx, panningCategory,
		changingTopPosition,
		topPositionChangeTimeout,
		lastScrollTop,
		lastOffTosetWindow,
		gridTopScrolls = {},
		isBelowNav = false,
		gridTopPosition = 0,
		gridMaxHeight;
	window.addEventListener("scroll", () => {
		$documentScrollTop = window.document?.documentElement?.scrollTop || 0
	});
	documentScrollTop.subscribe((scrollTop) => {
		if (!$gridFullView && mediaListPagerEl) {
			const element = mediaListPagerEl.querySelector(".category-list.viewed .image-grid");
			if (element) {
				const offsetToWindow = element.getBoundingClientRect().top;
				if (
					scrollTop !== lastScrollTop &&
					(offsetToWindow <= 1 || lastOffTosetWindow <= 1)
				) {
					topPositionChangeTimeout?.();
					changingTopPosition = true;
				}
				lastScrollTop = scrollTop;
				lastOffTosetWindow = offsetToWindow;
				const category = element?.dataset?.category;
				if (
					category &&
					panningCategory &&
					panningCategory !== category
				) {
					$selectedCategory = panningCategory;
				}
				if (offsetToWindow > 1) {
					gridTopPosition = 0;
					Array.from(mediaListPagerEl.children).forEach((el) => {
						el.scrollTop = 0;
					});
					for (const category in gridTopScrolls) {
						gridTopScrolls[category] = null;
					}
				} else {
					gridTopPosition = Math.abs(offsetToWindow);
					const category = element.dataset.category;
					const gridOffSetDocument =
						$documentScrollTop + element.getBoundingClientRect().top;
					gridTopScrolls[category] = $documentScrollTop - gridOffSetDocument;
				}
				gridMaxHeight = element?.clientHeight ?? gridMaxHeight;
				topPositionChangeTimeout = requestImmediate(async () => {
					await tick();
					changingTopPosition = false;
				}, 30);
			}
		}

		const shouldUpdate = !$popupVisible;
		if ($listUpdateAvailable && shouldUpdate && $initList === false) {
			if (!$initData && (!$android || window[$isBackgroundUpdateKey] !== true)) {
				$listUpdateAvailable = false;
				mediaManager({ updateRecommendedMediaList: true });
			}
		}
		isBelowNav = scrollTop > 54;
		if (
			$selectedMediaGridEl?.getBoundingClientRect?.()?.top < 0 &&
			!appShouldExit
		) {
			window.addHistory?.();
		}
	})

	// AUTO UPDATE/EXPORT FUNCTIONS
	async function checkAutoFunctions(
		initCheck = false,
		visibilityChange = false,
	) {
		if ($initData || ($android && window[$isBackgroundUpdateKey] === true)) return;

		if (initCheck) {
			try {
				await requestUserEntries();
				if (initCheck === "first-visit") {
					await requestMediaEntries();
				}
				checkAutoExportOnLoad();
			} catch (ex) {
				checkAutoExportOnLoad();
				console.error(ex);
			}
		} else if ($autoUpdate && (await autoUpdateIsPastDate())) {
			try {
				if (!$userRequestIsRunning) {
					await requestUserEntries()
					await requestMediaEntries()
				} else {
					await requestMediaEntries()
				}
			} catch (ex) {
				console.error(ex)
			}
			checkAutoExportOnLoad(visibilityChange);
		} else if ($autoExport && (await autoExportIsPastDate()) && $android) {
			try {
				await exportUserData({ visibilityChange })
			} catch (ex) {
				console.error(ex)
			}
			if (visibilityChange && !$userRequestIsRunning) {
				requestUserEntries({ visibilityChange: true });
			}
		} else if (visibilityChange && !$userRequestIsRunning) {
			requestUserEntries({ visibilityChange: true });
		}
	}
	async function checkAutoExportOnLoad(visibilityChange) {
		if ($android && window[$isBackgroundUpdateKey] === true) return;
		if ($autoExport && $android) {
			if (await autoExportIsPastDate()) {
				exportUserData({ visibilityChange });
			}
		}
	}
	document.addEventListener("visibilitychange", () => {
		if ($initData || $android || document.visibilityState !== "visible") return;
		checkAutoFunctions(false, true);
	});
	// Android Callable
	window.checkEntries = () => {
		if ($initData) return;
		checkAutoFunctions(false, true);
	};

	// REACTIVE FUNCTIONS
	initData.subscribe(async (val) => {
		// After the initial lLoad has Finished
		if (val === false) {
			// Check App ID and Version Updates for Android
			if ($android && window.navigator?.onLine !== false) {
				try {
					$appID = await getWebVersion();
					if (window[$isBackgroundUpdateKey] !== true && typeof $appID === "number" && !isNaN($appID) && isFinite($appID)) {
						JSBridge.checkAppID(Math.floor($appID), false);
					}
				} catch (ex) {
					console.error(ex)
				}
			}
		}
	});
	shouldUpdateList.subscribe((val) => {
		if (typeof val !== "boolean" || $initData || $initList !== false) return;
		if ($android && window[$isBackgroundUpdateKey] === true) return;

		$listUpdateAvailable = false;
		mediaManager({ updateRecommendedMediaList: true });
	});
	shouldUpdateRecommendationList.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData || $initList !== false) return;
		if ($android && window[$isBackgroundUpdateKey] === true) return;

		$listUpdateAvailable = false;
		try {
			await processRecommendedMediaList()
		} catch (ex) {
			console.error(ex)
		}
		shouldUpdateList.update((e) => !e);
	});
	updateRecommendationList.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData || $initList !== false) return;
		if ($android && window[$isBackgroundUpdateKey] === true) return;

		try {
			await processRecommendedMediaList()
		} catch (ex) {
			console.error(ex)
		}
		updateList.update((e) => !e);
	});
	window.loadlang = () => {
		updateList.update((e) => !e);
	}
	window.processlang = () => {
		updateRecommendationList.update((e) => !e);
	}
	updateList.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData) return;
		if ($android && window[$isBackgroundUpdateKey] === true) return;
		
		if ($initList !== false || ($popupVisible && $loadedMediaLists?.[$selectedCategory]?.mediaList?.length)) {
			$listUpdateAvailable = true;
		} else {
			mediaManager({ updateRecommendedMediaList: true });
		}
	});
	runUpdate.subscribe(async (val) => {
		if (typeof val !== "boolean" || $initData || window.navigator?.onLine === false) return;
		if ($android && window[$isBackgroundUpdateKey] === true) return;
		
		if (!$userRequestIsRunning) {
			try {
				await requestUserEntries()
				requestMediaEntries()
			} catch (ex) {
				console.error(ex)
			}
		} else {
			requestMediaEntries();
		}
	});

	// CONFIG CHANGES
	autoUpdate.subscribe(async (val) => {
		if ($android && window[$isBackgroundUpdateKey] === true) return;
		if (val === true) {
			const hourINMS = 60 * 60 * 1000;
			setLocalStorage("autoUpdate", true)
                .catch(() => {
                    removeLocalStorage("autoUpdate");
                })
                .finally(() => {
                    saveIDBdata(true, "autoUpdate");
                });
			if (await autoUpdateIsPastDate()) {
				checkAutoFunctions();
				if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
				$autoUpdateInterval = setInterval(() => {
					if ($autoUpdate) {
						checkAutoFunctions();
					}
				}, hourINMS);
			} else {
				const timeLeft = hourINMS - (new Date().getTime() - $runnedAutoUpdateAt) || 0;
				setTimeout(() => {
					if ($autoUpdate === false) return;
					checkAutoFunctions();
					if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
					$autoUpdateInterval = setInterval(() => {
						if ($autoUpdate) {
							checkAutoFunctions();
						}
					}, hourINMS);
				}, Math.min(timeLeft, 2000000000));
			}
		} else if (val === false) {
			if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
			$autoUpdateInterval = null;
			setLocalStorage("autoUpdate", false)
                .catch(() => {
                    removeLocalStorage("autoUpdate");
                })
                .finally(() => {
                    saveIDBdata(false, "autoUpdate");
                });
		}
	});
	autoExport.subscribe(async (val) => {
		if ($android && window[$isBackgroundUpdateKey] === true) return;
		if (val === true) {
			const hourINMS = 60 * 60 * 1000;
			setLocalStorage("autoExport", true)
                .catch(() => {
                    removeLocalStorage("autoExport");
                })
                .finally(() => {
                    saveIDBdata(true, "autoExport");
                });
			if (await autoExportIsPastDate()) {
				checkAutoFunctions();
				if ($autoExportInterval) clearInterval($autoExportInterval);
				$autoExportInterval = setInterval(() => {
					if ($autoExport) {
						checkAutoFunctions();
					}
				}, hourINMS);
			} else {
				const timeLeft = hourINMS - (new Date().getTime() - $runnedAutoExportAt) || 0;
				setTimeout(() => {
					if ($autoExport === false) return;
					checkAutoFunctions();
					if ($autoExportInterval)
						clearInterval($autoExportInterval);
					$autoExportInterval = setInterval(() => {
						if ($autoExport) {
							checkAutoFunctions();
						}
					}, hourINMS);
				}, Math.min(timeLeft, 2000000000));
			}
		} else if (val === false) {
			if ($autoExportInterval) clearInterval($autoExportInterval);
			$autoExportInterval = null;
			setLocalStorage("autoExport", false)
                .catch(() => {
                    removeLocalStorage("autoExport");
                })
                .finally(() => {
                    saveIDBdata(false, "autoExport");
				})
		}
	});
	async function autoUpdateIsPastDate() {
		let isPastDate = false;
		$runnedAutoUpdateAt = await getIDBdata("runnedAutoUpdateAt");
		if ($runnedAutoUpdateAt == null) {
			isPastDate = true;
		} else if (
			typeof $runnedAutoUpdateAt === "number" &&
			!isNaN($runnedAutoUpdateAt)
		) {
			const hourINMS = 60 * 60 * 1000;
			if (new Date().getTime() - $runnedAutoUpdateAt >= hourINMS) {
				isPastDate = true;
			}
		}
		return isPastDate;
	}
	async function autoExportIsPastDate() {
		// Check Run First
		let isPastDate = false;
		$runnedAutoExportAt = await getIDBdata("runnedAutoExportAt");
		if ($runnedAutoExportAt == null) {
			isPastDate = true;
		} else if (
			typeof $runnedAutoExportAt === "number" &&
			!isNaN($runnedAutoExportAt)
		) {
			const hourINMS = 60 * 60 * 1000;
			if (new Date().getTime() - $runnedAutoExportAt >= hourINMS) {
				isPastDate = true;
			}
		}
		return isPastDate;
	}

	// SPA History
	let appShouldExit = false, 
		exitScrollTimeout;
	if ("history" in window) {
		window.history.scrollRestoration = "manual"; // Disable scrolling to top when navigating back
	}
	window.onbeforeunload = () => {
		if (
			(!appShouldExit || window.history?.state === "visited")
			&& !$android && !matchMedia("(hover:hover)").matches
		) {
			return "Do you want to leave the site?"
		}
	}
	window.addHistory = () => {
		appShouldExit = false;
		if ($android) {
			if (window[$isBackgroundUpdateKey] !== true) {
				try {
					JSBridge.setShouldGoBack(false);
				} catch (ex) {
					console.error(ex)
				}
			}
		} else if (window.history?.state !== "visited") {
			// Only Add 1 state
			window.history?.pushState?.("visited", ""); // Push Popped State
		} 
	};
	window.backPressed = () => {
		if (appShouldExit && !$android) {
			// In Browser
			window.history?.go?.(-1); 
		} else {
			if (!$android) {
				window.history?.pushState?.("visited", ""); // Push Popped State
			}
			const activeElement = document?.activeElement;
			const activeElementTagName = activeElement?.tagName
			if ($confirmIsVisible) {
				handleConfirmationCancelled();
				$confirmIsVisible = false;
				appShouldExit = false;
			} else if (
				(activeElementTagName === "INPUT" || activeElementTagName === "TEXTAREA") &&
				$windowWidth <= 750
			) {
				activeElement.blur?.();
				if (activeElement.id === "username-input") {
					window.onfocusUsernameInput?.();
				}
				appShouldExit = false;
			} else if ($menuVisible) {
				$menuVisible = false;
				appShouldExit = false;
			} else if (window.checkOpenFullScreenItem?.()) {
				window.closeFullScreenItem?.();
				appShouldExit = false;
			} else if ($popupVisible) {
				$popupVisible = false;
				appShouldExit = false;
			} else if ($mediaOptionVisible) {
				$mediaOptionVisible = false;
				appShouldExit = false;
			} else if ($dropdownIsVisible) {
				$dropdownIsVisible = false;
				appShouldExit = false;
			} else {
				if ($gridFullView && $selectedMediaGridEl) {
					$selectedMediaGridEl.style.overflow = "hidden";
					$selectedMediaGridEl.scrollLeft = 0;
					exitScrollTimeout?.();
					exitScrollTimeout = requestImmediate(() => {
						$selectedMediaGridEl.style.overflow = "";
					}, 100);
				} else {
					window.showCategoriesNav?.(true);
					const documentEl = document.documentElement
					if ($android || !matchMedia("(hover:hover)").matches) {
						documentEl.style.overflow = "hidden";
					}
					documentEl.scrollTop = 0;
					document.body.scrollTop = 0;
					window.scrollY = 0;
					if ($android || !matchMedia("(hover:hover)").matches) {
						exitScrollTimeout?.()
						exitScrollTimeout = requestImmediate(() => {
							documentEl.style.overflow = "";
						}, 100);
					}
				}
				if ($android) {
					if (appShouldExit) {
						appShouldExit = false
						try {
							JSBridge.willExit();
							JSBridge.setShouldGoBack(true);
						} catch (ex) {
							console.error(ex)
						}
					} else {
						appShouldExit = true
					}
				} else {
					appShouldExit = true
				}
			}
		}
	};
	window.addEventListener("popstate", () => window.backPressed());
	gridFullView.subscribe(async (val) => {
		await tick();
		if (val) {
			if ($selectedMediaGridEl?.scrollLeft > 500) {
				window.addHistory?.();
			}
		} else {
			if ($selectedMediaGridEl?.getBoundingClientRect?.()?.top < 0) {
				window.addHistory?.();
			}
		}
	});
	window.mediaGridScrolled = (scrollLeft) => {
		if (scrollLeft > 500 && !appShouldExit) {
			window.addHistory?.();
		}
	};

	// PROGRESS INDICATOR
	let shownProgress = 0,
		progressChangeStart = performance.now(),
		isChangingProgress;
	progress.subscribe((val) => {
		if (
			val >= 100 ||
			val <= 0 ||
			performance.now() - progressChangeStart > 300
		) {
			if (shownProgress < 100 && shownProgress > 0) {
				shownProgress = Math.max(val, shownProgress);
			} else {
				if (isChangingProgress) return;
				isChangingProgress = true;
				setTimeout(() => {
					shownProgress = val;
					isChangingProgress = false;
				}, 17);
			}
			progressChangeStart = performance.now();
		}
	});
	resetProgress.subscribe(() => {
		shownProgress = 0.01;
		$progress = 0;
	});

	// toast
	let toastTimeout
	toast.subscribe((val) => {
		if (val) {
			clearTimeout(toastTimeout)
			toastTimeout = setTimeout(()=>{
				toast.set(null)
			}, 3500)
		}
	})

	// DEVICE WHEEL CHECKER
	let windowWheel = () => {
		$hasWheel = true;
		window.removeEventListener("wheel", windowWheel, { passive: true });
		windowWheel = undefined
	};
	window.addEventListener("wheel", windowWheel, { passive: true });

	// CONFIRM POPUP ABSTRACTION
	let isAlert,
		confirmTitle,
		confirmText,
		confirmLabel,
		cancelLabel,
		isImportant,
		confirmModalPromise,
		isPersistent;

	$confirmPromise = window.confirmPromise = (confirmValues) => {
		return new Promise((resolve) => {
			if (isPersistent && !confirmValues?.isPersistent) return;
			isPersistent = confirmValues?.isPersistent;
			isAlert = confirmValues?.isAlert || false;
			confirmTitle =
				confirmValues?.title ||
				(isAlert ? "Heads Up" : "Confirmation");
			confirmText =
				(typeof confirmValues === "string"
					? confirmValues
					: confirmValues?.text) || "Do you want to continue?";
			confirmLabel = confirmValues?.confirmLabel || "OK";
			cancelLabel = confirmValues?.cancelLabel || "CANCEL";
			isImportant = confirmValues?.isImportant ?? false;
			$confirmIsVisible = true;
			confirmModalPromise = { resolve };
		});
	};
	function handleConfirmationConfirmed() {
		isPersistent = false;
		confirmModalPromise?.resolve?.(true);
		confirmModalPromise =
		isAlert =
		confirmTitle =
		confirmText =
		confirmLabel =
		cancelLabel =
		isImportant =
			undefined;
		$confirmIsVisible = false;
	}
	function handleConfirmationCancelled() {
		isPersistent = false;
		confirmModalPromise?.resolve?.(false);
		confirmModalPromise =
		isAlert =
		confirmTitle =
		confirmText =
		confirmLabel =
		cancelLabel =
		isImportant =
			undefined;
		$confirmIsVisible = false;
	}
	window.handleConfirmationCancelled = handleConfirmationCancelled;
	confirmIsVisible.subscribe((val) => {
		if (val === false) {
			isPersistent = false;
			confirmModalPromise?.resolve?.(false);
			confirmModalPromise =
			isAlert =
			confirmTitle =
			confirmText =
			confirmLabel =
			cancelLabel =
			isImportant =
				undefined;
		}
	});

	// CATEGORY CHANGES
	window.deletedCategory = (categoryKey) => {
		delete gridTopScrolls?.[categoryKey]
		if (panningCategory === categoryKey) {
			panningCategory = undefined
		}
	}
	categories.subscribe((val) => {
		if (val) {
			$categoriesKeys = Object.keys(val).sort();
			for (let i = 0, l = $categoriesKeys.length; i < l; i++) {
				const categoryKey = $categoriesKeys[i]
				if (val?.[categoryKey] == null) {
					delete $loadedMediaLists?.[categoryKey];
					delete gridTopScrolls?.[categoryKey]
					if (panningCategory === categoryKey) {
						panningCategory = undefined
					}
				}
			}
		}
	});
	categoriesKeys.subscribe(async (val) => {
		await tick();
		if (
			val instanceof Array &&
			val.length > 0 &&
			typeof $selectedCategory === "string"
		) {
			if (!val.includes($selectedCategory)) {
				let newSelectedCategory = val[0];
				if (typeof newSelectedCategory === "string") {
					$selectedCategory = newSelectedCategory;
				}
			} else {
				window.scrollToSelectedCategory?.($selectedCategory);
			}
		}
	});

	// OTHER ANDROID APP CALLABLES
	window.shouldRefreshMediaList = async (
		shouldProcessRecommendation,
		shouldLoadMedia,
	) => {
		if ($initData || $initList !== false) return;
		if ($android && window[$isBackgroundUpdateKey] === true) return;
		
		let thisShouldLoadMedia
		if (shouldProcessRecommendation) {
			try {
				$loadingCategory[""] = new Date()
				await processRecommendedMediaList()
				thisShouldLoadMedia = true
			} catch (ex) { console.error(ex) }
		} else {
			thisShouldLoadMedia = false
		}		

		let isAlreadyLoaded = !shouldLoadMedia && !thisShouldLoadMedia;
		if (isAlreadyLoaded) {
			try {
				$loadingCategory[""] = new Date()
				await mediaLoader({
					updateRecommendedMediaList: true,
					updateUserList: true,
				})
			} catch (ex) { console.error(ex) }
			window.checkEntries?.();
		} else {
			try {
				$loadingCategory[""] = new Date()
				await mediaManager({ updateRecommendedMediaList: true })
			} catch (ex) { console.error(ex) }
			window.checkEntries?.();
		}
	};
	window.copyToClipBoard = (text) => {
		if (typeof text !== "string" && !text) return;
		if ($android) {
			try {
				JSBridge.copyToClipBoard(text);
			} catch (ex) {
				console.error(ex)
			}
		} else {
			navigator?.clipboard?.writeText?.(text);
		}
	}

	// LIST PAGER
	let mediaListPagerIsChanging,
		isFirstScroll = true,
		lastSelectedCategory;

	selectedCategory.subscribe(async (val) => {
		if (val) {
			window.scrollToSelectedCategory?.(val);

			await tick();

			if (!($categoriesKeys instanceof Array)) {
				return;
			}

			const categoryIdx = $categoriesKeys.findIndex((category) => category === val) ?? -1;
			
			if (categoryIdx === -1) {
				$selectedCategory = $categoriesKeys[0] || $selectedCategory;
				lastSelectedCategory = val;
				return;
			} else if (lastSelectedCategory !== val) {
				const offsetWidth = mediaListPagerEl.getBoundingClientRect().width;
				const pagerPads = categoryIdx * offsetWidth;
				const scrollOffset = Math.max(0, categoryIdx - 1) * mediaListPagerPad;
				const newScrollLeft = pagerPads + scrollOffset;
				mediaListPagerEl.scrollLeft = newScrollLeft;
				mediaListPagerIsChanging = false;
			}

			if ($gridFullView) {
				lastSelectedCategory = val;
				return;
			} else if (isFirstScroll) {
				isFirstScroll = false;
				lastSelectedCategory = val;
				return;
			}
			
			const element = Array.from(mediaListPagerEl.children).find((el) => el.dataset.category === val);
			if (element) {
				const gridToWindow = element.getBoundingClientRect().top + 20;
				const gridOffSetDocument = $documentScrollTop + gridToWindow;
				const selectedGridTopScroll = gridTopScrolls[val];
				const documentEL = document.documentElement;
				if (selectedGridTopScroll != null) {
					documentEL.scrollTop = gridOffSetDocument + selectedGridTopScroll;
				} else if (gridToWindow < 1) {
					documentEL.scrollTop = gridOffSetDocument;
				}
				Array.from(mediaListPagerEl.children).forEach((el) => {
					const category = el.dataset.category;
					if (val === category) return;
					const gridTopScroll = gridTopScrolls[category];
					if (gridTopScroll) {
						el.scrollTop = gridTopScroll;
					}
				});
			}
		}
		lastSelectedCategory = val;
	});

	let lastVisualViewportWidth = window.visualViewport?.width;
	window.visualViewport?.addEventListener?.("resize", () => {
		const newVisualViewportWidth = window.visualViewport?.width
		if (mediaListPagerIsChanging) {
			if ($selectedCategory && lastVisualViewportWidth !== newVisualViewportWidth) {
				const categoryIdx = panningIdx ?? $categoriesKeys.findIndex((category) => category === $selectedCategory);
				const currentScrollLeft = mediaListPagerEl.scrollLeft;
				const offsetWidth = mediaListPagerEl.getBoundingClientRect().width;
				const pagerPads = categoryIdx * offsetWidth;
				const scrollOffset = Math.max(0, categoryIdx - 1) * mediaListPagerPad;
				const newScrollLeft = pagerPads + scrollOffset;
				if (newScrollLeft > currentScrollLeft) {
					mediaListPagerEl.scrollBy({
						left: Number.EPSILON,
					});
				} else if (newScrollLeft < currentScrollLeft) {
					mediaListPagerEl.scrollBy({
						left: -Number.EPSILON,
					});
				}
			}
		}
		lastVisualViewportWidth = newVisualViewportWidth;
	})
		
	onMount(async () => {
		mediaListPagerEl.addEventListener("scroll", () => {
			mediaListPagerIsChanging = true;

			window.showCategoriesNav?.(true, true);

			const originalScrollLeft = parseInt(mediaListPagerEl.scrollLeft);

			const offsetWidth = mediaListPagerEl.getBoundingClientRect().width;

			const base = offsetWidth + mediaListPagerPad;
			const idx = Math.round(originalScrollLeft / (offsetWidth + mediaListPagerPad));

			if (idx >= 0 && idx !== panningIdx) {
				const children = Array.from(mediaListPagerEl?.children);
				const child = children?.[idx];
				const category = child?.dataset?.category;
				if (category != null) {
					window.scrollToSelectedCategory?.(category);
					panningCategory = category;
				}
				panningIdx = idx;
			}

			const remainder = originalScrollLeft % base;
			let pageChanged
			try {
				const mediaListPagerElStyle = getComputedStyle(mediaListPagerEl)
				const { marginLeft, marginRight } = mediaListPagerElStyle
				if (marginLeft && marginLeft === marginRight) {
					pageChanged = remainder === 0
				} else {
					pageChanged = remainder < 1 || base - remainder < 1
				}
			} catch {
				pageChanged = $android ? remainder === 0 : remainder < 1 || base - remainder < 1
			}

			if (pageChanged) {
				const children = Array.from(mediaListPagerEl?.children);
				const child = children?.[panningIdx];
				const category = child?.dataset?.category;

				if (category && category !== $selectedCategory) {
					$selectedCategory = category;
				}
				mediaListPagerIsChanging = false;
			}
		});		

		mediaListPagerEl.addEventListener("scrollend", () => {
			if (mediaListPagerIsChanging) {
				const children = Array.from(mediaListPagerEl?.children);
				const child = children?.[panningIdx];
				const category = child?.dataset?.category;

				if (category && category !== $selectedCategory) {
					$selectedCategory = category;
				}
				mediaListPagerIsChanging = false;
			}
		});
	});

</script>

<div
	id="app"
	class="{($android ? 'android' : '') +
		(isMaxWindowHeight ? ' max-window-height' : '') +
		($popupVisible ? ' popup-visible' : '')}"
>
	<C.Fixed.Navigator />

	<C.Fixed.Menu />

	<main>
		<C.Others.Search />
		<div
			bind:this="{mediaListPagerEl}"
			style:--grid-position="{gridTopPosition + "px"}"
			style:--grid-max-height="{gridMaxHeight + "px"}"
			id="media-list-pager"
			class="{'media-list-pager' +
				(mediaListPagerIsChanging ? ' pager-is-changing' : '') +
				(changingTopPosition ? ' is-changing-top-position' : '') +
				($gridFullView ? ' remove-snap-scroll' : '')}"
			style:--media-list-pager-pad="{mediaListPagerPad + "px"}"
		>
			{#if $categoriesKeys?.length > 0}
				{#each $categoriesKeys || [] as mainCategory (mainCategory)}
					<C.Media.MediaGrid {mainCategory} />
				{/each}
			{:else}
				<C.Media.MediaGrid mainCategory="{''}" />
			{/if}
		</div>
	</main>

	<C.Fixed.Categories />

	<C.Media.Fixed.MediaPopup />

	<C.Media.Fixed.MediaOptionsPopup />

	<C.Others.Confirm
		showConfirm="{$confirmIsVisible}"
		on:confirmed="{handleConfirmationConfirmed}"
		on:cancelled="{handleConfirmationCancelled}"
		{isAlert}
		{confirmTitle}
		{confirmText}
		{confirmLabel}
		{cancelLabel}
		{isImportant}
	/>

	{#if shownProgress > 0 && shownProgress < 100}
		<div
			out:fade="{{ duration: 0, delay: 400 }}"
			on:outrostart="{(e) => {
				e.target.style.setProperty('--progress', '0%');
			}}"
			id="progress"
			class="{'progress' +
				(isBelowNav ? ' is-below-absolute-progress' : '')}"
			style:--progress="{"-" + (100 - shownProgress) + "%"}"
		></div>
	{/if}

	{#if $toast}
		<div 
			role="progressbar"
			class="message-toast"
			transition:fade="{{ duration: 200 }}"
		>{$toast}</div>
	{/if}
</div>

<style>
	:global(html) {
		color-scheme: dark !important;
		overflow-y: overlay !important;
		scrollbar-gutter: stable !important;
	}
	#app {
		width: 100%;
		min-height: calc(100vh - 57px);
		overflow-x: clip;
	}
	#app.android {
		user-select: none !important;
	}
	@media screen and not (pointer:fine) {
		#app {
			user-select: none !important;
		}
	}
	main {
		height: calc(100% - 57px) !important;
		width: 100%;
		margin: 57px auto 0 !important;
		max-width: 1140px;
	}
	.progress.has-custom-filter-nav,
	:global(.progress:has(~#nav-container.delayed-full-screen-popup)) {
		position: fixed !important;
	}
	.progress {
		background-color: var(--fg-color);
		position: fixed;
		top: 0px;
		z-index: 1003;
		height: 2px;
		width: 100%;
		transform: translateX(var(--progress));
		transition: transform 0.3s linear;
	}

	.media-list-pager {
		--media-list-pager-pad: 0;
		display: flex;
		overflow-x: auto;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		column-gap: var(--media-list-pager-pad);
		-ms-overflow-style: none;
		scrollbar-width: none;
		width: calc(100% - 100px);
		margin: 0 auto;
	}

	.media-list-pager::-webkit-scrollbar {
		display: none;
	}

	.media-list-pager.remove-snap-scroll {
		overflow: hidden !important;
	}

	.message-toast {
		position: fixed;
		bottom: 45px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 9001;
		padding: 8px 20px;
		background: hsl(0, 0%, 32%);
		border-radius: 25px;
		min-height: 50px;
		min-width: 100px;
		width: max-content;
		max-width: 100%;
		display: grid;
		justify-content: center;
		align-items: center;
		color: var(--fg-color);
		box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.2);
	}

	@media screen and (max-width: 750px) {
		.progress {
			position: absolute;
			height: 1px !important;
			top: 55px !important;
			z-index: 1000;
		}
		.progress.is-below-absolute-progress {
			position: fixed;
			height: 2px !important;
			top: 0px !important;
			z-index: 1003 !important;
		}
		#app.android > #progress.is-below-absolute-progress {
			height: 1px !important;
		}
		:global(.progress:has(~ #nav-container.delayed-full-screen-popup:not(.layout-change):not(.hide))) {
			height: 1px !important;
			top: 55px !important;
			z-index: 1000 !important;
		}
		.media-list-pager {
			width: calc(100% - 20px);
		}
	}
</style>
