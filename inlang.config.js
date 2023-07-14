
// see https://inlang.com/
export async function defineConfig(env) {

	const { default: i18nextPlugin } = await env.$import(
		"https://cdn.jsdelivr.net/npm/@inlang/plugin-i18next@2/dist/index.js",
	)

  const { default: standardLintRules } = await env.$import(
		"https://cdn.jsdelivr.net/npm/@inlang/plugin-standard-lint-rules@3/dist/index.js",
	)

	return {
		referenceLanguage: "en",
		plugins: [
			i18nextPlugin({
				pathPattern: "./apps/web/public/static/locales/{language}/common.json",
			}),
      standardLintRules({
        // deactivating identical pattern because of nested
        // resources like "de-DE" and "de-AT" where "de-AT"
        // contrains overwrites but the majority are identical patterns. 
        identicalPattern: "off"
      }),
		],
	}
}