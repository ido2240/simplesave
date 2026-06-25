const API = "";

function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  const el = document.getElementById(`view-${name}`);
  if (el) el.classList.remove("hidden");
}

document.querySelectorAll("[data-nav]").forEach((btn) => {
  btn.addEventListener("click", () => showView(btn.dataset.nav));
});

function fmt(n) {
  return new Intl.NumberFormat("he-IL").format(Math.round(n));
}

function renderErrors(container, issues) {
  container.innerHTML = issues.map((i) => `<div>${i.field}: ${i.message}</div>`).join("");
}

function renderClocks(container, clocks) {
  container.innerHTML = clocks
    .map(
      (c) => `
    <div class="clock-card">
      <h3>${c.name_he}</h3>
      <div>החזר ראשון: <strong>${fmt(c.mix.first_pay)} ₪</strong></div>
      <div>סה״כ: ${fmt(c.mix.total)} ₪</div>
      <div>ריבית: ${fmt(c.mix.interest)} ₪</div>
      <div class="risk">סיכון: ${c.risk.label} (${c.risk.score.toFixed(2)})</div>
      ${c.duplicate_flag ? `<div class="muted">⚠ ${c.duplicate_flag}</div>` : ""}
      ${!c.in_range ? `<div class="muted">מחוץ לטווח רצוי</div>` : ""}
    </div>`
    )
    .join("");
}

function borrowerFromForm(form) {
  return {
    full_name: form.full_name.value,
    birth_date: form.birth_date.value,
    is_property_owner: form.is_property_owner?.checked ?? true,
    net_income: Number(form.net_income.value),
  };
}

document.getElementById("btn-new-clocks").addEventListener("click", async () => {
  const form = document.getElementById("form-new");
  const body = {
    loan_type: form.loan_type.value,
    property_source: form.property_source.value,
    property_value: Number(form.property_value.value),
    equity: Number(form.equity.value),
    borrowers: [borrowerFromForm(form)],
    additional_income: Number(form.additional_income.value),
    fixed_expenses: Number(form.fixed_expenses.value),
    desired_min_payment: Number(form.desired_min_payment.value),
    desired_max_payment: Number(form.desired_max_payment.value),
    existing_mortgage_balance: 0,
  };
  const err = document.getElementById("new-errors");
  err.innerHTML = "";
  const res = await fetch(`${API}/new-mortgage/clocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.validation.ok) {
    renderErrors(err, data.validation.issues);
    document.getElementById("new-clocks").innerHTML = "";
    return;
  }
  renderClocks(document.getElementById("new-clocks"), data.clocks);
});

document.getElementById("btn-refi-clocks").addEventListener("click", async () => {
  const form = document.getElementById("form-refi");
  const body = {
    property_value: Number(form.property_value.value),
    existing_routes_balance: Number(form.existing_routes_balance.value),
    borrowers: [{
      full_name: form.full_name.value,
      birth_date: form.birth_date.value,
      is_property_owner: true,
      net_income: Number(form.net_income.value),
    }],
    additional_income: 0,
    fixed_expenses: 0,
    desired_min_payment: Number(form.desired_min_payment.value),
    desired_max_payment: Number(form.desired_max_payment.value),
    adjust_payment: true,
  };
  const err = document.getElementById("refi-errors");
  err.innerHTML = "";
  const res = await fetch(`${API}/refinance/clocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.validation.ok) {
    renderErrors(err, data.validation.issues);
    return;
  }
  renderClocks(document.getElementById("refi-clocks"), data.clocks);
});

document.getElementById("balance-pdf")?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/refinance/parse-balance-report`, { method: "POST", body: fd });
  const data = await res.json();
  const form = document.getElementById("form-refi");
  if (data.total_balance) form.existing_routes_balance.value = data.total_balance;
  document.getElementById("refi-errors").innerHTML = `<div>${data.message} (${data.bank_hint || "בנק לא זוהה"})</div>`;
});

document.getElementById("btn-insurance").addEventListener("click", async () => {
  const form = document.getElementById("form-insurance");
  const body = {
    coverage_amount: Number(form.coverage_amount.value),
    age: Number(form.age.value),
  };
  const res = await fetch(`${API}/insurance/quotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.available) {
    document.getElementById("insurance-results").innerHTML = `<p class="muted">${data.note}</p>`;
    return;
  }
  const rows = data.quotes
    .map(
      (q) =>
        `<tr><td>${q.company}</td><td>${fmt(q.life_monthly)}</td><td>${fmt(q.structure_monthly)}</td><td><strong>${fmt(q.total_monthly)}</strong></td></tr>`
    )
    .join("");
  document.getElementById("insurance-results").innerHTML = `
    <p class="muted">${data.note}</p>
    <table><thead><tr><th>חברה</th><th>חיים</th><th>מבנה</th><th>סה״כ</th></tr></thead><tbody>${rows}</tbody></table>`;
});

let authToken = localStorage.getItem("ss_token") || "";

document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = e.target.email.value;
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  authToken = data.token;
  localStorage.setItem("ss_token", authToken);
  document.getElementById("auth-status").textContent = `מחובר: ${data.email} (${data.role})`;
  loadApplications();
});

async function loadApplications() {
  if (!authToken) return;
  const res = await fetch(`${API}/personal/applications`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) return;
  const apps = await res.json();
  document.getElementById("applications").innerHTML = apps.length
    ? apps.map((a) => `<div class="clock-card"><strong>${a.service_type}</strong> — ${a.status}</div>`).join("")
    : "<p>אין בקשות עדיין.</p>";
}

if (authToken) loadApplications();
