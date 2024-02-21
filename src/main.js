import './css/global.css';
import App from './App.svelte';

// Remove Other Session
try {
	const closeKey = "Kanshi.Anime.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70.Close"
	window.localStorage.removeItem(closeKey)
	window.localStorage.setItem(closeKey, 0)
	window.addEventListener("storage", e => e.key === closeKey && window.open("https://kanshi.vercel.app.removed"))
} catch (e) { }

const app = new App({
	target: document.body
});

export default app;
