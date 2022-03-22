import { fireEvent, addEventListener } from "http://localhost:3000/sdk-event.js";
let iframe = null;
Cal.__config = {
	origin: "http://localhost:3000"
};

//TODO: Move it to a CSS file and import
const css = `
	.cal-embed {
		border: 0px;
	}
`;
document.head.appendChild(document.createElement('style')).innerHTML = css;

function log(...args) {
	console.log(...args)
}

function processInstruction(instruction) {
	const [method, argument] = instruction;
	if (!Cal[method]) {
		// Instead of throwing error, log and move forward in the queue
		log(`Instruction ${method} not found`);
	}
	try {
		Cal[method](argument);
	} catch (e) {
		// Instead of throwing error, log and move forward in the queue
		log(`Instruction couldn't be executed`, e);
	}
}

function processQueue(queue) {
	queue.forEach((instruction) => {
		processInstruction(instruction)
	})

	queue.splice(0);

	queue.push = (instruction) => {
		processInstruction(instruction)
	}
}

Cal.configure = ({ origin }) => {
	Cal.__config.origin = origin;
}

function getConfig() {
	return Cal.__config;
}

// Cal.init = ({ calendarLink }) => {

// }

function createIframe({ calendarLink }) {
	const iframe = document.createElement('iframe');
	iframe.scrolling = "no";
	const config = getConfig();
	iframe.src = `${config.origin}/${calendarLink}`;
	return iframe;
}

window.addEventListener("message", (e) => {
	const detail = e.data;
	if (!e.data.fullType?.startsWith("Cal.")) {
		return;
	}
	fireEvent(detail.type, detail.data);
});

(function () {
	function setAppropriateHeight(proposedHeightByIframeWebsite) {
		iframe.style.height = proposedHeightByIframeWebsite;
	}
	// 1. Initial iframe width and height would be according to 100% value of the parent element
	// 2. Once webpage inside iframe renders, it would tell how much iframe height should be increased so that my entire content is visible without iframe scroll
	// 3. Parent window would check what iframe height can be set according to parent Element
	addEventListener("dimension-changed", (e) => {
		const { data } = e.detail
		let proposedHeightByIframeWebsite = parseFloat(getComputedStyle(iframe).height) + data.hiddenHeight
		setAppropriateHeight(proposedHeightByIframeWebsite);
	});
})();

Cal.inline = ({ calendarLink, elementOrSelector }) => {
	iframe = createIframe({ calendarLink })
	iframe.className = "cal-embed";
	iframe.style.height = "100%";
	iframe.style.width = "100%";
	let element = elementOrSelector instanceof HTMLElement ? elementOrSelector : document.querySelector(elementOrSelector)
	if (!element) {
		throw new Error("Element not found");
	}
	element.appendChild(iframe);
}

processQueue(Cal.q)
