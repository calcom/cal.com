import { trace, context } from "@opentelemetry/api";
import { registerOTel } from "@vercel/otel";

registerOTel("cal-app-" + process.env.VERCEL_ENV);

export const tracer = trace.getTracer("cal-app-tracer");
export { context };
