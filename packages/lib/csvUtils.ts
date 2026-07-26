// Excel, LibreOffice and Google Sheets evaluate a cell as a formula when it
// starts with any of these. Leading whitespace is skipped by the parsers, so
// it has to be skipped here too.
const FORMULA_TRIGGER = /^[\s]*[=+\-@\t\r]/;

export const downloadAsCsv = (data: string | Record<string, any>[], filename: string) => {
  // If data is an array of objects, convert it to CSV string
  const csvString = typeof data === "string" ? data : objectsToCsv(data);

  // Create a Blob from the text data
  const blob = new Blob([csvString], { type: "text/plain" });

  // Create an Object URL for the Blob
  const url = window.URL.createObjectURL(blob);

  // Create a download link
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  // Simulate a click event to trigger the download
  a.click();

  // Release the Object URL to free up memory
  window.URL.revokeObjectURL(url);
};

export const objectsToCsv = (data: Record<string, any>[]): string => {
  if (!data.length) return "";

  // Get headers from the first object
  const headers = Object.keys(data[0]);

  // Create CSV rows
  const csvRows = [
    // Header row
    headers
      .map((header) => sanitizeValue(header))
      .join(","),
    // Data rows
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          return sanitizeValue(value?.toString() ?? "");
        })
        .join(",")
    ),
  ];

  return csvRows.join("\n");
};

export const sanitizeValue = (value: string) => {
  // Spreadsheet apps evaluate a leading =, +, -, @, tab or CR as a formula, and
  // they do so *after* stripping the CSV quotes - so quoting alone is not enough.
  // Prefix with a single quote to neutralise it (OWASP CSV injection guidance).
  const neutralized = FORMULA_TRIGGER.test(value) ? `'${value}` : value;

  // handling three cases:
  // 1. quotes - we need to double quotes for CSV
  // 2. commas
  // 3. line breaks - CR, LF and CRLF are all record separators per RFC 4180,
  //    so a bare \r has to be quoted too or it splits the row
  if (neutralized.includes('"')) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  if (neutralized.includes(",") || /[\r\n]/.test(neutralized)) {
    return `"${neutralized}"`;
  }
  return neutralized;
};
