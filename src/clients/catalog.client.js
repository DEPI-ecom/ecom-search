import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

function catalogUnavailable() {
    return new AppError(
        503,
        'Catalog Service is unavailable',
        'SERVICE_UNAVAILABLE'
    );
}

export async function fetchProducts(filters) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== '') {
            params.set(key, String(value));
        }
    }

    let response;

    try {
        response = await fetch(
            `${env.catalogServiceUrl}/products?${params.toString()}`,
            { signal: AbortSignal.timeout(env.catalogTimeoutMs) }
        );
    } catch (error) {
        console.error(`Catalog request failed: ${error.message}`);
        throw catalogUnavailable();
    }

    if (!response.ok) {
        console.error(`Catalog responded with status ${response.status}`);
        throw catalogUnavailable();
    }

    try {
        return await response.json();
    } catch {
        console.error('Catalog returned a response that is not valid JSON');
        throw catalogUnavailable();
    }
}