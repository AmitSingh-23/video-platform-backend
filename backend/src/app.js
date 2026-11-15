import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRoute from './route/user.routes.js';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static('public'));
app.use(cookieParser());

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use('/api/v1/user', userRoute);

// Errors passed to next(), such as rejected uploads from Multer, end up here.
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    let status = err.statusCode || 500;
    if (err.name === 'MulterError') status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    if (status >= 500) console.error(err);
    res.status(status).json({
        success: false,
        message: status >= 500 ? 'Internal Server Error' : err.message
    });
});

export default app;
