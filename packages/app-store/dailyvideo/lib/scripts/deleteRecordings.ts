// This script is used to delete recordings older than 6 months from Daily.co
//
// Commands to run:
// 1. Fetch recordings older than 6 months and save to JSON:
//    ts-node packages/app-store/dailyvideo/lib/scripts/deleteRecordings.ts
//
// 2. Delete recordings from the JSON file (shows preview first, then prompts for confirmation):
//    ts-node packages/app-store/dailyvideo/lib/scripts/deleteRecordings.ts delete

interface Recording {
  id: string;
  room_name: string;
  mtgSessionId: string;
  status: string;
  start_ts: number;
  duration: number;
  max_participants?: number;
  share_token?: string;
  s3key?: string;
  isVttEnabled?: boolean;
  tracks?: unknown[];
}

interface RecordingsResponse {
  data: Recording[];
  total_count: number;
}

async function getAllRecordingsOlderThan6Months(): Promise<Recording[]> {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    console.error("DAILY_API_KEY environment variable is required");
    process.exit(1);
  }

  const baseUrl = "https://api.daily.co/v1/recordings";
  const allRecordings: Recording[] = [];
  const limit = 100;

  // Calculate date 6 months ago
  const cutoffDate = new Date();
  cutoffDate.setUTCMonth(cutoffDate.getUTCMonth() - 6);
  cutoffDate.setUTCHours(0, 0, 0, 0);
  const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

  console.log(
    `Fetching all recordings older than 6 months (before ${
      cutoffDate.toISOString().split("T")[0]
    }, timestamp: ${cutoffTimestamp})...`
  );

  let hasMoreRecordings = true;
  let requestCount = 0;
  const startTime = Date.now();
  let endingBefore = "OLDEST";

  while (hasMoreRecordings) {
    requestCount++;
    const elapsedTime = Date.now() - startTime;
    const expectedMinTime = (requestCount - 1) * 50;

    if (elapsedTime < expectedMinTime) {
      const delayTime = expectedMinTime - elapsedTime;
      console.log(`Rate limiting: waiting ${delayTime}ms before next request...`);
      await new Promise((resolve) => setTimeout(resolve, delayTime));
    }

    const url = new URL(baseUrl);
    url.searchParams.append("limit", limit.toString());

    if (endingBefore) {
      url.searchParams.append("ending_before", endingBefore);
    }

    let retries = 0;
    const maxRetries = 5;
    let response: Response | undefined;

    while (retries <= maxRetries) {
      try {
        console.log("url", url.toString());
        response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          break;
        }

        if (response.status === 404) {
          console.log("No recordings found or endpoint not available");
          return [];
        }

        if (response.status === 429) {
          if (retries < maxRetries) {
            const backoffDelay = Math.pow(2, retries) * 1000;
            console.log(
              `Rate limit exceeded (429). Retrying in ${backoffDelay / 1000}s... (attempt ${retries + 1}/${
                maxRetries + 1
              })`
            );
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
            retries++;
            continue;
          } else {
            throw new Error(`Rate limit exceeded after ${maxRetries + 1} attempts`);
          }
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      } catch (error) {
        if (retries < maxRetries && (error as Error).message.includes("fetch")) {
          const backoffDelay = Math.pow(2, retries) * 1000;
          console.log(
            `Network error. Retrying in ${backoffDelay / 1000}s... (attempt ${retries + 1}/${maxRetries + 1})`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          retries++;
          continue;
        }
        throw error;
      }
    }

    if (!response?.ok) {
      throw new Error(`Failed to fetch recordings after ${maxRetries + 1} attempts`);
    }

    const data = (await response.json()) as RecordingsResponse;

    if (!data.data || data.data.length === 0) {
      console.log("No more recordings available, ending pagination");
      hasMoreRecordings = false;
      break;
    }

    const filteredRecordings = data.data.filter((recording) => {
      return recording.start_ts < cutoffTimestamp;
    });

    allRecordings.push(...filteredRecordings);
    console.log(
      `Fetched ${data.data.length} recordings, ${filteredRecordings.length} older than 6 months (total: ${allRecordings.length})`
    );

    endingBefore = data.data[0].id;
    console.log("endingBefore", endingBefore);
    console.log("first recording in batch", data.data[0]);
    console.log("last recording in batch", data.data[data.data.length - 1]);

    if (data.data.length < limit) {
      console.log("Received fewer results than limit, reached end of data");
      hasMoreRecordings = false;
      break;
    }

    if (filteredRecordings.length === 0 && data.data.every((r) => r.start_ts >= cutoffTimestamp)) {
      console.log("Reached recordings newer than 6 months, stopping");
      hasMoreRecordings = false;
      break;
    }
  }

  return allRecordings;
}

