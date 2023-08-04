import { trace, context } from "@opentelemetry/api";
import { registerOTel } from "@vercel/otel";

registerOTel(process.env.VERCEL_URL);

export const tracer = trace.getTracer("cal-app-tracer");
export { context };
