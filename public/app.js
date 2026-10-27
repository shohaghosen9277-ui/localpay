(() => {
  const cfg = window.LOCALPAY_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const loginPanel = $("loginPanel"), dashboard = $("dashboard");
  let supabase = null, session = null, payments = [];

  function message(id, text, success = false) {
    const el = $(id); el.textContent = text || "";
    el.className = "message" + (success ? " success" : "");
  }
  function money(n) {
    return new Intl.NumberFormat("bn-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 2 }).format(Number(n || 0));
  }
  function dateLabel(value) {
    try { return new Date(value).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" }); }
    catch { return value || "—"; }
  }
  async function api(url, options = {}) {
    const token = session?.access_token;
    const response = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "অনুরোধটি সম্পন্ন করা যায়নি।");
    return body;
  }
  function showDashboard(user) {
    loginPanel.classList.add("hidden"); dashboard.classList.remove("hidden");
    $("adminEmail").textContent = user.email || "";
  }
  function showLogin() {
    dashboard.classList.add("hidden"); loginPanel.classList.remove("hidden");
    session = null;
  }
  function renderPayments() {
    const q = $("filterInput").value.trim().toLowerCase();
    const filtered = payments.filter(p => [p.customer_name, p.customer_phone, p.method, p.transaction_ref, p.status].join(" ").toLowerCase().includes(q));
    $("totalCount").textContent = payments.length;
    $("pendingCount").textContent = payments.filter(p => p.status === "pending").length;
    $("verifiedCount").textContent = payments.filter(p => p.status === "verified").length;
    $("verifiedAmount").textContent = money(payments.filter(p => p.status === "verified").reduce((sum, p) => sum + Number(p.amount), 0));
    const tbody = $("paymentRows");
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty">${payments.length ? "কোনো মিল পাওয়া যায়নি" : "এখনো কোনো পেমেন্ট রেকর্ড নেই"}</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map(p => {
      const statusBn = { pending: "অপেক্ষমাণ", verified: "যাচাইকৃত", rejected: "বাতিল" }[p.status] || p.status;
      const actions = p.status === "pending"
        ? `<div class="actions"><button class="approve" data-action="verified" data-id="${p.id}">যাচাই</button><button class="reject" data-action="rejected" data-id="${p.id}">বাতিল</button></div>`
        : `<span class="subline">আপডেট হয়েছে</span>`;
      return `<tr>
        <td><div class="customer">${escapeHtml(p.customer_name)}</div><div class="subline">${escapeHtml(p.customer_phone || "ফোন নেই")}</div></td>
        <td><strong>${money(p.amount)}</strong></td>
        <td><div>${escapeHtml(p.method)}</div><div class="subline">${escapeHtml(p.transaction_ref || "রেফারেন্স নেই")}</div></td>
        <td><span class="status ${p.status}">${statusBn}</span></td>
        <td>${dateLabel(p.created_at)}</td><td>${actions}</td></tr>`;
    }).join("");
  }
  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[ch]);
  }
  async function loadPayments() {
    $("paymentRows").innerHTML = `<tr><td colspan="6" class="empty">ডেটা লোড হচ্ছে…</td></tr>`;
    try {
      const data = await api("/api/payments");
      payments = data.payments || [];
      renderPayments();
      message("tableMessage", "");
    } catch (e) {
      message("tableMessage", e.message);
      $("paymentRows").innerHTML = `<tr><td colspan="6" class="empty">ডেটা লোড হয়নি। SQL schema চালানো হয়েছে কি না দেখুন।</td></tr>`;
    }
  }

  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault(); message("loginMessage", "লগইন করা হচ্ছে…");
    const email = $("email").value.trim().toLowerCase();
    const password = $("password").value;
    if (email !== String(cfg.adminEmail || "").toLowerCase()) {
      message("loginMessage", "এই ইমেইলটি LocalPay অ্যাডমিন ইমেইলের সঙ্গে মিলছে না।"); return;
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      session = data.session;
      if (!session) throw new Error("লগইন সেশন পাওয়া যায়নি।");
      showDashboard(data.user);
      await loadPayments();
    } catch (e) {
      message("loginMessage", e.message || "লগইন করা যায়নি। ইমেইল ও পাসওয়ার্ড যাচাই করুন।");
    }
  });

  $("logoutBtn").addEventListener("click", async () => {
    if (supabase) await supabase.auth.signOut();
    showLogin();
  });
  $("refreshBtn").addEventListener("click", loadPayments);
  $("filterInput").addEventListener("input", renderPayments);

  $("paymentForm").addEventListener("submit", async (event) => {
    event.preventDefault(); message("formMessage", "সংরক্ষণ করা হচ্ছে…");
    const payload = {
      customer_name: $("customerName").value,
      customer_phone: $("customerPhone").value,
      amount: $("amount").value,
      method: $("method").value,
      transaction_ref: $("transactionRef").value,
      note: $("note").value
    };
    try {
      await api("/api/payments", { method: "POST", body: JSON.stringify(payload) });
      $("paymentForm").reset();
      message("formMessage", "রেকর্ড সংরক্ষণ হয়েছে। এখন লেনদেন যাচাই করুন।", true);
      await loadPayments();
    } catch (e) { message("formMessage", e.message); }
  });

  $("paymentRows").addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const status = btn.dataset.action, id = btn.dataset.id;
    if (!confirm(status === "verified" ? "লেনদেনটি সত্যিই যাচাই করেছেন?" : "এই রেকর্ডটি বাতিল করবেন?")) return;
    btn.disabled = true;
    try {
      await api(`/api/payments/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await loadPayments();
    } catch (e) { message("tableMessage", e.message); btn.disabled = false; }
  });

  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) {
    message("loginMessage", "Supabase config পাওয়া যায়নি। Hosting environment variables সেট করুন।");
    $("loginForm").querySelector("button").disabled = true;
  } else {
    supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }
})();