async function saveRecordingsToJson(recordings: Recording[]): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");

  const simplifiedRecordings = recordings.map((recording) => ({
    id: recording.id,
    room_name: recording.room_name,
    start_ts: recording.start_ts,
    start_date: new Date(recording.start_ts * 1000).toISOString(),
    duration: recording.duration,
    status: recording.status,
    mtgSessionId: recording.mtgSessionId,
    max_participants: recording.max_participants,
    share_token: recording.share_token,
    s3key: recording.s3key,
    isVttEnabled: recording.isVttEnabled,
  }));

  const outputPath = path.join(process.cwd(), "recordings_older_than_6_months.json");

  try {
    await fs.writeFile(outputPath, JSON.stringify(simplifiedRecordings, null, 2), "utf-8");
    console.log(`\nRecordings saved to: ${outputPath}`);
  } catch (error) {
    console.error("Error saving recordings to JSON:", error);
  }
}

async function main(): Promise<void> {
  console.log("Fetching all recordings older than 6 months...");

  const recordings = await getAllRecordingsOlderThan6Months();

  const totalDurationSeconds = recordings.reduce(
    (total: number, recording: Recording) => total + recording.duration,
    0
  );

  const totalHours = Math.floor(totalDurationSeconds / 3600);
  const remainingMinutes = Math.floor((totalDurationSeconds % 3600) / 60);
  const remainingSeconds = totalDurationSeconds % 60;

  console.log(`\nFinal result: ${recordings.length} recordings found older than 6 months`);
  console.log(
    `Total duration: ${totalDurationSeconds} seconds (${totalHours}h ${remainingMinutes}m ${remainingSeconds}s)`
  );

  await saveRecordingsToJson(recordings);

  console.log("\nLast 10 recordings (oldest first):");

  const lastTen = recordings.slice(-10);
  lastTen.forEach((recording: Recording, index: number) => {
    const startTime = new Date(recording.start_ts * 1000).toISOString();
    const durationMinutes = Math.floor(recording.duration / 60);
    const durationSeconds = recording.duration % 60;

    console.log(
      `${index + 1}. ${recording.room_name} (${
        recording.id
      }) - Started: ${startTime} - Duration: ${durationMinutes}m ${durationSeconds}s - Status: ${
        recording.status
      }`
    );
  });

  if (recordings.length > 10) {
    console.log(`\n... and ${recordings.length - 10} more recordings before these`);
  }
}

async function deleteRecording(recordingId: string, apiKey: string): Promise<boolean> {
  const url = `https://api.daily.co/v1/recordings/${recordingId}`;
  const maxRetries = 5;
  let retries = 0;

  while (retries <= maxRetries) {
    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result.deleted === true;
      }

      if (response.status === 404) {
        console.log(`Recording ${recordingId} not found (may have been already deleted)`);
        return true;
      }

      if (response.status === 429) {
        if (retries < maxRetries) {
          const backoffDelay = Math.pow(2, retries) * 1000;
          console.log(
            `Rate limit for ${recordingId}. Retrying in ${backoffDelay / 1000}s... (attempt ${retries + 1}/${
              maxRetries + 1
            })`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          retries++;
          continue;
        }
      }

      console.error(`Failed to delete recording ${recordingId}: HTTP ${response.status}`);
      return false;
    } catch (error) {
      const errorMessage = (error as Error).message;

      if (
        retries < maxRetries &&
        (errorMessage.includes("fetch failed") || errorMessage.includes("TIMEOUT"))
      ) {
        const backoffDelay = Math.pow(2, retries) * 1000;
        console.log(
          `Network error for ${recordingId}. Retrying in ${backoffDelay / 1000}s... (attempt ${retries + 1}/${
            maxRetries + 1
          })`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        retries++;
        continue;
      }

      console.error(`Error deleting recording ${recordingId} after ${retries + 1} attempts:`, error);
      return false;
    }
  }

  console.error(`Failed to delete recording ${recordingId} after ${maxRetries + 1} attempts`);
  return false;
}

