import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import fs from "fs";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

const CONFIG_FILE = path.join(process.cwd(), "hostinger-config.json");

let pool: mysql.Pool | null = null;
let dbStatus = "not_configured";

async function connectToDb(config: any) {
  const newPool = mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Test connection
  await newPool.getConnection();
  
  // Create table if not exists
  await newPool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      store_key VARCHAR(255) PRIMARY KEY,
      store_value LONGTEXT
    )
  `);

  pool = newPool;
  dbStatus = "online";
  console.log("Connected to MySQL database on Hostinger!");
}

async function startServer() {
  // Try loading config
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      await connectToDb(config);
    } catch (e: any) {
      console.log(`Failed to connect to configured DB: ${e.message}`);
      dbStatus = "error";
    }
  }

  // Unified route for /api.php to simulate the PHP environment!
  app.all("/api.php", async (req, res) => {
    const action = req.query.action;
    
    if (action === "health") {
      res.json({ status: "ok", mode: dbStatus });
      return;
    }
    
    if (action === "status") {
      res.json({ status: dbStatus });
      return;
    }

    if (action === "setup" && req.method === "POST") {
      const { host, user, password, database } = req.body;
      try {
        await connectToDb({ host, user, password, database });
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ host, user, password, database }), "utf-8");
        res.json({ success: true });
      } catch (e: any) {
        dbStatus = "error";
        res.status(400).json({ success: false, error: e.message });
      }
      return;
    }

    if (action === "sync") {
      if (!pool) return res.status(400).json({ error: "not_configured" });

      if (req.method === "GET") {
        try {
          const [rows]: any = await pool.query(`SELECT store_key, store_value FROM app_state WHERE store_key = 'main_db'`);
          if (rows.length > 0) {
            res.json({ data: JSON.parse(rows[0].store_value) });
          } else {
            res.json({ data: null });
          }
        } catch (e: any) {
          res.status(500).json({ error: e.message });
        }
        return;
      }

      if (req.method === "POST") {
        try {
          const dbData = req.body;
          const strData = JSON.stringify(dbData);
          await pool.query(`
            INSERT INTO app_state (store_key, store_value) 
            VALUES ('main_db', ?) 
            ON DUPLICATE KEY UPDATE store_value = ?
          `, [strData, strData]);
          res.json({ success: true });
        } catch (e: any) {
          res.status(500).json({ error: e.message });
        }
        return;
      }
    }
    
    res.status(404).json({ error: "Action not found" });
  });

  // Legacy express routes for backward compatibility
  app.get("/api/health", (req, res) => {

    res.json({ status: "ok", mode: dbStatus });
  });

  app.get("/api/db/status", (req, res) => {
    res.json({ status: dbStatus });
  });

  app.post("/api/db/setup", async (req, res) => {
    const { host, user, password, database } = req.body;
    try {
      await connectToDb({ host, user, password, database });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ host, user, password, database }), "utf-8");
      res.json({ success: true });
    } catch (e: any) {
      dbStatus = "error";
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.get("/api/db/sync", async (req, res) => {
    if (!pool) return res.status(400).json({ error: "not_configured" });
    try {
      const [rows]: any = await pool.query(`SELECT store_key, store_value FROM app_state WHERE store_key = 'main_db'`);
      if (rows.length > 0) {
        res.json({ data: JSON.parse(rows[0].store_value) });
      } else {
        res.json({ data: null });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/db/sync", async (req, res) => {
    if (!pool) return res.status(400).json({ error: "not_configured" });
    try {
      const dbData = req.body;
      const strData = JSON.stringify(dbData);
      await pool.query(`
        INSERT INTO app_state (store_key, store_value) 
        VALUES ('main_db', ?) 
        ON DUPLICATE KEY UPDATE store_value = ?
      `, [strData, strData]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
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
