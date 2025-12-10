import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Environment configuration using expo-constants
 *
 * This module provides a centralized way to access environment variables
 * across all platforms (iOS, Android, Web) using Expo's Constants API.
 *
 * For native builds (iOS/Android), environment variables are loaded from:
 * - app.json/app.config.js `extra` field
 * - EAS build environment variables
 *
 * For web builds, environment variables are loaded from:
 * - process.env (for Expo web bundler)
 * - import.meta.env (for Vite/WXT extension builds)
 */

interface EnvConfig {
  CALCOM_OAUTH_CLIENT_ID: string;
  CALCOM_OAUTH_REDIRECT_URI: string;
  CALCOM_BASE_URL: string;
}

/**
 * Get environment variable value with fallback support
 * Checks multiple sources in order of priority:
 * 1. expo-constants extra config (for native builds)
 * 2. process.env (for Expo web bundler)
 * 3. import.meta.env (for Vite/WXT builds)
 */
function getEnvVar(key: string, defaultValue: string = ""): string {
  // For native platforms, use expo-constants
  const expoConfig = Constants.expoConfig;
  const extra = expoConfig?.extra;

  if (extra && extra[key]) {
    return extra[key] as string;
  }

  // For web platform, check process.env with EXPO_PUBLIC_ prefix
  if (Platform.OS === "web") {
    const envKey = `EXPO_PUBLIC_${key}`;

    // Check process.env (Expo web bundler)
    if (typeof process !== "undefined" && process.env && process.env[envKey]) {
      return process.env[envKey] as string;
    }

    // Check import.meta.env (Vite/WXT builds)
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[envKey]) {
      return import.meta.env[envKey] as string;
    }
  }

  return defaultValue;
}

/**
 * Environment configuration object
 * Access environment variables through this object for cross-platform compatibility
 */
export const env: EnvConfig = {
  CALCOM_OAUTH_CLIENT_ID: getEnvVar("CALCOM_OAUTH_CLIENT_ID"),
  CALCOM_OAUTH_REDIRECT_URI: getEnvVar("CALCOM_OAUTH_REDIRECT_URI"),
  CALCOM_BASE_URL: getEnvVar("CALCOM_BASE_URL", "https://app.cal.com"),
};

/**
 * Validate that required environment variables are set
 * Call this during app initialization to catch configuration errors early
 */
export function validateEnv(): { isValid: boolean; missingVars: string[] } {
  const requiredVars = ["CALCOM_OAUTH_CLIENT_ID"];
  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    if (!env[varName as keyof EnvConfig]) {
      missingVars.push(varName);
    }
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
}

export default env;
