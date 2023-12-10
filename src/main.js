import App from './App.svelte';

import './css/global.css';

if (!window?.location?.protocol?.includes?.("file") && 'serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw.js')
}

const app = new App({
	target: document.body
});

export default app;
