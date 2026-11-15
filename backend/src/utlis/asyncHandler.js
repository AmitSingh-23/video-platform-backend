const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (err) {
        const status = err.statusCode || 500;
        if (status >= 500) console.error(err);
        res.status(status).json({
            success: false,
            message: status >= 500 ? "Internal Server Error" : err.message,
            errors: err.errors || []
        });
    }
};
export default asyncHandler;
