const express = require("express");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 4002;

const orders = [
    { id: 1, productId: 1, quantity: 2 },
    { id: 2, productId: 3, quantity: 1 }
];

app.get("/orders", (req, res) => {
    res.json(orders);
});

app.post("/orders", (req, res) => {
    const order = {
        id: orders.length + 1,
        productId: req.body.productId,
        quantity: req.body.quantity
    };

    orders.push(order);

    res.status(201).json(order);
});

app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`);
});