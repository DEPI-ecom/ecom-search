import { fetchProducts } from '../clients/catalog.client.js';

// Search owns no data: Catalog filters, sorts and paginates, and its
// response format is returned unchanged so /search matches /products.
export async function searchProducts(filters) {
    return fetchProducts(filters);
}