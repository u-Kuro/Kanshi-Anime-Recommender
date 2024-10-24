import './css/global.css';
import App from './App.svelte';
import { get } from 'svelte/store';
import { android, dataStatus, progress } from './js/globalValues';

try {
	if (!get(android)) {
		const channel = new BroadcastChannel('tab');
		channel.postMessage('changed-tab');
		channel.addEventListener('message', (msg) => {
			if (msg.data === 'changed-tab') {
				const url = "https://kanshi.changed.tab"
				try {
					window.location.href = url
				} catch {}
				try {
					window.location.assign("https://kanshi.changed.tab")
				} catch {}
				try {
					window.open(url, '_self')
				} catch {}
			}
		});
	}
} catch {}

navigator.serviceWorker.register("sw.js")
navigator.serviceWorker.onmessage = ({ data }) => {
	if (data.type === "progress") {
		const { percent, message } = data
		progress.set(percent)
		dataStatus.set(`${percent.toFixed(2)}% ${message}`)
	}
};
// const app = new App({
// 	target: document.body
// });

// export default app;
