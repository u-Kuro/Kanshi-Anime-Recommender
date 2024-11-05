import { get } from "svelte/store";
import { inject } from "@vercel/analytics";
import { android, confirmPromise } from "../variables";

const showErrorMessage = () => {
    if (get(android)) {
        get(confirmPromise)({
            isAlert: true,
            title: "Something went wrong",
            text: "App may not be working properly, restart the app or clear your cache, if it still fails you may want to reinstall the app.",
        });
    } else {
        get(confirmPromise)({
            isAlert: true,
            title: "Something went wrong",
            text: "App may not be working properly, refresh the page or clear this website data, this also does not run in incognito.",
        });
    }
}

const loadYoutube = () => {
    window.onYouTubeIframeAPIReady = () => window.playMostVisibleTrailer?.();
    const YTscript = document.createElement("script");
    YTscript.onload = () =>  window.onYouTubeIframeAPIReady();
    YTscript.src = "https://www.youtube.com/iframe_api?v=16";
    YTscript.id = "www-widgetapi-script";
    YTscript.defer = true;
    document.head.appendChild(YTscript);
}

const loadAnalytics = () => {
    try {
        const isVercel = location.origin === "https://kanshi.vercel.app";
        // Google Analytics
        const GAscript = document.createElement("script");
        GAscript.onload = () => {
            window.dataLayer = window.dataLayer || [];
            const gtag = () => dataLayer.push(arguments);
            gtag("js", new Date());
            if (isVercel) {
                gtag("config", "G-F5E8XNQS20");
            } else {
                gtag("config", "G-PPMY92TJCE");
            }
        };
        if (isVercel) {
            inject(); // Vercel Analytics
            GAscript.src = "https://www.googletagmanager.com/gtag/js?id=G-F5E8XNQS20";
        } else {
            GAscript.src = "https://www.googletagmanager.com/gtag/js?id=G-PPMY92TJCE";
        }
        GAscript.defer = true;
        document.head.appendChild(GAscript);
    } catch (ex) { console.error(ex); }
}

export {
    loadYoutube,
    loadAnalytics,
    showErrorMessage,
}