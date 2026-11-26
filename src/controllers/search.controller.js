
import { z } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

const searchSchema = z
    .object({
        q: z.string().trim().optional(),
        categoryId: z.string().optional(),
        minPrice: z.coerce.number().min(0).optional(),
        maxPrice: z.coerce.number().min(0).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(10),
        sort: z
            .enum(['newest', 'price_asc', 'price_desc', 'name'])
            .default('newest')
    })
    .refine(
        (filters) =>
            filters.minPrice === undefined ||
            filters.maxPrice === undefined ||
            filters.minPrice <= filters.maxPrice,
        {
            message: 'minPrice cannot be greater than maxPrice'
        }
    );

export async function searchProducts(req, res, next) {
    try {
        const validation = searchSchema.safeParse(req.query);

        if (!validation.success) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid search filters',
                    details: validation.error.issues
                }
            });
        }

        const filters = validation.data;
        const params = new URLSearchParams();

        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== '') {
                params.set(key, String(value));
            }
        }

        let catalogResponse;

        try {
            catalogResponse = await fetch(
                `${env.catalogServiceUrl}/products?${params.toString()}`,
                {
                    signal: AbortSignal.timeout(5000)
                }
            );
        } catch {
            throw new AppError('Catalog Service is unavailable', 503);
        }

        const responseBody = await catalogResponse.json();

        return res.status(catalogResponse.status).json(responseBody);
    } catch (error) {
        next(error);
    }
}
