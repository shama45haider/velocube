/* Velocube Support Panel — app shell, router, and views */
(function () {
  "use strict";

  var api = window.VeloAPI;
  var agent = null;

  var loginEl = document.getElementById("login-screen");
  var appEl = document.getElementById("app");
  var viewEl = document.getElementById("view");

  /* ======================= Helpers ======================= */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[c];
    });
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function fmtDateTime(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      ", " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  }

  function relTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    var mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.round(hrs / 24);
    if (days < 30) return days + "d ago";
    return fmtDate(iso);
  }

  function ageHours(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return 0;
    return (Date.now() - d.getTime()) / 3600000;
  }

  function money(n) {
    return "$" + Number(n).toLocaleString();
  }

  function statusBadge(s) {
    var map = {
      open: ["Open", "b-blue"],
      pending: ["Pending", "b-amber"],
      resolved: ["Resolved", "b-green"],
      active: ["Active", "b-green"],
      past_due: ["Past Due", "b-red"],
      paused: ["Paused", "b-gray"],
      prospect: ["Prospect", "b-purple"],
      completed: ["Completed", "b-green"],
      in_progress: ["In Progress", "b-blue"],
      scheduled: ["Scheduled", "b-gray"]
    };
    var m = map[s] || [s, "b-gray"];
    return '<span class="badge ' + m[1] + '">' + esc(m[0]) + "</span>";
  }

  function prioBadge(p) {
    var map = {
      urgent: ["Urgent", "b-red"],
      high: ["High", "b-orange"],
      normal: ["Normal", "b-blue"],
      low: ["Low", "b-gray"]
    };
    var m = map[p] || [p, "b-gray"];
    return '<span class="badge ' + m[1] + '">' + esc(m[0]) + "</span>";
  }

  function planBadge(plan) {
    var map = {
      "Self-Managed Hosting": "b-blue",
      "Managed Hosting": "b-orange",
      "Website Management": "b-purple",
      None: "b-gray"
    };
    return (
      '<span class="badge ' +
      (map[plan] || "b-gray") +
      '">' +
      esc(plan === "None" ? "No Plan" : plan) +
      "</span>"
    );
  }

  function emailStatusBadge(st) {
    if (!st) return "";
    var map = {
      sent: ["Email sent", "b-green"],
      queued: ["Email queued", "b-amber"],
      failed: ["Email failed", "b-red"]
    };
    var m = map[st] || [st, "b-gray"];
    return '<span class="badge sm ' + m[1] + '">' + esc(m[0]) + "</span>";
  }

  function slaChip(t) {
    if (t.status === "resolved") return "";
    var h = ageHours(t.updated_at);
    var cls = h >= 24 ? "sla-red" : h >= 8 ? "sla-amber" : "sla-green";
    return '<span class="sla ' + cls + '" title="Time since last update">' + relTime(t.updated_at) + "</span>";
  }

  function tagChips(tags) {
    if (!tags) return "";
    return String(tags)
      .split(",")
      .map(function (t) {
        return t.trim();
      })
      .filter(Boolean)
      .map(function (t) {
        return '<span class="tag-chip">' + esc(t) + "</span>";
      })
      .join("");
  }

  function toast(msg, kind) {
    var t = document.createElement("div");
    t.className = "toast" + (kind ? " " + kind : "");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () {
      t.classList.add("show");
    }, 10);
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () {
        t.remove();
      }, 300);
    }, 3200);
  }

  function initials(name) {
    return String(name || "?")
      .split(/\s+/)
      .slice(0, 2)
      .map(function (w) {
        return w[0] || "";
      })
      .join("")
      .toUpperCase();
  }

  function firstName(name) {
    return String(name || "").split(/\s+/)[0];
  }

  function log(kind, ref, detail) {
    api.logActivity(agent.name, kind, ref, detail);
  }

  function downloadFile(name, text, type) {
    var blob = new Blob([text], { type: type || "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 500);
  }

  function toCsv(rows, cols) {
    var head = cols.map(function (c) { return c.label; }).join(",");
    var body = rows
      .map(function (r) {
        return cols
          .map(function (c) {
            var v = r[c.key];
            v = v == null ? "" : String(v);
            return '"' + v.replace(/"/g, '""') + '"';
          })
          .join(",");
      })
      .join("\n");
    return head + "\n" + body;
  }

  /* -------- Modal -------- */

  function openModal(title, bodyHtml, onMount) {
    closeModal();
    var wrap = document.createElement("div");
    wrap.className = "modal-wrap";
    wrap.id = "modal";
    wrap.innerHTML =
      '<div class="modal-card"><div class="modal-head"><h2>' +
      esc(title) +
      '</h2><button class="modal-x" type="button" aria-label="Close">&times;</button></div>' +
      '<div class="modal-body">' + bodyHtml + "</div></div>";
    document.body.appendChild(wrap);
    wrap.addEventListener("click", function (e) {
      if (e.target === wrap || e.target.closest(".modal-x")) closeModal();
    });
    document.addEventListener("keydown", modalEsc);
    if (onMount) onMount(wrap);
  }

  function modalEsc(e) {
    if (e.key === "Escape") closeModal();
  }

  function closeModal() {
    var m = document.getElementById("modal");
    if (m) m.remove();
    document.removeEventListener("keydown", modalEsc);
  }

  /* ======================= Auth ======================= */

  function showLogin() {
    loginEl.hidden = false;
    appEl.hidden = true;
  }

  function showApp() {
    loginEl.hidden = true;
    appEl.hidden = false;
    document.getElementById("agent-name").textContent = agent.name;
    document.getElementById("agent-role").textContent = agent.role;
    document.getElementById("agent-avatar").textContent = initials(agent.name);
    refreshNavCount();
    route();
  }

  function refreshNavCount() {
    api.getTickets().then(function (tickets) {
      var open = tickets.filter(function (t) {
        return t.status === "open";
      }).length;
      var el = document.getElementById("nav-open-count");
      if (el) {
        el.textContent = open;
        el.hidden = open === 0;
      }
    });
  }

  document
    .getElementById("login-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("login-email").value;
      var password = document.getElementById("login-password").value;
      var err = document.getElementById("login-error");
      err.textContent = "";
      api
        .signIn(email, password)
        .then(function (session) {
          agent = session;
          location.hash = "#/dashboard";
          showApp();
        })
        .catch(function (ex) {
          err.textContent = ex.message || "Sign in failed.";
        });
    });

  document.getElementById("logout-btn").addEventListener("click", function () {
    api.signOut().then(function () {
      agent = null;
      showLogin();
    });
  });

  /* ======================= Global search ======================= */

  var searchInput = document.getElementById("global-search");
  var searchResults = document.getElementById("search-results");

  searchInput.addEventListener("input", function () {
    var q = searchInput.value.trim().toLowerCase();
    if (q.length < 2) {
      searchResults.hidden = true;
      return;
    }
    Promise.all([api.getClients(), api.getTickets()]).then(function (res) {
      var clients = res[0];
      var tickets = res[1];
      var cHits = clients
        .filter(function (c) {
          return (
            c.account_number.toLowerCase().indexOf(q) !== -1 ||
            c.business.toLowerCase().indexOf(q) !== -1 ||
            c.contact.toLowerCase().indexOf(q) !== -1 ||
            c.email.toLowerCase().indexOf(q) !== -1
          );
        })
        .slice(0, 5);
      var tHits = tickets
        .filter(function (t) {
          return (
            t.id.toLowerCase().indexOf(q) !== -1 ||
            t.subject.toLowerCase().indexOf(q) !== -1
          );
        })
        .slice(0, 4);
      var html = "";
      if (cHits.length) {
        html += '<p class="sr-group">Accounts</p>';
        html += cHits
          .map(function (c) {
            return (
              '<a href="#/account/' + c.id + '"><strong>' +
              esc(c.account_number) + "</strong> " + esc(c.business) +
              "<span>" + esc(c.contact) + "</span></a>"
            );
          })
          .join("");
      }
      if (tHits.length) {
        html += '<p class="sr-group">Tickets</p>';
        html += tHits
          .map(function (t) {
            return (
              '<a href="#/ticket/' + t.id + '"><strong>' + esc(t.id) +
              "</strong> " + esc(t.subject) + "<span>" + esc(t.status) + "</span></a>"
            );
          })
          .join("");
      }
      searchResults.innerHTML =
        html || '<div class="sr-empty">Nothing matches "' + esc(q) + '"</div>';
      searchResults.hidden = false;
    });
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".topbar-search")) searchResults.hidden = true;
  });

  searchResults.addEventListener("click", function () {
    searchResults.hidden = true;
    searchInput.value = "";
  });

  document.addEventListener("keydown", function (e) {
    if (
      e.key === "/" &&
      !e.target.closest("input, textarea, select") &&
      !appEl.hidden
    ) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  /* ======================= Router ======================= */

  function setActiveNav(name) {
    document.querySelectorAll(".side-nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-nav") === name);
    });
  }

  function route() {
    if (!agent) return;
    closeModal();
    var hash = location.hash || "#/dashboard";
    var parts = hash.replace(/^#\//, "").split("/");
    var page = parts[0] || "dashboard";
    var id = parts[1];

    viewEl.scrollTop = 0;
    window.scrollTo(0, 0);

    if (page === "dashboard") return viewDashboard();
    if (page === "accounts") return viewAccounts();
    if (page === "account" && id) return viewAccount(id);
    if (page === "tickets") return viewTickets(parts[1]);
    if (page === "ticket" && id) return viewTicket(id);
    if (page === "reports") return viewReports();
    if (page === "activity") return viewActivity();
    if (page === "snippets") return viewSnippets();
    if (page === "team") return viewTeam();
    if (page === "settings") return viewSettings();
    if (page === "guides") return viewGuides();
    viewDashboard();
  }

  window.addEventListener("hashchange", route);

  /* ======================= Dashboard ======================= */

  function viewDashboard() {
    setActiveNav("dashboard");
    Promise.all([
      api.getTickets(),
      api.getClients(),
      api.getAllServices(),
      api.getActivity(8)
    ]).then(function (res) {
      var tickets = res[0];
      var clients = res[1];
      var services = res[2];
      var activity = res[3];

      var open = tickets.filter(function (t) { return t.status === "open"; });
      var urgent = tickets.filter(function (t) {
        return t.priority === "urgent" && t.status !== "resolved";
      });
      var unassigned = tickets.filter(function (t) {
        return t.assignee === "Unassigned" && t.status !== "resolved";
      });
      var overdue = tickets.filter(function (t) {
        return t.status !== "resolved" && ageHours(t.updated_at) >= 24;
      });

      var activeClients = clients.filter(function (c) { return c.status === "active"; });
      var mrr = clients.reduce(function (sum, c) {
        return sum + (c.status === "active" ? Number(c.monthly || 0) : 0);
      }, 0);
      var pipeline = services
        .filter(function (s) { return s.status === "in_progress" || s.status === "scheduled"; })
        .reduce(function (sum, s) { return sum + Number(s.price || 0); }, 0);

      var clientById = {};
      clients.forEach(function (c) { clientById[c.id] = c; });

      // 14-day ticket volume (created per day)
      var days = [];
      for (var i = 13; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
      }
      var counts = days.map(function (day) {
        return tickets.filter(function (t) {
          return String(t.created_at).slice(0, 10) === day;
        }).length;
      });
      var maxCount = Math.max.apply(null, counts.concat([1]));

      // Renewals in the next 45 days
      var soon = clients
        .filter(function (c) {
          if (!c.renewal_date) return false;
          var diff = (new Date(c.renewal_date) - Date.now()) / 86400000;
          return diff >= -5 && diff <= 45;
        })
        .sort(function (a, b) {
          return a.renewal_date < b.renewal_date ? -1 : 1;
        });

      // Storage alerts (>= 80%)
      var storageAlerts = clients.filter(function (c) {
        return c.storage_limit > 0 && c.storage_used / c.storage_limit >= 0.8;
      });

      var needsAttention = tickets
        .filter(function (t) { return t.status !== "resolved"; })
        .sort(function (a, b) {
          var pw = { urgent: 0, high: 1, normal: 2, low: 3 };
          if (pw[a.priority] !== pw[b.priority]) return pw[a.priority] - pw[b.priority];
          return a.updated_at < b.updated_at ? -1 : 1;
        })
        .slice(0, 6);

      viewEl.innerHTML =
        '<div class="view-head"><div><h1>Welcome back, ' +
        esc(firstName(agent.name)) +
        '</h1><p class="view-sub">' +
        (open.length
          ? open.length + " open ticket" + (open.length === 1 ? "" : "s") +
            (urgent.length ? ", " + urgent.length + " urgent" : "") + "."
          : "Inbox is clear. Nice work.") +
        '</p></div><div class="btn-row">' +
        '<button class="btn ghost" id="qa-new-client">New Client</button>' +
        '<button class="btn primary" id="qa-new-ticket">New Ticket</button>' +
        "</div></div>" +

        '<div class="stat-grid">' +
        statTile("Open Tickets", open.length, "blue", icoTicket(), "#/tickets/open") +
        statTile("Urgent", urgent.length, "red", icoAlert(), "#/tickets/open") +
        statTile("Unassigned", unassigned.length, "amber", icoInbox(), "#/tickets/open") +
        statTile("Waiting 24h+", overdue.length, "orange", icoClock(), "#/tickets") +
        statTile("Active Clients", activeClients.length, "green", icoUsers(), "#/accounts") +
        statTile("Monthly Recurring", money(mrr), "purple", icoDollar(), "#/reports") +
        "</div>" +

        '<div class="dash-cols">' +
        '<div class="dash-main">' +

        '<div class="card"><div class="card-head"><h2>Needs attention</h2><a class="text-link" href="#/tickets">All tickets</a></div>' +
        (needsAttention.length
          ? '<table class="data-table"><thead><tr><th>Ticket</th><th>Client</th><th>Subject</th><th>Priority</th><th>Waiting</th></tr></thead><tbody>' +
            needsAttention
              .map(function (t) {
                var c = clientById[t.client_id] || {};
                return (
                  '<tr class="rowlink" data-href="#/ticket/' + t.id +
                  '"><td class="mono">' + esc(t.id) + "</td><td>" +
                  esc(c.business || "—") + "</td><td>" + esc(t.subject) +
                  "</td><td>" + prioBadge(t.priority) + "</td><td>" +
                  slaChip(t) + "</td></tr>"
                );
              })
              .join("") +
            "</tbody></table>"
          : '<p class="empty-cell pad">Nothing waiting. Inbox zero.</p>') +
        "</div>" +

        '<div class="card pad"><div class="card-head bare"><h2>Ticket volume · last 14 days</h2></div>' +
        '<div class="bar-chart">' +
        counts
          .map(function (n, idx) {
            var h = Math.round((n / maxCount) * 100);
            var d = new Date(days[idx]);
            var lbl = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return (
              '<div class="bar-col" title="' + lbl + ": " + n + '">' +
              '<span class="bar-val">' + (n || "") + "</span>" +
              '<span class="bar" style="height:' + Math.max(h, 3) + '%"></span>' +
              '<span class="bar-lbl">' + d.getDate() + "</span></div>"
            );
          })
          .join("") +
        "</div></div>" +

        "</div>" +
        '<div class="dash-side">' +

        '<div class="card pad"><div class="card-head bare"><h2>Recent activity</h2><a class="text-link" href="#/activity">All</a></div>' +
        '<ul class="feed">' +
        (activity.length
          ? activity
              .map(function (a) {
                return (
                  '<li><span class="feed-dot ' + feedDot(a.kind) + '"></span><div><p>' +
                  esc(a.detail || a.kind) +
                  '</p><p class="feed-meta">' +
                  esc(a.agent) + " · " + relTime(a.ts) +
                  (a.ref ? ' · <a href="' + refHref(a.ref) + '" class="text-link mono">' + esc(a.ref) + "</a>" : "") +
                  "</p></div></li>"
                );
              })
              .join("")
          : "<li><p class='empty-cell'>No activity yet.</p></li>") +
        "</ul></div>" +

        '<div class="card pad"><div class="card-head bare"><h2>Upcoming renewals</h2></div>' +
        (soon.length
          ? '<ul class="mini-list">' +
            soon
              .map(function (c) {
                var overdueR = new Date(c.renewal_date) < new Date();
                return (
                  '<li><a href="#/account/' + c.id + '"><strong>' + esc(c.business) +
                  '</strong><span class="mono">' + money(c.monthly) + "/mo</span></a>" +
                  '<span class="' + (overdueR ? "text-red" : "feed-meta") + '">' +
                  (overdueR ? "Past due · " : "") + fmtDate(c.renewal_date) + "</span></li>"
                );
              })
              .join("") +
            "</ul>"
          : '<p class="empty-cell">No renewals in the next 45 days.</p>') +
        "</div>" +

        (storageAlerts.length
          ? '<div class="card pad"><div class="card-head bare"><h2>Storage alerts</h2></div><ul class="mini-list">' +
            storageAlerts
              .map(function (c) {
                var pct = Math.round((c.storage_used / c.storage_limit) * 100);
                return (
                  '<li><a href="#/account/' + c.id + '"><strong>' + esc(c.business) +
                  '</strong><span class="' + (pct >= 90 ? "text-red" : "text-amber") + '">' +
                  pct + "% full</span></a>" +
                  '<div class="progress slim"><span style="width:' + Math.min(pct, 100) +
                  '%" class="' + (pct >= 90 ? "p-red" : "p-amber") + '"></span></div></li>'
                );
              })
              .join("") +
            "</ul></div>"
          : "") +

        '<div class="card pad"><div class="card-head bare"><h2>Pipeline</h2></div>' +
        '<p class="big-num">' + money(pipeline) + '</p><p class="feed-meta">Project value in progress or scheduled</p></div>' +

        "</div></div>";

      bindRowLinks();
      document.getElementById("qa-new-ticket").addEventListener("click", function () {
        newTicketModal(clients);
      });
      document.getElementById("qa-new-client").addEventListener("click", function () {
        clientModal(null);
      });
    });
  }

  function feedDot(kind) {
    if (kind === "reply_sent" || kind === "reply_received") return "fd-blue";
    if (kind === "ticket_created") return "fd-orange";
    if (kind === "status_changed") return "fd-green";
    if (kind === "client_created" || kind === "client_updated") return "fd-purple";
    return "fd-gray";
  }

  function refHref(ref) {
    return ref.indexOf("TK-") === 0 ? "#/ticket/" + ref : "#/accounts";
  }

  function statTile(label, value, color, icon, href) {
    return (
      '<a class="stat-tile" href="' + (href || "#") + '"><span class="stat-icon si-' +
      color + '">' + icon + '</span><div><p class="stat-value">' + value +
      '</p><p class="stat-label">' + esc(label) + "</p></div></a>"
    );
  }

  /* ======================= Accounts ======================= */

  function viewAccounts() {
    setActiveNav("accounts");
    api.getClients().then(function (clients) {
      viewEl.innerHTML =
        '<div class="view-head"><div><h1>Accounts</h1><p class="view-sub">' +
        clients.length + ' client accounts.</p></div><div class="btn-row">' +
        '<button class="btn ghost" id="acct-export">Export CSV</button>' +
        '<button class="btn primary" id="acct-new">New Client</button></div></div>' +
        '<div class="card"><div class="card-head filters">' +
        '<input type="search" id="acct-search" class="input" placeholder="Search accounts...">' +
        '<select id="acct-plan" class="input select"><option value="">All plans</option><option>Self-Managed Hosting</option><option>Managed Hosting</option><option>Website Management</option><option value="None">No plan</option></select>' +
        '<select id="acct-status" class="input select"><option value="">All statuses</option><option>active</option><option>past_due</option><option>prospect</option><option>paused</option></select>' +
        "</div>" +
        '<table class="data-table"><thead><tr><th>Account</th><th>Business</th><th>Contact</th><th>Plan</th><th>MRR</th><th>Status</th><th>Client Since</th></tr></thead><tbody id="acct-rows"></tbody></table></div>';

      var current = clients;

      function render() {
        var q = document.getElementById("acct-search").value.trim().toLowerCase();
        var plan = document.getElementById("acct-plan").value;
        var st = document.getElementById("acct-status").value;
        current = clients.filter(function (c) {
          var matchQ =
            !q ||
            c.account_number.toLowerCase().indexOf(q) !== -1 ||
            c.business.toLowerCase().indexOf(q) !== -1 ||
            c.contact.toLowerCase().indexOf(q) !== -1 ||
            c.email.toLowerCase().indexOf(q) !== -1;
          return matchQ && (!plan || c.plan === plan) && (!st || c.status === st);
        });
        document.getElementById("acct-rows").innerHTML = current.length
          ? current
              .map(function (c) {
                return (
                  '<tr class="rowlink" data-href="#/account/' + c.id +
                  '"><td class="mono">' + esc(c.account_number) +
                  "</td><td><strong>" + esc(c.business) + "</strong></td><td>" +
                  esc(c.contact) + "</td><td>" + planBadge(c.plan) +
                  '</td><td class="mono">' + (c.monthly ? money(c.monthly) : "—") +
                  "</td><td>" + statusBadge(c.status) + "</td><td>" +
                  fmtDate(c.client_since) + "</td></tr>"
                );
              })
              .join("")
          : '<tr><td colspan="7" class="empty-cell">No accounts match.</td></tr>';
        bindRowLinks();
      }

      document.getElementById("acct-search").addEventListener("input", render);
      document.getElementById("acct-plan").addEventListener("change", render);
      document.getElementById("acct-status").addEventListener("change", render);
      document.getElementById("acct-new").addEventListener("click", function () {
        clientModal(null);
      });
      document.getElementById("acct-export").addEventListener("click", function () {
        downloadFile(
          "velocube-accounts.csv",
          toCsv(current, [
            { key: "account_number", label: "Account" },
            { key: "business", label: "Business" },
            { key: "contact", label: "Contact" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
            { key: "plan", label: "Plan" },
            { key: "monthly", label: "Monthly" },
            { key: "status", label: "Status" },
            { key: "client_since", label: "Client Since" },
            { key: "renewal_date", label: "Renewal" }
          ]),
          "text/csv"
        );
        toast("Exported " + current.length + " accounts");
      });
      render();
    });
  }

  function clientModal(existing) {
    var isNew = !existing;
    var c = existing || {};
    openModal(
      isNew ? "New client" : "Edit " + c.business,
      '<div class="form-grid">' +
        field("cm-business", "Business name", c.business) +
        field("cm-contact", "Contact name", c.contact) +
        field("cm-email", "Email", c.email, "email") +
        field("cm-phone", "Phone", c.phone) +
        (isNew ? field("cm-account", "Account number", suggestAccountNumber(), "text") : "") +
        '<label>Plan<select id="cm-plan" class="input select">' +
        ["None", "Self-Managed Hosting", "Managed Hosting", "Website Management"]
          .map(function (p) {
            return "<option" + (c.plan === p ? " selected" : "") + ">" + p + "</option>";
          })
          .join("") +
        "</select></label>" +
        field("cm-monthly", "Monthly rate ($)", c.monthly != null ? c.monthly : 0, "number") +
        '<label>Status<select id="cm-status" class="input select">' +
        ["prospect", "active", "past_due", "paused"]
          .map(function (s) {
            return "<option" + (c.status === s ? " selected" : "") + ">" + s + "</option>";
          })
          .join("") +
        "</select></label>" +
        field("cm-renewal", "Renewal date", c.renewal_date || "", "date") +
        field("cm-storage-limit", "Storage limit (GB)", c.storage_limit != null ? c.storage_limit : 0, "number") +
        "</div>" +
        '<div class="btn-row"><button class="btn primary" id="cm-save">' +
        (isNew ? "Create Client" : "Save Changes") +
        '</button><button class="btn ghost" id="cm-cancel">Cancel</button></div>',
      function (wrap) {
        wrap.querySelector("#cm-cancel").addEventListener("click", closeModal);
        wrap.querySelector("#cm-save").addEventListener("click", function () {
          var data = {
            business: val("cm-business"),
            contact: val("cm-contact"),
            email: val("cm-email"),
            phone: val("cm-phone"),
            plan: val("cm-plan"),
            monthly: Number(val("cm-monthly")) || 0,
            status: val("cm-status"),
            renewal_date: val("cm-renewal") || null,
            storage_limit: Number(val("cm-storage-limit")) || 0
          };
          if (!data.business || !data.contact || !data.email) {
            toast("Business, contact, and email are required", "warn");
            return;
          }
          if (isNew) {
            data.account_number = val("cm-account");
            api.createClient(data).then(function (created) {
              log("client_created", data.account_number, "New client: " + data.business);
              toast("Client created");
              closeModal();
              location.hash = "#/account/" + created.id;
              route();
            });
          } else {
            api.updateClient(c.id, data).then(function () {
              log("client_updated", c.account_number, "Updated " + data.business);
              toast("Client updated");
              closeModal();
              route();
            });
          }
        });
      }
    );
  }

  function suggestAccountNumber() {
    return "VC-" + String(10000 + Math.floor(Math.random() * 90000));
  }

  function field(id, label, value, type) {
    return (
      "<label>" + esc(label) + '<input id="' + id + '" class="input" type="' +
      (type || "text") + '" value="' + esc(value == null ? "" : value) + '"></label>'
    );
  }

  function val(id) {
    return document.getElementById(id).value.trim();
  }

  function viewAccount(id) {
    setActiveNav("accounts");
    Promise.all([
      api.getClient(id),
      api.getServices(id),
      api.getTickets()
    ]).then(function (res) {
      var c = res[0];
      var services = res[1];
      var tickets = res[2].filter(function (t) {
        return String(t.client_id) === String(id);
      });

      if (!c) {
        viewEl.innerHTML = '<div class="card pad"><p>Account not found.</p></div>';
        return;
      }

      var completed = services.filter(function (s) { return s.status === "completed"; });
      var inProgress = services.filter(function (s) {
        return s.status === "in_progress" || s.status === "scheduled";
      });
      var subs = services.filter(function (s) { return s.type === "subscription"; });
      var totalSpent = completed.reduce(function (sum, s) { return sum + s.price; }, 0);
      var openT = tickets.filter(function (t) { return t.status !== "resolved"; }).length;
      var pct =
        c.storage_limit > 0
          ? Math.min(100, Math.round((c.storage_used / c.storage_limit) * 100))
          : 0;

      viewEl.innerHTML =
        '<div class="view-head"><div><a class="back-link" href="#/accounts">Back to accounts</a>' +
        "<h1>" + esc(c.business) +
        '</h1><p class="view-sub mono">' + esc(c.account_number) +
        " · Client since " + fmtDate(c.client_since) +
        "</p></div><div class='btn-row'>" +
        '<button class="btn ghost" id="acct-edit">Edit Client</button>' +
        '<button class="btn primary" id="acct-ticket">New Ticket</button>' +
        "</div></div>" +

        '<div class="stat-grid four">' +
        statTile("Open Tickets", openT, "blue", icoTicket()) +
        statTile("Lifetime Projects", money(totalSpent), "green", icoDollar()) +
        statTile("Monthly", c.monthly ? money(c.monthly) : "—", "purple", icoRepeat()) +
        statTile("Storage", c.storage_limit ? pct + "%" : "—", pct >= 90 ? "red" : "amber", icoDrive()) +
        "</div>" +

        '<div class="two-col">' +

        '<div class="card pad"><h2>Contact</h2><dl class="kv">' +
        "<dt>Name</dt><dd>" + esc(c.contact) + "</dd>" +
        '<dt>Email</dt><dd><a class="text-link" href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a></dd>" +
        "<dt>Phone</dt><dd>" + esc(c.phone || "—") + "</dd>" +
        "<dt>Status</dt><dd>" + statusBadge(c.status) + "</dd>" +
        "</dl></div>" +

        '<div class="card pad"><h2>Plan &amp; Billing</h2><dl class="kv">' +
        "<dt>Plan</dt><dd>" + planBadge(c.plan) + "</dd>" +
        "<dt>Rate</dt><dd>" + (c.monthly ? money(c.monthly) + "/mo" : "—") + "</dd>" +
        "<dt>Term</dt><dd>" + esc(c.term || "—") + "</dd>" +
        "<dt>Renewal</dt><dd>" + fmtDate(c.renewal_date) + "</dd>" +
        "</dl>" +
        (c.storage_limit > 0
          ? '<p class="storage-label">Storage: ' + c.storage_used + " GB of " +
            c.storage_limit + ' GB used</p><div class="progress"><span style="width:' +
            pct + '%" class="' +
            (pct >= 90 ? "p-red" : pct >= 70 ? "p-amber" : "p-green") +
            '"></span></div>'
          : "") +
        "</div>" +
        "</div>" +

        '<div class="card"><div class="card-head"><h2>Services in progress</h2></div>' +
        (inProgress.length
          ? '<table class="data-table"><thead><tr><th>Service</th><th>Type</th><th>Price</th><th>Status</th><th>Progress</th><th>Started</th></tr></thead><tbody>' +
            inProgress
              .map(function (s) {
                return (
                  "<tr><td><strong>" + esc(s.name) + "</strong></td><td>" +
                  esc(s.type) + "</td><td>" + money(s.price) + "</td><td>" +
                  statusBadge(s.status) + "</td><td>" +
                  (s.progress != null
                    ? '<div class="progress slim"><span style="width:' + s.progress + '%" class="p-orange"></span></div><span class="pct">' + s.progress + "%</span>"
                    : "—") +
                  "</td><td>" + fmtDate(s.started) + "</td></tr>"
                );
              })
              .join("") +
            "</tbody></table>"
          : '<p class="empty-cell pad">Nothing in progress right now.</p>') +
        "</div>" +

        '<div class="card"><div class="card-head"><h2>Purchased services</h2></div>' +
        '<table class="data-table"><thead><tr><th>Service</th><th>Type</th><th>Price</th><th>Status</th><th>Delivered</th></tr></thead><tbody>' +
        completed
          .concat(subs.filter(function (s) { return s.status !== "completed"; }))
          .map(function (s) {
            return (
              "<tr><td><strong>" + esc(s.name) + "</strong></td><td>" +
              esc(s.type) + "</td><td>" + money(s.price) +
              (s.type === "subscription" ? "/mo" : "") + "</td><td>" +
              statusBadge(s.status) + "</td><td>" +
              fmtDate(s.delivered || s.started) + "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table></div>" +

        '<div class="card"><div class="card-head"><h2>Tickets for this account</h2><a class="text-link" href="#/tickets">All tickets</a></div>' +
        (tickets.length
          ? '<table class="data-table"><thead><tr><th>Ticket</th><th>Subject</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead><tbody>' +
            tickets
              .map(function (t) {
                return (
                  '<tr class="rowlink" data-href="#/ticket/' + t.id +
                  '"><td class="mono">' + esc(t.id) + "</td><td>" +
                  esc(t.subject) + "</td><td>" + prioBadge(t.priority) +
                  "</td><td>" + statusBadge(t.status) + "</td><td>" +
                  fmtDateTime(t.updated_at) + "</td></tr>"
                );
              })
              .join("") +
            "</tbody></table>"
          : '<p class="empty-cell pad">No tickets for this account.</p>') +
        "</div>" +

        '<div class="card pad"><h2>Internal notes</h2><p class="hint">Visible to agents only, never to the client.</p>' +
        '<textarea id="notes-box" class="input textarea">' + esc(c.notes || "") + "</textarea>" +
        '<button class="btn primary" id="save-notes">Save Notes</button></div>';

      bindRowLinks();

      document.getElementById("acct-edit").addEventListener("click", function () {
        clientModal(c);
      });
      document.getElementById("acct-ticket").addEventListener("click", function () {
        api.getClients().then(function (clients) {
          newTicketModal(clients, c.id);
        });
      });
      document.getElementById("save-notes").addEventListener("click", function () {
        api
          .updateClientNotes(c.id, document.getElementById("notes-box").value)
          .then(function () {
            log("client_updated", c.account_number, "Internal notes updated");
            toast("Notes saved");
          });
      });
    });
  }

  /* ======================= Tickets ======================= */

  function newTicketModal(clients, presetClientId) {
    openModal(
      "New ticket",
      '<div class="form-grid">' +
        '<label>Client<select id="nt-client" class="input select">' +
        clients
          .map(function (c) {
            return (
              '<option value="' + c.id + '"' +
              (String(c.id) === String(presetClientId) ? " selected" : "") +
              ">" + esc(c.account_number + " · " + c.business) + "</option>"
            );
          })
          .join("") +
        "</select></label>" +
        '<label>Priority<select id="nt-priority" class="input select"><option>low</option><option selected>normal</option><option>high</option><option>urgent</option></select></label>' +
        '<label>Source<select id="nt-source" class="input select"><option selected>manual</option><option>email</option><option>phone</option><option>quote form</option></select></label>' +
        '<label>Tags<input id="nt-tags" class="input" type="text" placeholder="billing, hosting (comma separated)"></label>' +
        '<label class="full">Subject<input id="nt-subject" class="input" type="text" placeholder="Short summary"></label>' +
        '<label class="full">First message<textarea id="nt-body" class="input textarea" placeholder="What did the client ask?"></textarea></label>' +
        "</div>" +
        '<div class="btn-row"><button class="btn primary" id="nt-save">Create Ticket</button><button class="btn ghost" id="nt-cancel">Cancel</button></div>',
      function (wrap) {
        wrap.querySelector("#nt-cancel").addEventListener("click", closeModal);
        wrap.querySelector("#nt-save").addEventListener("click", function () {
          var subject = val("nt-subject");
          var body = val("nt-body");
          if (!subject) {
            toast("Add a subject first", "warn");
            return;
          }
          var clientId = val("nt-client");
          api
            .createTicket({
              client_id: isNaN(Number(clientId)) ? clientId : Number(clientId),
              subject: subject,
              priority: val("nt-priority"),
              source: val("nt-source"),
              tags: val("nt-tags"),
              assignee: agent.name
            })
            .then(function (t) {
              log("ticket_created", t.id, subject);
              if (body) {
                return api
                  .addMessage(t.id, agent.name, body, { internal: false })
                  .then(function () { return t; });
              }
              return t;
            })
            .then(function (t) {
              toast("Ticket " + t.id + " created");
              closeModal();
              refreshNavCount();
              location.hash = "#/ticket/" + t.id;
            });
        });
      }
    );
  }

  function viewTickets(tab) {
    setActiveNav("tickets");
    tab = tab || "open";
    Promise.all([api.getTickets(), api.getClients(), api.getAgents()]).then(function (res) {
      var tickets = res[0];
      var clients = res[1];
      var agents = res[2];
      var clientById = {};
      clients.forEach(function (c) { clientById[c.id] = c; });

      function countFor(name) {
        if (name === "all") return tickets.length;
        return tickets.filter(function (t) { return t.status === name; }).length;
      }

      var tabs = ["open", "pending", "resolved", "all"];

      viewEl.innerHTML =
        '<div class="view-head"><div><h1>Tickets</h1><p class="view-sub">Client requests from email, phone, and the quote form.</p></div>' +
        '<button class="btn primary" id="new-ticket-btn">New Ticket</button></div>' +
        '<div class="tab-row">' +
        tabs
          .map(function (name) {
            return (
              '<a class="tab' + (tab === name ? " active" : "") + '" href="#/tickets/' + name + '">' +
              name.charAt(0).toUpperCase() + name.slice(1) +
              ' <span class="tab-count">' + countFor(name) + "</span></a>"
            );
          })
          .join("") +
        "</div>" +
        '<div class="card"><div class="card-head filters">' +
        '<input type="search" id="tk-search" class="input" placeholder="Search subject or ID...">' +
        '<select id="tk-priority" class="input select"><option value="">All priorities</option><option>urgent</option><option>high</option><option>normal</option><option>low</option></select>' +
        '<select id="tk-assignee" class="input select"><option value="">All assignees</option><option>Unassigned</option>' +
        agents
          .map(function (a) { return "<option>" + esc(a.name) + "</option>"; })
          .join("") +
        "</select>" +
        '<select id="tk-source" class="input select"><option value="">All sources</option><option>email</option><option>phone</option><option>quote form</option><option>manual</option></select>' +
        "</div>" +
        '<table class="data-table"><thead><tr><th>Ticket</th><th>Client</th><th>Subject</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Waiting</th></tr></thead><tbody id="tk-rows"></tbody></table></div>';

      function render() {
        var q = document.getElementById("tk-search").value.trim().toLowerCase();
        var pr = document.getElementById("tk-priority").value;
        var asg = document.getElementById("tk-assignee").value;
        var src = document.getElementById("tk-source").value;
        var pw = { urgent: 0, high: 1, normal: 2, low: 3 };
        var rows = tickets
          .filter(function (t) {
            if (tab !== "all" && t.status !== tab) return false;
            if (pr && t.priority !== pr) return false;
            if (asg && t.assignee !== asg) return false;
            if (src && t.source !== src) return false;
            if (
              q &&
              t.subject.toLowerCase().indexOf(q) === -1 &&
              t.id.toLowerCase().indexOf(q) === -1
            )
              return false;
            return true;
          })
          .sort(function (a, b) {
            if (tab === "resolved" || tab === "all") {
              return a.updated_at < b.updated_at ? 1 : -1;
            }
            if (pw[a.priority] !== pw[b.priority]) return pw[a.priority] - pw[b.priority];
            return a.updated_at < b.updated_at ? -1 : 1;
          });
        document.getElementById("tk-rows").innerHTML = rows.length
          ? rows
              .map(function (t) {
                var c = clientById[t.client_id] || {};
                return (
                  '<tr class="rowlink" data-href="#/ticket/' + t.id +
                  '"><td class="mono">' + esc(t.id) + "</td><td>" +
                  esc(c.business || "—") + "</td><td>" + esc(t.subject) +
                  " " + tagChips(t.tags) + "</td><td>" +
                  (t.assignee === "Unassigned"
                    ? '<span class="text-amber">Unassigned</span>'
                    : esc(t.assignee)) +
                  "</td><td>" + prioBadge(t.priority) + "</td><td>" +
                  statusBadge(t.status) + "</td><td>" + (slaChip(t) || fmtDateTime(t.updated_at)) +
                  "</td></tr>"
                );
              })
              .join("")
          : '<tr><td colspan="7" class="empty-cell">No tickets match.</td></tr>';
        bindRowLinks();
      }

      ["tk-priority", "tk-assignee", "tk-source"].forEach(function (id) {
        document.getElementById(id).addEventListener("change", render);
      });
      document.getElementById("tk-search").addEventListener("input", render);
      document.getElementById("new-ticket-btn").addEventListener("click", function () {
        newTicketModal(clients);
      });

      render();
    });
  }

  function viewTicket(id) {
    setActiveNav("tickets");
    Promise.all([
      api.getTicket(id),
      api.getMessages(id),
      api.getAgents(),
      api.getSnippets()
    ]).then(function (res) {
      var t = res[0];
      var messages = res[1];
      var agents = res[2];
      var snippets = res[3];
      if (!t) {
        viewEl.innerHTML = '<div class="card pad"><p>Ticket not found.</p></div>';
        return;
      }
      api.getClient(t.client_id).then(function (c) {
        var assigneeNames = ["Unassigned"].concat(
          agents.map(function (a) { return a.name; })
        );
        if (assigneeNames.indexOf(agent.name) === -1) assigneeNames.push(agent.name);
        if (t.assignee && assigneeNames.indexOf(t.assignee) === -1)
          assigneeNames.push(t.assignee);

        viewEl.innerHTML =
          '<div class="view-head"><div><a class="back-link" href="#/tickets">Back to tickets</a>' +
          "<h1>" + esc(t.subject) + '</h1><p class="view-sub mono">' +
          esc(t.id) + " · " + esc(t.source) + " · opened " + fmtDateTime(t.created_at) +
          "</p></div>" +
          (c
            ? '<a class="account-chip" href="#/account/' + c.id + '">' +
              '<span class="chip-avatar">' + initials(c.business) + "</span><span><strong>" +
              esc(c.business) + '</strong><span class="mono">' + esc(c.account_number) +
              "</span></span></a>"
            : "") +
          "</div>" +

          '<div class="ticket-layout">' +
          '<div class="card thread-card"><div class="thread">' +
          messages
            .map(function (m) {
              if (m.internal) {
                return (
                  '<div class="msg note"><div class="msg-meta">' + esc(m.author) +
                  ' <span class="msg-tag note-tag">Internal note</span> · ' +
                  fmtDateTime(m.sent_at) + '</div><div class="msg-body">' +
                  esc(m.body) + "</div></div>"
                );
              }
              return (
                '<div class="msg ' + (m.direction === "outbound" ? "out" : "in") + '">' +
                '<div class="msg-meta">' + esc(m.author) +
                (m.direction === "outbound" ? ' <span class="msg-tag">Agent</span>' : "") +
                " · " + fmtDateTime(m.sent_at) +
                (m.direction === "outbound" ? " " + emailStatusBadge(m.email_status) : "") +
                "</div>" +
                '<div class="msg-body">' + esc(m.body) + "</div></div>"
              );
            })
            .join("") +
          "</div>" +

          '<div class="reply-box">' +
          '<div class="reply-tabs"><button type="button" class="reply-tab active" data-mode="reply">Reply to client</button>' +
          '<button type="button" class="reply-tab" data-mode="note">Internal note</button>' +
          (snippets.length
            ? '<select id="snippet-pick" class="input select snippet-pick"><option value="">Insert canned reply...</option>' +
              snippets
                .map(function (s, i) {
                  return '<option value="' + i + '">' + esc(s.category + " · " + s.title) + "</option>";
                })
                .join("") +
              "</select>"
            : "") +
          "</div>" +
          '<textarea id="reply-body" class="input textarea" placeholder="Write a reply to ' +
          esc(c ? c.contact : "the client") + '..."></textarea>' +
          '<div class="btn-row"><button class="btn primary" id="send-reply">Send Reply</button>' +
          '<span class="hint" id="reply-hint">' +
          (api.mode === "supabase"
            ? "Saved to the thread and emailed to " + esc(c ? c.email : "the client") + "."
            : "Demo mode: saved to the thread and marked queued (no real email).") +
          "</span></div></div></div>" +

          '<div class="card pad ticket-side"><h2>Ticket details</h2>' +
          '<label class="side-field">Status<select id="tk-set-status" class="input select">' +
          ["open", "pending", "resolved"]
            .map(function (s) {
              return "<option" + (t.status === s ? " selected" : "") + ">" + s + "</option>";
            })
            .join("") +
          "</select></label>" +
          '<label class="side-field">Priority<select id="tk-set-priority" class="input select">' +
          ["low", "normal", "high", "urgent"]
            .map(function (p) {
              return "<option" + (t.priority === p ? " selected" : "") + ">" + p + "</option>";
            })
            .join("") +
          "</select></label>" +
          '<label class="side-field">Assignee<select id="tk-set-assignee" class="input select">' +
          assigneeNames
            .filter(function (v, i, a) { return a.indexOf(v) === i; })
            .map(function (n) {
              return "<option" + (t.assignee === n ? " selected" : "") + ">" + esc(n) + "</option>";
            })
            .join("") +
          "</select></label>" +
          '<label class="side-field">Tags<input id="tk-set-tags" class="input" type="text" value="' +
          esc(t.tags || "") + '" placeholder="billing, hosting"></label>' +
          '<button class="btn ghost full-w" id="tk-save">Update Ticket</button>' +
          (t.status !== "resolved"
            ? '<button class="btn primary full-w" id="tk-resolve">Mark Resolved</button>'
            : '<button class="btn ghost full-w" id="tk-reopen">Reopen Ticket</button>') +
          (c
            ? '<a class="btn ghost full-w" href="mailto:' + esc(c.email) + "?subject=Re: " +
              encodeURIComponent(t.subject) + '">Open in Email App</a>'
            : "") +

          (c
            ? '<div class="side-context"><h3>Client context</h3><dl class="kv small">' +
              "<dt>Plan</dt><dd>" + planBadge(c.plan) + "</dd>" +
              "<dt>Status</dt><dd>" + statusBadge(c.status) + "</dd>" +
              "<dt>Phone</dt><dd>" + esc(c.phone || "—") + "</dd>" +
              "</dl>" +
              (c.notes
                ? '<p class="ctx-notes">' + esc(c.notes) + "</p>"
                : "") +
              "</div>"
            : "") +
          "</div></div>";

        var replyMode = "reply";
        var replyBody = document.getElementById("reply-body");
        var sendBtn = document.getElementById("send-reply");
        var hint = document.getElementById("reply-hint");

        document.querySelectorAll(".reply-tab").forEach(function (btn) {
          btn.addEventListener("click", function () {
            replyMode = btn.getAttribute("data-mode");
            document.querySelectorAll(".reply-tab").forEach(function (b) {
              b.classList.toggle("active", b === btn);
            });
            document.querySelector(".reply-box").classList.toggle("note-mode", replyMode === "note");
            if (replyMode === "note") {
              sendBtn.textContent = "Save Note";
              replyBody.placeholder = "Write an internal note (never emailed to the client)...";
              hint.textContent = "Internal notes are visible to agents only.";
            } else {
              sendBtn.textContent = "Send Reply";
              replyBody.placeholder = "Write a reply to " + (c ? c.contact : "the client") + "...";
              hint.textContent =
                api.mode === "supabase"
                  ? "Saved to the thread and emailed to " + (c ? c.email : "the client") + "."
                  : "Demo mode: saved to the thread and marked queued (no real email).";
            }
          });
        });

        var snippetPick = document.getElementById("snippet-pick");
        if (snippetPick) {
          snippetPick.addEventListener("change", function () {
            if (snippetPick.value === "") return;
            var s = snippets[Number(snippetPick.value)];
            var text = s.body
              .replace(/\{name\}/g, c ? firstName(c.contact) : "there")
              .replace(/\{agent\}/g, agent.name);
            replyBody.value = replyBody.value
              ? replyBody.value + "\n\n" + text
              : text;
            snippetPick.value = "";
            replyBody.focus();
          });
        }

        sendBtn.addEventListener("click", function () {
          var body = replyBody.value.trim();
          if (!body) {
            toast("Write something first", "warn");
            return;
          }
          sendBtn.disabled = true;
          var internal = replyMode === "note";
          api
            .addMessage(t.id, agent.name, body, { internal: internal })
            .then(function (msg) {
              if (internal) {
                log("note_added", t.id, "Internal note added");
                toast("Note saved");
                viewTicket(id);
                return;
              }
              log("reply_sent", t.id, "Replied to " + (c ? c.business : "client"));
              if (api.mode === "supabase" && c) {
                return api
                  .sendEmail({
                    message_id: msg.id,
                    to: c.email,
                    to_name: c.contact,
                    subject: t.subject,
                    body: body,
                    ticket_id: t.id,
                    agent_name: agent.name
                  })
                  .then(function (r) {
                    if (r.ok && r.email_status === "sent") {
                      toast("Reply sent and emailed to " + c.email);
                    } else {
                      toast("Reply saved — email queued (mail service not connected)", "warn");
                    }
                    viewTicket(id);
                  });
              }
              toast("Reply saved and queued for email");
              viewTicket(id);
            })
            .catch(function () {
              sendBtn.disabled = false;
              toast("Something went wrong saving the reply", "warn");
            });
        });

        function saveTicket(patch, msg) {
          api.updateTicket(t.id, patch).then(function () {
            if (patch.status && patch.status !== t.status) {
              log("status_changed", t.id, "Status set to " + patch.status);
            }
            toast(msg || "Ticket updated");
            refreshNavCount();
            viewTicket(id);
          });
        }

        document.getElementById("tk-save").addEventListener("click", function () {
          saveTicket({
            status: document.getElementById("tk-set-status").value,
            priority: document.getElementById("tk-set-priority").value,
            assignee: document.getElementById("tk-set-assignee").value,
            tags: document.getElementById("tk-set-tags").value
          });
        });

        var resolveBtn = document.getElementById("tk-resolve");
        if (resolveBtn) {
          resolveBtn.addEventListener("click", function () {
            saveTicket({ status: "resolved" }, "Ticket resolved");
          });
        }
        var reopenBtn = document.getElementById("tk-reopen");
        if (reopenBtn) {
          reopenBtn.addEventListener("click", function () {
            saveTicket({ status: "open" }, "Ticket reopened");
          });
        }
      });
    });
  }

  /* ======================= Reports ======================= */

  function viewReports() {
    setActiveNav("reports");
    Promise.all([
      api.getTickets(),
      api.getClients(),
      api.getAllServices()
    ]).then(function (res) {
      var tickets = res[0];
      var clients = res[1];
      var services = res[2];

      var clientById = {};
      clients.forEach(function (c) { clientById[c.id] = c; });

      var mrr = clients.reduce(function (sum, c) {
        return sum + (c.status === "active" ? Number(c.monthly || 0) : 0);
      }, 0);
      var lifetime = services
        .filter(function (s) { return s.status === "completed"; })
        .reduce(function (sum, s) { return sum + Number(s.price || 0); }, 0);
      var resolved = tickets.filter(function (t) { return t.status === "resolved"; }).length;
      var resRate = tickets.length ? Math.round((resolved / tickets.length) * 100) : 0;

      // Revenue by month (completed services, last 6 months)
      var months = [];
      for (var i = 5; i >= 0; i--) {
        var d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        months.push(d.toISOString().slice(0, 7));
      }
      var revByMonth = months.map(function (m) {
        return services
          .filter(function (s) {
            return s.delivered && String(s.delivered).slice(0, 7) === m;
          })
          .reduce(function (sum, s) { return sum + Number(s.price || 0); }, 0);
      });
      var maxRev = Math.max.apply(null, revByMonth.concat([1]));

      // Tickets by priority and by source
      function breakdown(key, values) {
        var active = tickets.filter(function (t) { return t.status !== "resolved"; });
        return values.map(function (v) {
          return {
            label: v,
            count: active.filter(function (t) { return t[key] === v; }).length,
            total: active.length || 1
          };
        });
      }
      var byPriority = breakdown("priority", ["urgent", "high", "normal", "low"]);
      var bySource = breakdown("source", ["email", "phone", "quote form", "manual"]);

      // Top clients by lifetime value
      var byClient = {};
      services
        .filter(function (s) { return s.status === "completed"; })
        .forEach(function (s) {
          byClient[s.client_id] = (byClient[s.client_id] || 0) + Number(s.price || 0);
        });
      var top = Object.keys(byClient)
        .map(function (cid) {
          return { client: clientById[cid], total: byClient[cid] };
        })
        .filter(function (r) { return r.client; })
        .sort(function (a, b) { return b.total - a.total; })
        .slice(0, 5);
      var maxTop = top.length ? top[0].total : 1;

      var prColors = { urgent: "p-red", high: "p-orange", normal: "p-blue", low: "p-gray" };

      viewEl.innerHTML =
        '<div class="view-head"><div><h1>Reports</h1><p class="view-sub">Revenue, workload, and client value at a glance.</p></div></div>' +

        '<div class="stat-grid four">' +
        statTile("Monthly Recurring", money(mrr), "purple", icoRepeat()) +
        statTile("Lifetime Project Revenue", money(lifetime), "green", icoDollar()) +
        statTile("Tickets Resolved", resolved + " / " + tickets.length, "blue", icoCheck()) +
        statTile("Resolution Rate", resRate + "%", "orange", icoTrend()) +
        "</div>" +

        '<div class="two-col">' +

        '<div class="card pad"><div class="card-head bare"><h2>Project revenue · last 6 months</h2></div>' +
        '<div class="bar-chart tall">' +
        revByMonth
          .map(function (n, idx) {
            var h = Math.round((n / maxRev) * 100);
            var d = new Date(months[idx] + "-02");
            return (
              '<div class="bar-col" title="' + months[idx] + ": " + money(n) + '">' +
              '<span class="bar-val">' + (n ? "$" + Math.round(n / 100) / 10 + "k" : "") + "</span>" +
              '<span class="bar green" style="height:' + Math.max(h, 3) + '%"></span>' +
              '<span class="bar-lbl">' +
              d.toLocaleDateString("en-US", { month: "short" }) +
              "</span></div>"
            );
          })
          .join("") +
        "</div></div>" +

        '<div class="card pad"><div class="card-head bare"><h2>Top clients by project value</h2></div>' +
        (top.length
          ? '<ul class="hbar-list">' +
            top
              .map(function (r) {
                var w = Math.round((r.total / maxTop) * 100);
                return (
                  '<li><a class="text-link" href="#/account/' + r.client.id + '">' +
                  esc(r.client.business) + '</a><span class="mono">' + money(r.total) +
                  '</span><div class="progress slim"><span style="width:' + w +
                  '%" class="p-purple"></span></div></li>'
                );
              })
              .join("") +
            "</ul>"
          : '<p class="empty-cell">No completed projects yet.</p>') +
        "</div>" +
        "</div>" +

        '<div class="two-col">' +
        '<div class="card pad"><div class="card-head bare"><h2>Open workload by priority</h2></div><ul class="hbar-list">' +
        byPriority
          .map(function (r) {
            var w = Math.round((r.count / r.total) * 100);
            return (
              "<li><span>" + prioBadge(r.label) + '</span><span class="mono">' + r.count +
              '</span><div class="progress slim"><span style="width:' + w + '%" class="' +
              (prColors[r.label] || "p-gray") + '"></span></div></li>'
            );
          })
          .join("") +
        "</ul></div>" +

        '<div class="card pad"><div class="card-head bare"><h2>Open tickets by source</h2></div><ul class="hbar-list">' +
        bySource
          .map(function (r) {
            var w = Math.round((r.count / r.total) * 100);
            return (
              "<li><span>" + esc(r.label) + '</span><span class="mono">' + r.count +
              '</span><div class="progress slim"><span style="width:' + w +
              '%" class="p-blue"></span></div></li>'
            );
          })
          .join("") +
        "</ul></div>" +
        "</div>";
    });
  }

  /* ======================= Activity ======================= */

  function viewActivity() {
    setActiveNav("activity");
    api.getActivity().then(function (items) {
      viewEl.innerHTML =
        '<div class="view-head"><div><h1>Activity</h1><p class="view-sub">Everything the team has done, newest first.</p></div></div>' +
        '<div class="card pad"><ul class="feed big">' +
        (items.length
          ? items
              .map(function (a) {
                return (
                  '<li><span class="feed-dot ' + feedDot(a.kind) + '"></span><div><p>' +
                  esc(a.detail || a.kind) +
                  '</p><p class="feed-meta">' + esc(a.agent) + " · " + fmtDateTime(a.ts) +
                  (a.ref
                    ? ' · <a href="' + refHref(a.ref) + '" class="text-link mono">' + esc(a.ref) + "</a>"
                    : "") +
                  "</p></div></li>"
                );
              })
              .join("")
          : "<li><p class='empty-cell'>No activity logged yet.</p></li>") +
        "</ul></div>";
    });
  }

  /* ======================= Snippets ======================= */

  function viewSnippets() {
    setActiveNav("snippets");
    api.getSnippets().then(function (snippets) {
      var cats = [];
      snippets.forEach(function (s) {
        if (cats.indexOf(s.category) === -1) cats.push(s.category);
      });

      viewEl.innerHTML =
        '<div class="view-head"><div><h1>Canned Replies</h1><p class="view-sub">Reusable responses. Use {name} for the client\'s first name and {agent} for yours.</p></div>' +
        '<button class="btn primary" id="sn-new">New Reply</button></div>' +
        (snippets.length
          ? cats
              .map(function (cat) {
                return (
                  '<h2 class="guide-cat">' + esc(cat) + "</h2>" +
                  snippets
                    .filter(function (s) { return s.category === cat; })
                    .map(function (s) {
                      return (
                        '<div class="card pad snippet-card" data-id="' + s.id + '">' +
                        '<div class="card-head bare"><h3>' + esc(s.title) + "</h3>" +
                        '<div class="btn-row"><button class="btn ghost sm sn-copy" type="button">Copy</button>' +
                        '<button class="btn ghost sm sn-edit" type="button">Edit</button>' +
                        '<button class="btn ghost sm danger sn-del" type="button">Delete</button></div></div>' +
                        '<pre class="snippet-body">' + esc(s.body) + "</pre></div>"
                      );
                    })
                    .join("")
                );
              })
              .join("")
          : '<div class="card pad"><p class="empty-cell">No canned replies yet. Create your first one.</p></div>');

      document.getElementById("sn-new").addEventListener("click", function () {
        snippetModal(null);
      });

      viewEl.querySelectorAll(".snippet-card").forEach(function (card) {
        var sid = card.getAttribute("data-id");
        var s = snippets.find(function (x) { return String(x.id) === String(sid); });
        card.querySelector(".sn-copy").addEventListener("click", function () {
          navigator.clipboard.writeText(s.body).then(function () {
            toast("Copied to clipboard");
          });
        });
        card.querySelector(".sn-edit").addEventListener("click", function () {
          snippetModal(s);
        });
        card.querySelector(".sn-del").addEventListener("click", function () {
          if (!confirm('Delete "' + s.title + '"?')) return;
          api.deleteSnippet(s.id).then(function () {
            toast("Deleted");
            viewSnippets();
          });
        });
      });
    });
  }

  function snippetModal(existing) {
    var isNew = !existing;
    var s = existing || {};
    openModal(
      isNew ? "New canned reply" : "Edit canned reply",
      '<div class="form-grid">' +
        field("sn-title", "Title", s.title) +
        field("sn-cat", "Category", s.category || "General") +
        '<label class="full">Body<textarea id="sn-body" class="input textarea tall">' +
        esc(s.body || "") +
        "</textarea></label></div>" +
        '<p class="hint">{name} → client first name · {agent} → your name</p>' +
        '<div class="btn-row"><button class="btn primary" id="sn-save">' +
        (isNew ? "Create" : "Save") +
        '</button><button class="btn ghost" id="sn-cancel">Cancel</button></div>',
      function (wrap) {
        wrap.querySelector("#sn-cancel").addEventListener("click", closeModal);
        wrap.querySelector("#sn-save").addEventListener("click", function () {
          var data = {
            title: val("sn-title"),
            category: val("sn-cat") || "General",
            body: document.getElementById("sn-body").value.trim()
          };
          if (!data.title || !data.body) {
            toast("Title and body are required", "warn");
            return;
          }
          var p = isNew
            ? api.createSnippet(data)
            : api.updateSnippet(s.id, data);
          p.then(function () {
            toast(isNew ? "Canned reply created" : "Saved");
            closeModal();
            viewSnippets();
          });
        });
      }
    );
  }

  /* ======================= Team ======================= */

  function viewTeam() {
    setActiveNav("team");
    Promise.all([api.getAgents(), api.getTickets()]).then(function (res) {
      var agents = res[0];
      var tickets = res[1];

      viewEl.innerHTML =
        '<div class="view-head"><div><h1>Team</h1><p class="view-sub">Workload across the support team.' +
        (api.mode === "supabase"
          ? " Add agents in the Supabase Dashboard (agents table + Authentication)."
          : "") +
        "</p></div></div>" +
        '<div class="team-grid">' +
        (agents.length
          ? agents
              .map(function (a) {
                var mine = tickets.filter(function (t) { return t.assignee === a.name; });
                var open = mine.filter(function (t) { return t.status !== "resolved"; }).length;
                var resolved = mine.filter(function (t) { return t.status === "resolved"; }).length;
                return (
                  '<div class="card pad team-card"><span class="chip-avatar lg">' +
                  initials(a.name) + "</span><h3>" + esc(a.name) +
                  '</h3><p class="feed-meta">' + esc(a.role) + " · " + esc(a.email) +
                  '</p><div class="team-stats"><div><p class="stat-value sm">' + open +
                  '</p><p class="stat-label">Open</p></div><div><p class="stat-value sm">' +
                  resolved + '</p><p class="stat-label">Resolved</p></div></div></div>'
                );
              })
              .join("")
          : '<div class="card pad"><p class="empty-cell">No agents in the roster yet. Run supabase-upgrade.sql, then add rows to the agents table.</p></div>') +
        "</div>" +
        '<div class="card"><div class="card-head"><h2>Unassigned tickets</h2></div>' +
        (function () {
          var un = tickets.filter(function (t) {
            return t.assignee === "Unassigned" && t.status !== "resolved";
          });
          return un.length
            ? '<table class="data-table"><thead><tr><th>Ticket</th><th>Subject</th><th>Priority</th><th>Waiting</th></tr></thead><tbody>' +
                un
                  .map(function (t) {
                    return (
                      '<tr class="rowlink" data-href="#/ticket/' + t.id +
                      '"><td class="mono">' + esc(t.id) + "</td><td>" + esc(t.subject) +
                      "</td><td>" + prioBadge(t.priority) + "</td><td>" + slaChip(t) +
                      "</td></tr>"
                    );
                  })
                  .join("") +
                "</tbody></table>"
            : '<p class="empty-cell pad">Everything is assigned. Great.</p>';
        })() +
        "</div>";
      bindRowLinks();
    });
  }

  /* ======================= Settings ======================= */

  function viewSettings() {
    setActiveNav("settings");
    var live = api.mode === "supabase";
    viewEl.innerHTML =
      '<div class="view-head"><div><h1>Settings</h1><p class="view-sub">Connection status and panel utilities.</p></div></div>' +

      '<div class="card pad"><h2>Connection</h2><dl class="kv">' +
      "<dt>Mode</dt><dd>" +
      (live
        ? '<span class="badge b-green">Live · Supabase</span>'
        : '<span class="badge b-amber">Demo Mode</span>') +
      "</dd>" +
      "<dt>Signed in as</dt><dd>" + esc(agent.email) + "</dd>" +
      (live
        ? "<dt>Project</dt><dd class='mono'>" + esc((window.VELO_CONFIG || {}).SUPABASE_URL || "") + "</dd>"
        : "") +
      "</dl>" +
      (!live
        ? '<p class="hint">To go live: create a Supabase project, run supabase-setup.sql and supabase-upgrade.sql, then paste your keys into admin/js/config.js.</p>'
        : "") +
      "</div>" +

      '<div class="card pad"><h2>Email delivery</h2>' +
      '<p class="hint">Replies are emailed to clients through the send-ticket-email Edge Function (Resend). Test whether it is deployed and configured:</p>' +
      '<div class="btn-row"><button class="btn primary" id="test-email">Test Email Function</button>' +
      '<span class="hint" id="test-email-result"></span></div>' +
      (!live
        ? '<p class="hint">Demo mode: outbound email is simulated; replies are marked "queued".</p>'
        : "") +
      "</div>" +

      '<div class="card pad"><h2>Data export</h2>' +
      '<p class="hint">Download a snapshot of panel data.</p>' +
      '<div class="btn-row">' +
      '<button class="btn ghost" id="exp-clients">Accounts CSV</button>' +
      '<button class="btn ghost" id="exp-tickets">Tickets CSV</button>' +
      '<button class="btn ghost" id="exp-json">Everything (JSON)</button>' +
      "</div></div>" +

      (!live
        ? '<div class="card pad"><h2>Demo data</h2><p class="hint">Reset all demo changes (replies, tickets, notes, clients) back to the starting dataset.</p>' +
          '<button class="btn ghost danger" id="reset-demo">Reset Demo Data</button></div>'
        : "");

    document.getElementById("test-email").addEventListener("click", function () {
      var out = document.getElementById("test-email-result");
      out.textContent = "Testing...";
      if (!live) {
        out.textContent = "Demo mode — connect Supabase first.";
        return;
      }
      api
        .sendEmail({
          to: agent.email,
          to_name: agent.name,
          subject: "Support panel email test",
          body: "This is a test email from the Velocube support panel. If you received this, email delivery is working.",
          ticket_id: "TEST",
          agent_name: agent.name
        })
        .then(function (r) {
          out.textContent =
            r.ok && r.email_status === "sent"
              ? "Working — test email sent to " + agent.email
              : "Not delivering yet: " + (r.error || "function not deployed or RESEND_API_KEY missing");
        });
    });

    document.getElementById("exp-clients").addEventListener("click", function () {
      api.getClients().then(function (clients) {
        downloadFile(
          "velocube-accounts.csv",
          toCsv(clients, [
            { key: "account_number", label: "Account" },
            { key: "business", label: "Business" },
            { key: "contact", label: "Contact" },
            { key: "email", label: "Email" },
            { key: "plan", label: "Plan" },
            { key: "monthly", label: "Monthly" },
            { key: "status", label: "Status" }
          ]),
          "text/csv"
        );
      });
    });

    document.getElementById("exp-tickets").addEventListener("click", function () {
      api.getTickets().then(function (tickets) {
        downloadFile(
          "velocube-tickets.csv",
          toCsv(tickets, [
            { key: "id", label: "Ticket" },
            { key: "subject", label: "Subject" },
            { key: "status", label: "Status" },
            { key: "priority", label: "Priority" },
            { key: "assignee", label: "Assignee" },
            { key: "source", label: "Source" },
            { key: "created_at", label: "Created" },
            { key: "updated_at", label: "Updated" }
          ]),
          "text/csv"
        );
      });
    });

    document.getElementById("exp-json").addEventListener("click", function () {
      Promise.all([
        api.getClients(),
        api.getTickets(),
        api.getAllServices(),
        api.getSnippets(),
        api.getActivity()
      ]).then(function (res) {
        downloadFile(
          "velocube-panel-export.json",
          JSON.stringify(
            {
              exported_at: new Date().toISOString(),
              clients: res[0],
              tickets: res[1],
              services: res[2],
              canned_responses: res[3],
              activity: res[4]
            },
            null,
            2
          ),
          "application/json"
        );
      });
    });

    var resetBtn = document.getElementById("reset-demo");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (!confirm("Reset all demo changes back to the starting dataset?")) return;
        localStorage.removeItem("velo_admin_demo_v2");
        toast("Demo data reset");
        route();
      });
    }
  }

  /* ======================= Guides ======================= */

  function viewGuides() {
    setActiveNav("guides");
    api.getGuides().then(function (guides) {
      var cats = [];
      guides.forEach(function (g) {
        if (cats.indexOf(g.category) === -1) cats.push(g.category);
      });

      viewEl.innerHTML =
        '<div class="view-head"><div><h1>Help Guides</h1><p class="view-sub">Playbooks for the questions clients ask most.</p></div></div>' +
        '<input type="search" id="guide-search" class="input guide-search" placeholder="Search guides...">' +
        '<div id="guide-list">' + renderGuides(guides, cats) + "</div>";

      document.getElementById("guide-search").addEventListener("input", function () {
        var q = this.value.trim().toLowerCase();
        var filtered = !q
          ? guides
          : guides.filter(function (g) {
              return (
                g.title.toLowerCase().indexOf(q) !== -1 ||
                g.summary.toLowerCase().indexOf(q) !== -1 ||
                g.steps.join(" ").toLowerCase().indexOf(q) !== -1
              );
            });
        var fCats = [];
        filtered.forEach(function (g) {
          if (fCats.indexOf(g.category) === -1) fCats.push(g.category);
        });
        document.getElementById("guide-list").innerHTML = filtered.length
          ? renderGuides(filtered, fCats)
          : '<div class="card pad"><p class="empty-cell">No guides match.</p></div>';
      });
    });
  }

  function renderGuides(guides, cats) {
    return cats
      .map(function (cat) {
        return (
          '<h2 class="guide-cat">' + esc(cat) + "</h2>" +
          guides
            .filter(function (g) {
              return g.category === cat;
            })
            .map(function (g) {
              return (
                '<details class="guide card"><summary><div><strong>' +
                esc(g.title) + "</strong><span>" + esc(g.summary) +
                '</span></div></summary><ol class="guide-steps">' +
                g.steps
                  .map(function (s) {
                    return "<li>" + esc(s) + "</li>";
                  })
                  .join("") +
                "</ol></details>"
              );
            })
            .join("")
        );
      })
      .join("");
  }

  function bindRowLinks() {
    viewEl.querySelectorAll(".rowlink").forEach(function (row) {
      row.addEventListener("click", function () {
        location.hash = row.getAttribute("data-href");
      });
    });
  }

  /* ======================= Icons ======================= */

  function svgWrap(inner) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      inner +
      "</svg>"
    );
  }
  function icoTicket() {
    return svgWrap('<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2M13 17v2M13 11v2"/>');
  }
  function icoAlert() {
    return svgWrap('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>');
  }
  function icoUsers() {
    return svgWrap('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>');
  }
  function icoInbox() {
    return svgWrap('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>');
  }
  function icoClock() {
    return svgWrap('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>');
  }
  function icoDollar() {
    return svgWrap('<path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>');
  }
  function icoRepeat() {
    return svgWrap('<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>');
  }
  function icoDrive() {
    return svgWrap('<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>');
  }
  function icoCheck() {
    return svgWrap('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>');
  }
  function icoTrend() {
    return svgWrap('<path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>');
  }

  /* ======================= Boot ======================= */

  var modeChip = document.getElementById("mode-chip");
  if (api.mode === "demo") {
    var demoNote = document.getElementById("demo-note");
    if (demoNote) demoNote.hidden = false;
  } else if (modeChip) {
    modeChip.textContent = "Live";
    modeChip.classList.add("live");
  }

  api.getSession().then(function (session) {
    if (session) {
      agent = session;
      showApp();
    } else {
      showLogin();
    }
  });
})();
