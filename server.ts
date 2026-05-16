import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Database connection pool
  let pool: mysql.Pool | null = null;
  let dbStatus = "offline";

  try {
    if (process.env.DB_HOST && process.env.DB_USER) {
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "school_db",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      // Test connection
      await pool.getConnection();
      dbStatus = "online";
      console.log("Connected to MySQL database on Hostinger!");
    } else {
      console.log("No MySQL connection configuration found. Running in offline/local mode.");
    }
  } catch (error: any) {
    console.log(`MySQL Connection Info (Running offline): ${error.message}`);
    dbStatus = "offline";
  }

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: dbStatus });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
