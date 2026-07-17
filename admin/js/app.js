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

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast";
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
    }, 2600);
  }

  function initials(name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(function (w) {
        return w[0] || "";
      })
      .join("")
      .toUpperCase();
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
    route();
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
    api.getClients().then(function (clients) {
      var hits = clients
        .filter(function (c) {
          return (
            c.account_number.toLowerCase().indexOf(q) !== -1 ||
            c.business.toLowerCase().indexOf(q) !== -1 ||
            c.contact.toLowerCase().indexOf(q) !== -1 ||
            c.email.toLowerCase().indexOf(q) !== -1
          );
        })
        .slice(0, 6);
      if (!hits.length) {
        searchResults.innerHTML =
          '<div class="sr-empty">No accounts match "' + esc(q) + '"</div>';
      } else {
        searchResults.innerHTML = hits
          .map(function (c) {
            return (
              '<a href="#/account/' +
              c.id +
              '"><strong>' +
              esc(c.account_number) +
              "</strong> " +
              esc(c.business) +
              '<span>' +
              esc(c.contact) +
              "</span></a>"
            );
          })
          .join("");
      }
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

  /* ======================= Router ======================= */

  function setActiveNav(name) {
    document.querySelectorAll(".side-nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-nav") === name);
    });
  }

  function route() {
    if (!agent) return;
    var hash = location.hash || "#/dashboard";
    var parts = hash.replace(/^#\//, "").split("/");
    var page = parts[0] || "dashboard";
    var id = parts[1];

    viewEl.scrollTop = 0;
    window.scrollTo(0, 0);

    if (page === "dashboard") return viewDashboard();
    if (page === "accounts") return viewAccounts();
    if (page === "account" && id) return viewAccount(id);
    if (page === "tickets") return viewTickets();
    if (page === "ticket" && id) return viewTicket(id);
    if (page === "guides") return viewGuides();
    viewDashboard();
  }

  window.addEventListener("hashchange", route);

  /* ======================= Views ======================= */

  function viewDashboard() {
    setActiveNav("dashboard");
    Promise.all([api.getTickets(), api.getClients(), api.getAllServices()]).then(
      function (res) {
        var tickets = res[0];
        var clients = res[1];
        var services = res[2];

        var open = tickets.filter(function (t) {
          return t.status === "open";
        }).length;
        var urgent = tickets.filter(function (t) {
          return t.priority === "urgent" && t.status !== "resolved";
        }).length;
        var active = clients.filter(function (c) {
          return c.status === "active";
        }).length;
        var inProgress = services.filter(function (s) {
          return s.status === "in_progress";
        }).length;

        var recent = tickets
          .slice()
          .sort(function (a, b) {
            return a.updated_at < b.updated_at ? 1 : -1;
          })
          .slice(0, 6);

        var clientById = {};
        clients.forEach(function (c) {
          clientById[c.id] = c;
        });

        viewEl.innerHTML =
          '<div class="view-head"><div><h1>Welcome back, ' +
          esc(agent.name.split(" ")[0]) +
          '</h1><p class="view-sub">Here is what needs attention today.</p></div></div>' +
          '<div class="stat-grid">' +
          statTile("Open Tickets", open, "blue", icoTicket()) +
          statTile("Urgent", urgent, "red", icoAlert()) +
          statTile("Active Clients", active, "green", icoUsers()) +
          statTile("Services In Progress", inProgress, "purple", icoWrench()) +
          "</div>" +
          '<div class="card"><div class="card-head"><h2>Recent tickets</h2><a class="text-link" href="#/tickets">View all</a></div>' +
          '<table class="data-table"><thead><tr><th>Ticket</th><th>Client</th><th>Subject</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead><tbody>' +
          recent
            .map(function (t) {
              var c = clientById[t.client_id] || {};
              return (
                '<tr class="rowlink" data-href="#/ticket/' +
                t.id +
                '"><td class="mono">' +
                esc(t.id) +
                "</td><td>" +
                esc(c.business || "—") +
                "</td><td>" +
                esc(t.subject) +
                "</td><td>" +
                prioBadge(t.priority) +
                "</td><td>" +
                statusBadge(t.status) +
                "</td><td>" +
                fmtDateTime(t.updated_at) +
                "</td></tr>"
              );
            })
            .join("") +
          "</tbody></table></div>";

        bindRowLinks();
      }
    );
  }

  function statTile(label, value, color, icon) {
    return (
      '<div class="stat-tile"><span class="stat-icon si-' +
      color +
      '">' +
      icon +
      '</span><div><p class="stat-value">' +
      value +
      '</p><p class="stat-label">' +
      esc(label) +
      "</p></div></div>"
    );
  }

  function viewAccounts() {
    setActiveNav("accounts");
    api.getClients().then(function (clients) {
      viewEl.innerHTML =
        '<div class="view-head"><div><h1>Accounts</h1><p class="view-sub">Search by account number, business, contact, or email.</p></div></div>' +
        '<div class="card"><div class="card-head filters">' +
        '<input type="search" id="acct-search" class="input" placeholder="Search accounts...">' +
        '<select id="acct-plan" class="input select"><option value="">All plans</option><option>Self-Managed Hosting</option><option>Managed Hosting</option><option>Website Management</option><option value="None">No plan</option></select>' +
        "</div>" +
        '<table class="data-table"><thead><tr><th>Account</th><th>Business</th><th>Contact</th><th>Plan</th><th>Status</th><th>Client Since</th></tr></thead><tbody id="acct-rows"></tbody></table></div>';

      function render() {
        var q = document.getElementById("acct-search").value.trim().toLowerCase();
        var plan = document.getElementById("acct-plan").value;
        var rows = clients.filter(function (c) {
          var matchQ =
            !q ||
            c.account_number.toLowerCase().indexOf(q) !== -1 ||
            c.business.toLowerCase().indexOf(q) !== -1 ||
            c.contact.toLowerCase().indexOf(q) !== -1 ||
            c.email.toLowerCase().indexOf(q) !== -1;
          var matchP = !plan || c.plan === plan;
          return matchQ && matchP;
        });
        document.getElementById("acct-rows").innerHTML = rows.length
          ? rows
              .map(function (c) {
                return (
                  '<tr class="rowlink" data-href="#/account/' +
                  c.id +
                  '"><td class="mono">' +
                  esc(c.account_number) +
                  "</td><td><strong>" +
                  esc(c.business) +
                  "</strong></td><td>" +
                  esc(c.contact) +
                  "</td><td>" +
                  planBadge(c.plan) +
                  "</td><td>" +
                  statusBadge(c.status) +
                  "</td><td>" +
                  fmtDate(c.client_since) +
                  "</td></tr>"
                );
              })
              .join("")
          : '<tr><td colspan="6" class="empty-cell">No accounts match.</td></tr>';
        bindRowLinks();
      }

      document.getElementById("acct-search").addEventListener("input", render);
      document.getElementById("acct-plan").addEventListener("change", render);
      render();
    });
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

      var completed = services.filter(function (s) {
        return s.status === "completed";
      });
      var inProgress = services.filter(function (s) {
        return s.status === "in_progress" || s.status === "scheduled";
      });
      var subs = services.filter(function (s) {
        return s.type === "subscription";
      });
      var totalSpent = completed.reduce(function (sum, s) {
        return sum + s.price;
      }, 0);
      var pct =
        c.storage_limit > 0
          ? Math.min(100, Math.round((c.storage_used / c.storage_limit) * 100))
          : 0;

      viewEl.innerHTML =
        '<div class="view-head"><div><a class="back-link" href="#/accounts">Back to accounts</a>' +
        "<h1>" +
        esc(c.business) +
        '</h1><p class="view-sub mono">' +
        esc(c.account_number) +
        " · Client since " +
        fmtDate(c.client_since) +
        "</p></div><div>" +
        planBadge(c.plan) +
        " " +
        statusBadge(c.status) +
        "</div></div>" +

        '<div class="two-col">' +

        '<div class="card pad"><h2>Contact</h2><dl class="kv">' +
        "<dt>Name</dt><dd>" + esc(c.contact) + "</dd>" +
        '<dt>Email</dt><dd><a class="text-link" href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a></dd>" +
        "<dt>Phone</dt><dd>" + esc(c.phone) + "</dd>" +
        "</dl></div>" +

        '<div class="card pad"><h2>Plan &amp; Billing</h2><dl class="kv">' +
        "<dt>Plan</dt><dd>" + planBadge(c.plan) + "</dd>" +
        "<dt>Rate</dt><dd>" + (c.monthly ? money(c.monthly) + "/mo" : "—") + "</dd>" +
        "<dt>Term</dt><dd>" + esc(c.term) + "</dd>" +
        "<dt>Renewal</dt><dd>" + fmtDate(c.renewal_date) + "</dd>" +
        "<dt>Lifetime projects</dt><dd>" + money(totalSpent) + "</dd>" +
        "</dl>" +
        (c.storage_limit > 0
          ? '<p class="storage-label">Storage: ' +
            c.storage_used +
            " GB of " +
            c.storage_limit +
            ' GB used</p><div class="progress"><span style="width:' +
            pct +
            '%" class="' +
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

      document.getElementById("save-notes").addEventListener("click", function () {
        api
          .updateClientNotes(c.id, document.getElementById("notes-box").value)
          .then(function () {
            toast("Notes saved");
          });
      });
    });
  }

  function viewTickets() {
    setActiveNav("tickets");
    Promise.all([api.getTickets(), api.getClients()]).then(function (res) {
      var tickets = res[0];
      var clients = res[1];
      var clientById = {};
      clients.forEach(function (c) {
        clientById[c.id] = c;
      });

      viewEl.innerHTML =
        '<div class="view-head"><div><h1>Tickets</h1><p class="view-sub">Client requests from email, phone, and the quote form.</p></div>' +
        '<button class="btn primary" id="new-ticket-btn">New Ticket</button></div>' +
        '<div id="new-ticket-wrap" hidden><div class="card pad new-ticket"><h2>New ticket</h2>' +
        '<div class="form-grid">' +
        '<label>Client<select id="nt-client" class="input select">' +
        clients
          .map(function (c) {
            return '<option value="' + c.id + '">' + esc(c.account_number + " · " + c.business) + "</option>";
          })
          .join("") +
        "</select></label>" +
        '<label>Priority<select id="nt-priority" class="input select"><option>low</option><option selected>normal</option><option>high</option><option>urgent</option></select></label>' +
        '<label class="full">Subject<input id="nt-subject" class="input" type="text" placeholder="Short summary"></label>' +
        '<label class="full">First message<textarea id="nt-body" class="input textarea" placeholder="What did the client ask?"></textarea></label>' +
        "</div>" +
        '<div class="btn-row"><button class="btn primary" id="nt-save">Create Ticket</button><button class="btn ghost" id="nt-cancel">Cancel</button></div></div></div>' +
        '<div class="card"><div class="card-head filters">' +
        '<select id="tk-status" class="input select"><option value="">All statuses</option><option>open</option><option>pending</option><option>resolved</option></select>' +
        '<select id="tk-priority" class="input select"><option value="">All priorities</option><option>urgent</option><option>high</option><option>normal</option><option>low</option></select>' +
        "</div>" +
        '<table class="data-table"><thead><tr><th>Ticket</th><th>Client</th><th>Subject</th><th>Source</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead><tbody id="tk-rows"></tbody></table></div>';

      function render() {
        var st = document.getElementById("tk-status").value;
        var pr = document.getElementById("tk-priority").value;
        var rows = tickets
          .filter(function (t) {
            return (!st || t.status === st) && (!pr || t.priority === pr);
          })
          .sort(function (a, b) {
            return a.updated_at < b.updated_at ? 1 : -1;
          });
        document.getElementById("tk-rows").innerHTML = rows.length
          ? rows
              .map(function (t) {
                var c = clientById[t.client_id] || {};
                return (
                  '<tr class="rowlink" data-href="#/ticket/' + t.id +
                  '"><td class="mono">' + esc(t.id) + "</td><td>" +
                  esc(c.business || "—") + "</td><td>" + esc(t.subject) +
                  "</td><td>" + esc(t.source) + "</td><td>" +
                  prioBadge(t.priority) + "</td><td>" + statusBadge(t.status) +
                  "</td><td>" + fmtDateTime(t.updated_at) + "</td></tr>"
                );
              })
              .join("")
          : '<tr><td colspan="7" class="empty-cell">No tickets match.</td></tr>';
        bindRowLinks();
      }

      document.getElementById("tk-status").addEventListener("change", render);
      document.getElementById("tk-priority").addEventListener("change", render);

      var wrap = document.getElementById("new-ticket-wrap");
      document.getElementById("new-ticket-btn").addEventListener("click", function () {
        wrap.hidden = !wrap.hidden;
      });
      document.getElementById("nt-cancel").addEventListener("click", function () {
        wrap.hidden = true;
      });
      document.getElementById("nt-save").addEventListener("click", function () {
        var subject = document.getElementById("nt-subject").value.trim();
        var body = document.getElementById("nt-body").value.trim();
        if (!subject) {
          toast("Add a subject first");
          return;
        }
        var clientId = document.getElementById("nt-client").value;
        api
          .createTicket({
            client_id: isNaN(Number(clientId)) ? clientId : Number(clientId),
            subject: subject,
            priority: document.getElementById("nt-priority").value,
            assignee: agent.name
          })
          .then(function (t) {
            if (body) return api.addMessage(t.id, agent.name, body).then(function(){ return t; });
            return t;
          })
          .then(function (t) {
            toast("Ticket " + t.id + " created");
            location.hash = "#/ticket/" + t.id;
          });
      });

      render();
    });
  }

  function viewTicket(id) {
    setActiveNav("tickets");
    Promise.all([api.getTicket(id), api.getMessages(id)]).then(function (res) {
      var t = res[0];
      var messages = res[1];
      if (!t) {
        viewEl.innerHTML = '<div class="card pad"><p>Ticket not found.</p></div>';
        return;
      }
      api.getClient(t.client_id).then(function (c) {
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
              return (
                '<div class="msg ' + (m.direction === "outbound" ? "out" : "in") + '">' +
                '<div class="msg-meta">' + esc(m.author) +
                (m.direction === "outbound" ? ' <span class="msg-tag">Agent</span>' : "") +
                " · " + fmtDateTime(m.sent_at) + "</div>" +
                '<div class="msg-body">' + esc(m.body) + "</div></div>"
              );
            })
            .join("") +
          "</div>" +
          '<div class="reply-box"><textarea id="reply-body" class="input textarea" placeholder="Write a reply to ' +
          esc(c ? c.contact : "the client") + '..."></textarea>' +
          '<div class="btn-row"><button class="btn primary" id="send-reply">Send Reply</button>' +
          '<span class="hint">Saved to the thread and queued for email delivery.</span></div></div></div>' +

          '<div class="card pad ticket-side"><h2>Ticket details</h2>' +
          '<label class="side-field">Status<select id="tk-set-status" class="input select">' +
          ["open", "pending", "resolved"]
            .map(function (s) {
              return '<option' + (t.status === s ? " selected" : "") + ">" + s + "</option>";
            })
            .join("") +
          "</select></label>" +
          '<label class="side-field">Priority<select id="tk-set-priority" class="input select">' +
          ["low", "normal", "high", "urgent"]
            .map(function (p) {
              return '<option' + (t.priority === p ? " selected" : "") + ">" + p + "</option>";
            })
            .join("") +
          "</select></label>" +
          '<label class="side-field">Assignee<select id="tk-set-assignee" class="input select">' +
          ["Unassigned", agent.name]
            .filter(function (v, i, a) { return a.indexOf(v) === i; })
            .map(function (n) {
              return '<option' + (t.assignee === n ? " selected" : "") + ">" + esc(n) + "</option>";
            })
            .join("") +
          "</select></label>" +
          '<button class="btn ghost full-w" id="tk-save">Update Ticket</button>' +
          (c
            ? '<a class="btn ghost full-w" href="mailto:' + esc(c.email) + "?subject=Re: " +
              encodeURIComponent(t.subject) + '">Open in Email App</a>'
            : "") +
          "</div></div>";

        document.getElementById("send-reply").addEventListener("click", function () {
          var body = document.getElementById("reply-body").value.trim();
          if (!body) {
            toast("Write a reply first");
            return;
          }
          api.addMessage(t.id, agent.name, body).then(function () {
            toast("Reply saved and queued for email");
            viewTicket(id);
          });
        });

        document.getElementById("tk-save").addEventListener("click", function () {
          api
            .updateTicket(t.id, {
              status: document.getElementById("tk-set-status").value,
              priority: document.getElementById("tk-set-priority").value,
              assignee: document.getElementById("tk-set-assignee").value
            })
            .then(function () {
              toast("Ticket updated");
              viewTicket(id);
            });
        });
      });
    });
  }

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
                "</span></div></summary><ol class="+'"guide-steps"'+">" +
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

  function icoTicket() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2M13 17v2M13 11v2"/></svg>';
  }
  function icoAlert() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
  }
  function icoUsers() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  }
  function icoWrench() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-2.4z"/></svg>';
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
