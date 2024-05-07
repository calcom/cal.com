docker build ^
--platform linux/amd64 ^
--tag ghcr.io/nischay876/hamzacalprodimage:v2 ^
--build-arg NEXT_PUBLIC_WEBAPP_URL=https://cal.nischay.eu.org ^
--build-arg NEXTAUTH_URL=https://cal.nischay.eu.org ^
--build-arg NEXT_PUBLIC_LICENSE_CONSENT=true ^
--build-arg CALCOM_TELEMETRY_DISABLED=1 ^
--build-arg DATABASE_URL="postgresql://publicuser:mysecretpassword@172.17.0.2:5432/mainprodbcal" ^
--build-arg NEXTAUTH_SECRET=secret ^
--build-arg CALENDSO_ENCRYPTION_KEY=secret ^
--build-arg NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn ^
--build-arg NEXT_PUBLIC_API_V2_URL=https://cal.nischay.eu.org/api/v2 ^
.

