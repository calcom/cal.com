import os from "node:os";
import path from "node:path"

export const APP_STORE_PATH = path.join(__dirname, "..", "..", "app-store");
export const APPS_PATH = path.join(APP_STORE_PATH, "apps");
export const GENERATED_PATH = path.join(APP_STORE_PATH, "generated");
export const SRC_PATH = path.join(APP_STORE_PATH, "src");
export const TEMPLATES_PATH = path.join(SRC_PATH, "templates");
export const IS_WINDOWS_PLATFORM = os.platform() === "win32";
