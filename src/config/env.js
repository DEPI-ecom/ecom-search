import 'dotenv/config';

export const env = {
    port: Number(process.env.PORT) || 3003,
    nodeEnv: process.env.NODE_ENV || 'development',
    catalogServiceUrl:
        process.env.CATALOG_SERVICE_URL || 'http://localhost:3002',
    catalogTimeoutMs: Number(process.env.CATALOG_TIMEOUT_MS) || 5000
};