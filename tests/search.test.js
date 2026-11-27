import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import http from 'node:http';
import request from 'supertest';
import app from '../src/app.js';

// A tiny fake Catalog on the port configured as CATALOG_SERVICE_URL in vitest.config.js.
// It answers like the real Catalog's public GET /products.
const CATALOG_PORT = 19102;

const sampleProduct = {
    id: 'cmprod0000000000000000001',
    name: 'Wireless Headphones',
    slug: 'wireless-headphones',
    description: 'Over-ear wireless headphones',
    price: '79.99',
    stock: 14,
    imageUrl: null,
    category: { id: 'cmcat00000000000000000001', name: 'Electronics', slug: 'electronics' }
};

let fakeCatalog;
let lastCatalogUrl;
let catalogCalls;

const stop = (server) => new Promise((resolve) => {
    if (!server.listening) return resolve();
    server.closeAllConnections?.();
    server.close(() => resolve());
});

beforeAll(async () => {
    fakeCatalog = http.createServer((req, res) => {
        catalogCalls += 1;
        lastCatalogUrl = new URL(req.url, 'http://localhost');

        if (lastCatalogUrl.pathname !== '/products') {
            res.writeHead(404);
            return res.end();
        }

        const q = lastCatalogUrl.searchParams.get('q');
        if (q === 'boom') {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR' } }));
        }
        if (q === 'garbage') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end('<html>not json</html>');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            data: {
                products: [sampleProduct],
                pagination: {
                    page: Number(lastCatalogUrl.searchParams.get('page')),
                    limit: Number(lastCatalogUrl.searchParams.get('limit')),
                    total: 1,
                    totalPages: 1
                }
            }
        }));
    });
    await new Promise((resolve) => fakeCatalog.listen(CATALOG_PORT, '127.0.0.1', resolve));
});

beforeEach(() => {
    catalogCalls = 0;
    lastCatalogUrl = undefined;
});

afterAll(async () => {
    await stop(fakeCatalog);
});

describe('search own routes', () => {
    it('GET /health', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok', service: 'ecom-search' });
    });

    it('unknown routes return 404', async () => {
        const res = await request(app).get('/nope');
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBeTruthy();
    });
});

describe('forwarding to Catalog', () => {
    it('sends every validated filter, including q, to Catalog /products', async () => {
        const res = await request(app).get('/search').query({
            q: '  headphones  ',
            categoryId: 'cmcat00000000000000000001',
            minPrice: 20,
            maxPrice: 150,
            page: 2,
            limit: 5,
            sort: 'price_asc'
        });

        expect(res.status).toBe(200);
        expect(Object.fromEntries(lastCatalogUrl.searchParams)).toEqual({
            q: 'headphones', // trimmed
            categoryId: 'cmcat00000000000000000001',
            minPrice: '20',
            maxPrice: '150',
            page: '2',
            limit: '5',
            sort: 'price_asc'
        });
    });

    it("returns Catalog's response unchanged", async () => {
        const res = await request(app).get('/search').query({ q: 'headphones', page: 2, limit: 5 });

        expect(res.body.data.products).toEqual([sampleProduct]);
        expect(res.body.data.pagination).toMatchObject({ page: 2, limit: 5, total: 1 });
    });

    it('applies defaults and leaves q out when it is missing or blank', async () => {
        await request(app).get('/search');
        expect(Object.fromEntries(lastCatalogUrl.searchParams)).toEqual({
            page: '1',
            limit: '10',
            sort: 'newest'
        });

        await request(app).get('/search').query({ q: '   ' });
        expect(lastCatalogUrl.searchParams.has('q')).toBe(false);
    });
});

describe('validation', () => {
    it.each([
        ['limit above 50', { limit: 51 }],
        ['limit 0', { limit: 0 }],
        ['page 0', { page: 0 }],
        ['an unknown sort value', { sort: 'cheapest' }],
        ['a negative minPrice', { minPrice: -1 }],
        ['minPrice above maxPrice', { minPrice: 100, maxPrice: 10 }],
        ['q longer than 100 characters', { q: 'x'.repeat(101) }]
    ])('rejects %s with 400 VALIDATION_ERROR and never calls Catalog', async (_label, query) => {
        const res = await request(app).get('/search').query(query);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
        expect(catalogCalls).toBe(0);
    });
});

// Keep this last: it shuts the fake Catalog down.
describe('Catalog unavailable', () => {
    it('returns 503 SERVICE_UNAVAILABLE when Catalog answers with an error', async () => {
        const res = await request(app).get('/search').query({ q: 'boom' });
        expect(res.status).toBe(503);
        expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('returns 503 SERVICE_UNAVAILABLE when Catalog answers with something that is not JSON', async () => {
        const res = await request(app).get('/search').query({ q: 'garbage' });
        expect(res.status).toBe(503);
        expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('returns 503 SERVICE_UNAVAILABLE when Catalog is unreachable', async () => {
        await stop(fakeCatalog);
        const res = await request(app).get('/search').query({ q: 'headphones' });
        expect(res.status).toBe(503);
        expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });
});