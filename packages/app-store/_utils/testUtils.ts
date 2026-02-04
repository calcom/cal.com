export function generateJsonResponse({
  json,
  status = 200,
  statusText = "OK",
}: {
  json: unknown;
  status?: number;
  statusText?: string;
}) {
  return new Response(JSON.stringify(json), {
    status,
    statusText,
  });
}

export function internalServerErrorResponse({
  json,
}: {
  json: unknown;
  status?: number;
  statusText?: string;
}) {
  return generateJsonResponse({ json, status: 500, statusText: "Internal Server Error" });
}

export function generateTextResponse({
  text,
  status = 200,
  statusText = "OK",
}: {
  text: string;
  status?: number;
  statusText?: string;
}) {
  // Status 204 (No Content) doesn't allow a body, so pass null for body
  const body = status === 204 ? null : text;
  return new Response(body, {
    status: status,
    statusText: statusText,
  });
}

export function successResponse({ json }: { json: unknown }) {
  return generateJsonResponse({ json });
}
