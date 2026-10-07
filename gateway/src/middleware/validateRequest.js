const { z } = require("zod");


// REGISTER BODY
const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6)
});


// LOGIN BODY
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});


// CREATE ORDER BODY
const orderSchema = z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive()
});


function validateRequest(req, res, next) {
    try {
        let schema = null;

        // REGISTER
        if (
            req.method === "POST" &&
            req.originalUrl === "/api/auth/register"
        ) {
            schema = registerSchema;
        }

        // LOGIN
        else if (
            req.method === "POST" &&
            req.originalUrl === "/api/auth/login"
        ) {
            schema = loginSchema;
        }

        // CREATE ORDER
        else if (
            req.method === "POST" &&
            req.originalUrl === "/api/orders"
        ) {
            schema = orderSchema;
        }

        // Is route ke liye validation defined nahi hai
        if (!schema) {
            return next();
        }

        const result = schema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Invalid request data",
                errors: result.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message
                }))
            });
        }

        // Validated/sanitized data
        req.body = result.data;

        next();

    } catch (error) {
        next(error);
    }
}

module.exports = validateRequest;