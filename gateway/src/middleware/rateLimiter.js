const { redisClient } = require("../config/redis");

const WINDOW_SIZE = 60 * 1000; // 60 seconds
const MAX_REQUESTS = 5;

async function rateLimiter(req, res, next) {
    try {
        const now = Date.now();

        const windowStart = now - WINDOW_SIZE;

        // Abhi IP ke basis par user identify kar rahe hain
        const clientId = req.ip;

        const key = `rate_limit:${clientId}`;

        // Purane timestamps hata do
        await redisClient.zRemRangeByScore(
            key,
            0,
            windowStart
        );

        // Last 60 sec me kitni requests hain?
        const requestCount = await redisClient.zCard(key);

        // Headers useful hain Postman/debugging ke liye
        res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);

        if (requestCount >= MAX_REQUESTS) {
            res.setHeader("X-RateLimit-Remaining", 0);

            console.log(
                `RATE LIMIT EXCEEDED: ${clientId}`
            );

            return res.status(429).json({
                error: "Too many requests",
                message: "Please try again later"
            });
        }

        // Current request ka timestamp store karo
        await redisClient.zAdd(key, [
            {
                score: now,
                value: `${now}-${Math.random()}`
            }
        ]);

        // Redis key ko permanently store nahi karna
        await redisClient.expire(key, 60);

        res.setHeader(
            "X-RateLimit-Remaining",
            MAX_REQUESTS - requestCount - 1
        );

        next();

    } catch (error) {
        console.error("Rate limiter error:", error);

        // Redis fail ho jaye to फिलहाल request block nahi karenge
        next();
    }
}

module.exports = rateLimiter;