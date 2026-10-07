const express = require("express");

const {
    createProxyMiddleware,
    responseInterceptor,
    fixRequestBody
} = require("http-proxy-middleware");

const services = require("./config/services");

const requestLogger = require("./middleware/requestLogger");
const rateLimiter = require("./middleware/rateLimiter");
const validateRequest = require("./middleware/validateRequest");
const cacheMiddleware = require("./middleware/cacheMiddleware");
const authMiddleware = require("./middleware/authMiddleware");

const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const { redisClient } = require("./config/redis");

const adminRoutes = require("./routes/adminRoutes");

const {
    recordServiceMetric
} = require("./services/healthService");


const app = express();


// =====================================================
// GLOBAL MIDDLEWARE
// =====================================================

// Incoming JSON body parse karega
app.use(express.json());

// Request logs + PostgreSQL logging
app.use(requestLogger);

// Redis-based adaptive rate limiter
app.use(rateLimiter);

// Register/Login/Order bodies validate karega
app.use(validateRequest);


// =====================================================
// GATEWAY HEALTH
// =====================================================

app.get("/health", (req, res) => {
    res.json({
        status: "Gateway is running"
    });
});


// =====================================================
// ADMIN ROUTES
// =====================================================

// GET /admin/analytics
// GET /admin/health
app.use("/admin", adminRoutes);


// =====================================================
// PRODUCT SERVICE
// =====================================================

app.use(
    services.product.path,

    // Product routes protected hain
    authMiddleware,

    // GET requests ke liye Redis cache
    cacheMiddleware,

    createProxyMiddleware({
        target: services.product.target,

        changeOrigin: true,

        // Response ko intercept karna hai
        selfHandleResponse: true,

        pathRewrite: (path) => {
            return services.product.rewritePath + path;
        },

        on: {

            // Backend request start hone se pehle timer
            proxyReq: (proxyReq, req) => {
                req.backendStart = Date.now();
            },


            // Product service ka response
            proxyRes: responseInterceptor(
                async (responseBuffer, proxyRes, req, res) => {

                    // ---------------------------------
                    // SERVICE HEALTH METRIC
                    // ---------------------------------

                    const latency =
                        Date.now() - req.backendStart;

                    await recordServiceMetric(
                        "product",
                        latency,
                        proxyRes.statusCode
                    );


                    // ---------------------------------
                    // CACHE SUCCESSFUL GET RESPONSE
                    // ---------------------------------

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


                    // Same backend response client ko bhejo
                    return responseBuffer;
                }
            ),


            // ---------------------------------
            // PRODUCT SERVICE DOWN / UNAVAILABLE
            // ---------------------------------

            error: (err, req, res) => {

                console.error(
                    "Product service proxy error:",
                    err.message
                );

                if (!res.headersSent) {
                    res.writeHead(502, {
                        "Content-Type": "application/json"
                    });
                }

                res.end(
                    JSON.stringify({
                        error: "Bad Gateway",
                        message: "Product service is unavailable"
                    })
                );
            }
        }
    })
);


// =====================================================
// ORDER SERVICE
// =====================================================

app.use(
    services.order.path,

    // Order routes protected hain
    authMiddleware,

    createProxyMiddleware({
        target: services.order.target,

        changeOrigin: true,

        pathRewrite: (path) => {
            return services.order.rewritePath + path;
        },

        on: {

            // POST body ko backend tak forward karo
            proxyReq: (proxyReq, req, res) => {

                fixRequestBody(
                    proxyReq,
                    req,
                    res
                );

                req.backendStart = Date.now();
            },


            // Order service response metric
            proxyRes: (proxyRes, req) => {

                const latency =
                    Date.now() - req.backendStart;

                recordServiceMetric(
                    "order",
                    latency,
                    proxyRes.statusCode
                ).catch(console.error);
            },


            // Order service unavailable
            error: (err, req, res) => {

                console.error(
                    "Order service proxy error:",
                    err.message
                );

                if (!res.headersSent) {
                    res.writeHead(502, {
                        "Content-Type": "application/json"
                    });
                }

                res.end(
                    JSON.stringify({
                        error: "Bad Gateway",
                        message: "Order service is unavailable"
                    })
                );
            }
        }
    })
);


// =====================================================
// AUTH SERVICE
// =====================================================

app.use(
    services.auth.path,

    // Login/register public hain,
    // isliye authMiddleware yahan nahi hai

    createProxyMiddleware({
        target: services.auth.target,

        changeOrigin: true,

        pathRewrite: (path) => {
            return services.auth.rewritePath + path;
        },

        on: {

            // JSON body auth service ko forward
            proxyReq: (proxyReq, req, res) => {

                fixRequestBody(
                    proxyReq,
                    req,
                    res
                );

                req.backendStart = Date.now();
            },


            // Auth service response metric
            proxyRes: (proxyRes, req) => {

                const latency =
                    Date.now() - req.backendStart;

                recordServiceMetric(
                    "auth",
                    latency,
                    proxyRes.statusCode
                ).catch(console.error);
            },


            // Auth service unavailable
            error: (err, req, res) => {

                console.error(
                    "Auth service proxy error:",
                    err.message
                );

                if (!res.headersSent) {
                    res.writeHead(502, {
                        "Content-Type": "application/json"
                    });
                }

                res.end(
                    JSON.stringify({
                        error: "Bad Gateway",
                        message: "Auth service is unavailable"
                    })
                );
            }
        }
    })
);


// =====================================================
// UNKNOWN ROUTES
// =====================================================

// Ye sab real routes ke BAAD hona chahiye
app.use(notFound);


// =====================================================
// FINAL ERROR HANDLER
// =====================================================

// Ye bilkul last middleware hona chahiye
app.use(errorHandler);


module.exports = app;