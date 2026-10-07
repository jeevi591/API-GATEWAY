function errorHandler(err, req, res, next) {
    console.error("Gateway error:", err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        error: "Internal server error",
        message: "Something went wrong in the API gateway"
    });
}

module.exports = errorHandler;