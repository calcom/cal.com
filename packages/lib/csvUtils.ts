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
