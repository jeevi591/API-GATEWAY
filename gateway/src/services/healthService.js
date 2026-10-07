const { redisClient } = require("../config/redis");

const MAX_SAMPLES = 20;

async function recordServiceMetric(serviceName, latency, statusCode) {
    const key = `health:${serviceName}`;

    const metric = JSON.stringify({
        latency,
        statusCode,
        timestamp: Date.now()
    });

    await redisClient.lPush(key, metric);

    // Sirf latest 20 responses
    await redisClient.lTrim(key, 0, MAX_SAMPLES - 1);

    // 5 minutes baad stale metrics expire
    await redisClient.expire(key, 300);
}

async function getServiceHealth(serviceName) {
    const key = `health:${serviceName}`;

    const data = await redisClient.lRange(key, 0, -1);

    if (data.length === 0) {
        return {
            service: serviceName,
            status: "unknown",
            sampleCount: 0,
            averageLatencyMs: 0,
            errorRate: 0
        };
    }

    const metrics = data.map((item) => JSON.parse(item));

    const totalLatency = metrics.reduce(
        (sum, metric) => sum + metric.latency,
        0
    );

    const failures = metrics.filter(
        (metric) => metric.statusCode >= 500
    ).length;

    const averageLatency =
        totalLatency / metrics.length;

    const errorRate =
        (failures / metrics.length) * 100;

    let status = "healthy";

    if (errorRate >= 50 || averageLatency >= 1000) {
        status = "critical";
    } else if (
        errorRate >= 20 ||
        averageLatency >= 500
    ) {
        status = "degraded";
    }

    return {
        service: serviceName,
        status,
        sampleCount: metrics.length,
        averageLatencyMs: Number(
            averageLatency.toFixed(2)
        ),
        errorRate: Number(
            errorRate.toFixed(2)
        )
    };
}

module.exports = {
    recordServiceMetric,
    getServiceHealth
};