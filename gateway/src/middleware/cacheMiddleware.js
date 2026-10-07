const { redisClient } = require("../config/redis");

async function cacheMiddleware(req, res, next) {
    // Abhi sirf GET requests cache karenge
    if (req.method !== "GET") {
        return next();
    }

    const cacheKey = `cache:${req.originalUrl}`;

    try {
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log(`CACHE HIT: ${req.originalUrl}`);

            res.setHeader("X-Cache", "HIT");
            res.setHeader("Content-Type", "application/json");

            return res.status(200).send(cachedData);
        }

        console.log(`CACHE MISS: ${req.originalUrl}`);

        res.setHeader("X-Cache", "MISS");

        // Baad me response ko isi key par save karna hai
        req.cacheKey = cacheKey;

        next();

    } catch (error) {
        console.error("Cache error:", error);

        // Redis me problem ho to request ko block nahi karenge
        next();
    }
}

module.exports = cacheMiddleware;