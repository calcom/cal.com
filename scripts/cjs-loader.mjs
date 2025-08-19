/**
 * Custom ESM loader to force CommonJS resolution for app-store e2e tests
 * This loader helps resolve the module system mismatch between ESM (Playwright) 
 * and CommonJS (calendar app packages)
 */

export async function resolve(specifier, context, defaultResolve) {
  // For app-store calendar service imports, ensure they're treated as CommonJS
  if (specifier.includes('app-store') && specifier.includes('CalendarService')) {
    const result = await defaultResolve(specifier, context);
    return {
      ...result,
      format: 'commonjs'
    };
  }
  
  // For other app-store package imports, prefer CommonJS resolution
  if (specifier.includes('packages/app-store/')) {
    const result = await defaultResolve(specifier, context);
    return {
      ...result,
      format: result.format === 'module' ? 'commonjs' : result.format
    };
  }
  
  return defaultResolve(specifier, context);
}

export async function load(url, context, defaultLoad) {
  // Handle CommonJS modules that need to be loaded in ESM context
  if (context.format === 'commonjs' && url.includes('app-store')) {
    const result = await defaultLoad(url, context);
    return result;
  }
  
  return defaultLoad(url, context);
}
