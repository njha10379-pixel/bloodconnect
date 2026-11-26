require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serves your website

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined
});

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// "Rohit Sharma" -> "Rohit S."  (privacy: full name is never sent)
function publicName(n) {
  const p = n.trim().split(/\s+/);
  return p[0] + (p[1] ? " " + p[1][0] + "." : "");
}
const fail = (res, code, msg) => res.status(code).json({ error: msg });

// 1. Search donors (phone number is NOT selected, so it is never sent)
app.get("/api/donors", async (req, res) => {
  try {
    const { group, city, available } = req.query;
    if (!GROUPS.includes(group)) return fail(res, 400, "Invalid blood group");
    let sql = "SELECT id, name, blood_group, city, area, available FROM donors WHERE blood_group = ?";
    const params = [group];
    if (city) { sql += " AND city = ?"; params.push(city); }
    if (available === "1") sql += " AND available = 1";
    const [rows] = await db.query(sql, params);
    res.json(rows.map(r => ({ id: r.id, n: publicName(r.name), g: r.blood_group, c: r.city, a: r.area, v: r.available })));
  } catch (e) { console.error(e); fail(res, 500, "Server error"); }
});

// 2. Register a donor
app.post("/api/donors", async (req, res) => {
  try {
    const { name, age, blood_group, city, area, phone, consent } = req.body;
    if (!name || !city || !area) return fail(res, 400, "Please fill all fields");
    if (!GROUPS.includes(blood_group)) return fail(res, 400, "Invalid blood group");
    if (!(age >= 18 && age <= 65)) return fail(res, 400, "Donors must be between 18 and 65 years old.");
    if (!/^\d{10}$/.test(phone)) return fail(res, 400, "Phone must be 10 digits");
    if (consent !== true) return fail(res, 400, "Consent is required");
    const [r] = await db.query(
      "INSERT INTO donors (name, age, blood_group, city, area, phone, consent) VALUES (?, ?, ?, ?, ?, ?, 1)",
      [name.trim(), age, blood_group, city, area.trim(), phone]);
    res.json({ id: r.insertId });
  } catch (e) { console.error(e); fail(res, 500, "Server error"); }
});

// 3. Change availability
app.patch("/api/donors/:id", async (req, res) => {
  try {
    await db.query("UPDATE donors SET available = ? WHERE id = ?", [req.body.available ? 1 : 0, req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); fail(res, 500, "Server error"); }
});

// 4. Send a blood request
app.post("/api/requests", async (req, res) => {
  try {
    const { donor_id, patient_name, units, hospital, requester_phone } = req.body;
    if (!patient_name || !hospital) return fail(res, 400, "Please fill all fields");
    if (!(units >= 1 && units <= 10)) return fail(res, 400, "Units must be 1 to 10");
    if (!/^\d{10}$/.test(requester_phone)) return fail(res, 400, "Phone must be 10 digits");
    const [d] = await db.query("SELECT available FROM donors WHERE id = ?", [donor_id]);
    if (!d.length) return fail(res, 404, "Donor not found");
    if (!d[0].available) return fail(res, 400, "This donor is not available");
    await db.query(
      "INSERT INTO requests (donor_id, patient_name, units, hospital, requester_phone) VALUES (?, ?, ?, ?, ?)",
      [donor_id, patient_name.trim(), units, hospital.trim(), requester_phone]);
    res.json({ ok: true });
  } catch (e) { console.error(e); fail(res, 500, "Server error"); }
});

// 5. List requests sent by one phone number
app.get("/api/requests", async (req, res) => {
  try {
    const phone = req.query.phone || "";
    const [rows] = await db.query(
      `SELECT r.patient_name, r.units, r.hospital, r.status, r.created_at, d.name, d.blood_group
       FROM requests r JOIN donors d ON d.id = r.donor_id
       WHERE r.requester_phone = ? ORDER BY r.created_at DESC`, [phone]);
    res.json(rows.map(r => ({ g: r.blood_group, dn: publicName(r.name), p: r.patient_name, u: r.units, h: r.hospital, s: r.status, t: r.created_at })));
  } catch (e) { console.error(e); fail(res, 500, "Server error"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("BloodConnect running on port " + PORT));