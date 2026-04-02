export const CALENDLY_IMPORT_CONTINUATION_ERROR = "CONTINUATION_REQUIRED";

export function isCalendlyImportContinuationError(error: unknown): boolean {
  return error instanceof Error && error.message === CALENDLY_IMPORT_CONTINUATION_ERROR;
}

export async function runCalendlyImportWithContinuation(params: {
  runImport: () => Promise<void>;
  scheduleContinuation: () => Promise<void>;
}): Promise<{ continued: boolean }> {
  const { runImport, scheduleContinuation } = params;

  try {
    await runImport();
    return { continued: false };
  } catch (error) {
    if (isCalendlyImportContinuationError(error)) {
      await scheduleContinuation();
      return { continued: true };
    }
    throw error;
  }
}
