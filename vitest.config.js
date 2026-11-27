import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/**/*.test.js'],
        env: {
            NODE_ENV: 'test',
            CATALOG_SERVICE_URL: 'http://127.0.0.1:19102',
            CATALOG_TIMEOUT_MS: '2000'
        }
    }
});