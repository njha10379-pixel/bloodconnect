// BloodConnect – frontend script (backend version)
const G = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CITIES = ["Gwalior", "Bhopal", "Indore", "Jabalpur", "Ujjain"];
const JSON_H = { "Content-Type": "application/json" };

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function load(k, d) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (e) { return d; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function fill(sel, list, first) { sel.innerHTML = (first ? `<option value="">${first}</option>` : "") + list.map(x => `<option>${x}</option>`).join(""); }
function toast(t) { const e = $("toast"); e.textContent = t; e.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(() => e.style.display = "none", 3500); }

// Talks to the server and returns the JSON answer
async function api(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}
const page = document.body.dataset.page;

// ---------- Home ----------
if (page === "home") {
  $("hgroups").innerHTML = G.map(g => `<a class="g" href="find.html?g=${encodeURIComponent(g)}">${g}</a>`).join("");
}

// ---------- Find donors ----------
if (page === "find") {
  let grp = new URLSearchParams(location.search).get("g");
  if (!G.includes(grp)) grp = null;
  let donors = [], target = null;
  $("groups").innerHTML = G.map(g => `<button class="g" type="button" aria-pressed="${g === grp}" data-g="${g}">${g}</button>`).join("");
  fill($("city"), CITIES, "All cities");

  async function render() {
    $("rtitle").textContent = grp ? `${grp} donors${$("city").value ? " in " + $("city").value : ""}` : "Donors";
    const r = $("results");
    if (!grp) { $("rsub").textContent = "Choose a blood group above to see matching donors."; r.innerHTML = ""; return; }
    const q = new URLSearchParams({ group: grp });
    if ($("city").value) q.set("city", $("city").value);
    if ($("avail").checked) q.set("available", "1");
    try { donors = await api("/api/donors?" + q); } catch (e) { toast(e.message); return; }
    $("rsub").textContent = donors.length ? `${donors.length} donor${donors.length > 1 ? "s" : ""} found. Send a request and they will reply to your phone number.` : "";
    if (!donors.length) { r.innerHTML = `<div class="empty">No ${grp} donors match yet. Try another city, untick “Available now only”, or <a href="donate.html" style="color:var(--red)">register as a donor</a> if you are ${grp}.</div>`; return; }
    r.innerHTML = donors.map((d, i) => `<div class="d"><div class="badge">${d.g}</div><div><h3>${esc(d.n)}</h3><div class="meta">${esc(d.a)}, ${d.c} · <span class="st ${d.v ? "on" : "off"}">${d.v ? "Available now" : "Not available"}</span></div></div><button class="btn" data-i="${i}" ${d.v ? "" : "disabled"}>Request blood</button></div>`).join("");
  }
  $("groups").onclick = e => {
    const b = e.target.closest(".g"); if (!b) return;
    grp = grp === b.dataset.g ? null : b.dataset.g;
    document.querySelectorAll(".g").forEach(x => x.setAttribute("aria-pressed", x.dataset.g === grp));
    render();
  };
  $("city").onchange = $("avail").onchange = render;
  $("results").onclick = e => {
    const b = e.target.closest("[data-i]"); if (!b) return;
    target = donors[+b.dataset.i];
    $("dtitle").textContent = `Request ${target.g} blood from ${target.n}`;
    $("dlg").showModal();
  };
  $("qc").onclick = () => $("dlg").close();
  $("rq").onsubmit = async e => {
    e.preventDefault();
    const phone = $("qph").value;
    try {
      await api("/api/requests", { method: "POST", headers: JSON_H, body: JSON.stringify({
        donor_id: target.id, patient_name: $("qp").value, units: +$("qu").value, hospital: $("qh").value, requester_phone: phone }) });
      save("bc_phone", phone);
      $("dlg").close(); $("rq").reset(); $("qu").value = 1;
      toast(`Request sent to ${target.n}. You can track it on the Requests page.`);
    } catch (err) { toast(err.message); }
  };
  render();
}

// ---------- Become a donor ----------
if (page === "donate") {
  fill($("rg"), G, "Select"); fill($("rc"), CITIES, "Select");
  function showMe() {
    const m = load("bc_me", null); $("me").hidden = !m; if (!m) return;
    $("mename").textContent = `You are registered, ${m.n.split(" ")[0]}.`;
    $("mesub").textContent = `${m.g} · ${m.a}, ${m.c}`; $("meav").checked = !!m.v;
  }
  $("reg").onsubmit = async e => {
    e.preventDefault();
    const body = { name: $("rn").value.trim(), age: +$("ra").value, blood_group: $("rg").value, city: $("rc").value,
      area: $("rar").value.trim(), phone: $("rp").value, consent: $("rcons").checked };
    try {
      const r = await api("/api/donors", { method: "POST", headers: JSON_H, body: JSON.stringify(body) });
      save("bc_me", { id: r.id, n: body.name, g: body.blood_group, c: body.city, a: body.area, v: 1 });
      $("reg").reset(); showMe(); toast("You are now listed as a donor.");
    } catch (err) { toast(err.message); }
  };
  $("meav").onchange = async () => {
    const m = load("bc_me", null); if (!m) return;
    const v = $("meav").checked ? 1 : 0;
    try {
      await api("/api/donors/" + m.id, { method: "PATCH", headers: JSON_H, body: JSON.stringify({ available: v }) });
      m.v = v; save("bc_me", m);
      toast(v ? "You are marked available." : "You are marked unavailable.");
    } catch (err) { toast(err.message); $("meav").checked = !!m.v; }
  };
  showMe();
}

// ---------- Requests ----------
if (page === "requests") {
  (async () => {
    const phone = load("bc_phone", "");
    const empty = `<div class="empty">No requests yet. <a href="find.html" style="color:var(--red)">Find a donor</a> and send your first request.</div>`;
    if (!phone) { $("reqlist").innerHTML = empty; return; }
    try {
      const list = await api("/api/requests?phone=" + phone);
      $("reqlist").innerHTML = list.length ? list.map(s => `<div class="d" style="grid-template-columns:3.4rem 1fr"><div class="badge">${s.g}</div><div><h3>${s.u} unit${s.u > 1 ? "s" : ""} for ${esc(s.p)}</h3><div class="meta">To ${esc(s.dn)} · ${esc(s.h)} · ${new Date(s.t).toLocaleString()} · <span class="st on">${esc(s.s)}</span></div></div></div>`).join("") : empty;
    } catch (err) { toast(err.message); }
  })();
}