async function deleteRecordingsFromJson(dryRun = false): Promise<void> {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    console.error("DAILY_API_KEY environment variable is required");
    process.exit(1);
  }

  const fs = await import("fs/promises");
  const path = await import("path");

  const filePath = path.join(process.cwd(), "recordings_older_than_6_months.json");

  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const recordings = JSON.parse(fileContent) as Array<{
      id: string;
      room_name: string;
      start_date: string;
      duration: number;
      status: string;
    }>;

    console.log(`\nFound ${recordings.length} recordings to delete`);

    if (recordings.length === 0) {
      console.log("No recordings to delete");
      return;
    }

    const totalDuration = recordings.reduce((sum, rec) => sum + rec.duration, 0);
    const totalHours = Math.floor(totalDuration / 3600);
    const totalMinutes = Math.floor((totalDuration % 3600) / 60);

    console.log(`Total duration: ${totalHours}h ${totalMinutes}m`);
    console.log(`Date range: ${recordings[0].start_date} to ${recordings[recordings.length - 1].start_date}`);

    if (dryRun) {
      console.log("\n🔸 DRY RUN MODE - No recordings will be deleted");
      console.log("First 5 recordings that would be deleted:");
      recordings.slice(0, 5).forEach((rec, idx) => {
        console.log(`  ${idx + 1}. ${rec.id} - ${rec.room_name} (${rec.start_date})`);
      });
      if (recordings.length > 5) {
        console.log(`  ... and ${recordings.length - 5} more`);
      }
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();
    const batchSize = 10;

    for (let i = 0; i < recordings.length; i += batchSize) {
      const batch = recordings.slice(i, Math.min(i + batchSize, recordings.length));
      const batchPromises = [];

      for (const recording of batch) {
        const elapsedTime = Date.now() - startTime;
        const expectedMinTime = (successCount + failCount) * 50;

        if (elapsedTime < expectedMinTime) {
          const delayTime = expectedMinTime - elapsedTime;
          await new Promise((resolve) => setTimeout(resolve, delayTime));
        }

        const deletePromise = deleteRecording(recording.id, apiKey).then((success) => {
          if (success) {
            successCount++;
          } else {
            failCount++;
          }

          if ((successCount + failCount) % 10 === 0) {
            const progress = (((successCount + failCount) / recordings.length) * 100).toFixed(1);
            console.log(
              `Progress: ${progress}% (${successCount + failCount}/${recordings.length}), recording-id:${
                recording.id
              }`
            );
          }

          return success;
        });

        batchPromises.push(deletePromise);
      }

      await Promise.all(batchPromises);
    }

    console.log("\n✅ Deletion complete!");
    console.log(`Successfully deleted: ${successCount}`);
    console.log(`Failed to delete: ${failCount}`);
    console.log(`Total processed: ${successCount + failCount}`);

    if (failCount > 0) {
      console.log("\n⚠️  Some recordings failed to delete. Check the logs above for details.");
    }
  } catch (error) {
    console.error("Error reading or processing recordings file:", error);
    process.exit(1);
  }
}

async function mainDelete(): Promise<void> {
  const readline = (await import("readline")).createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("🗑️  Daily Video Recording Deletion Tool");
  console.log("=====================================");
  console.log("This tool will delete all recordings listed in recordings_older_than_6_months.json");
  console.log("\n⚠️  WARNING: This action cannot be undone!");
  console.log("Note: Recordings in custom S3 buckets will NOT be deleted from S3.\n");

  await deleteRecordingsFromJson(true);

  const question = (query: string): Promise<string> =>
    new Promise((resolve) => readline.question(query, resolve));

  const answer = await question("\nDo you want to proceed with deletion? (yes/no): ");

  if (answer.toLowerCase() === "yes") {
    console.log("\nStarting deletion process...\n");
    await deleteRecordingsFromJson(false);
  } else {
    console.log("\nDeletion cancelled.");
  }

  readline.close();
}

const args = process.argv.slice(2);
if (args[0] === "delete") {
  mainDelete();
} else {
  main();
}
