const services = {
    product: {
        path: "/api/products",
        target: "http://localhost:4001",
        rewritePath: "/products"
    },

    order: {
        path: "/api/orders",
        target: "http://localhost:4002",
        rewritePath: "/orders"
    },

    auth: {
        path: "/api/auth",
        target: "http://localhost:4003",
        rewritePath: "/auth"
    }
};

module.exports = services;