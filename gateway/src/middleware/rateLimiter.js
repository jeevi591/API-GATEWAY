const { redisClient } = require("../config/redis");
const {
    getServiceHealth
} = require("../services/healthService");

const WINDOW_SIZE = 60 * 1000;
const BASE_LIMIT = 5;


function getServiceName(path) {
    if (path.startsWith("/api/products")) {
        return "product";
    }

    if (path.startsWith("/api/orders")) {
        return "order";
    }

    if (path.startsWith("/api/auth")) {
        return "auth";
    }

    return "gateway";
}


async function rateLimiter(req, res, next) {
    try {
        const now = Date.now();
        const windowStart = now - WINDOW_SIZE;

        const clientId = req.ip;

        const serviceName =
            getServiceName(req.originalUrl);

        let effectiveLimit = BASE_LIMIT;
        let healthStatus = "unknown";

        if (serviceName !== "gateway") {
            const health =
                await getServiceHealth(serviceName);

            healthStatus = health.status;

            // Bahut kam samples ke basis par
            // limit change nahi karenge
            if (health.sampleCount >= 3) {

                if (health.status === "degraded") {
                    effectiveLimit =
                        Math.max(
                            1,
                            Math.floor(BASE_LIMIT * 0.75)
                        );
                }

                if (health.status === "critical") {
                    effectiveLimit =
                        Math.max(
                            1,
                            Math.floor(BASE_LIMIT * 0.5)
                        );
                }
            }
        }


        const key =
            `rate_limit:${clientId}:${serviceName}`;

        await redisClient.zRemRangeByScore(
            key,
            0,
            windowStart
        );

        const requestCount =
            await redisClient.zCard(key);


        res.setHeader(
            "X-RateLimit-Limit",
            effectiveLimit
        );

        res.setHeader(
            "X-Service-Health",
            healthStatus
        );


        if (requestCount >= effectiveLimit) {

            res.setHeader(
                "X-RateLimit-Remaining",
                0
            );

            console.log(
                `RATE LIMIT EXCEEDED: ${clientId} | ${serviceName} | limit=${effectiveLimit}`
            );

            return res.status(429).json({
                error: "Too many requests",
                service: serviceName,
                health: healthStatus,
                limit: effectiveLimit
            });
        }


        await redisClient.zAdd(key, [
            {
                score: now,
                value: `${now}-${Math.random()}`
            }
        ]);

        await redisClient.expire(key, 60);

        res.setHeader(
            "X-RateLimit-Remaining",
            effectiveLimit - requestCount - 1
        );

        next();

    } catch (error) {
        console.error(
            "Rate limiter error:",
            error
        );

        next();
    }
}

module.exports = rateLimiter;