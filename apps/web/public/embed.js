import { SdkEventManager } from "http://localhost:3000/sdk-event-manager.js";
let iframe = null;
const globalCal = window.Cal;

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

class Cal {
	processInstruction(instruction) {
		const [method, argument] = instruction;
		if (!this[method]) {
			// Instead of throwing error, log and move forward in the queue
			log(`Instruction ${method} not found`);
		}
		try {
			this[method](argument);
		} catch (e) {
			// Instead of throwing error, log and move forward in the queue
			log(`Instruction couldn't be executed`, e);
		}
	}

	processQueue(queue) {
		queue.forEach((instruction) => {
			this.processInstruction(instruction)
		})

		queue.splice(0);

		queue.push = (instruction) => {
			this.processInstruction(instruction)
		}
	}

	createIframe({ calendarLink }) {
		const iframe = document.createElement('iframe');
		// FIXME: scrolling seems deprecated, though it works on Chrome. What's the recommended way to do it?
		iframe.scrolling = "no";
		const config = this.getConfig();
		const urlInstance = new URL(`${config.origin}/${calendarLink}`)
		urlInstance.searchParams.set("embed", this.namespace);
		iframe.src = urlInstance.toString();
		return iframe;
	}

	configure({ origin }) {
		this.__config.origin = origin;
	}

	getConfig() {
		return this.__config;
	}

	inline({ calendarLink, elementOrSelector }) {
		const iframe = this.iframe = this.createIframe({ calendarLink })
		iframe.className = "cal-embed";
		iframe.style.height = "100%";
		iframe.style.width = "100%";
		let element = elementOrSelector instanceof HTMLElement ? elementOrSelector : document.querySelector(elementOrSelector)
		if (!element) {
			throw new Error("Element not found");
		}
		element.appendChild(iframe);
	}

	on({ action, callback }) {
		this.actionManager.on(action, callback);
	}

	constructor(namespace, q) {
		this.__config = {
			origin: "http://localhost:3000"
		};

		this.namespace = namespace;
		this.actionManager = new SdkEventManager(namespace);
		Cal.actionManagers = Cal.actionManagers || {};
		Cal.actionManagers[namespace] = this.actionManager;
		this.processQueue(q);
		function setAppropriateHeight({ iframe, proposedHeightByIframeWebsite }) {
			iframe.style.height = proposedHeightByIframeWebsite;
		}
		// 1. Initial iframe width and height would be according to 100% value of the parent element
		// 2. Once webpage inside iframe renders, it would tell how much iframe height should be increased so that my entire content is visible without iframe scroll
		// 3. Parent window would check what iframe height can be set according to parent Element
		this.actionManager.on("dimension-changed", (e) => {
			const { data } = e.detail
			let proposedHeightByIframeWebsite = parseFloat(getComputedStyle(iframe).height) + data.hiddenHeight
			const iframe = this.iframe
			setAppropriateHeight({ iframe, proposedHeightByIframeWebsite });
		});
	}
}

globalCal.instance = new Cal("", globalCal.q)

for (let [ns, api] of Object.entries(globalCal.ns)) {
	api.instance = new Cal(ns, api.q);
}

/**
 * Intercepts all postmessages and fires action in corresponding actionManager
 */
window.addEventListener("message", (e) => {
	const detail = e.data;
	const fullType = detail.fullType;
	const parsedAction = SdkEventManager.parseAction(fullType)
	if (!parsedAction) {
		return;
	}
	const actionManager = Cal.actionManagers[parsedAction.ns]
	if (!actionManager) {
		throw new Error("Unhandled Action", parsedAction)
	}
	actionManager.fire(parsedAction.type, detail.data);
});