import { fireEvent } from "http://localhost:3000/sdk-event.js";
Cal.__config = {
	origin: "http://localhost:3000"
};

Cal.configure = ({ origin }) => {
	Cal.__config.origin = origin;
}

function getConfig() {
	return Cal.__config;
}

Cal.init = ({ calendarLink }) => {
	const iframe = document.createElement('iframe');
	const config = getConfig();
	iframe.className = "cal-embed";
	iframe.src = `${config.origin}/${calendarLink}`;
	iframe.style.height = "100%";
	iframe.style.width = "100%";
	document.body.appendChild(iframe);
}

window.addEventListener("message", (e) => {
	const detail = e.data;
	fireEvent(detail.type, detail.data);
})