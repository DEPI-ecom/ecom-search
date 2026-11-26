
import express from 'express';
import helmet from 'helmet';

import searchRoutes from './routes/search.routes.js';
import healthRoutes from './routes/health.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const app = express();

app.use(helmet());
app.use(express.json());

app.use('/health', healthRoutes);
app.use('/search', searchRoutes);

app.use((req, res) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: 'Route not found'
        }
    });
});

app.use(errorMiddleware);

export default app;
