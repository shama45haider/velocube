/* Velocube Master Control — application
   Hash-routed single page app. Every view's data chain ends in
   renderViewError, every write in apiFail, so nothing fails silently. */
(function () {
  "use strict";

  var api = window.VeloMasterAPI;
  var me = null;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var view = $("#view");

  /* ================= helpers ================= */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function money(n) {
    if (n == null || isNaN(Number(n))) return "—";
    return "$" + Number(n).toLocaleString("en-US");
  }

  function fmtDate(v) {
    if (!v) return "—";
    var d = new Date(v);
    if (isNaN(d)) return String(v);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function fmtDateTime(v) {
    if (!v) return "—";
    var d = new Date(v);
    if (isNaN(d)) return String(v);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function timeAgo(v) {
    if (!v) return "never";
    var s = (Date.now() - new Date(v).getTime()) / 1000;
    if (s < 90) return "just now";
    if (s < 3600) return Math.round(s / 60) + "m ago";
    if (s < 86400) return Math.round(s / 3600) + "h ago";
    if (s < 86400 * 30) return Math.round(s / 86400) + "d ago";
    return fmtDate(v);
  }

  function isBanned(u) {
    return !!(u.banned_until && new Date(u.banned_until) > new Date());
  }

  // Random temp password: 14 chars, unambiguous alphabet, cryptographic source.
  function genPassword() {
    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    var buf = new Uint32Array(14);
    crypto.getRandomValues(buf);
    var out = "";
    for (var i = 0; i < buf.length; i++) out += alphabet[buf[i] % alphabet.length];
    return out;
  }

  function toast(msg, isErr) {
    var el = document.createElement("div");
    el.className = "toast" + (isErr ? " err" : "");
    el.textContent = msg;
    $("#toast-root").appendChild(el);
    setTimeout(function () { el.remove(); }, 4200);
  }

  function apiFail(err) {
    toast((err && err.message) || "Something went wrong", true);
  }

  function renderViewError(err) {
    view.innerHTML =
      '<div class="error-card">' +
      "<h2>Couldn't load this page</h2>" +
      "<p>" + esc((err && err.message) || "Unknown error") + "</p>" +
      '<button class="btn btn-primary" id="retry-btn">TRY AGAIN</button>' +
      "</div>";
    $("#retry-btn").addEventListener("click", route);
  }

  /* ================= modals ================= */

  function openModal(title, bodyHtml, footHtml) {
    closeModal();
    var root = $("#modal-root");
    root.innerHTML =
      '<div class="modal-overlay">' +
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h2>' + esc(title) + '</h2>' +
      '<button class="modal-close" aria-label="Close">&times;</button></div>' +
      '<div class="modal-body">' + bodyHtml + "</div>" +
      (footHtml ? '<div class="modal-foot">' + footHtml + "</div>" : "") +
      "</div></div>";
    $(".modal-close", root).addEventListener("click", closeModal);
    $(".modal-overlay", root).addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal();
    });
    return root;
  }

  function closeModal() { $("#modal-root").innerHTML = ""; }

  function modalError(msg) {
    var body = $("#modal-root .modal-body");
    if (!body) return;
    var ex = $(".modal-error", body);
    if (ex) ex.remove();
    var p = document.createElement("p");
    p.className = "modal-error";
    p.textContent = msg;
    body.prepend(p);
  }

  /* ================= screens ================= */

  function show(which) {
    $("#login-screen").hidden = which !== "login";
    $("#lockout-screen").hidden = which !== "lockout";
    $("#app").hidden = which !== "app";
  }

  function showApp() {
    show("app");
    $("#session-email").textContent = me.email;
    $("#mode-chip").hidden = api.mode !== "sandbox";
    if (!location.hash || location.hash === "#/") location.hash = "#/overview";
    route();
  }

  /* ================= router ================= */

  var routes = [
    { re: /^#\/overview$/, fn: viewOverview, nav: "overview" },
    { re: /^#\/users$/, fn: viewUsers, nav: "users" },
    { re: /^#\/clients$/, fn: viewClients, nav: "clients" },
    { re: /^#\/client\/(\d+)$/, fn: viewClientDetail, nav: "clients" },
    { re: /^#\/tickets$/, fn: viewTickets, nav: "tickets" },
    { re: /^#\/team$/, fn: viewTeam, nav: "team" },
    { re: /^#\/commerce$/, fn: viewCommerce, nav: "commerce" },
    { re: /^#\/broadcast$/, fn: viewBroadcast, nav: "broadcast" },
    { re: /^#\/activity$/, fn: viewActivity, nav: "activity" },
    { re: /^#\/settings$/, fn: viewSettings, nav: "settings" }
  ];

  function route() {
    if ($("#app").hidden) return;
    closeModal();
    var hash = location.hash || "#/overview";
    for (var i = 0; i < routes.length; i++) {
      var m = hash.match(routes[i].re);
      if (m) {
        document.querySelectorAll("#cmd-nav a").forEach(function (a) {
          a.classList.toggle("active", a.dataset.nav === routes[i].nav);
        });
        view.innerHTML = '<p class="empty-note">Loading…</p>';
        routes[i].fn.apply(null, m.slice(1));
        return;
      }
    }
    location.hash = "#/overview";
  }

  function head(label, title, actionsHtml) {
    return '<div class="view-head"><div>' +
      '<span class="microlabel">' + esc(label) + "</span>" +
      "<h1>" + esc(title) + "</h1></div>" +
      (actionsHtml ? '<div class="view-actions">' + actionsHtml + "</div>" : "") +
      "</div>";
  }

  /* ================= Overview ================= */

  function viewOverview() {
    Promise.all([api.getCounts(), api.getActivity(12), api.admin("list_users")])
      .then(function (res) {
        var counts = res[0], activity = res[1], usersRes = res[2];
        var users = usersRes.users || [];
        var unlinked = users.filter(function (u) { return u.identity.kind === "unlinked"; });
        var orphans = usersRes.orphans || [];
        var banned = users.filter(isBanned);

        var tiles = [
          { n: users.length, l: "Auth accounts", href: "#/users" },
          { n: counts.clients, l: "Clients", href: "#/clients" },
          { n: counts.openTickets, l: "Open tickets", href: "#/tickets" },
          { n: counts.agents, l: "Active agents", href: "#/team" },
          { n: counts.services, l: "Services" },
          { n: counts.orders, l: "Add-on orders", href: "#/commerce" },
          { n: counts.documents, l: "Documents", href: "#/commerce" },
          { n: counts.staging, l: "Staging sites" }
        ];

        var html = head("SYSTEM", "Overview");

        var warnings = [];
        if (unlinked.length) warnings.push(unlinked.length + " login" + (unlinked.length > 1 ? "s" : "") + " not linked to any client or agent");
        if (orphans.length) warnings.push(orphans.length + " client record" + (orphans.length > 1 ? "s" : "") + " pointing at a deleted login");
        if (banned.length) warnings.push(banned.length + " banned account" + (banned.length > 1 ? "s" : ""));
        if (warnings.length) {
          html += '<div class="banner-warn"><strong>ATTN</strong><span>' +
            esc(warnings.join(" · ")) + ' — <a href="#/users">review accounts</a></span></div>';
        }

        html += '<div class="stat-grid">' + tiles.map(function (t) {
          var inner = '<span class="num">' + t.n + '</span><span class="microlabel">' + esc(t.l) + "</span>";
          return t.href
            ? '<a class="stat-tile" href="' + t.href + '">' + inner + "</a>"
            : '<div class="stat-tile">' + inner + "</div>";
        }).join("") + "</div>";

        html += '<div class="panel"><div class="panel-head"><span class="microlabel">RECENT ACTIVITY</span>' +
          '<a class="btn btn-ghost btn-sm" href="#/activity">FULL LOG</a></div>' +
          renderFeed(activity) + "</div>";

        view.innerHTML = html;
      })
      .catch(renderViewError);
  }

  function renderFeed(items) {
    if (!items.length) return '<p class="empty-note">No activity yet.</p>';
    return '<ul class="feed">' + items.map(function (a) {
      var master = /^master_/.test(a.kind || "");
      return '<li class="' + (master ? "master-act" : "") + '">' +
        '<span class="ts">' + esc(fmtDateTime(a.ts)) + "</span>" +
        "<span><span class=\"who\">" + esc(a.agent || "") + "</span> " +
        '<span class="kind-tag">' + esc(a.kind || "") + "</span> " +
        esc(a.ref || "") + (a.detail ? " — " + esc(a.detail) : "") + "</span></li>";
    }).join("") + "</ul>";
  }

  /* ================= Users (centerpiece) ================= */

  function viewUsers() {
    Promise.all([api.admin("list_users"), api.getClients()])
      .then(function (res) {
        renderUsers(res[0], res[1]);
      })
      .catch(renderViewError);
  }

  function renderUsers(usersRes, clients) {
    var users = usersRes.users || [];
    var orphans = usersRes.orphans || [];

    var html = head("ACCESS CONTROL", "Auth Accounts",
      '<button class="btn btn-primary" id="new-user-btn">NEW ACCOUNT</button>');

    if (orphans.length) {
      html += '<div class="banner-warn"><strong>ORPHANS</strong><span>' +
        orphans.map(function (o) { return esc(o.business) + " (" + esc(o.email) + ")"; }).join(", ") +
        " point at logins that no longer exist. Link them to a new account below.</span></div>";
    }

    html += '<div class="filter-bar"><input type="search" id="user-search" placeholder="filter by email, name, business…">' +
      '<select class="inline-select" id="user-filter">' +
      '<option value="">ALL</option><option value="agent">AGENTS</option>' +
      '<option value="client">CLIENTS</option><option value="unlinked">UNLINKED</option>' +
      '<option value="banned">BANNED</option></select></div>';

    html += '<div class="panel"><div class="table-wrap"><table class="data"><thead><tr>' +
      "<th>Email</th><th>Identity</th><th>Status</th><th>Last sign-in</th><th>Created</th><th></th>" +
      "</tr></thead><tbody id=\"user-rows\"></tbody></table></div></div>";

    view.innerHTML = html;

    function identityChip(u) {
      var idn = u.identity || {};
      if (idn.kind === "agent") return '<span class="chip chip-info">AGENT · ' + esc(idn.agent_role || "") + "</span>";
      if (idn.kind === "client") return '<span class="chip chip-ok">CLIENT · ' + esc(idn.business || "") + "</span>";
      if (idn.kind === "both") return '<span class="chip chip-info">AGENT + CLIENT</span>';
      return '<span class="chip chip-warn">UNLINKED</span>';
    }

    function draw() {
      var q = ($("#user-search").value || "").toLowerCase();
      var f = $("#user-filter").value;
      var rows = users.filter(function (u) {
        var hay = (u.email + " " + (u.name || "") + " " + ((u.identity || {}).business || "") + " " + ((u.identity || {}).agent_name || "")).toLowerCase();
        if (q && hay.indexOf(q) === -1) return false;
        if (f === "banned") return isBanned(u);
        if (f && (u.identity || {}).kind !== f) return false;
        return true;
      });

      if (!rows.length) {
        $("#user-rows").innerHTML = '<tr><td colspan="6"><p class="empty-note">No accounts match.</p></td></tr>';
        return;
      }

      $("#user-rows").innerHTML = rows.map(function (u) {
        var self = me && u.email.toLowerCase() === me.email.toLowerCase();
        var banned = isBanned(u);
        var status = banned
          ? '<span class="chip chip-danger">BANNED</span>'
          : u.email_confirmed_at
            ? '<span class="chip chip-ok">ACTIVE</span>'
            : '<span class="chip chip-muted">UNCONFIRMED</span>';
        var actions = self
          ? '<span class="chip chip-info">YOU</span>'
          : '<button class="btn btn-ghost btn-sm" data-act="reset" data-id="' + esc(u.id) + '">RESET PW</button>' +
            '<button class="btn btn-ghost btn-sm" data-act="link" data-id="' + esc(u.id) + '">LINK</button>' +
            (banned
              ? '<button class="btn btn-ghost btn-sm" data-act="unban" data-id="' + esc(u.id) + '">UNBAN</button>'
              : '<button class="btn btn-danger btn-sm" data-act="ban" data-id="' + esc(u.id) + '">BAN</button>') +
            '<button class="btn btn-danger btn-sm" data-act="delete" data-id="' + esc(u.id) + '">DELETE</button>';
        return "<tr" + (self ? ' class="row-self"' : "") + ">" +
          '<td class="mono">' + esc(u.email) + (u.name ? '<br><span style="color:var(--muted)">' + esc(u.name) + "</span>" : "") + "</td>" +
          "<td>" + identityChip(u) + "</td>" +
          "<td>" + status + (banned ? '<br><span class="mono" style="color:var(--muted)">until ' + esc(fmtDate(u.banned_until)) + "</span>" : "") + "</td>" +
          '<td class="mono">' + esc(timeAgo(u.last_sign_in_at)) + "</td>" +
          '<td class="mono">' + esc(fmtDate(u.created_at)) + "</td>" +
          '<td><div class="row-actions">' + actions + "</div></td></tr>";
      }).join("");
    }

    draw();
    $("#user-search").addEventListener("input", draw);
    $("#user-filter").addEventListener("change", draw);

    $("#user-rows").addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-act]");
      if (!btn) return;
      var u = users.find(function (x) { return x.id === btn.dataset.id; });
      if (!u) return;
      if (btn.dataset.act === "reset") resetPasswordModal(u);
      if (btn.dataset.act === "ban") banModal(u);
      if (btn.dataset.act === "unban") {
        api.admin("unban_user", { user_id: u.id })
          .then(function () { toast("Ban lifted for " + u.email); viewUsers(); })
          .catch(apiFail);
      }
      if (btn.dataset.act === "delete") deleteUserModal(u);
      if (btn.dataset.act === "link") linkModal(u, clients);
    });

    $("#new-user-btn").addEventListener("click", function () { newUserModal(clients); });
  }

  function secretRevealHtml(pw) {
    return '<p style="font-size:13px;margin-bottom:8px">Temporary password — shown once, copy it now:</p>' +
      '<div class="secret-box"><code id="secret-pw">' + esc(pw) + "</code>" +
      '<button class="btn btn-sm" id="copy-pw">COPY</button></div>';
  }

  function wireCopy() {
    var btn = $("#copy-pw");
    if (!btn) return;
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText($("#secret-pw").textContent).then(function () {
        btn.textContent = "COPIED";
        setTimeout(function () { btn.textContent = "COPY"; }, 1600);
      }, function () { toast("Copy failed — select it manually", true); });
    });
  }

  function resetPasswordModal(u) {
    var pw = genPassword();
    openModal("Reset password",
      '<p style="font-size:13px;margin-bottom:14px">New temporary password for <strong class="mono">' + esc(u.email) + "</strong>:</p>" +
      secretRevealHtml(pw) +
      '<label class="check-row"><input type="checkbox" id="kick-box" checked>' +
      "<span>Also sign them out everywhere (their current sessions stay valid otherwise)</span></label>",
      '<button class="btn btn-ghost" id="m-cancel">CANCEL</button>' +
      '<button class="btn btn-primary" id="m-go">SET PASSWORD</button>');
    wireCopy();
    $("#m-cancel").addEventListener("click", closeModal);
    $("#m-go").addEventListener("click", function () {
      var btn = this;
      btn.disabled = true;
      api.admin("update_user", { user_id: u.id, password: pw, kick_sessions: $("#kick-box").checked })
        .then(function () {
          toast("Password reset for " + u.email);
          $("#m-go").remove();
          $("#m-cancel").textContent = "DONE";
        })
        .catch(function (err) { btn.disabled = false; modalError(err.message); });
    });
  }

  function banModal(u) {
    openModal("Ban account",
      '<p style="font-size:13px;margin-bottom:14px"><strong class="mono">' + esc(u.email) + "</strong> will be locked out immediately and cannot sign in to any panel until unbanned.</p>",
      '<button class="btn btn-ghost" id="m-cancel">CANCEL</button>' +
      '<button class="btn btn-danger" id="m-go">BAN ACCOUNT</button>');
    $("#m-cancel").addEventListener("click", closeModal);
    $("#m-go").addEventListener("click", function () {
      this.disabled = true;
      api.admin("ban_user", { user_id: u.id })
        .then(function () { closeModal(); toast("Banned " + u.email); viewUsers(); })
        .catch(function (err) { $("#m-go").disabled = false; modalError(err.message); });
    });
  }

  function deleteUserModal(u) {
    openModal("Delete account",
      '<p style="font-size:13px;margin-bottom:14px">This permanently deletes the login <strong class="mono">' + esc(u.email) + "</strong>. " +
      "Any linked client record stays intact but loses portal access. This cannot be undone.</p>" +
      '<label class="field"><span class="field-label">TYPE THE EMAIL TO CONFIRM</span>' +
      '<input type="text" id="confirm-email" autocomplete="off" placeholder="' + esc(u.email) + '"></label>',
      '<button class="btn btn-ghost" id="m-cancel">CANCEL</button>' +
      '<button class="btn btn-danger" id="m-go" disabled>DELETE FOREVER</button>');
    $("#m-cancel").addEventListener("click", closeModal);
    $("#confirm-email").addEventListener("input", function () {
      $("#m-go").disabled = this.value.trim().toLowerCase() !== u.email.toLowerCase();
    });
    $("#m-go").addEventListener("click", function () {
      this.disabled = true;
      api.admin("delete_user", { user_id: u.id })
        .then(function () { closeModal(); toast("Deleted " + u.email); viewUsers(); })
        .catch(function (err) { $("#m-go").disabled = false; modalError(err.message); });
    });
  }

  function linkModal(u, clients) {
    var current = (u.identity || {}).client_id;
    openModal("Link to client",
      '<p style="font-size:13px;margin-bottom:14px">Choose which client record <strong class="mono">' + esc(u.email) + "</strong> signs in to on the portal.</p>" +
      '<label class="field"><span class="field-label">CLIENT</span><select id="link-client">' +
      '<option value="">— no client (unlink) —</option>' +
      clients.map(function (c) {
        return '<option value="' + c.id + '"' + (c.id === current ? " selected" : "") + ">" +
          esc(c.account_number + " · " + c.business) + "</option>";
      }).join("") + "</select></label>",
      '<button class="btn btn-ghost" id="m-cancel">CANCEL</button>' +
      '<button class="btn btn-primary" id="m-go">SAVE LINK</button>');
    $("#m-cancel").addEventListener("click", closeModal);
    $("#m-go").addEventListener("click", function () {
      this.disabled = true;
      var val = $("#link-client").value;
      api.admin("link_user", { user_id: u.id, client_id: val ? Number(val) : null })
        .then(function () { closeModal(); toast(val ? "Linked " + u.email : "Unlinked " + u.email); viewUsers(); })
        .catch(function (err) { $("#m-go").disabled = false; modalError(err.message); });
    });
  }

  function newUserModal(clients) {
    var pw = genPassword();
    openModal("New account",
      '<label class="field"><span class="field-label">EMAIL</span><input type="email" id="nu-email" placeholder="person@business.com"></label>' +
      '<label class="field"><span class="field-label">NAME (OPTIONAL)</span><input type="text" id="nu-name"></label>' +
      secretRevealHtml(pw) +
      '<label class="field"><span class="field-label">LINK TO CLIENT (OPTIONAL)</span><select id="nu-client">' +
      '<option value="">— none —</option>' +
      clients.filter(function (c) { return !c.auth_user_id; }).map(function (c) {
        return '<option value="' + c.id + '">' + esc(c.account_number + " · " + c.business) + "</option>";
      }).join("") + "</select>" +
      '<p class="field-hint">Only clients without an existing login are listed.</p></label>' +
      '<label class="check-row"><input type="checkbox" id="nu-agent">' +
      "<span>Also give this account <strong>staff agent access</strong> to the support panel</span></label>",
      '<button class="btn btn-ghost" id="m-cancel">CANCEL</button>' +
      '<button class="btn btn-primary" id="m-go">CREATE ACCOUNT</button>');
    wireCopy();
    $("#m-cancel").addEventListener("click", closeModal);
    $("#m-go").addEventListener("click", function () {
      var email = $("#nu-email").value.trim();
      if (!email || email.indexOf("@") === -1) { modalError("Enter a valid email address"); return; }
      var params = { email: email, password: pw, name: $("#nu-name").value.trim() || undefined };
      if ($("#nu-client").value) params.link_client_id = Number($("#nu-client").value);
      if ($("#nu-agent").checked) params.make_agent = { name: params.name || email, role: "Support Agent" };
      this.disabled = true;
      api.admin("create_user", params)
        .then(function () { toast("Created " + email); closeModal(); viewUsers(); })
        .catch(function (err) { $("#m-go").disabled = false; modalError(err.message); });
    });
  }

  /* ================= Clients ================= */

  function viewClients() {
    api.getClients()
      .then(function (clients) {
        var html = head("CUSTOMER FILE", "Clients");
        html += '<div class="filter-bar"><input type="search" id="client-search" placeholder="filter by business, contact, email…"></div>';
        html += '<div class="panel"><div class="table-wrap"><table class="data"><thead><tr>' +
          "<th>Account</th><th>Business</th><th>Contact</th><th>Plan</th><th>Monthly</th><th>Status</th><th>Portal login</th>" +
          "</tr></thead><tbody id=\"client-rows\"></tbody></table></div></div>";
        view.innerHTML = html;

        function draw() {
          var q = ($("#client-search").value || "").toLowerCase();
          var rows = clients.filter(function (c) {
            return !q || (c.business + " " + c.contact + " " + c.email + " " + c.account_number).toLowerCase().indexOf(q) !== -1;
          });
          $("#client-rows").innerHTML = rows.length ? rows.map(function (c) {
            return '<tr style="cursor:pointer" data-id="' + c.id + '">' +
              '<td class="mono">' + esc(c.account_number) + "</td>" +
              "<td><strong>" + esc(c.business) + "</strong></td>" +
              "<td>" + esc(c.contact || "—") + '<br><span class="mono" style="color:var(--muted)">' + esc(c.email || "") + "</span></td>" +
              "<td>" + esc(c.plan || "—") + "</td>" +
              '<td class="mono">' + (c.monthly ? money(c.monthly) + "/mo" : "—") + "</td>" +
              "<td>" + statusChip(c.status) + "</td>" +
              "<td>" + (c.auth_user_id ? '<span class="chip chip-ok">LINKED</span>' : '<span class="chip chip-muted">NONE</span>') + "</td></tr>";
          }).join("") : '<tr><td colspan="7"><p class="empty-note">No clients match.</p></td></tr>';
        }

        draw();
        $("#client-search").addEventListener("input", draw);
        $("#client-rows").addEventListener("click", function (e) {
          var tr = e.target.closest("tr[data-id]");
          if (tr) location.hash = "#/client/" + tr.dataset.id;
        });
      })
      .catch(renderViewError);
  }

  function statusChip(status) {
    var s = (status || "").toLowerCase();
    var cls = s === "active" ? "chip-ok" : s === "onboarding" || s === "paused" ? "chip-warn" : s ? "chip-muted" : "chip-muted";
    return '<span class="chip ' + cls + '">' + esc((status || "—").toUpperCase()) + "</span>";
  }

  function viewClientDetail(id) {
    Promise.all([
      api.getClient(id), api.getServices(id), api.getTickets(id),
      api.getOrders(id), api.getDocuments(id), api.getStaging(id)
    ])
      .then(function (res) {
        var c = res[0], services = res[1], tickets = res[2], orders = res[3], docs = res[4], staging = res[5];

        var html = head(esc(c.account_number), c.business,
          '<a class="btn btn-ghost" href="../admin/#/account/' + c.id + '">OPEN IN SUPPORT PANEL</a>' +
          '<a class="btn btn-ghost" href="#/clients">ALL CLIENTS</a>');

        html += '<div class="panel"><div class="panel-head"><span class="microlabel">RECORD</span>' +
          statusChip(c.status) + "</div><dl class=\"def-list\">" +
          defRow("Contact", esc(c.contact || "—")) +
          defRow("Email", '<span class="mono">' + esc(c.email || "—") + "</span>") +
          defRow("Phone", esc(c.phone || "—")) +
          defRow("Plan", esc(c.plan || "—") + (c.monthly ? " · " + money(c.monthly) + "/mo" : "")) +
          defRow("Term", esc(c.term || "—")) +
          defRow("Client since", esc(fmtDate(c.client_since))) +
          defRow("Renewal", esc(fmtDate(c.renewal_date))) +
          defRow("Storage", (c.storage_used != null ? c.storage_used + " / " + c.storage_limit + " GB" : "—")) +
          defRow("Portal login", c.auth_user_id
            ? '<span class="chip chip-ok">LINKED</span> <a href="#/users">manage in Accounts</a>'
            : '<span class="chip chip-muted">NONE</span> <a href="#/users">create one in Accounts</a>') +
          defRow("Internal notes", esc(c.notes || "—")) +
          "</dl></div>";

        html += tablePanel("SERVICES", ["Service", "Type", "Price", "Progress", "Status"], services.map(function (s) {
          return ["<strong>" + esc(s.name) + "</strong>", esc(s.type || "—"), '<span class="mono">' + money(s.price) + "</span>",
            '<span class="mono">' + (s.progress != null ? s.progress + "%" : "—") + "</span>", statusChip(s.status)];
        }));

        html += tablePanel("TICKETS", ["Ticket", "Subject", "Priority", "Updated", "Status"], tickets.map(function (t) {
          return ['<a class="mono" href="../admin/#/ticket/' + esc(t.id) + '">' + esc(t.id) + "</a>", esc(t.subject),
            esc(t.priority || "—"), '<span class="mono">' + esc(timeAgo(t.updated_at)) + "</span>", statusChip(t.status)];
        }));

        html += tablePanel("ADD-ON ORDERS", ["Add-on", "Price", "Requested", "Status"], orders.map(function (o) {
          return ["<strong>" + esc(o.label) + "</strong>", '<span class="mono">' + money(o.price) + "</span>",
            '<span class="mono">' + esc(fmtDate(o.requested_at)) + "</span>", statusChip(o.status)];
        }));

        html += tablePanel("DOCUMENTS", ["Document", "Kind", "Signature"], docs.map(function (d) {
          return ["<strong>" + esc(d.title) + "</strong>", esc(d.kind || "—"),
            d.requires_signature
              ? (d.signed_at ? '<span class="chip chip-ok">SIGNED · ' + esc(d.signed_name || "") + "</span>" : '<span class="chip chip-warn">AWAITING SIGNATURE</span>')
              : '<span class="chip chip-muted">N/A</span>'];
        }));

        html += tablePanel("STAGING SITES", ["Label", "URL", "Last deploy", "Status"], staging.map(function (s) {
          return [esc(s.label), '<a class="mono" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url) + "</a>",
            '<span class="mono">' + esc(timeAgo(s.last_deploy)) + "</span>", statusChip(s.status)];
        }));

        view.innerHTML = html;
      })
      .catch(renderViewError);
  }

  function defRow(dt, ddHtml) { return "<dt>" + esc(dt) + "</dt><dd>" + ddHtml + "</dd>"; }

  function tablePanel(label, headers, rows) {
    var body = rows.length
      ? "<tbody>" + rows.map(function (r) { return "<tr><td>" + r.join("</td><td>") + "</td></tr>"; }).join("") + "</tbody>"
      : '<tbody><tr><td colspan="' + headers.length + '"><p class="empty-note">None on file.</p></td></tr></tbody>';
    return '<div class="panel"><div class="panel-head"><span class="microlabel">' + esc(label) + "</span></div>" +
      '<div class="table-wrap"><table class="data"><thead><tr><th>' + headers.join("</th><th>") + "</th></tr></thead>" + body + "</table></div></div>";
  }

  /* ================= Tickets ================= */

  var TICKET_STATUSES = ["Open", "In progress", "Waiting", "Closed"];
  var TICKET_PRIORITIES = ["Low", "Normal", "High", "Urgent"];

  function viewTickets() {
    Promise.all([api.getTickets(), api.getClients()])
      .then(function (res) {
        var tickets = res[0], clients = res[1];
        var byId = {};
        clients.forEach(function (c) { byId[c.id] = c; });

        var html = head("SUPPORT", "All Tickets",
          '<a class="btn btn-ghost" href="../admin/">OPEN SUPPORT PANEL</a>');
        html += '<div class="panel" id="ticket-panel"><div class="table-wrap"><table class="data"><thead><tr>' +
          "<th>Ticket</th><th>Client</th><th>Subject</th><th>Status</th><th>Priority</th><th>Updated</th>" +
          "</tr></thead><tbody>" +
          (tickets.length ? tickets.map(function (t) {
            var c = byId[t.client_id];
            return "<tr>" +
              '<td><a class="mono" href="../admin/#/ticket/' + esc(t.id) + '">' + esc(t.id) + "</a></td>" +
              "<td>" + esc(c ? c.business : "—") + "</td>" +
              "<td>" + esc(t.subject) + "</td>" +
              "<td><select class=\"inline-select\" data-id=\"" + esc(t.id) + "\" data-field=\"status\">" +
              TICKET_STATUSES.map(function (s) { return "<option" + (s === t.status ? " selected" : "") + ">" + s + "</option>"; }).join("") +
              "</select></td>" +
              "<td><select class=\"inline-select\" data-id=\"" + esc(t.id) + "\" data-field=\"priority\">" +
              TICKET_PRIORITIES.map(function (p) { return "<option" + (p === t.priority ? " selected" : "") + ">" + p + "</option>"; }).join("") +
              "</select></td>" +
              '<td class="mono">' + esc(timeAgo(t.updated_at)) + "</td></tr>";
          }).join("") : '<tr><td colspan="6"><p class="empty-note">No tickets.</p></td></tr>') +
          "</tbody></table></div></div>";
        view.innerHTML = html;

        $("#ticket-panel").addEventListener("change", function (e) {
          var sel = e.target.closest("select.inline-select[data-id]");
          if (!sel) return;
          var patch = {};
          patch[sel.dataset.field] = sel.value;
          api.updateTicket(sel.dataset.id, patch)
            .then(function () {
              toast(sel.dataset.id + " " + sel.dataset.field + " → " + sel.value);
              api.logActivity("master_ticket_" + sel.dataset.field, sel.dataset.id, "Set to " + sel.value);
            })
            .catch(apiFail);
        });
      })
      .catch(renderViewError);
  }

  /* ================= Team ================= */

  function viewTeam() {
    Promise.all([api.getAgents(), api.admin("list_users")])
      .then(function (res) {
        var agents = res[0];
        var users = res[1].users || [];
        var userByEmail = {};
        users.forEach(function (u) { userByEmail[u.email.toLowerCase()] = u; });

        var html = head("STAFF", "Team",
          '<button class="btn btn-primary" id="new-agent-btn">ADD AGENT</button>');
        html += '<div class="panel" id="team-panel"><div class="table-wrap"><table class="data"><thead><tr>' +
          "<th>Name</th><th>Email</th><th>Role</th><th>Login</th><th>Status</th><th></th>" +
          "</tr></thead><tbody>" +
          agents.map(function (a) {
            var u = userByEmail[(a.email || "").toLowerCase()];
            var self = me && (a.email || "").toLowerCase() === me.email.toLowerCase();
            return "<tr>" +
              "<td><strong>" + esc(a.name) + "</strong>" + (self ? ' <span class="chip chip-info">YOU</span>' : "") + "</td>" +
              '<td class="mono">' + esc(a.email) + "</td>" +
              "<td>" + esc(a.role || "—") + "</td>" +
              "<td>" + (u
                ? (isBanned(u) ? '<span class="chip chip-danger">BANNED</span>' : '<span class="chip chip-ok">HAS LOGIN</span>')
                : '<span class="chip chip-warn">NO LOGIN</span>') + "</td>" +
              "<td>" + (a.active ? '<span class="chip chip-ok">ACTIVE</span>' : '<span class="chip chip-muted">INACTIVE</span>') + "</td>" +
              '<td><div class="row-actions">' +
              '<button class="btn btn-ghost btn-sm" data-act="edit" data-id="' + a.id + '">EDIT</button>' +
              (self ? "" : '<button class="btn btn-ghost btn-sm" data-act="toggle" data-id="' + a.id + '">' + (a.active ? "DEACTIVATE" : "ACTIVATE") + "</button>") +
              "</div></td></tr>";
          }).join("") +
          "</tbody></table></div></div>" +
          '<p class="field-hint">Deactivating an agent removes their access to every panel instantly (RLS checks the active flag). To fully lock the login out, ban it from <a href="#/users">Accounts</a>.</p>';
        view.innerHTML = html;

        $("#team-panel").addEventListener("click", function (e) {
          var btn = e.target.closest("button[data-act]");
          if (!btn) return;
          var a = agents.find(function (x) { return x.id === Number(btn.dataset.id); });
          if (btn.dataset.act === "edit") agentModal(a);
          if (btn.dataset.act === "toggle" && a) {
            api.saveAgent({ id: a.id, active: !a.active })
              .then(function () {
                toast(a.name + (a.active ? " deactivated" : " activated"));
                api.logActivity("master_agent_toggle", a.email, a.active ? "Deactivated" : "Activated");
                viewTeam();
              })
              .catch(apiFail);
          }
        });
        $("#new-agent-btn").addEventListener("click", function () { agentModal(null); });
      })
      .catch(renderViewError);
  }

  function agentModal(agent) {
    openModal(agent ? "Edit agent" : "Add agent",
      '<label class="field"><span class="field-label">NAME</span><input type="text" id="ag-name" value="' + esc(agent ? agent.name : "") + '"></label>' +
      '<label class="field"><span class="field-label">EMAIL</span><input type="email" id="ag-email" value="' + esc(agent ? agent.email : "") + '"' + (agent ? " disabled" : "") + "></label>" +
      '<label class="field"><span class="field-label">ROLE LABEL</span><input type="text" id="ag-role" value="' + esc(agent ? agent.role || "" : "Support Agent") + '"></label>' +
      (agent ? "" : '<p class="field-hint">This grants panel permissions only. Create their login separately in <strong>Accounts → New account</strong> with "staff agent access" checked, or add it here first and the login later.</p>'),
      '<button class="btn btn-ghost" id="m-cancel">CANCEL</button>' +
      '<button class="btn btn-primary" id="m-go">SAVE</button>');
    $("#m-cancel").addEventListener("click", closeModal);
    $("#m-go").addEventListener("click", function () {
      var payload = {
        name: $("#ag-name").value.trim(),
        role: $("#ag-role").value.trim() || "Support Agent"
      };
      if (!payload.name) { modalError("Name is required"); return; }
      if (agent) payload.id = agent.id;
      else {
        payload.email = $("#ag-email").value.trim().toLowerCase();
        if (!payload.email || payload.email.indexOf("@") === -1) { modalError("Enter a valid email"); return; }
        payload.active = true;
      }
      this.disabled = true;
      api.saveAgent(payload)
        .then(function () {
          toast(agent ? "Agent updated" : "Agent added");
          api.logActivity(agent ? "master_agent_edit" : "master_agent_add", payload.email || (agent && agent.email) || "", payload.name);
          closeModal();
          viewTeam();
        })
        .catch(function (err) { $("#m-go").disabled = false; modalError(err.message); });
    });
  }

  /* ================= Commerce ================= */

  var ORDER_STATUSES = ["requested", "in progress", "delivered", "cancelled"];

  function viewCommerce() {
    Promise.all([api.getOrders(), api.getDocuments(), api.getClients()])
      .then(function (res) {
        var orders = res[0], docs = res[1], clients = res[2];
        var byId = {};
        clients.forEach(function (c) { byId[c.id] = c; });

        var html = head("REVENUE", "Commerce");

        html += '<div class="panel" id="orders-panel"><div class="panel-head"><span class="microlabel">ADD-ON ORDERS</span></div>' +
          '<div class="table-wrap"><table class="data"><thead><tr>' +
          "<th>Add-on</th><th>Client</th><th>Price</th><th>Requested</th><th>Status</th>" +
          "</tr></thead><tbody>" +
          (orders.length ? orders.map(function (o) {
            var c = byId[o.client_id];
            return "<tr><td><strong>" + esc(o.label) + "</strong>" + (o.note ? '<br><span style="color:var(--muted);font-size:12px">' + esc(o.note) + "</span>" : "") + "</td>" +
              "<td>" + (c ? '<a href="#/client/' + c.id + '">' + esc(c.business) + "</a>" : "—") + "</td>" +
              '<td class="mono">' + money(o.price) + "</td>" +
              '<td class="mono">' + esc(fmtDate(o.requested_at)) + "</td>" +
              "<td><select class=\"inline-select\" data-order=\"" + o.id + "\">" +
              ORDER_STATUSES.map(function (s) { return "<option" + (s === o.status ? " selected" : "") + ">" + s + "</option>"; }).join("") +
              "</select></td></tr>";
          }).join("") : '<tr><td colspan="5"><p class="empty-note">No orders yet.</p></td></tr>') +
          "</tbody></table></div></div>";

        html += '<div class="panel"><div class="panel-head"><span class="microlabel">DOCUMENTS</span></div>' +
          '<div class="table-wrap"><table class="data"><thead><tr>' +
          "<th>Document</th><th>Client</th><th>Kind</th><th>Created</th><th>Signature</th>" +
          "</tr></thead><tbody>" +
          (docs.length ? docs.map(function (d) {
            var c = byId[d.client_id];
            return "<tr><td><strong>" + esc(d.title) + "</strong></td>" +
              "<td>" + (c ? '<a href="#/client/' + c.id + '">' + esc(c.business) + "</a>" : "—") + "</td>" +
              "<td>" + esc(d.kind || "—") + "</td>" +
              '<td class="mono">' + esc(fmtDate(d.created_at)) + "</td>" +
              "<td>" + (d.requires_signature
                ? (d.signed_at ? '<span class="chip chip-ok">SIGNED ' + esc(fmtDate(d.signed_at)) + "</span>" : '<span class="chip chip-warn">AWAITING</span>')
                : '<span class="chip chip-muted">N/A</span>') + "</td></tr>";
          }).join("") : '<tr><td colspan="5"><p class="empty-note">No documents.</p></td></tr>') +
          "</tbody></table></div></div>";

        view.innerHTML = html;

        $("#orders-panel").addEventListener("change", function (e) {
          var sel = e.target.closest("select.inline-select[data-order]");
          if (!sel) return;
          api.updateOrder(Number(sel.dataset.order), { status: sel.value })
            .then(function () {
              toast("Order status → " + sel.value);
              api.logActivity("master_order_status", "#" + sel.dataset.order, "Set to " + sel.value);
            })
            .catch(apiFail);
        });
      })
      .catch(renderViewError);
  }

  /* ================= Broadcast ================= */

  function viewBroadcast() {
    api.getAnnouncements()
      .then(function (items) {
        var html = head("CLIENT PORTAL", "Broadcast",
          '<button class="btn btn-primary" id="new-ann-btn">NEW ANNOUNCEMENT</button>');
        html += '<div class="panel" id="ann-panel"><div class="table-wrap"><table class="data"><thead><tr>' +
          "<th>Title</th><th>Kind</th><th>Posted</th><th>Pinned</th><th></th>" +
          "</tr></thead><tbody>" +
          (items.length ? items.map(function (a) {
            return "<tr><td><strong>" + esc(a.title) + "</strong><br><span style=\"color:var(--muted);font-size:12px\">" + esc((a.body || "").slice(0, 90)) + ((a.body || "").length > 90 ? "…" : "") + "</span></td>" +
              "<td>" + esc(a.kind || "news") + "</td>" +
              '<td class="mono">' + esc(fmtDate(a.created_at)) + "</td>" +
              "<td>" + (a.pinned ? '<span class="chip chip-info">PINNED</span>' : "—") + "</td>" +
              '<td><div class="row-actions">' +
              '<button class="btn btn-ghost btn-sm" data-act="edit" data-id="' + a.id + '">EDIT</button>' +
              '<button class="btn btn-danger btn-sm" data-act="del" data-id="' + a.id + '">DELETE</button>' +
              "</div></td></tr>";
          }).join("") : '<tr><td colspan="5"><p class="empty-note">Nothing broadcast yet.</p></td></tr>') +
          "</tbody></table></div></div>" +
          '<p class="field-hint">Announcements appear on every client\'s portal home page.</p>';
        view.innerHTML = html;

        $("#ann-panel").addEventListener("click", function (e) {
          var btn = e.target.closest("button[data-act]");
          if (!btn) return;
          var a = items.find(function (x) { return x.id === Number(btn.dataset.id); });
          if (btn.dataset.act === "edit") announcementModal(a);
          if (btn.dataset.act === "del" && a) {
            api.deleteAnnouncement(a.id)
              .then(function () {
                toast("Announcement deleted");
                api.logActivity("master_broadcast_delete", a.title, "");
                viewBroadcast();
              })
              .catch(apiFail);
          }
        });
        $("#new-ann-btn").addEventListener("click", function () { announcementModal(null); });
      })
      .catch(renderViewError);
  }

  function announcementModal(ann) {
    openModal(ann ? "Edit announcement" : "New announcement",
      '<label class="field"><span class="field-label">TITLE</span><input type="text" id="an-title" value="' + esc(ann ? ann.title : "") + '"></label>' +
      '<label class="field"><span class="field-label">BODY</span><textarea id="an-body">' + esc(ann ? ann.body : "") + "</textarea></label>" +
      '<label class="field"><span class="field-label">KIND</span><select id="an-kind">' +
      ["news", "notice", "maintenance"].map(function (k) {
        return "<option" + (ann && ann.kind === k ? " selected" : "") + ">" + k + "</option>";
      }).join("") + "</select></label>" +
      '<label class="check-row"><input type="checkbox" id="an-pin"' + (ann && ann.pinned ? " checked" : "") + "><span>Pin to the top of the portal</span></label>",
      '<button class="btn btn-ghost" id="m-cancel">CANCEL</button>' +
      '<button class="btn btn-primary" id="m-go">' + (ann ? "SAVE" : "PUBLISH") + "</button>");
    $("#m-cancel").addEventListener("click", closeModal);
    $("#m-go").addEventListener("click", function () {
      var payload = {
        title: $("#an-title").value.trim(),
        body: $("#an-body").value.trim(),
        kind: $("#an-kind").value,
        pinned: $("#an-pin").checked
      };
      if (!payload.title) { modalError("Title is required"); return; }
      if (ann) payload.id = ann.id;
      this.disabled = true;
      api.saveAnnouncement(payload)
        .then(function () {
          toast(ann ? "Announcement updated" : "Announcement published");
          api.logActivity(ann ? "master_broadcast_edit" : "master_broadcast_new", payload.title, "");
          closeModal();
          viewBroadcast();
        })
        .catch(function (err) { $("#m-go").disabled = false; modalError(err.message); });
    });
  }

  /* ================= Activity ================= */

  function viewActivity() {
    api.getActivity(200)
      .then(function (items) {
        var html = head("AUDIT", "Activity Log");
        html += '<div class="filter-bar"><input type="search" id="act-search" placeholder="filter…">' +
          '<select class="inline-select" id="act-filter"><option value="">ALL</option><option value="master">MASTER ACTIONS</option></select></div>';
        html += '<div class="panel" id="act-panel"></div>';
        view.innerHTML = html;

        function draw() {
          var q = ($("#act-search").value || "").toLowerCase();
          var f = $("#act-filter").value;
          var rows = items.filter(function (a) {
            if (f === "master" && !/^master_/.test(a.kind || "")) return false;
            return !q || ((a.agent || "") + " " + (a.kind || "") + " " + (a.ref || "") + " " + (a.detail || "")).toLowerCase().indexOf(q) !== -1;
          });
          $("#act-panel").innerHTML = renderFeed(rows);
        }
        draw();
        $("#act-search").addEventListener("input", draw);
        $("#act-filter").addEventListener("change", draw);
      })
      .catch(renderViewError);
  }

  /* ================= Settings ================= */

  function viewSettings() {
    var html = head("CONSOLE", "Settings");
    html += '<div class="panel"><div class="panel-head"><span class="microlabel">SESSION</span></div><dl class="def-list">' +
      defRow("Signed in as", '<span class="mono">' + esc(me.email) + "</span>") +
      defRow("Access level", '<span class="chip chip-info">MASTER</span>') +
      defRow("Data mode", '<span class="mono">' + (api.mode === "sandbox" ? "SANDBOX (fake data, nothing is real)" : "LIVE") + "</span>") +
      "</dl></div>";

    html += '<div class="panel"><div class="panel-head"><span class="microlabel">CONTROL LINK</span></div><div class="panel-body">' +
      '<p style="font-size:13px;color:var(--muted);margin-bottom:14px">Account operations (create, reset, ban, delete) run through the <span class="mono">master-admin</span> function on Supabase. Use this to confirm it is deployed and answering.</p>' +
      '<button class="btn btn-primary" id="ping-btn">CHECK CONTROL LINK</button>' +
      '<span id="ping-result" class="mono" style="margin-left:12px"></span>' +
      "</div></div>";

    html += '<div class="panel"><div class="panel-head"><span class="microlabel">OTHER PANELS</span></div><div class="panel-body" style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<a class="btn btn-ghost" href="../admin/">SUPPORT PANEL</a>' +
      '<a class="btn btn-ghost" href="../portal/">CLIENT PORTAL</a>' +
      '<a class="btn btn-ghost" href="https://supabase.com/dashboard" target="_blank" rel="noopener">SUPABASE DASHBOARD</a>' +
      "</div></div>";

    view.innerHTML = html;

    $("#ping-btn").addEventListener("click", function () {
      var out = $("#ping-result");
      out.textContent = "…";
      out.style.color = "";
      api.admin("ping")
        .then(function (res) {
          out.textContent = "OK — v" + res.version + " answering as " + res.master;
          out.style.color = "var(--ok)";
        })
        .catch(function (err) {
          out.textContent = "FAILED — " + err.message;
          out.style.color = "var(--danger)";
        });
    });
  }

  /* ================= boot ================= */

  $("#login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = $("#login-btn");
    var errEl = $("#login-error");
    errEl.hidden = true;
    btn.disabled = true;
    btn.textContent = "CHECKING…";
    api.signIn($("#login-email").value.trim(), $("#login-password").value)
      .then(function (session) {
        me = session;
        showApp();
      })
      .catch(function (err) {
        if (err && err.code === "NOT_MASTER") {
          show("lockout");
        } else {
          errEl.textContent = (err && err.message) || "Sign-in failed";
          errEl.hidden = false;
        }
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = "AUTHENTICATE";
      });
  });

  $("#lockout-retry").addEventListener("click", function () {
    $("#login-password").value = "";
    show("login");
  });

  $("#signout-btn").addEventListener("click", function () {
    api.signOut().then(function () {
      me = null;
      location.hash = "";
      show("login");
    }).catch(apiFail);
  });

  window.addEventListener("hashchange", route);

  api.getSession()
    .then(function (session) {
      if (session) {
        me = session;
        showApp();
      } else {
        show("login");
      }
    })
    .catch(function () { show("login"); });
})();
