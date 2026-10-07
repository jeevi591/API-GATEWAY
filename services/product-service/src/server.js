const express = require("express");

const app = express();

const PORT = process.env.PORT || 4001;

const products = [
    { id: 1, name: "Keyboard", price: 2500 },
    { id: 2, name: "Mouse", price: 1200 },
    { id: 3, name: "Monitor", price: 15000 }
];

app.get("/products", (req, res) => {
    res.json(products);
});


app.get("/products/error", (req, res) => {
    res.status(500).json({
        message: "Simulated backend failure"
    });
});
app.get("/products/:id", (req, res) => {
    const id = Number(req.params.id);

    const product = products.find((p) => p.id === id);

    if (!product) {
        return res.status(404).json({
            message: "Product not found"
        });
    }

    res.json(product);
}); 


app.listen(PORT, () => {
    console.log(`Product service running on port ${PORT}`);
});