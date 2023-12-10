import App from './App.svelte';
import './css/global.css';

try {
	let location = window?.location;
	if (
		!location?.protocol?.includes?.("file") &&
		"serviceWorker" in navigator
	) {
		let path = location.pathname;
		path = path.endsWith("/") ? path : path + "/";
		navigator.serviceWorker.register(`${path}sw.js`);
	}
} catch (e) { }

const app = new App({
	target: document.body
});

export default app;
