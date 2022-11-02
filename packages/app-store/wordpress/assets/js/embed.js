(function (C, A, L) {
	let p = function (a, ar) {
		a.q.push(ar);
	};
	let d = C.document;
	C.Cal =
		C.Cal ||
		function () {
			let cal = C.Cal;
			let ar = arguments;
			if (!cal.loaded) {
				cal.ns = {};
				cal.q = cal.q || [];
				d.head.appendChild(d.createElement("script")).src = A;
				cal.loaded = true;
			}
			if (ar[0] === L) {
				const api = function () {
					p(api, arguments);
				};
				const namespace = ar[1];
				api.q = api.q || [];
				typeof namespace === "string"
					? (cal.ns[namespace] = api) && p(api, ar)
					: p(cal, ar);
				return;
			}
			p(cal, ar);
		};
})(window, "https://cal.com/embed.js", "init");
Cal("init");
