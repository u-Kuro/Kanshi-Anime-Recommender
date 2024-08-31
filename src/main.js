import './css/global.css';
import App from './App.svelte';
import { get } from 'svelte/store';
import { android } from './js/globalValues';

try{
	if (!get(android)) {
		const channel = new BroadcastChannel('tab');
		channel.postMessage('changed-tab');
		channel.addEventListener('message', (msg) => {
			if (msg.data === 'changed-tab') {
				const url = "https://kanshi.changed.tab"
				try{
					window.location.href = url
				}catch{}
				try{
					window.location.assign("https://kanshi.changed.tab")
				}catch{}
				try{
					window.open(url, '_self')
				}catch{}
			}
		});
	}
}catch{}

const app = new App({
	target: document.body
});

export default app;
