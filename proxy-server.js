// ============================================================
//  TVO Happy Health — Static File Server (Production Version)
//  วิธีใช้: node proxy-server.js
// ============================================================
const http = require("http");
const fs   = require("fs");
const path = require("path");

const STATIC_DIR = __dirname;
const PORT       = 3001;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".ico":  "image/x-icon",
  ".svg":  "image/svg+xml",
};

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const server = http.createServer((req, res) => {
  const urlPath = new URL(req.url, `http://localhost:${PORT}`).pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  // ── Health check ──────────────────────────────────────────
  if (urlPath === "/health") {
    res.writeHead(200, { ...CORS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", backend: "supabase", port: PORT }));
    return;
  }

  // ── Static files ──────────────────────────────────────────
  const safeName = urlPath === "/" ? "Calapp.html" : urlPath.replace(/^\//, "");
  
  // 1. ตรวจสอบความปลอดภัย Path Traversal
  const filePath = path.resolve(STATIC_DIR, safeName);

  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 Forbidden: Access Denied");
    return;
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || "text/plain; charset=utf-8";

  // 2. เรียกอ่านไฟล์เพียงรอบเดียว (แก้ไขปัญหาขัดแย้งของ HTTP Headers)
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }

    // 3. ปรับประสิทธิภาพ: เพิ่ม Caching สำหรับไฟล์ทั่วไปที่ไม่ใช่ HTML เพื่อความเร็วสูงสุด
    const headers = { ...CORS, "Content-Type": mime };
    if (ext !== ".html") {
      // ให้เบราว์เซอร์จำไฟล์เหล่านั้นไว้เป็นเวลา 1 วัน ไม่ต้องโหลดใหม่ทุกครั้ง
      headers["Cache-Control"] = "public, max-age=86400"; 
    } else {
      // หน้าเว็บหลักให้ดึงข้อมูลใหม่เสมอเพื่ออัปเดตระบบ
      headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    }

    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log("\n🌿 TVO Happy Health — Supabase Edition (Production)");
  console.log("   Static server: http://localhost:" + PORT);
  console.log("   App:   http://localhost:" + PORT + "/Calapp.html");
  console.log("   Admin: http://localhost:" + PORT + "/admin.html");
});