function requestLogger(req, res, next) {
    const startTime = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - startTime;

        console.log(
            `${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
        );
    });

    next(); //taaki request aage jaaye 
}

module.exports = requestLogger;// ye basically hum request ke liye log maintain karta hai 
