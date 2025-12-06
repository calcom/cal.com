/**
 * Alert Utilities
 *
 * Helper functions for showing alerts with environment-aware behavior.
 * Error alerts are only shown in development mode to avoid confusing users in production.
 */

import { Alert } from "react-native";

/**
 * Show an error alert only in development mode.
 * In production, errors are silently logged to console.
 *
 * @param title - The alert title
 * @param message - The error message to display
 */
export const showErrorAlert = (title: string, message: string) => {
  if (__DEV__) {
    Alert.alert(title, message);
  } else {
    console.error(`[${title}] ${message}`);
  }
};

/**
 * Show a confirmation alert (always shown - user-initiated actions)
 * This is a direct reference to Alert.alert for consistency.
 */
export const showConfirmAlert = Alert.alert;

/**
 * Show a success alert (always shown - user feedback)
 *
 * @param title - The alert title
 * @param message - The success message to display
 */
export const showSuccessAlert = (title: string, message: string) => {
  Alert.alert(title, message);
};
