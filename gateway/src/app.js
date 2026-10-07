const express = require("express");

const {
    createProxyMiddleware,
    responseInterceptor
} = require("http-proxy-middleware");

const services = require("./config/services");
const requestLogger = require("./middleware/requestLogger"); 
const cacheMiddleware = require("./middleware/cacheMiddleware"); 
const authMiddleware = require("./middleware/authMiddleware");
const { redisClient } = require("./config/redis"); 
const rateLimiter = require("./middleware/rateLimiter");
const app = express(); 
// Logger should run for every incoming request
app.use(requestLogger); 
app.use(rateLimiter);


// Gateway health check
app.get("/health", (req, res) => {
    res.json({
        status: "Gateway is running"
    });
});


// Product Service
app.use(
    services.product.path,

    authMiddleware,
    cacheMiddleware,

    createProxyMiddleware({
        target: services.product.target,
        changeOrigin: true,

        selfHandleResponse: true,

        pathRewrite: (path) => {
            return services.product.rewritePath + path;
        },

        on: {
            proxyRes: responseInterceptor(
                async (responseBuffer, proxyRes, req, res) => {

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

                    return responseBuffer;
                }
            )
        }
    })
);

// Order Service
app.use(
    services.order.path,

    authMiddleware,

    createProxyMiddleware({
        target: services.order.target,
        changeOrigin: true,

        pathRewrite: (path) => {
            return services.order.rewritePath + path;
        }
    })
);


// Auth Service
app.use(
    services.auth.path,
    createProxyMiddleware({
        target: services.auth.target,
        changeOrigin: true,

        pathRewrite: (path) => {
            return services.auth.rewritePath + path;
        }
    })
);


module.exports = app;