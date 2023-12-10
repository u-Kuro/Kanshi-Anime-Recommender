import App from './App.svelte';
import { inject } from "@vercel/analytics";
import './css/global.css';

try {
	let location = window?.location
	if (location?.origin === "https://kanshi.vercel.app") {
		inject(); // Vercel Analytics
	}
	if (!location?.protocol?.includes?.("file") && 'serviceWorker' in navigator) {
		let path = location.pathname;
		path = path.endsWith('/') ? path : path + '/'
		path = path.includes('/index.html') ? path.replace('/index.html', '') : path
		navigator.serviceWorker.register(`${path}sw.js`)
	}
} catch (e) { }

const app = new App({
	target: document.body
});

export default app;
