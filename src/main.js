import "./css/global.css";
import App from "./App.svelte";
import { get } from "svelte/store";
import { android } from "./js/variables";

if (!get(android)) {
	const channel = new BroadcastChannel("tab");
	channel.postMessage("changed-tab");
	channel.onmessage = ({ data }) => {
		if (data === "changed-tab") {
			window.location.href = "https://kanshi.changed.tab"
		}
	};
}

export default new App({
	target: document.body
});