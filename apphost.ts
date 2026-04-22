// Aspire TypeScript AppHost
// For more information, see: https://aspire.dev

import { ContainerLifetime, createBuilder, refExpr } from './.modules/aspire.js';

async function main() {
    const builder = await createBuilder();

    const nextAuthSecret = await builder.addParameterWithGeneratedValue('nextauth-secret', {
        minLength: 43,
        lower: true,
        upper: true,
        numeric: true,
        special: true,
        minLower: 1,
        minUpper: 1,
        minNumeric: 1,
        minSpecial: 1,
    }, { secret: true, persist: true });

    const cronApiKey = await builder.addParameterWithGeneratedValue('cron-api-key', {
        minLength: 32,
        lower: true,
        upper: true,
        numeric: true,
        minLower: 1,
        minUpper: 1,
        minNumeric: 1,
    }, { secret: true, persist: true });

    const calendsoEncryptionKey = await builder.addParameterWithGeneratedValue('calendso-encryption-key', {
        minLength: 32,
        lower: true,
        upper: true,
        numeric: true,
        minLower: 1,
        minUpper: 1,
        minNumeric: 1,
    }, { secret: true, persist: true });

    const postgres = await builder
        .addPostgres('postgres')
        .withLifetime(ContainerLifetime.Persistent)
        .withDataVolume({ name: 'calcom-postgres-data' });

    const calcomDb = await postgres.addDatabase('calendso');
    const calcomDbUrl = await calcomDb.uriExpression.get();

    const dbDeploy = await builder
        .addExecutable('calcom-db-deploy', 'yarn', '.', ['workspace', '@calcom/prisma', 'db-deploy'])
        .withEnvironment('DATABASE_URL', calcomDbUrl)
        .withEnvironment('DATABASE_DIRECT_URL', calcomDbUrl)
        .waitFor(calcomDb);

    const dbSeed = await builder
        .addExecutable('calcom-db-seed', 'yarn', '.', ['workspace', '@calcom/prisma', 'db-seed'])
        .withEnvironment('DATABASE_URL', calcomDbUrl)
        .withEnvironment('DATABASE_DIRECT_URL', calcomDbUrl)
        .withEnvironmentParameter('NEXTAUTH_SECRET', nextAuthSecret)
        .withEnvironmentParameter('CRON_API_KEY', cronApiKey)
        .withEnvironmentParameter('CALENDSO_ENCRYPTION_KEY', calendsoEncryptionKey)
        .waitForCompletion(dbDeploy);

    const calcom = await builder
        .addJavaScriptApp('calcom', '.', { runScriptName: 'dev' })
        .withYarn({ install: false })
        .withEnvironment('NODE_OPTIONS', '--max-old-space-size=8192')
        .withEnvironment('DATABASE_URL', calcomDbUrl)
        .withEnvironment('DATABASE_DIRECT_URL', calcomDbUrl)
        .withEnvironmentParameter('NEXTAUTH_SECRET', nextAuthSecret)
        .withEnvironmentParameter('CRON_API_KEY', cronApiKey)
        .withEnvironmentParameter('CALENDSO_ENCRYPTION_KEY', calendsoEncryptionKey)
        .withHttpEndpoint({ env: 'PORT' })
        .withExternalHttpEndpoints()
        .waitFor(calcomDb)
        .waitForCompletion(dbSeed);

    const calcomHttp = await calcom.getEndpoint('http');

    await dbSeed
        .withEnvironment('NEXT_PUBLIC_WEBAPP_URL', refExpr`${calcomHttp}`)
        .withEnvironment('NEXTAUTH_URL', refExpr`${calcomHttp}`);

    await calcom
        .withEnvironment('NEXT_PUBLIC_WEBAPP_URL', refExpr`${calcomHttp}`)
        .withEnvironment('NEXT_PUBLIC_WEBSITE_URL', refExpr`${calcomHttp}`)
        .withEnvironment('NEXT_PUBLIC_EMBED_LIB_URL', refExpr`${calcomHttp}/embed/embed.js`)
        .withEnvironment('NEXTAUTH_URL', refExpr`${calcomHttp}`)
        .withEnvironmentCallback(async (ctx) => {
            const host = await calcomHttp.host.get();
            const port = await calcomHttp.port.get();

            await ctx.environmentVariables.set(
                'ALLOWED_HOSTNAMES',
                `"${host}:${port}","localhost:${port}","127.0.0.1:${port}"`,
            );
        });

    await builder.build().run();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
