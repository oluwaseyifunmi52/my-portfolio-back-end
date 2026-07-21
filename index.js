import dns from "dns";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./config/db.js";

import contactRoutes from "./routes/contactRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";

import errorMiddleware from "./middleware/errorMiddleware.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;


app.use(
    cors({
        origin: (origin, callback) => {
            const allowed = [
                "http://localhost:5174",
                 "https://my-portfolio-6x9e473w9-oluwaseyifunmi52s-projects.vercel.app", 
            ];
            const isVercelPreview = origin && /^https:\/\/my-portfolio-.*\.vercel\.app$/.test(origin);

            if (!origin || allowed.includes(origin) || isVercelPreview) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

     
// Body parser
app.use(express.json());

// Health check
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Portfolio Backend API is running",
    });
});

// API health check
app.get("/api", (req, res) => {
    res.json({
        success: true,
        message: "Portfolio API is running",
    });
});

// API Routes
app.use("/api/contact", contactRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/newsletter", newsletterRoutes);

// Error middleware
app.use(errorMiddleware);

// Start server
const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(
                `Server running on port ${PORT}`
            );
        });
    } catch (error) {
        console.error(
            `Failed to start server: ${error.message}`
        );

        process.exit(1);
    }
};

startServer();