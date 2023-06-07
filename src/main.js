import App from './App.svelte';

import './css/global.css';
import './js/others/fontawesome-5.0.js';
import './css/font-awesome-pro-6.4.0.min.css';
import { inject } from '@vercel/analytics';
inject();

const app = new App({
	target: document.body
});

export default app;
