const express = require("express");

const {
    createProxyMiddleware,
    responseInterceptor
} = require("http-proxy-middleware");

const services = require("./config/services");

const requestLogger = require("./middleware/requestLogger");
const rateLimiter = require("./middleware/rateLimiter");
const cacheMiddleware = require("./middleware/cacheMiddleware");
const authMiddleware = require("./middleware/authMiddleware");

const { redisClient } = require("./config/redis");

const adminRoutes = require("./routes/adminRoutes");

const {
    recordServiceMetric
} = require("./services/healthService");


const app = express();


// ---------------- GLOBAL MIDDLEWARE ----------------

app.use(requestLogger);
app.use(rateLimiter);


// ---------------- GATEWAY HEALTH ----------------

app.get("/health", (req, res) => {
    res.json({
        status: "Gateway is running"
    });
});


// ---------------- ADMIN ROUTES ----------------

app.use("/admin", adminRoutes);


// =====================================================
// PRODUCT SERVICE
// =====================================================

app.use(
    services.product.path,

    // Products require JWT
    authMiddleware,

    // GET requests can use Redis cache
    cacheMiddleware,

    createProxyMiddleware({
        target: services.product.target,

        changeOrigin: true,

        selfHandleResponse: true,

        pathRewrite: (path) => {
            return services.product.rewritePath + path;
        },

        on: {

            // Backend request start hone ka time
            proxyReq: (proxyReq, req) => {
                req.backendStart = Date.now();
            },

            // Backend response intercept karo
            proxyRes: responseInterceptor(
                async (responseBuffer, proxyRes, req, res) => {

                    // --------------------------------
                    // SERVICE HEALTH METRIC
                    // --------------------------------

                    const latency =
                        Date.now() - req.backendStart;

                    await recordServiceMetric(
                        "product",
                        latency,
                        proxyRes.statusCode
                    );


                    // --------------------------------
                    // CACHE RESPONSE
                    // --------------------------------

                    if (
                        req.method === "GET" &&
                        proxyRes.statusCode === 200 &&
                        req.cacheKey
                    ) {
                        const responseData =
                            responseBuffer.toString("utf8");

                        await redisClient.setEx(
                            req.cacheKey,
                            60,
                            responseData
                        );

                        console.log(
                            `CACHE STORED: ${req.originalUrl}`
                        );
                    }

                    // Actual response client ko return
                    return responseBuffer;
                }
            )
        }
    })
);


// =====================================================
// ORDER SERVICE
// =====================================================

app.use(
    services.order.path,

    authMiddleware,

    createProxyMiddleware({
        target: services.order.target,

        changeOrigin: true,

        pathRewrite: (path) => {
            return services.order.rewritePath + path;
        },

        on: {

            proxyReq: (proxyReq, req) => {
                req.backendStart = Date.now();
            },

            proxyRes: (proxyRes, req) => {

                const latency =
                    Date.now() - req.backendStart;

                recordServiceMetric(
                    "order",
                    latency,
                    proxyRes.statusCode
                ).catch(console.error);
            }
        }
    })
);


// =====================================================
// AUTH SERVICE
// =====================================================

app.use(
    services.auth.path,

    createProxyMiddleware({
        target: services.auth.target,

        changeOrigin: true,

        pathRewrite: (path) => {
            return services.auth.rewritePath + path;
        },

        on: {

            proxyReq: (proxyReq, req) => {
                req.backendStart = Date.now();
            },

            proxyRes: (proxyRes, req) => {

                const latency =
                    Date.now() - req.backendStart;

                recordServiceMetric(
                    "auth",
                    latency,
                    proxyRes.statusCode
                ).catch(console.error);
            }
        }
    })
);


module.exports = app;