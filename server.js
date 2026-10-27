require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAIL"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error("Missing environment variables:", missing.join(", "));
  console.error("Copy .env.example to .env and fill in the Supabase values.");
  process.exit(1);
}

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();

async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Login required." });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: "Session expired. Please log in again." });
  if ((data.user.email || "").toLowerCase() !== adminEmail) {
    return res.status(403).json({ error: "This account is not authorized as LocalPay admin." });
  }
  req.adminUser = data.user;
  next();
}

app.get("/config.js", (req, res) => {
  res.type("application/javascript").set("Cache-Control", "no-store");
  res.send(`window.LOCALPAY_CONFIG = ${JSON.stringify({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    adminEmail
  })};`);
});

app.get("/api/health", (req, res) => res.json({ ok: true, app: "LocalPay" }));

app.get("/api/payments", requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("localpay_payments")
    .select("id, customer_name, customer_phone, amount, method, transaction_ref, status, note, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return res.status(500).json({ error: "Could not load payments. Check database setup." });
  res.json({ payments: data || [] });
});

app.post("/api/payments", requireAdmin, async (req, res) => {
  const body = req.body || {};
  const customer_name = String(body.customer_name || "").trim().slice(0, 120);
  const customer_phone = String(body.customer_phone || "").trim().slice(0, 40);
  const method = String(body.method || "").trim().slice(0, 40);
  const transaction_ref = String(body.transaction_ref || "").trim().slice(0, 120);
  const note = String(body.note || "").trim().slice(0, 500);
  const amount = Number(body.amount);

  if (!customer_name || !Number.isFinite(amount) || amount <= 0 || !method) {
    return res.status(400).json({ error: "Name, valid amount, and payment method are required." });
  }
  const { data, error } = await supabaseAdmin.from("localpay_payments").insert({
    customer_name, customer_phone, amount, method, transaction_ref, note, status: "pending"
  }).select().single();
  if (error) return res.status(500).json({ error: "Could not save payment. Check database setup." });
  res.status(201).json({ payment: data });
});

app.patch("/api/payments/:id/status", requireAdmin, async (req, res) => {
  const status = String((req.body || {}).status || "");
  if (!["pending", "verified", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Status must be pending, verified, or rejected." });
  }
  const { data, error } = await supabaseAdmin
    .from("localpay_payments")
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: req.adminUser.email })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: "Could not update status. Check payment ID and database." });
  res.json({ payment: data });
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const port = process.env.PORT || 10000;
app.listen(port, "0.0.0.0", () => console.log(`LocalPay listening on ${port}`));
