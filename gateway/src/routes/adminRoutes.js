const express = require("express");
const pool = require("../config/postgres");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router(); 
const {
    getServiceHealth
} = require("../services/healthService");

router.get("/analytics", authMiddleware, async (req, res) => {
    try {
        // Total requests
        const totalResult = await pool.query(
            "SELECT COUNT(*) FROM request_logs"
        );

        // Average response time
        const latencyResult = await pool.query(
            "SELECT AVG(response_time_ms) FROM request_logs"
        );

        // Failed requests = status code >= 400
        const errorResult = await pool.query(`
            SELECT COUNT(*)
            FROM request_logs
            WHERE status_code >= 400
        `);

        // Most used routes
        const routeResult = await pool.query(`
            SELECT route, COUNT(*) AS request_count
            FROM request_logs
            GROUP BY route
            ORDER BY request_count DESC
            LIMIT 5
        `);

        const totalRequests = Number(totalResult.rows[0].count);
        const failedRequests = Number(errorResult.rows[0].count);

        const averageLatency =
            Number(latencyResult.rows[0].avg) || 0;

        const errorRate =
            totalRequests === 0
                ? 0
                : failedRequests / totalRequests;

        res.json({
            totalRequests,
            averageLatencyMs: Number(
                averageLatency.toFixed(2)
            ),
            failedRequests,
            errorRate: Number(
                (errorRate * 100).toFixed(2)
            ),
            topRoutes: routeResult.rows
        });

    } catch (error) {
        console.error("Analytics error:", error);

        res.status(500).json({
            message: "Failed to fetch analytics"
        });
    }
}); 

router.get("/health", authMiddleware, async (req, res) => {
    try {
        const productHealth =
            await getServiceHealth("product");

        const orderHealth =
            await getServiceHealth("order");

        const authHealth =
            await getServiceHealth("auth");

        res.json({
            services: {
                product: productHealth,
                order: orderHealth,
                auth: authHealth
            }
        });

    } catch (error) {
        console.error("Health monitoring error:", error);

        res.status(500).json({
            message: "Failed to fetch service health"
        });
    }
});

module.exports = router;