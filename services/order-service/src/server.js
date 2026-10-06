const app = require("./app");
const { connectRedis, redisClient } = require("./config/redis");

const PORT = process.env.PORT || 3000;

async function startServer() {
    await connectRedis();

    await redisClient.set("test", "Redis is working");

    const value = await redisClient.get("test");

    console.log("Redis test:", value);

    app.listen(PORT, () => {
        console.log(`API Gateway running on port ${PORT}`);
    });
}

startServer();