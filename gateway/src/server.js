const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

const PORT = process.env.PORT || 3000;


// Simple gateway health endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "Gateway is running"
    });
});


// PRODUCT SERVICE
app.use(
    "/api/products",
    createProxyMiddleware({
        target: "http://localhost:4001",
        changeOrigin: true,

        pathRewrite: (path) => {
            return "/products" + path;
        }
    })
);


// ORDER SERVICE
app.use(
    "/api/orders",
    createProxyMiddleware({
        target: "http://localhost:4002",
        changeOrigin: true,

        pathRewrite: (path) => {
            return "/orders" + path;
        }
    })
);


// AUTH SERVICE
app.use(
    "/api/auth",
    createProxyMiddleware({
        target: "http://localhost:4003",
        changeOrigin: true,

        pathRewrite: (path) => {
            return "/auth" + path;
        }
    })
);


app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});