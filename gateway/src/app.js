const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const services = require("./config/services");
const requestLogger = require("./middleware/requestLogger");

const app = express();


// Logger should run for every incoming request
app.use(requestLogger);


// Gateway health check
app.get("/health", (req, res) => {
    res.json({
        status: "Gateway is running"
    });
});


// Product Service
app.use(
    services.product.path,
    createProxyMiddleware({
        target: services.product.target,
        changeOrigin: true,

        pathRewrite: (path) => {
            return services.product.rewritePath + path;
        }
    })
);


// Order Service
app.use(
    services.order.path,
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