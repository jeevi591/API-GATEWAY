const app = require("./app");
const { connectRedis, redisClient } = require("./config/redis");

const PORT = process.env.PORT || 3000;

async function startServer() {
    await connectRedis();

    
    app.listen(PORT, () => {
        console.log(`API Gateway running on port ${PORT}`);
    });
}

startServer();