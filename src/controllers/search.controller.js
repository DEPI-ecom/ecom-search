import { z } from 'zod';

import { parseQuery } from '../utils/validate.js';
import * as searchService from '../services/search.service.js';

const searchSchema = z
    .object({
        q: z.string().trim().max(100).optional(),
        categoryId: z.string().optional(),
        minPrice: z.coerce.number().min(0).optional(),
        maxPrice: z.coerce.number().min(0).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(10),
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
            message: 'minPrice cannot be greater than maxPrice',
            path: ['minPrice']
        }
    );

export async function searchProducts(req, res) {
    const filters = parseQuery(searchSchema, req.query);
    const result = await searchService.searchProducts(filters);

    res.status(200).json(result);
}