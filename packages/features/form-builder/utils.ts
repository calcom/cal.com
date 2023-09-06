import type z from "zod";

import { fieldTypesConfigMap } from "./fieldTypes";
import type { fieldSchema } from "./schema";

export const preprocessNameFieldDataWithVariant = (
  variantName: "fullName" | "firstAndLastName",
  value: string | Record<"firstName" | "lastName", string> | undefined
) => {
  // We expect an object here, but if we get a string, then we will try to transform it into the appropriate object
  if (variantName === "firstAndLastName") {
    return getFirstAndLastName(value);
    // We expect a string here, but if we get an object, then we will try to transform it into the appropriate string
  } else {
    return getFullName(value);
  }
};

export const getFullName = (name: string | { firstName: string; lastName?: string } | undefined) => {
  if (!name) {
    return "";
  }
  let nameString = "";
  if (typeof name === "string") {
    nameString = name;
  } else {
    nameString = name.firstName;
    if (name.lastName) {
      nameString = nameString + " " + name.lastName;
    }
  }
  return nameString;
};

function getFirstAndLastName(value: string | Record<"firstName" | "lastName", string> | undefined) {
  let newValue: Record<"firstName" | "lastName", string>;
  value = value || "";
  if (typeof value === "string") {
    try {
      // Support name={"firstName": "John", "lastName": "Johny Janardan"} for prefilling
      newValue = JSON.parse(value);
    } catch (e) {
      // Support name="John Johny Janardan" to be filled as firstName="John" and lastName="Johny Janardan"
      const parts = value.split(" ").map((part) => part.trim());
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ");

      // If the value is not a valid JSON, then we will just use the value as is as it can be the full name directly
      newValue = { firstName, lastName };
    }
  } else {
    newValue = value;
  }
  return newValue;
}

/**
 * Get's the field's variantsConfig and if not available, then it will get the default variantsConfig from the fieldTypesConfigMap
 */
export const getVariantsConfig = (field: Pick<z.infer<typeof fieldSchema>, "variantsConfig" | "type">) => {
  const fieldVariantsConfig = field.variantsConfig;
  const fieldTypeConfig = fieldTypesConfigMap[field.type as keyof typeof fieldTypesConfigMap];

  if (!fieldTypeConfig) throw new Error(`Invalid field.type ${field.type}}`);

  const defaultVariantsConfig = fieldTypeConfig?.variantsConfig?.defaultValue;
  const variantsConfig = fieldVariantsConfig || defaultVariantsConfig;

  if (fieldTypeConfig.propsType === "variants" && !variantsConfig) {
    throw new Error(`propsType variants must have variantsConfig`);
  }
  return variantsConfig;
};

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
const mimeTypeList = {
  ".aac": "audio/aac",
  ".abw": "application/x-abiword",
  ".arc": "application/x-freearc",
  ".avif": "image/avif",
  ".avi": "video/x-msvideo",
  ".azw": "application/vnd.amazon.ebook",
  ".bin": "application/octet-stream",
  ".bmp": "image/bmp",
  ".bz": "application/x-bzip",
  ".bz2": "application/x-bzip2",
  ".cda": "application/x-cdf",
  ".csh": "application/x-csh",
  ".css": "text/css",
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".eot": "application/vnd.ms-fontobject",
  ".epub": "application/epub+zip",
  ".gz": "application/gzip",
  ".gif": "image/gif",
  ".html": "text/html",
  ".htm": "text/html",
  ".ico": "image/vnd.microsoft.icon",
  ".ics": "text/calendar",
  ".jar": "application/java-archive",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript",
  ".json": "application/json",
  ".jsonld": "application/ld+json",
  ".midi": "audio/midi, audio/x-midi",
  ".mid": "audio/midi, audio/x-midi",
  ".mjs": "text/javascript",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".mpeg": "video/mpeg",
  ".mpkg": "application/vnd.apple.installer+xml",
  ".odp": "application/vnd.oasis.opendocument.presentation",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".oga": "audio/ogg",
  ".ogv": "video/ogg",
  ".ogx": "application/ogg",
  ".opus": "audio/opus",
  ".otf": "font/otf",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".php": "application/x-httpd-php",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".rar": "application/vnd.rar",
  ".rtf": "application/rtf",
  ".sh": "application/x-sh",
  ".svg": "image/svg+xml",
  ".tar": "application/x-tar",
  ".tif, .tiff": "image/tiff",
  ".ts": "video/mp2t",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
  ".vsd": "application/vnd.visio",
  ".wav": "audio/wav",
  ".weba": "audio/webm",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xhtml": "application/xhtml+xml",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xml": "application/xml",
  ".xul": "application/vnd.mozilla.xul+xml",
  ".zip": "application/zip",
  ".3gp": "video/3gpp; audio/3gpp",
  ".3g2": "video/3gpp2; audio/3gpp2",
  ".7z": "application/x-7z-compressed",
};

export const getFileUploadAccept = (mime: string | undefined) => {
  const acceptValues: Record<string, string[]> = {};

  if (mime && mime !== "") {
    const mimeList = mime.split(",");

    for (const value of mimeList) {
      const type = mimeTypeList[value as keyof typeof mimeTypeList];

      if (type) {
        acceptValues[type] = acceptValues[type] || [];
        acceptValues[type].push(value);
      }
    }
  }

  return acceptValues;
};
