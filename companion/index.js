// Set up global error handlers before anything else
if (typeof global !== 'undefined') {
  // Suppress console warnings in production to prevent crashes from excessive logging
  if (!__DEV__) {
    console.warn = () => {};
    console.error = () => {};
  }
  
  // Global error handler
  global.ErrorUtils?.setGlobalHandler((error, isFatal) => {
    console.log('Global error handler:', error, 'isFatal:', isFatal);
    if (isFatal) {
      // In production, we could send to error tracking service
      console.log('Fatal error occurred, but app will try to continue');
    }
  });
}

import 'expo-router/entry';
