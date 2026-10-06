const express = require("express");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 4003;

app.post("/auth/login", (req, res) => {
    const { email } = req.body;

    res.json({
        message: "Login endpoint reached",
        email
    });
});

app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
});