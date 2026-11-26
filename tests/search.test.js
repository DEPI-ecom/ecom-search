import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../src/app.js';

test('Search Service API', async (t) => {
    let requestedUrl = '';
    let fetchCalls = 0;
    let shouldFail = false;

    const fetchMock = t.mock.method(
        globalThis,
        'fetch',
        async (url) => {
            fetchCalls++;
            requestedUrl = String(url);

            if (shouldFail) {
                throw new Error('Catalog unavailable');
            }

            return new Response(
                JSON.stringify({
                    data: {
                        products: []
                    }
                }),
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }
    );

    await t.test('health endpoint works', async () => {
        const response = await request(app).get('/health');

        assert.equal(response.status, 200);
        assert.equal(response.body.status, 'ok');
        assert.equal(response.body.service, 'search');
    });

    await t.test('search forwards filters to Catalog', async () => {
        const response = await request(app)
            .get('/search')
            .query({
                q: 'headphones',
                categoryId: 'electronics',
                minPrice: 100,
                maxPrice: 1000,
                page: 2,
                limit: 5,
                sort: 'price_asc'
            });

        assert.equal(response.status, 200);
        assert.ok(requestedUrl.includes('q=headphones'));
        assert.ok(requestedUrl.includes('minPrice=100'));
        assert.ok(requestedUrl.includes('maxPrice=1000'));
        assert.ok(requestedUrl.includes('page=2'));
        assert.ok(requestedUrl.includes('sort=price_asc'));
        assert.equal(fetchCalls, 1);
    });

    await t.test('reject invalid price range', async () => {
        const previousCalls = fetchCalls;

        const response = await request(app)
            .get('/search')
            .query({
                minPrice: 1000,
                maxPrice: 100
            });

        assert.equal(response.status, 400);
        assert.equal(fetchCalls, previousCalls);
    });

    await t.test('reject invalid sorting option', async () => {
        const previousCalls = fetchCalls;

        const response = await request(app)
            .get('/search')
            .query({
                sort: 'random'
            });

        assert.equal(response.status, 400);
        assert.equal(fetchCalls, previousCalls);
    });

    await t.test('return 503 when Catalog is unavailable', async () => {
        shouldFail = true;

        const response = await request(app)
            .get('/search')
            .query({ q: 'headphones' });

        assert.equal(response.status, 503);

        shouldFail = false;
    });
});
