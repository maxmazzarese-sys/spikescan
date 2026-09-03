(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const store = {
    get users() {
      try { return JSON.parse(localStorage.getItem("ss_users") || "[]"); } catch { return []; }
    },
    set users(v) { localStorage.setItem("ss_users", JSON.stringify(v)); },
    get session() {
      try { return JSON.parse(localStorage.getItem("ss_session") || "null"); } catch { return null; }
    },
    set session(v) {
      if (v) localStorage.setItem("ss_session", JSON.stringify(v));
      else localStorage.removeItem("ss_session");
    },
    get watch() {
      try { return JSON.parse(localStorage.getItem("ss_watch") || "null") || window.WATCHLIST_DEFAULT.slice();
      } catch { return window.WATCHLIST_DEFAULT.slice(); }
    },
    set watch(v) { localStorage.setItem("ss_watch", JSON.stringify(v)); },
  };

  function seedDemo() {
    const users = store.users;
    if (!users.some((u) => u.email === "analyst@spikescan.io")) {
      users.push({
        name: "Avery Chen",
        email: "analyst@spikescan.io",
        password: "spike2026",
        plan: "Pro desk",
      });
      store.users = users;
    }
  }

  function fmt(n, d = 2) {
    if (n == null || Number.isNaN(n)) return "—";
    return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtVol(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
    return String(n);
  }
  function fmtCap(n) {
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(0) + "M";
    return "$" + fmt(n, 0);
  }
  function chgClass(x) { return x >= 0 ? "chg pos" : "chg neg"; }
  function chgTxt(x) { return (x >= 0 ? "+" : "") + fmt(x, 2) + "%"; }

  function sparkSVG(arr) {
    if (!arr || arr.length < 2) return "";
    const w = 88, h = 28, pad = 2;
    const min = Math.min(...arr), max = Math.max(...arr);
    const span = max - min || 1;
    const pts = arr.map((v, i) => {
      const x = pad + (i / (arr.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    const up = arr[arr.length - 1] >= arr[0];
    const c = up ? "#2ee6a6" : "#ff5d73";
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline fill="none" stroke="${c}" stroke-width="1.6" points="${pts}"/></svg>`;
  }

  function showAuth(mode) {
    $("#auth").classList.remove("app-hidden");
    $("#app").classList.add("app-hidden");
    setAuthTab(mode || "login");
  }
  function showApp() {
    $("#auth").classList.add("app-hidden");
    $("#app").classList.remove("app-hidden");
    const s = store.session;
    $("#userName").textContent = s.name;
    $("#userMeta").textContent = s.plan || "Pro desk";
    $("#avatar").textContent = (s.name || "A").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
    renderAll();
  }

  function setAuthTab(mode) {
    $$(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === mode));
    $("#loginForm").classList.toggle("app-hidden", mode !== "login");
    $("#signupForm").classList.toggle("app-hidden", mode !== "signup");
    $("#authErr").textContent = "";
  }

  function displayNameFromEmail(email) {
    const local = (email || "").split("@")[0] || "Analyst";
    return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  function login(email, password) {
    const u = store.users.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
    if (!u) return "No account matches those credentials.";
    store.session = { name: u.name || displayNameFromEmail(u.email), email: u.email, plan: u.plan || "Pro desk" };
    showApp();
  }
  function signup(email, password) {
    if (!email || !password) return "Email and password are required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    const users = store.users;
    if (users.some((x) => x.email.toLowerCase() === email.toLowerCase())) return "That email is already registered.";
    const name = displayNameFromEmail(email);
    users.push({ name, email, password, plan: "Pro desk" });
    store.users = users;
    store.session = { name, email, plan: "Pro desk" };
    showApp();
  }

  function navigate(page) {
    $$(".nav button").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
    $$(".page").forEach((p) => p.classList.toggle("active", p.id === "page-" + page));
  }

  function signalByTicker(t) {
    return window.SIGNALS.find((s) => s.ticker === t);
  }

  function renderKPIs() {
    const m = window.MARKET_STATS;
    $("#kpiScan").textContent = m.scanned.toLocaleString();
    $("#kpiSig").textContent = String(window.SIGNALS.length);
    $("#kpiIns").textContent = String(window.INSIDER_TAPE.filter((i) => i.type !== "S").length);
    $("#kpiVol").textContent = m.avgVolSpike.toFixed(1) + "×";
    $("#asOf").textContent = window.SPIKE_AS_OF;
  }

  function renderFeatured() {
    const s = signalByTicker("GPRO");
    $("#featTicker").textContent = s.ticker;
    $("#featName").textContent = s.name + " · " + s.exchange;
    $("#featPrice").textContent = "$" + fmt(s.price);
    $("#featChg").textContent = chgTxt(s.change) + " today";
    $("#featChg").className = chgClass(s.change);
    $("#featWeek").textContent = chgTxt(s.weekChange) + " 5-session";
    $("#featWeek").className = chgClass(s.weekChange);
    $("#featScore").textContent = s.score;
    $("#featThesis").textContent = s.thesis;
    $("#featWhy").innerHTML = "<strong>Why Markiplier bought:</strong> " + s.whyInvested;
    $("#featTags").innerHTML = s.tags.map((t) => `<span class="chip">${t}</span>`).join("");
    $("#featMeta").innerHTML = [
      `Vol ${fmtVol(s.volume)} · ${s.volRatio.toFixed(1)}× avg`,
      `Mkt cap ${fmtCap(s.mktCap)}`,
      `Short ${s.shortPct}%`,
      `Float ${s.floatM}M`,
    ].map((t) => `<span class="chip">${t}</span>`).join("");
    $("#featTime").innerHTML = s.catalysts.map((c) =>
      `<li><time>${c.date.slice(5)}</time><div><b>${c.label}</b> — ${c.detail}</div></li>`
    ).join("");
    $("#featSpark").innerHTML = sparkSVG(s.spark);
  }

  function rowHTML(s) {
    const badge =
      s.status.includes("SPIKE") ? "hot" :
      s.status.includes("COIL") || s.status.includes("IGNIT") ? "coil" :
      s.status.includes("NEWS") || s.status.includes("INSIDER") ? "news" : "hot";
    return `<tr class="clickable" data-ticker="${s.ticker}">
      <td class="mono"><b>${s.ticker}</b><div style="color:var(--faint);font-size:11px">${s.name}</div></td>
      <td>$${fmt(s.price)}</td>
      <td class="${chgClass(s.change)}">${chgTxt(s.change)}</td>
      <td class="${chgClass(s.weekChange)}">${chgTxt(s.weekChange)}</td>
      <td>${fmtVol(s.volume)} <span style="color:var(--faint)">(${s.volRatio.toFixed(1)}×)</span></td>
      <td>${fmtCap(s.mktCap)}</td>
      <td><span class="score-bar"><i style="width:${s.score}%"></i></span>${s.score}</td>
      <td><span class="badge ${badge}">${s.status}</span></td>
      <td>${sparkSVG(s.spark)}</td>
    </tr>`;
  }

  function renderTables() {
    const ranked = [...window.SIGNALS].sort((a, b) => b.score - a.score);
    $("#signalRows").innerHTML = ranked.map(rowHTML).join("");
    const clone = document.getElementById("scannerClone");
    if (clone) clone.innerHTML = ranked.map(rowHTML).join("");
    applyScanner();
    $("#watchRows").innerHTML = store.watch.map((t) => {
      const s = signalByTicker(t);
      return s ? rowHTML(s) : "";
    }).join("");
    $("#insiderRows").innerHTML = window.INSIDER_TAPE.map((i) => {
      const buy = i.type !== "S";
      return `<tr>
        <td class="mono">${i.date.slice(5)}</td>
        <td class="mono"><b>${i.ticker}</b></td>
        <td>${i.name}<div style="color:var(--faint);font-size:11px">${i.role}</div></td>
        <td><span class="badge ${buy ? "coil" : "warn"}">${i.type === "13G" ? "13G" : buy ? "BUY" : "SELL"}</span></td>
        <td class="mono">${fmtVol(i.shares)}</td>
        <td class="${buy ? "chg pos" : "chg neg"}">${buy ? "+" : ""}$${fmtVol(Math.abs(i.value))}</td>
        <td style="color:var(--muted);max-width:360px">${i.note}</td>
      </tr>`;
    }).join("");
    $("#newsList").innerHTML = window.NEWS_DESK.map((n) =>
      `<div class="timeline" style="border-bottom:1px solid var(--line);padding:10px 0">
        <div style="display:flex;gap:10px;align-items:baseline">
          <time style="color:var(--faint);font-family:var(--mono);font-size:11px;min-width:92px">${n.time}</time>
          <div>
            <span class="badge ${n.sentiment === "pos" ? "coil" : "hot"}">${n.ticker}</span>
            <span class="chip">${n.impact}</span>
            <div style="margin-top:6px">${n.title}</div>
            <div style="color:var(--faint);font-size:11px;margin-top:3px">${n.source}</div>
          </div>
        </div>
      </div>`
    ).join("");
  }

  function applyScanner() {
    const q = ($("#scanQ")?.value || "").toLowerCase();
    const maxP = parseFloat($("#scanPrice")?.value || "5");
    const minVol = parseFloat($("#scanVol")?.value || "0");
    const cat = $("#scanCat")?.value || "all";
    const rows = window.SIGNALS.filter((s) => {
      if (s.price > maxP) return false;
      if (s.volRatio < minVol) return false;
      if (q && !(`${s.ticker} ${s.name} ${s.tags.join(" ")}`).toLowerCase().includes(q)) return false;
      if (cat === "insider" && !s.tags.some((t) => /13G|Insider|Celebrity/i.test(t))) return false;
      if (cat === "news" && !s.tags.some((t) => /News|M&A|Product/i.test(t))) return false;
      if (cat === "volume" && s.volRatio < 3) return false;
      if (cat === "short" && s.shortPct < 25) return false;
      return true;
    }).sort((a, b) => b.score - a.score);
    $("#scannerRows").innerHTML = rows.map(rowHTML).join("");
    $("#scanCount").textContent = rows.length + " names";
  }

  function openDetail(ticker) {
    const s = signalByTicker(ticker);
    if (!s) return;
    navigate("signals");
    const el = $("#detail");
    el.classList.add("open");
    const watched = store.watch.includes(s.ticker);
    el.innerHTML = `
      <div class="card featured">
        <div class="feat-head">
          <div>
            <div class="ticker-lg">${s.ticker}</div>
            <div style="color:var(--muted)">${s.name} · ${s.exchange} · ${s.sector}</div>
          </div>
          <div style="text-align:right">
            <div class="price-lg">$${fmt(s.price)}</div>
            <div class="${chgClass(s.change)}">${chgTxt(s.change)} session · <span class="${chgClass(s.weekChange)}">${chgTxt(s.weekChange)} week</span></div>
          </div>
        </div>
        <div class="meta-row" style="margin-top:12px">
          ${s.tags.map((t) => `<span class="chip">${t}</span>`).join("")}
          <span class="badge hot">Score ${s.score}</span>
          <span class="badge coil">${s.phase}</span>
        </div>
        <p class="thesis">${s.thesis}</p>
        <div class="why-box"><strong>Holder / flow context:</strong> ${s.whyInvested}</div>
        <div class="meta-row" style="margin-top:12px">
          <span class="chip">Volume ${fmtVol(s.volume)} (${s.volRatio.toFixed(1)}× 30d avg ${fmtVol(s.avgVol)})</span>
          <span class="chip">Mkt cap ${fmtCap(s.mktCap)}</span>
          <span class="chip">Float ${s.floatM}M</span>
          <span class="chip">Short ${s.shortPct}%</span>
        </div>
        ${s.catalysts.length ? `<ul class="timeline" style="margin-top:12px">${s.catalysts.map((c) => `<li><time>${c.date}</time><div><b>${c.label}</b> — ${c.detail}</div></li>`).join("")}</ul>` : ""}
        ${s.news.length ? `<div style="margin-top:12px">${s.news.map((n) => `<div style="padding:6px 0;border-top:1px solid var(--line);font-size:13px"><b>${n.source}</b> · ${n.title} <span style="color:var(--faint)">${n.time}</span></div>`).join("")}</div>` : ""}
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn-primary" style="width:auto;padding:10px 16px" id="toggleWatch">${watched ? "Remove from desk" : "Add to desk"}</button>
          <button class="btn-ghost" style="width:auto;padding:10px 16px" id="closeDetail">Close</button>
        </div>
      </div>`;
    $("#toggleWatch").onclick = () => {
      let w = store.watch;
      if (w.includes(s.ticker)) w = w.filter((t) => t !== s.ticker);
      else w = [s.ticker, ...w];
      store.watch = w;
      renderTables();
      openDetail(s.ticker);
    };
    $("#closeDetail").onclick = () => el.classList.remove("open");
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderAll() {
    renderKPIs();
    renderFeatured();
    renderTables();
  }

  function bind() {
    $$(".tabs button").forEach((b) => b.addEventListener("click", () => setAuthTab(b.dataset.tab)));
    $("#loginForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = login($("#loginEmail").value.trim(), $("#loginPass").value);
      if (msg) $("#authErr").textContent = msg;
    });
    $("#signupForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = signup($("#suEmail").value.trim(), $("#suPass").value);
      if (msg) $("#authErr").textContent = msg;
    });
    $("#demoBtn").addEventListener("click", () => {
      $("#loginEmail").value = "analyst@spikescan.io";
      $("#loginPass").value = "spike2026";
      login("analyst@spikescan.io", "spike2026");
    });
    $("#logoutBtn").addEventListener("click", () => { store.session = null; showAuth("login"); });
    $$(".nav button").forEach((b) => b.addEventListener("click", () => navigate(b.dataset.page)));
    document.addEventListener("click", (e) => {
      const tr = e.target.closest("tr[data-ticker]");
      if (tr) openDetail(tr.dataset.ticker);
    });
    ["scanQ", "scanPrice", "scanVol", "scanCat"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", applyScanner);
      if (el && el.tagName === "SELECT") el.addEventListener("change", applyScanner);
    });
    $("#topSearch").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const q = e.target.value.trim().toUpperCase();
        if (signalByTicker(q)) openDetail(q);
        else {
          navigate("scanner");
          $("#scanQ").value = e.target.value.trim();
          applyScanner();
        }
      }
    });
  }

  seedDemo();
  bind();
  if (store.session) showApp();
  else showAuth("login");
})();
