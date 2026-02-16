const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_m9DGwBJnh4ue@ep-nameless-darkness-ahikejot-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=no-verify',
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect()
    .then(() => console.log('Connected successfully'))
    .catch(e => console.error('Connection error', e.stack))
    .finally(() => client.end());
