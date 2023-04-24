import { registerOTel } from '@vercel/otel'

export function register() {
  registerOTel('cal-app')
}
