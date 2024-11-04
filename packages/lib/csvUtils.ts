export const downloadAsCsv = (csvRaw: string, filename: string) => {
  // Create a Blob from the text data
  const blob = new Blob([csvRaw], { type: "text/plain" });

  // Create an Object URL for the Blob
  const url = window.URL.createObjectURL(blob);

  // Create a download link
  const a = document.createElement("a");
  a.href = url;
  a.download = filename; // Specify the filename

  // Simulate a click event to trigger the download
  a.click();

  // Release the Object URL to free up memory
  window.URL.revokeObjectURL(url);
};

export const sanitizeValue = (value: string) => {
  // handling three cases:
  // 1. quotes - we need to double quotes for CSV
  // 2. commas
  // 3. newlines
  if (value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  if (value.includes(",") || value.includes("\n")) {
    return `"${value}"`;
  }
  return value;
};
