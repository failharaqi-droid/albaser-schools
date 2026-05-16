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
  } catch (error) {
    console.error("MySQL Connection Error:", error);
    dbStatus = "offline";
  }

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: dbStatus });
  });

  // Example API route to initialize database schema (Quick Install)
  app.post("/api/install", async (req, res) => {
    if (!pool) {
      return res.status(400).json({ error: "Database not configured. Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME." });
    }
    try {
      const connection = await pool.getConnection();
      
      // Basic schema creation
      const schema = `
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          username VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        -- Add more tables here as needed
      `;
      
      // Simple split by ';' for multiple statements
      const statements = schema.split(';').filter(stmt => stmt.trim() !== '');
      for (const stmt of statements) {
        await connection.query(stmt);
      }
      
      connection.release();
      res.json({ success: true, message: "Database tables created successfully on Hostinger!" });
    } catch (error: any) {
      console.error("Install error:", error);
      res.status(500).json({ error: error.message });
    }
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
