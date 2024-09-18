import './css/global.css';
import App from './App.svelte';
import { get } from 'svelte/store';
import { android } from './js/globalValues';

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

try {
	const intersectionObserver = new IntersectionObserver((entries) => {
		setTimeout(() => {
			for (let i = 0; i < entries.length; i++) {
				setTimeout(() => {
					const entry = entries[i];
					if (entry.isIntersecting) {
						try {
							const opacity = entry.target.style.opacity
							entry.target.style.opacity = '0.99';
							requestAnimationFrame(() => {
								entry.target.style.opacity = opacity;
							})
						} catch {}
					
					}
				})
			}
		})
	});

	new MutationObserver((mutations) => {
		setTimeout(() => {
			for (let i = 0; i < mutations.length; i++) {
				setTimeout(() => {
					const mutation = mutations[i];
					try {
						for (let j = 0; j < mutation.addedNodes.length; j++) {
							setTimeout(() => {
								try {
									const node = mutation.addedNodes[j];
									intersectionObserver.observe(node);
									const children = node.querySelectorAll('*')
									for (let k = 0; k < children.length; k++) {
										setTimeout(() => {
											try {
												intersectionObserver.observe(children[k]);
											} catch {}
										})
									}
								} catch {}
							})
						}
					} catch {}
					try {
						for (let j = 0; j < mutation.removedNodes.length; j++) {
							setTimeout(() => {
								try {
									const node = mutation.removedNodes[j];
									intersectionObserver.unobserve(node);
									const children = node.querySelectorAll('*')
									for (let k = 0; k < children.length; k++) {
										setTimeout(() => {
											try {
												intersectionObserver.unobserve(children[k]);
											} catch {}
										})
									}
								} catch {}
							})
						}
					} catch {}
				})
			}
		})
	}).observe(document.body, { childList: true, subtree: true });
} catch {}

const app = new App({
	target: document.body
});

export default app;
