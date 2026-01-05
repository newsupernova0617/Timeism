import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './db/schema.js',
    out: './db/migrations',
    dialect: 'sqlite',
    dbCredentials: {
        url: process.env.DB_PATH || './data/app.db'
    },
    verbose: true,
    strict: true
});
