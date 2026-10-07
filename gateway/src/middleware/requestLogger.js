const pool = require("../config/postgres");

function requestLogger(req, res, next) {
    const startTime = Date.now();

    res.on("finish", async () => {
        const duration = Date.now() - startTime;

        console.log(
            `${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
        );

        try {
            const userId = req.user?.userId || null;

            await pool.query(
                `INSERT INTO request_logs
                (user_id, method, route, status_code, response_time_ms)
                VALUES ($1, $2, $3, $4, $5)`,
                [
                    userId,
                    req.method,
                    req.originalUrl,
                    res.statusCode,
                    duration
                ]
            );
        } catch (error) {
            console.error("Request logging DB error:", error.message);
        }
    });

    next();
}

module.exports = requestLogger;