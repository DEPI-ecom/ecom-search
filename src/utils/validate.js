import { AppError } from "./app-error.js";

export function parseQuery(schema, query) {
    const result = schema.safeParse(query);

    if (!result.success) {
        throw new AppError(
            400,
            "Invalid query parameters",
            "VALIDATION_ERROR",
            result.error.flatten()
        );
    }

    return result.data;
}
