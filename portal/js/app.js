/* Velocube Client Portal — app shell, router, and views */
(function () {
  "use strict";

  var api = window.VeloClientAPI;
  var me = null;              // client record from the client_self view
  var session = null;

  var loginEl = document.getElementById("login-screen");
  var unlinkedEl = document.getElementById("unlinked-screen");
  var appEl = document.getElementById("app");
  var viewEl = document.getElementById("view");
  var sidebarEl = document.getElementById("sidebar");

  /* ======================= Helpers ======================= */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function fmtDateTime(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      ", " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  }

  function relTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    var mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.round(hrs / 24);
    if (days < 30) return days + "d ago";
    return fmtDate(iso);
  }

  function daysUntil(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d)) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86400000);
  }

  function money(n) {
    return "$" + Number(n || 0).toLocaleString();
  }

  function initials(name) {
    return String(name || "?")
      .split(/\s+/)
      .slice(0, 2)
      .map(function (w) { return w[0] || ""; })
      .join("")
      .toUpperCase();
  }

  function firstName(name) {
    return String(name || "").split(/\s+/)[0] || "there";
  }

  function statusBadge(s) {
    var map = {
      open: ["Open", "b-blue"],
      pending: ["Awaiting you", "b-amber"],
      resolved: ["Resolved", "b-green"],
      active: ["Active", "b-green"],
      in_progress: ["In progress", "b-blue"],
      scheduled: ["Scheduled", "b-gray"],
      completed: ["Delivered", "b-green"],
      paused: ["Paused", "b-gray"],
      past_due: ["Past due", "b-red"],
      prospect: ["Prospect", "b-purple"],
      requested: ["Requested", "b-amber"],
      approved: ["Approved", "b-blue"],
      live: ["Live", "b-green"],
      building: ["Building", "b-amber"]
    };
    var m = map[s] || [String(s || "").replace(/_/g, " "), "b-gray"];
    return '<span class="badge ' + m[1] + '">' + esc(m[0]) + "</span>";
  }

  function toast(msg, kind) {
    var t = document.createElement("div");
    t.className = "toast" + (kind ? " " + kind : "");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add("show"); }, 10);
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { t.remove(); }, 300);
    }, 3400);
  }

  /* Never let a rejected promise fail silently — that was the top bug in
     the staff panel: a dead-looking button with no explanation. */
  function apiFail(e) {
    var msg = (e && (e.message || e.error_description || e.details)) || "Unknown error";
    toast("Something went wrong: " + msg, "warn");
    if (window.console) console.error(e);
  }

  function renderViewError(e) {
    var msg = (e && (e.message || e.error_description || e.details)) || "Unknown error";
    if (window.console) console.error(e);
    viewEl.innerHTML =
      '<div class="card"><div class="empty-state"><span class="es-icon">' + icoAlert() +
      "</span><h3>This page could not load</h3><p>" + esc(msg) +
      '</p><button class="btn primary" id="ve-retry" type="button">Try Again</button></div></div>';
    var r = document.getElementById("ve-retry");
    if (r) r.addEventListener("click", route);
  }

  function emptyState(icon, title, body, actionHtml) {
    return (
      '<div class="empty-state"><span class="es-icon">' + icon + "</span><h3>" +
      esc(title) + "</h3><p>" + esc(body) + "</p>" + (actionHtml || "") + "</div>"
    );
  }

  /* -------- Modal -------- */

  function openModal(title, bodyHtml, onMount, wide) {
    closeModal();
    var wrap = document.createElement("div");
    wrap.className = "modal-wrap";
    wrap.id = "modal";
    wrap.innerHTML =
      '<div class="modal-card"' + (wide ? ' style="max-width:46rem;"' : "") +
      '><div class="modal-head"><h2>' + esc(title) +
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

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  /* ======================= Auth ======================= */

  function showLogin() {
    loginEl.hidden = false;
    unlinkedEl.hidden = true;
    appEl.hidden = true;
  }

  function showUnlinked() {
    loginEl.hidden = true;
    unlinkedEl.hidden = false;
    appEl.hidden = true;
  }

  function showApp() {
    loginEl.hidden = true;
    unlinkedEl.hidden = true;
    appEl.hidden = false;
    document.getElementById("client-name").textContent = me.contact || me.business;
    document.getElementById("client-meta").textContent = me.business || me.account_number;
    document.getElementById("client-avatar").textContent = initials(me.business || me.contact);
    refreshBadges();
    route();
  }

  function boot() {
    if (!api.ready) {
      loginEl.hidden = false;
      document.getElementById("login-error").textContent =
        "Portal is not configured yet. Add Supabase credentials to portal/js/config.js.";
      return;
    }
    api.getSession().then(function (s) {
      if (!s) {
        showLogin();
        return;
      }
      session = s;
      return api.getMe(true).then(function (client) {
        me = client;
        if (!me) {
          showUnlinked();
          return;
        }
        if (!location.hash) location.hash = "#/";
        showApp();
      });
    }).catch(function (e) {
      showLogin();
      document.getElementById("login-error").textContent =
        (e && e.message) || "Could not reach the server.";
    });
  }

  document.getElementById("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = document.getElementById("login-submit");
    var err = document.getElementById("login-error");
    err.textContent = "";
    btn.disabled = true;
    api
      .signIn(val("login-email"), document.getElementById("login-password").value)
      .then(function (user) {
        session = user;
        return api.getMe(true);
      })
      .then(function (client) {
        me = client;
        btn.disabled = false;
        if (!me) {
          showUnlinked();
          return;
        }
        location.hash = "#/";
        showApp();
      })
      .catch(function (ex) {
        btn.disabled = false;
        err.textContent = (ex && ex.message) || "Sign in failed.";
      });
  });

  document.getElementById("logout-btn").addEventListener("click", function () {
    api.signOut().then(function () {
      me = null;
      session = null;
      location.hash = "";
      showLogin();
    });
  });

  document.getElementById("unlinked-logout").addEventListener("click", function () {
    api.signOut().then(function () {
      me = null;
      showLogin();
    });
  });

  /* Mobile nav */
  document.getElementById("menu-toggle").addEventListener("click", function () {
    sidebarEl.classList.toggle("open");
  });

  document.addEventListener("click", function (e) {
    if (
      sidebarEl.classList.contains("open") &&
      !e.target.closest(".sidebar") &&
      !e.target.closest("#menu-toggle")
    ) {
      sidebarEl.classList.remove("open");
    }
  });

  /* ======================= Badges ======================= */

  function refreshBadges() {
    Promise.all([api.getMyTickets(), api.getDocuments()])
      .then(function (res) {
        var openTickets = res[0].filter(function (t) { return t.status !== "resolved"; }).length;
        var unsigned = res[1].filter(function (d) {
          return d.requires_signature && !d.signed_at;
        }).length;

        setBadge("nav-msg-count", openTickets);
        setBadge("nav-doc-count", unsigned);
        setBadge("nav-todo-count", unsigned + (openTickets ? 0 : 0));
      })
      .catch(function () { /* badges are cosmetic; never block the UI */ });
  }

  function setBadge(id, n) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = n;
    el.hidden = !n;
  }

  /* ======================= Router ======================= */

  var TITLES = {
    home: "Home",
    project: "My Project",
    messages: "Messages",
    preview: "Live Preview",
    documents: "Documents",
    addons: "Add-ons",
    hosting: "Hosting",
    account: "Account"
  };

  function setActiveNav(name) {
    document.querySelectorAll(".side-nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-nav") === name);
    });
    var t = document.getElementById("topbar-title");
    if (t) t.textContent = TITLES[name] || "Portal";
    sidebarEl.classList.remove("open");
  }

  function route() {
    if (!me) return;
    closeModal();
    var parts = (location.hash || "#/").replace(/^#\/?/, "").split("/");
    var page = parts[0] || "home";
    var id = parts[1];

    window.scrollTo(0, 0);

    if (page === "" || page === "home") return viewHome();
    if (page === "project") return viewProject();
    if (page === "messages") return viewMessages(id);
    if (page === "preview") return viewPreview();
    if (page === "documents") return viewDocuments(id);
    if (page === "addons") return viewAddons();
    if (page === "hosting") return viewHosting();
    if (page === "account") return viewAccount();
    viewHome();
  }

  window.addEventListener("hashchange", route);

  /* ======================= Project phases ======================= */

  var PHASES = ["Discovery", "Design", "Build", "Review", "Launch"];

  /* Derives a phase from service progress so the tracker reflects real
     data rather than a hard-coded stage. */
  function derivePhase(services) {
    var active = services.filter(function (s) { return s.type === "project"; });
    if (!active.length) return { index: 0, pct: 0 };
    var allDone = active.every(function (s) { return s.status === "completed"; });
    if (allDone) return { index: 4, pct: 100 };
    var avg = Math.round(
      active.reduce(function (sum, s) {
        return sum + (s.status === "completed" ? 100 : Number(s.progress || 0));
      }, 0) / active.length
    );
    var idx = avg >= 90 ? 4 : avg >= 70 ? 3 : avg >= 35 ? 2 : avg >= 15 ? 1 : 0;
    return { index: idx, pct: avg };
  }

  function phaseTrack(phaseIdx) {
    return (
      '<div class="phase-track">' +
      PHASES.map(function (p, i) {
        var cls = i < phaseIdx ? "done" : i === phaseIdx ? "current" : "";
        return (
          '<div class="phase ' + cls + '"><span class="ph-dot">' +
          (i < phaseIdx ? "&#10003;" : i + 1) +
          '</span><span class="ph-label">' + esc(p) + "</span></div>"
        );
      }).join("") +
      "</div>"
    );
  }

  /* ======================= Home ======================= */

  function viewHome() {
    setActiveNav("home");
    Promise.all([
      api.getMyServices(),
      api.getUpdates(4),
      api.getMyTickets(),
      api.getDocuments(),
      api.getAnnouncements(),
      api.getStagingSites()
    ])
      .then(function (res) {
        var services = res[0];
        var updates = res[1];
        var tickets = res[2];
        var docs = res[3];
        var news = res[4];
        var staging = res[5];

        var phase = derivePhase(services);
        var openTickets = tickets.filter(function (t) { return t.status !== "resolved"; });
        var unsigned = docs.filter(function (d) { return d.requires_signature && !d.signed_at; });
        var awaitingYou = tickets.filter(function (t) { return t.status === "pending"; });
        var renewalDays = daysUntil(me.renewal_date);
        var lastUpdate = updates[0];

        /* Notification hub: only things the client can actually act on. */
        var todos = [];
        unsigned.forEach(function (d) {
          todos.push({
            icon: icoPen(), cls: "ti-orange",
            title: "Sign " + d.title,
            sub: "Waiting on your signature",
            href: "#/documents/" + d.id, cta: "Review & sign"
          });
        });
        awaitingYou.forEach(function (t) {
          todos.push({
            icon: icoChat(), cls: "ti-blue",
            title: t.subject,
            sub: "The team is waiting on your reply",
            href: "#/messages/" + t.id, cta: "Reply"
          });
        });
        if (renewalDays !== null && renewalDays <= 30 && me.plan && me.plan !== "None") {
          todos.push({
            icon: icoRepeat(), cls: renewalDays <= 7 ? "ti-red" : "ti-amber",
            title: me.plan + " renews " + (renewalDays <= 0 ? "now" : "in " + renewalDays + " days"),
            sub: "Renews " + fmtDate(me.renewal_date),
            href: "#/hosting", cta: "View plan"
          });
        }
        if (me.storage_limit > 0 && me.storage_used / me.storage_limit >= 0.8) {
          todos.push({
            icon: icoDrive(), cls: "ti-amber",
            title: "Storage is almost full",
            sub: me.storage_used + " GB of " + me.storage_limit + " GB used",
            href: "#/hosting", cta: "Manage"
          });
        }

        var live = staging[0];

        viewEl.innerHTML =
          '<div class="hero-card"><h1>Welcome back, <span class="accent">' +
          esc(firstName(me.contact)) + "</span></h1>" +
          '<p class="hero-sub">' +
          (todos.length
            ? "You have " + todos.length + " item" + (todos.length === 1 ? "" : "s") + " that need your attention."
            : "Everything is on track. Nothing needs your attention right now.") +
          "</p>" +
          '<div class="hero-stats">' +
          heroStat(phase.pct + "%", "Project complete") +
          heroStat(PHASES[phase.index], "Current phase") +
          heroStat(openTickets.length, "Open requests") +
          heroStat(lastUpdate ? relTime(lastUpdate.created_at) : "—", "Last update") +
          "</div>" +
          phaseTrack(phase.index) +
          "</div>" +

          '<div class="dash-grid"><div class="dash-col">' +

          /* Notification hub */
          '<div class="card"><div class="card-head"><h2>Needs your attention</h2>' +
          (todos.length ? '<span class="badge b-orange">' + todos.length + "</span>" : "") +
          "</div>" +
          (todos.length
            ? '<ul class="todo-list">' +
              todos.map(function (t) {
                return (
                  '<li><span class="todo-icon ' + t.cls + '">' + t.icon + "</span>" +
                  '<span class="todo-body"><strong>' + esc(t.title) + "</strong><span>" +
                  esc(t.sub) + "</span></span>" +
                  '<a class="btn ghost sm" href="' + t.href + '">' + esc(t.cta) + "</a></li>"
                );
              }).join("") +
              "</ul>"
            : emptyState(icoCheck(), "You're all caught up", "When something needs your input, it will show up here first.")) +
          "</div>" +

          /* Dev team updates */
          '<div class="card"><div class="card-head"><h2>Updates from the team</h2>' +
          '<a class="text-link" href="#/project">See all</a></div>' +
          (updates.length
            ? '<ul class="update-feed">' +
              updates.map(updateItem).join("") +
              "</ul>"
            : emptyState(icoMega(), "No updates yet", "As soon as our team logs progress on your project, it will appear here.")) +
          "</div>" +

          "</div><div class=\"dash-col\">" +

          /* Live preview mini */
          '<div class="card pad"><div class="card-head bare"><h2>Live preview</h2>' +
          (live ? '<a class="text-link" href="#/preview">Open</a>' : "") + "</div>" +
          (live
            ? '<div class="preview-mini">' + esc(live.url.replace(/^https?:\/\//, "")) + "</div>" +
              '<p class="hint" style="margin-top:0.75rem;">Last deployed ' + relTime(live.last_deploy) + "</p>"
            : '<p class="hint">Your staging site will appear here once the build starts.</p>') +
          "</div>" +

          /* News board */
          '<div class="card"><div class="card-head"><h2>News board</h2></div>' +
          (news.length
            ? '<ul class="news-list">' +
              news.slice(0, 4).map(function (n) {
                return (
                  "<li><h3>" + (n.pinned ? '<span class="badge b-orange">Pinned</span>' : "") +
                  esc(n.title) + "</h3><p>" + esc(n.body) + "</p><time>" +
                  fmtDate(n.created_at) + "</time></li>"
                );
              }).join("") +
              "</ul>"
            : '<p class="hint" style="padding:1.25rem 1.5rem;">No announcements right now.</p>') +
          "</div>" +

          /* Quick actions */
          '<div class="card pad"><div class="card-head bare"><h2>Quick actions</h2></div>' +
          '<div class="btn-row" style="margin-top:0;">' +
          '<a class="btn primary sm" href="#/messages">Message the team</a>' +
          '<a class="btn ghost sm" href="#/addons">Browse add-ons</a>' +
          "</div></div>" +

          "</div></div>";
      })
      .catch(renderViewError);
  }

  function heroStat(value, label) {
    return (
      '<div class="hero-stat"><p class="hs-value">' + esc(String(value)) +
      '</p><p class="hs-label">' + esc(label) + "</p></div>"
    );
  }

  function updateItem(u) {
    var kindMap = {
      milestone: ["Milestone", "b-green"],
      blocker: ["Needs attention", "b-red"],
      progress: ["Progress", "b-blue"]
    };
    var k = kindMap[u.kind] || ["Update", "b-gray"];
    return (
      '<li><div class="update-meta"><span class="badge ' + k[1] + '">' + esc(k[0]) +
      "</span><time>" + fmtDateTime(u.created_at) + "</time></div>" +
      "<h3>" + esc(u.title) + "</h3>" +
      (u.body ? "<p>" + esc(u.body) + "</p>" : "") +
      '<p class="hint" style="margin-top:0.4rem;">' + esc(u.posted_by) + "</p></li>"
    );
  }

  /* ======================= Project ======================= */

  function viewProject() {
    setActiveNav("project");
    Promise.all([api.getMyServices(), api.getUpdates()])
      .then(function (res) {
        var services = res[0];
        var updates = res[1];
        var phase = derivePhase(services);
        var projects = services.filter(function (s) { return s.type === "project"; });

        viewEl.innerHTML =
          '<div class="view-head"><div><h1>My Project</h1>' +
          '<p class="view-sub">Everything we are building for ' + esc(me.business) + ".</p></div>" +
          '<a class="btn ghost" href="#/messages">Ask a question</a></div>' +

          '<div class="card pad"><div class="card-head bare"><h2>Overall progress</h2>' +
          '<span class="badge b-orange">' + phase.pct + "%</span></div>" +
          '<div class="progress"><span style="width:' + phase.pct + '%"></span></div>' +
          phaseTrack(phase.index) + "</div>" +

          '<div class="card"><div class="card-head"><h2>Deliverables</h2></div>' +
          (services.length
            ? '<table class="data-table"><thead><tr><th>Service</th><th>Type</th><th>Status</th><th>Progress</th><th>Started</th><th>Delivered</th></tr></thead><tbody>' +
              services.map(function (s) {
                var pct = s.status === "completed" ? 100 : Number(s.progress || 0);
                return (
                  "<tr><td><strong>" + esc(s.name) + "</strong></td><td>" + esc(s.type) +
                  "</td><td>" + statusBadge(s.status) + "</td><td>" +
                  '<div class="progress slim" style="width:6rem;"><span style="width:' + pct +
                  '%"></span></div></td><td>' + fmtDate(s.started) + "</td><td>" +
                  fmtDate(s.delivered) + "</td></tr>"
                );
              }).join("") +
              "</tbody></table>"
            : emptyState(icoCheck(), "No services yet", "Once your project is scoped, each deliverable will be tracked here.")) +
          "</div>" +

          '<div class="card"><div class="card-head"><h2>Update history</h2>' +
          '<select id="upd-filter" class="input" style="max-width:12rem;">' +
          '<option value="">All updates</option><option value="milestone">Milestones</option>' +
          '<option value="progress">Progress</option><option value="blocker">Blockers</option>' +
          "</select></div>" +
          '<div id="upd-list"></div></div>';

        function renderUpdates() {
          var f = document.getElementById("upd-filter").value;
          var rows = f ? updates.filter(function (u) { return u.kind === f; }) : updates;
          document.getElementById("upd-list").innerHTML = rows.length
            ? '<ul class="update-feed">' + rows.map(updateItem).join("") + "</ul>"
            : emptyState(icoMega(), "Nothing here yet", "No updates match this filter.");
        }

        document.getElementById("upd-filter").addEventListener("change", renderUpdates);
        renderUpdates();

        if (projects.length === 0 && services.length === 0) {
          // nothing extra; empty states already cover it
        }
      })
      .catch(renderViewError);
  }

  /* ======================= Messages ======================= */

  function viewMessages(activeId) {
    setActiveNav("messages");
    api
      .getMyTickets()
      .then(function (tickets) {
        if (!tickets.length) {
          viewEl.innerHTML =
            '<div class="view-head"><div><h1>Messages</h1>' +
            '<p class="view-sub">Talk directly with the team building your site.</p></div>' +
            '<button class="btn primary" id="new-msg">New Message</button></div>' +
            '<div class="card">' +
            emptyState(
              icoChat(),
              "No conversations yet",
              "Send us a question, a change request, or anything else — we reply within one business day.",
              '<button class="btn primary" id="new-msg-empty" type="button">Start a conversation</button>'
            ) +
            "</div>";
          bindNewMessage();
          return;
        }

        var current = activeId
          ? tickets.find(function (t) { return t.id === activeId; }) || tickets[0]
          : tickets[0];

        viewEl.innerHTML =
          '<div class="view-head"><div><h1>Messages</h1>' +
          '<p class="view-sub">Talk directly with the team building your site.</p></div>' +
          '<button class="btn primary" id="new-msg">New Message</button></div>' +
          '<div class="msg-layout">' +
          '<div class="card"><div class="card-head"><h2>Conversations</h2></div>' +
          '<ul class="thread-list">' +
          tickets.map(function (t) {
            return (
              '<li><button type="button" data-ticket="' + esc(t.id) + '"' +
              (t.id === current.id ? ' class="active"' : "") + ">" +
              "<strong>" + esc(t.subject) + "</strong>" +
              '<span class="tl-meta">' + statusBadge(t.status) +
              "<span>" + relTime(t.updated_at) + "</span></span></button></li>"
            );
          }).join("") +
          "</ul></div>" +
          '<div class="card" id="thread-card"></div></div>';

        bindNewMessage();

        viewEl.querySelectorAll("[data-ticket]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            location.hash = "#/messages/" + btn.getAttribute("data-ticket");
          });
        });

        renderThread(current);
      })
      .catch(renderViewError);
  }

  function renderThread(ticket) {
    var card = document.getElementById("thread-card");
    if (!card) return;
    card.innerHTML = '<div class="card-head"><h2>' + esc(ticket.subject) + "</h2>" +
      statusBadge(ticket.status) + '</div><div class="thread" id="thread"><p class="hint">Loading…</p></div>';

    api
      .getTicketMessages(ticket.id)
      .then(function (messages) {
        var threadEl = document.getElementById("thread");
        if (!threadEl) return;
        threadEl.innerHTML = messages.length
          ? messages.map(function (m) {
              // inbound = sent by the client; outbound = from the Velocube team
              var mine = m.direction === "inbound";
              return (
                '<div class="msg ' + (mine ? "mine" : "team") + '">' +
                '<div class="msg-meta">' + esc(mine ? "You" : m.author) + " · " +
                fmtDateTime(m.sent_at) + "</div>" +
                '<div class="msg-body">' + esc(m.body) + "</div></div>"
              );
            }).join("")
          : '<p class="hint">No messages in this conversation yet.</p>';
        threadEl.scrollTop = threadEl.scrollHeight;

        card.insertAdjacentHTML(
          "beforeend",
          '<div class="reply-box"><textarea id="reply-body" class="input textarea" placeholder="Write a reply…"></textarea>' +
          '<div class="btn-row"><button class="btn primary" id="send-reply" type="button">Send Reply</button>' +
          '<span class="hint">Our team is notified right away.</span></div></div>'
        );

        document.getElementById("send-reply").addEventListener("click", function () {
          var btn = this;
          var body = val("reply-body");
          if (!body) {
            toast("Write a message first", "warn");
            return;
          }
          btn.disabled = true;
          api
            .replyToTicket(ticket.id, me.contact || me.business, body)
            .then(function () {
              toast("Message sent");
              renderThread(ticket);
              refreshBadges();
            })
            .catch(function (e) {
              btn.disabled = false;
              apiFail(e);
            });
        });
      })
      .catch(function (e) {
        var threadEl = document.getElementById("thread");
        if (threadEl) threadEl.innerHTML = '<p class="hint">Could not load this conversation.</p>';
        apiFail(e);
      });
  }

  function bindNewMessage() {
    ["new-msg", "new-msg-empty"].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener("click", newMessageModal);
    });
  }

  function newMessageModal() {
    openModal(
      "New message",
      '<div class="form-grid">' +
        '<label class="full">Subject<input id="nm-subject" class="input" type="text" placeholder="What is this about?"></label>' +
        '<label>Priority<select id="nm-priority" class="input"><option value="low">Low</option><option value="normal" selected>Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>' +
        '<label class="full">Message<textarea id="nm-body" class="input textarea" placeholder="Tell us what you need…"></textarea></label>' +
        "</div>" +
        '<div class="btn-row"><button class="btn primary" id="nm-send" type="button">Send Message</button>' +
        '<button class="btn ghost" id="nm-cancel" type="button">Cancel</button></div>',
      function (wrap) {
        wrap.querySelector("#nm-cancel").addEventListener("click", closeModal);
        wrap.querySelector("#nm-send").addEventListener("click", function () {
          var btn = this;
          var subject = val("nm-subject");
          var body = val("nm-body");
          if (!subject || !body) {
            toast("Add a subject and a message", "warn");
            return;
          }
          btn.disabled = true;
          api
            .createTicket(me.id, subject, body, me.contact || me.business, val("nm-priority"))
            .then(function (t) {
              toast("Message sent — we'll reply shortly");
              closeModal();
              refreshBadges();
              location.hash = "#/messages/" + t.id;
              route();
            })
            .catch(function (e) {
              btn.disabled = false;
              apiFail(e);
            });
        });
      }
    );
  }

  /* ======================= Live preview ======================= */

  function viewPreview() {
    setActiveNav("preview");
    api
      .getStagingSites()
      .then(function (sites) {
        if (!sites.length) {
          viewEl.innerHTML =
            '<div class="view-head"><div><h1>Live Preview</h1>' +
            '<p class="view-sub">See your site as we build it.</p></div></div>' +
            '<div class="card">' +
            emptyState(
              icoMonitor(),
              "No preview available yet",
              "Once development starts, a live staging link appears here so you can watch your site come together."
            ) +
            "</div>";
          return;
        }

        var site = sites[0];
        viewEl.innerHTML =
          '<div class="view-head"><div><h1>Live Preview</h1>' +
          '<p class="view-sub">This is your staging site — changes appear here before going live.</p></div>' +
          '<a class="btn primary" href="' + esc(site.url) + '" target="_blank" rel="noopener">Open in new tab</a></div>' +
          '<div class="card"><div class="preview-toolbar">' +
          '<button class="width-btn active" type="button" data-w="100%">Desktop</button>' +
          '<button class="width-btn" type="button" data-w="48rem">Tablet</button>' +
          '<button class="width-btn" type="button" data-w="23rem">Mobile</button>' +
          '<span class="hint" style="margin-left:auto;">' + statusBadge(site.status) +
          " Last deployed " + relTime(site.last_deploy) + "</span></div>" +
          '<div class="preview-stage"><iframe class="preview-frame" id="preview-frame" src="' +
          esc(site.url) + '" title="Staging preview" loading="lazy" ' +
          'sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe></div></div>' +
          '<p class="hint">Some sites block being shown inside a frame. If the preview stays blank, use “Open in new tab”.</p>';

        viewEl.querySelectorAll(".width-btn").forEach(function (b) {
          b.addEventListener("click", function () {
            viewEl.querySelectorAll(".width-btn").forEach(function (x) {
              x.classList.toggle("active", x === b);
            });
            document.getElementById("preview-frame").style.maxWidth = b.getAttribute("data-w");
          });
        });
      })
      .catch(renderViewError);
  }

  /* ======================= Documents ======================= */

  function viewDocuments(openId) {
    setActiveNav("documents");
    api
      .getDocuments()
      .then(function (docs) {
        viewEl.innerHTML =
          '<div class="view-head"><div><h1>Documents</h1>' +
          '<p class="view-sub">Agreements, proposals, and invoices for your project.</p></div></div>' +
          '<div class="card">' +
          (docs.length
            ? '<ul class="doc-list">' +
              docs.map(function (d) {
                var signed = !!d.signed_at;
                var needs = d.requires_signature && !signed;
                return (
                  '<li><span class="doc-icon">' + icoDoc() + "</span>" +
                  '<span class="doc-body"><strong>' + esc(d.title) + "</strong><span>" +
                  esc(d.kind) + " · " + fmtDate(d.created_at) +
                  (signed ? " · Signed " + fmtDate(d.signed_at) : "") + "</span></span>" +
                  (needs
                    ? '<span class="badge b-amber">Needs signature</span>'
                    : signed
                      ? '<span class="badge b-green">Signed</span>'
                      : '<span class="badge b-gray">Reference</span>') +
                  '<button class="btn ' + (needs ? "primary" : "ghost") +
                  ' sm" type="button" data-doc="' + d.id + '">' +
                  (needs ? "Review & sign" : "View") + "</button></li>"
                );
              }).join("") +
              "</ul>"
            : emptyState(icoDoc(), "No documents yet", "Agreements and proposals we send you will be collected here.")) +
          "</div>";

        viewEl.querySelectorAll("[data-doc]").forEach(function (b) {
          b.addEventListener("click", function () {
            var d = docs.find(function (x) { return String(x.id) === b.getAttribute("data-doc"); });
            if (d) documentModal(d);
          });
        });

        if (openId) {
          var target = docs.find(function (x) { return String(x.id) === String(openId); });
          if (target) documentModal(target);
        }
      })
      .catch(renderViewError);
  }

  function documentModal(doc) {
    var signed = !!doc.signed_at;
    var needs = doc.requires_signature && !signed;

    openModal(
      doc.title,
      (needs
        ? '<div class="demo-notice">' + icoAlert() +
          "<span><strong>Demo signing.</strong> This is a product demonstration. " +
          "Signing here records your name and the date for the demo, but does not " +
          "create a legally binding signature.</span></div>"
        : "") +
        '<div class="doc-reader">' + esc(doc.body_md || "No content provided.") + "</div>" +
        (signed
          ? '<p class="hint" style="margin-top:1rem;">Signed by ' + esc(doc.signed_name) +
            " on " + fmtDateTime(doc.signed_at) + ".</p>"
          : needs
            ? '<div style="margin-top:1.25rem;">' +
              '<div class="sign-tabs"><button class="sign-tab active" type="button" data-mode="type">Type signature</button>' +
              '<button class="sign-tab" type="button" data-mode="draw">Draw signature</button></div>' +
              '<div id="sign-type"><label style="font-size:0.75rem;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--ink-2);">Full legal name' +
              '<input id="sign-name" class="input" type="text" placeholder="Your full name" style="margin-top:0.35rem;"></label>' +
              '<div class="typed-sign" id="typed-preview" aria-live="polite"></div></div>' +
              '<div id="sign-draw" hidden><canvas class="sign-pad" id="sign-pad" width="600" height="180"></canvas>' +
              '<div class="btn-row"><button class="btn ghost sm" type="button" id="clear-pad">Clear</button></div></div>' +
              '<div class="btn-row"><button class="btn primary" id="do-sign" type="button">Sign document</button>' +
              '<button class="btn ghost" id="close-doc" type="button">Close</button></div></div>'
            : '<div class="btn-row"><button class="btn ghost" id="close-doc" type="button">Close</button></div>'),
      function (wrap) {
        var closeBtn = wrap.querySelector("#close-doc");
        if (closeBtn) closeBtn.addEventListener("click", closeModal);
        if (!needs) return;

        var mode = "type";
        var nameInput = wrap.querySelector("#sign-name");
        var preview = wrap.querySelector("#typed-preview");

        nameInput.addEventListener("input", function () {
          preview.textContent = nameInput.value;
        });

        wrap.querySelectorAll(".sign-tab").forEach(function (tab) {
          tab.addEventListener("click", function () {
            mode = tab.getAttribute("data-mode");
            wrap.querySelectorAll(".sign-tab").forEach(function (t) {
              t.classList.toggle("active", t === tab);
            });
            wrap.querySelector("#sign-type").hidden = mode !== "type";
            wrap.querySelector("#sign-draw").hidden = mode !== "draw";
          });
        });

        /* Draw pad */
        var canvas = wrap.querySelector("#sign-pad");
        var ctx = canvas.getContext("2d");
        var drawing = false;
        var hasDrawn = false;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#14120f";

        function pos(e) {
          var r = canvas.getBoundingClientRect();
          var cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
          var cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
          return { x: cx * (canvas.width / r.width), y: cy * (canvas.height / r.height) };
        }
        function start(e) {
          e.preventDefault();
          drawing = true;
          hasDrawn = true;
          var p = pos(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }
        function move(e) {
          if (!drawing) return;
          e.preventDefault();
          var p = pos(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        function end() { drawing = false; }

        canvas.addEventListener("mousedown", start);
        canvas.addEventListener("mousemove", move);
        window.addEventListener("mouseup", end);
        canvas.addEventListener("touchstart", start, { passive: false });
        canvas.addEventListener("touchmove", move, { passive: false });
        canvas.addEventListener("touchend", end);

        wrap.querySelector("#clear-pad").addEventListener("click", function () {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          hasDrawn = false;
        });

        wrap.querySelector("#do-sign").addEventListener("click", function () {
          var btn = this;
          var name = nameInput.value.trim();
          if (!name) {
            toast("Enter your full legal name to sign", "warn");
            return;
          }
          if (mode === "draw" && !hasDrawn) {
            toast("Draw your signature first", "warn");
            return;
          }
          var sigData = mode === "draw" ? canvas.toDataURL("image/png") : null;
          btn.disabled = true;
          api
            .signDocument(doc.id, name, sigData)
            .then(function () {
              toast("Document signed");
              closeModal();
              refreshBadges();
              viewDocuments();
            })
            .catch(function (e) {
              btn.disabled = false;
              apiFail(e);
            });
        });
      },
      true
    );
  }

  /* ======================= Add-ons ======================= */

  /* Prices mirror pricing.html so the portal never contradicts the site. */
  var ADDONS = [
    { key: "extra-page", label: "Extra Page", price: 250, unit: "per page", icon: icoDoc(),
      desc: "A new custom page built to match your existing design — landing pages, service pages, anything." },
    { key: "seo-bundle", label: "SEO Bundle", price: 2400, unit: "one-time", icon: icoTrend(),
      desc: "Full technical and on-page audit, keyword research, schema markup, and three months of reports." },
    { key: "ai-chatbot", label: "AI Chatbot", price: 900, unit: "one-time", icon: icoSpark(),
      desc: "A chatbot trained on your business that answers customer questions around the clock." },
    { key: "ecommerce", label: "Online Store", price: 3800, unit: "one-time", icon: icoCart(),
      desc: "Full ecommerce with checkout, shipping, tax, and inventory automation built in." },
    { key: "extra-storage", label: "Extra Storage", price: 5, unit: "per GB / month", icon: icoDrive(),
      desc: "More room for images, video, and files, added straight onto your current hosting plan." },
    { key: "priority-support", label: "Priority Support", price: 75, unit: "per month", icon: icoBolt(),
      desc: "Front-of-queue responses and same-business-day turnaround on change requests." }
  ];

  function viewAddons() {
    setActiveNav("addons");
    api
      .getAddonOrders()
      .then(function (orders) {
        viewEl.innerHTML =
          '<div class="view-head"><div><h1>Add-ons</h1>' +
          '<p class="view-sub">Extend what we have already built for you.</p></div></div>' +

          '<div class="demo-notice">' + icoAlert() +
          "<span><strong>No payment is taken here.</strong> Requesting an add-on starts a " +
          "conversation — a Velocube rep confirms the scope and price with you before any work or invoice.</span></div>" +

          '<div class="addon-grid">' +
          ADDONS.map(function (a) {
            return (
              '<div class="addon-card"><span class="addon-icon">' + a.icon + "</span>" +
              "<h3>" + esc(a.label) + "</h3><p>" + esc(a.desc) + "</p>" +
              '<p class="addon-price">' + money(a.price) + " <small>" + esc(a.unit) + "</small></p>" +
              '<div class="btn-row"><button class="btn primary sm full-w" type="button" data-addon="' +
              a.key + '">Request this</button></div></div>'
            );
          }).join("") +
          "</div>" +

          (orders.length
            ? '<div class="card" style="margin-top:1.5rem;"><div class="card-head"><h2>Your requests</h2></div>' +
              '<table class="data-table"><thead><tr><th>Add-on</th><th>Requested</th><th>Status</th></tr></thead><tbody>' +
              orders.map(function (o) {
                return (
                  "<tr><td><strong>" + esc(o.label) + "</strong>" +
                  (o.note ? '<br><span class="hint">' + esc(o.note) + "</span>" : "") +
                  "</td><td>" + fmtDate(o.requested_at) + "</td><td>" +
                  statusBadge(o.status) + "</td></tr>"
                );
              }).join("") +
              "</tbody></table></div>"
            : "");

        viewEl.querySelectorAll("[data-addon]").forEach(function (b) {
          b.addEventListener("click", function () {
            var addon = ADDONS.find(function (a) { return a.key === b.getAttribute("data-addon"); });
            addonModal(addon);
          });
        });
      })
      .catch(renderViewError);
  }

  function addonModal(addon) {
    openModal(
      "Request " + addon.label,
      "<p>" + esc(addon.desc) + "</p>" +
        '<p class="addon-price" style="margin-top:0.75rem;">' + money(addon.price) +
        " <small>" + esc(addon.unit) + "</small></p>" +
        '<div class="demo-notice" style="margin-top:1.15rem;">' + icoAlert() +
        "<span>Submitting this sends a request to our team. Nothing is charged until you approve a final quote.</span></div>" +
        '<label style="font-size:0.75rem;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--ink-2);">Anything we should know?' +
        '<textarea id="ao-note" class="input textarea" style="margin-top:0.35rem;" placeholder="Optional — timing, specific requirements, questions…"></textarea></label>' +
        '<div class="btn-row"><button class="btn primary" id="ao-send" type="button">Send Request</button>' +
        '<button class="btn ghost" id="ao-cancel" type="button">Cancel</button></div>',
      function (wrap) {
        wrap.querySelector("#ao-cancel").addEventListener("click", closeModal);
        wrap.querySelector("#ao-send").addEventListener("click", function () {
          var btn = this;
          btn.disabled = true;
          api
            .orderAddon(me.id, addon, val("ao-note"))
            .then(function () {
              toast("Request sent — we'll be in touch shortly");
              closeModal();
              viewAddons();
            })
            .catch(function (e) {
              btn.disabled = false;
              apiFail(e);
            });
        });
      }
    );
  }

  /* ======================= Hosting ======================= */

  function viewHosting() {
    setActiveNav("hosting");
    var hasPlan = me.plan && me.plan !== "None";

    if (!hasPlan) {
      viewEl.innerHTML =
        '<div class="view-head"><div><h1>Hosting</h1>' +
        '<p class="view-sub">Keep your site fast, secure, and looked after.</p></div></div>' +
        '<div class="card">' +
        emptyState(
          icoServer(),
          "You're not on a hosting plan yet",
          "We can host, secure, back up, and maintain your site so you never have to think about it.",
          '<a class="btn primary" href="../management.html" target="_blank" rel="noopener">Compare plans</a>'
        ) +
        "</div>" +
        '<div class="card pad"><h2>Interested?</h2>' +
        '<p class="hint">Tell us what you need and we\'ll recommend the right plan.</p>' +
        '<div class="btn-row"><button class="btn primary" id="ask-hosting" type="button">Ask about hosting</button></div></div>';

      document.getElementById("ask-hosting").addEventListener("click", function () {
        planChangeModal("Hosting enquiry");
      });
      return;
    }

    var pct = me.storage_limit > 0
      ? Math.min(100, Math.round((me.storage_used / me.storage_limit) * 100))
      : 0;
    var renewalDays = daysUntil(me.renewal_date);

    viewEl.innerHTML =
      '<div class="view-head"><div><h1>Hosting</h1>' +
      '<p class="view-sub">Your plan, storage, and renewal.</p></div>' +
      '<button class="btn ghost" id="change-plan" type="button">Request a change</button></div>' +

      '<div class="two-col">' +
      '<div class="card pad"><h2>Your plan</h2><dl class="kv">' +
      "<dt>Plan</dt><dd><strong>" + esc(me.plan) + "</strong></dd>" +
      "<dt>Rate</dt><dd>" + (me.monthly ? money(me.monthly) + "/mo" : "—") + "</dd>" +
      "<dt>Term</dt><dd>" + esc(me.term || "Monthly") + "</dd>" +
      "<dt>Renews</dt><dd>" + fmtDate(me.renewal_date) +
      (renewalDays !== null && renewalDays <= 30
        ? ' <span class="badge ' + (renewalDays <= 7 ? "b-red" : "b-amber") + '">in ' +
          Math.max(renewalDays, 0) + " days</span>"
        : "") +
      "</dd><dt>Status</dt><dd>" + statusBadge(me.status) + "</dd></dl></div>" +

      '<div class="card pad"><h2>Storage</h2>' +
      (me.storage_limit > 0
        ? "<p>" + me.storage_used + " GB of " + me.storage_limit + " GB used</p>" +
          '<div class="progress"><span class="' +
          (pct >= 90 ? "p-red" : pct >= 70 ? "p-amber" : "p-green") +
          '" style="width:' + pct + '%"></span></div>' +
          '<p class="hint" style="margin-top:0.75rem;">' +
          (pct >= 80
            ? "You're close to your limit. Extra storage is $5 per GB per month."
            : "Plenty of room. Images, files, and backups count toward this.") +
          "</p>" +
          (pct >= 80
            ? '<div class="btn-row"><button class="btn primary sm" id="more-storage" type="button">Add storage</button></div>'
            : "")
        : '<p class="hint">No storage limit on your current plan.</p>') +
      "</div></div>" +

      '<div class="card pad"><h2>What your plan includes</h2>' +
      '<div class="btn-row" style="margin-top:0;">' +
      '<a class="btn ghost sm" href="../management.html" target="_blank" rel="noopener">See full plan details</a>' +
      '<a class="btn ghost sm" href="#/messages">Ask a question</a></div></div>';

    document.getElementById("change-plan").addEventListener("click", function () {
      planChangeModal("Plan change request");
    });
    var storageBtn = document.getElementById("more-storage");
    if (storageBtn) {
      storageBtn.addEventListener("click", function () {
        var addon = ADDONS.find(function (a) { return a.key === "extra-storage"; });
        addonModal(addon);
      });
    }
  }

  function planChangeModal(label) {
    openModal(
      label,
      '<p class="hint">Tell us what you\'d like to change and we\'ll confirm pricing before anything is updated. Billing is never changed automatically.</p>' +
        '<label style="display:block;margin-top:1rem;font-size:0.75rem;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--ink-2);">What would you like?' +
        '<textarea id="pc-note" class="input textarea" style="margin-top:0.35rem;" placeholder="e.g. upgrade to Website Management, switch to annual billing, add storage…"></textarea></label>' +
        '<div class="btn-row"><button class="btn primary" id="pc-send" type="button">Send Request</button>' +
        '<button class="btn ghost" id="pc-cancel" type="button">Cancel</button></div>',
      function (wrap) {
        wrap.querySelector("#pc-cancel").addEventListener("click", closeModal);
        wrap.querySelector("#pc-send").addEventListener("click", function () {
          var btn = this;
          var note = val("pc-note");
          if (!note) {
            toast("Let us know what you'd like to change", "warn");
            return;
          }
          btn.disabled = true;
          api
            .requestPlanChange(me.id, label, note)
            .then(function () {
              toast("Request sent — we'll follow up shortly");
              closeModal();
            })
            .catch(function (e) {
              btn.disabled = false;
              apiFail(e);
            });
        });
      }
    );
  }

  /* ======================= Account ======================= */

  function viewAccount() {
    setActiveNav("account");
    viewEl.innerHTML =
      '<div class="view-head"><div><h1>Account</h1>' +
      '<p class="view-sub">Your details and sign-in.</p></div></div>' +

      '<div class="two-col">' +
      '<div class="card pad"><h2>Your details</h2><dl class="kv">' +
      "<dt>Business</dt><dd>" + esc(me.business) + "</dd>" +
      "<dt>Contact</dt><dd>" + esc(me.contact) + "</dd>" +
      "<dt>Email</dt><dd>" + esc(me.email) + "</dd>" +
      "<dt>Phone</dt><dd>" + esc(me.phone || "—") + "</dd>" +
      "<dt>Account</dt><dd class='mono'>" + esc(me.account_number) + "</dd>" +
      "<dt>Client since</dt><dd>" + fmtDate(me.client_since) + "</dd>" +
      "</dl>" +
      '<p class="hint" style="margin-top:1rem;">Need something changed? <a href="#/messages">Send us a message</a> and we\'ll update it.</p></div>' +

      '<div class="card pad"><h2>Change password</h2>' +
      '<div class="form-grid">' +
      '<label class="full">New password<input id="pw-new" class="input" type="password" autocomplete="new-password"></label>' +
      '<label class="full">Repeat it<input id="pw-confirm" class="input" type="password" autocomplete="new-password"></label>' +
      "</div>" +
      '<div class="btn-row"><button class="btn primary" id="pw-save" type="button">Update Password</button>' +
      '<span class="hint" id="pw-status"></span></div></div>' +
      "</div>" +

      '<div class="card pad"><h2>Need help?</h2>' +
      '<p class="hint">Our team is available Monday to Friday, 9am to 6pm Eastern.</p>' +
      '<div class="btn-row"><a class="btn primary sm" href="#/messages">Message the team</a>' +
      '<a class="btn ghost sm" href="mailto:hr@velocube.net">hr@velocube.net</a>' +
      '<a class="btn ghost sm" href="tel:+17186350662">(718) 635-0662</a></div></div>';

    document.getElementById("pw-save").addEventListener("click", function () {
      var btn = this;
      var pw = document.getElementById("pw-new").value;
      var pw2 = document.getElementById("pw-confirm").value;
      var status = document.getElementById("pw-status");
      if (pw.length < 8) {
        status.textContent = "Use at least 8 characters.";
        return;
      }
      if (pw !== pw2) {
        status.textContent = "Passwords do not match.";
        return;
      }
      btn.disabled = true;
      status.textContent = "Saving…";
      api
        .changePassword(pw)
        .then(function () {
          btn.disabled = false;
          document.getElementById("pw-new").value = "";
          document.getElementById("pw-confirm").value = "";
          status.textContent = "";
          toast("Password updated");
        })
        .catch(function (e) {
          btn.disabled = false;
          status.textContent = (e && e.message) || "Could not update password.";
        });
    });
  }

  /* ======================= Icons ======================= */

  function svgWrap(inner) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      inner + "</svg>"
    );
  }
  function icoAlert() {
    return svgWrap('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>');
  }
  function icoCheck() {
    return svgWrap('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>');
  }
  function icoChat() {
    return svgWrap('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>');
  }
  function icoPen() {
    return svgWrap('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>');
  }
  function icoDoc() {
    return svgWrap('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6"/>');
  }
  function icoMega() {
    return svgWrap('<path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.2-3"/>');
  }
  function icoMonitor() {
    return svgWrap('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>');
  }
  function icoRepeat() {
    return svgWrap('<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>');
  }
  function icoDrive() {
    return svgWrap('<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/>');
  }
  function icoServer() {
    return svgWrap('<rect x="2" y="3" width="20" height="6" rx="1.5"/><rect x="2" y="15" width="20" height="6" rx="1.5"/><path d="M6 6h.01M6 18h.01"/>');
  }
  function icoTrend() {
    return svgWrap('<path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>');
  }
  function icoSpark() {
    return svgWrap('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3"/>');
  }
  function icoCart() {
    return svgWrap('<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>');
  }
  function icoBolt() {
    return svgWrap('<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>');
  }

  /* ======================= Boot ======================= */

  boot();
})();
