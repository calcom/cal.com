import os from "os";
import path from "path";

export const APP_STORE_PATH = path.join(__dirname, "..", "..", "app-store");
export const APP_STORE_APPS_PATH = path.join(__dirname, "..", "..", "apps");
export const TEMPLATES_PATH = path.join(APP_STORE_PATH, "templates");
export const IS_WINDOWS_PLATFORM = os.platform() === "win32";
