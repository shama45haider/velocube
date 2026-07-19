/* Velocube Support Panel — data layer
   One async interface, two adapters:
   - Supabase adapter when config.js has credentials and supabase-js loaded
   - Demo adapter otherwise: VELO_DEMO dataset plus a localStorage overlay
     so replies, status changes, notes, clients, snippets, and activity
     survive reloads. */
window.VeloAPI = (function () {
  "use strict";

  var cfg = window.VELO_CONFIG || {};
  var hasSupabase =
    !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) &&
    typeof window.supabase !== "undefined";

  /* ======================= Demo adapter ======================= */

  var LS_KEY = "velo_admin_demo_v2";
  var SESSION_KEY = "velo_admin_session";

  function loadOverlay() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveOverlay(o) {
    localStorage.setItem(LS_KEY, JSON.stringify(o));
  }

  function overlay() {
    var o = loadOverlay();
    o.messages = o.messages || [];
    o.messageUpdates = o.messageUpdates || {};
    o.ticketUpdates = o.ticketUpdates || {};
    o.clientUpdates = o.clientUpdates || {};
    o.newTickets = o.newTickets || [];
    o.newClients = o.newClients || [];
    o.newSnippets = o.newSnippets || [];
    o.snippetUpdates = o.snippetUpdates || {};
    o.deletedSnippets = o.deletedSnippets || [];
    o.activity = o.activity || [];
    return o;
  }

  function nowIso() {
    return new Date().toISOString().slice(0, 19);
  }

  function demoTickets() {
    var o = overlay();
    var base = window.VELO_DEMO.tickets.concat(o.newTickets);
    return base.map(function (t) {
      var patch = o.ticketUpdates[t.id] || {};
      return Object.assign({ tags: "" }, t, patch);
    });
  }

  function demoMessages(ticketId) {
    var o = overlay();
    return window.VELO_DEMO.messages
      .concat(o.messages)
      .map(function (m) {
        var patch = o.messageUpdates[m.id] || {};
        return Object.assign({}, m, patch);
      })
      .filter(function (m) {
        return m.ticket_id === ticketId;
      })
      .sort(function (a, b) {
        return a.sent_at < b.sent_at ? -1 : 1;
      });
  }

  function demoClients() {
    var o = overlay();
    return window.VELO_DEMO.clients.concat(o.newClients).map(function (c) {
      var patch = o.clientUpdates[c.id] || {};
      return Object.assign({}, c, patch);
    });
  }

  function demoSnippets() {
    var o = overlay();
    return window.VELO_DEMO.snippets
      .concat(o.newSnippets)
      .map(function (s) {
        var patch = o.snippetUpdates[s.id] || {};
        return Object.assign({}, s, patch);
      })
      .filter(function (s) {
        return o.deletedSnippets.indexOf(s.id) === -1;
      });
  }

  var demo = {
    mode: "demo",

    signIn: function (email, password) {
      var a = window.VELO_DEMO.agent;
      if (
        email.trim().toLowerCase() === a.email &&
        password === a.password
      ) {
        var session = { email: a.email, name: a.name, role: a.role };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return Promise.resolve(session);
      }
      return Promise.reject(new Error("Wrong email or password."));
    },

    signOut: function () {
      sessionStorage.removeItem(SESSION_KEY);
      return Promise.resolve();
    },

    getSession: function () {
      try {
        return Promise.resolve(
          JSON.parse(sessionStorage.getItem(SESSION_KEY))
        );
      } catch (e) {
        return Promise.resolve(null);
      }
    },

    getClients: function () {
      return Promise.resolve(demoClients());
    },

    getClient: function (id) {
      var c = demoClients().find(function (c) {
        return String(c.id) === String(id);
      });
      return Promise.resolve(c || null);
    },

    createClient: function (data) {
      var o = overlay();
      var maxId = 100;
      demoClients().forEach(function (c) {
        if (Number(c.id) > maxId) maxId = Number(c.id);
      });
      var c = Object.assign(
        {
          id: maxId + 1,
          plan: "None",
          monthly: 0,
          term: "No subscription",
          storage_used: 0,
          storage_limit: 0,
          client_since: nowIso().slice(0, 10),
          renewal_date: null,
          status: "prospect",
          notes: ""
        },
        data
      );
      o.newClients.push(c);
      saveOverlay(o);
      return Promise.resolve(c);
    },

    updateClient: function (id, patch) {
      var o = overlay();
      o.clientUpdates[id] = Object.assign({}, o.clientUpdates[id], patch);
      saveOverlay(o);
      return Promise.resolve();
    },

    getServices: function (clientId) {
      return Promise.resolve(
        window.VELO_DEMO.services.filter(function (s) {
          return String(s.client_id) === String(clientId);
        })
      );
    },

    getAllServices: function () {
      return Promise.resolve(window.VELO_DEMO.services.slice());
    },

    getTickets: function () {
      return Promise.resolve(demoTickets());
    },

    getTicket: function (id) {
      var t = demoTickets().find(function (t) {
        return t.id === id;
      });
      return Promise.resolve(t || null);
    },

    getMessages: function (ticketId) {
      return Promise.resolve(demoMessages(ticketId));
    },

    getAllMessages: function () {
      var o = overlay();
      return Promise.resolve(
        window.VELO_DEMO.messages.concat(o.messages).slice()
      );
    },

    addMessage: function (ticketId, author, body, opts) {
      opts = opts || {};
      var o = overlay();
      var msg = {
        id: Date.now(),
        ticket_id: ticketId,
        author: author,
        direction: opts.internal ? "outbound" : "outbound",
        internal: !!opts.internal,
        email_status: opts.internal ? null : "queued",
        body: body,
        sent_at: nowIso()
      };
      o.messages.push(msg);
      o.ticketUpdates[ticketId] = Object.assign(
        {},
        o.ticketUpdates[ticketId],
        { updated_at: msg.sent_at }
      );
      saveOverlay(o);
      return Promise.resolve(msg);
    },

    updateMessage: function (id, patch) {
      var o = overlay();
      o.messageUpdates[id] = Object.assign({}, o.messageUpdates[id], patch);
      saveOverlay(o);
      return Promise.resolve();
    },

    sendEmail: function () {
      // Demo mode has no mail service; replies stay "queued".
      return Promise.resolve({ ok: false, demo: true, email_status: "queued" });
    },

    updateTicket: function (ticketId, patch) {
      var o = overlay();
      o.ticketUpdates[ticketId] = Object.assign(
        {},
        o.ticketUpdates[ticketId],
        patch,
        { updated_at: nowIso() }
      );
      saveOverlay(o);
      return Promise.resolve();
    },

    createTicket: function (data) {
      var o = overlay();
      var num = 2410 + o.newTickets.length + 1;
      var t = Object.assign(
        {
          id: "TK-" + num,
          status: "open",
          source: "manual",
          assignee: "Unassigned",
          tags: "",
          created_at: nowIso(),
          updated_at: nowIso()
        },
        data
      );
      o.newTickets.push(t);
      saveOverlay(o);
      return Promise.resolve(t);
    },

    updateClientNotes: function (clientId, notes) {
      return demo.updateClient(clientId, { notes: notes });
    },

    getAgents: function () {
      return Promise.resolve(window.VELO_DEMO.agents.slice());
    },

    getSnippets: function () {
      return Promise.resolve(demoSnippets());
    },

    createSnippet: function (data) {
      var o = overlay();
      var s = Object.assign(
        { id: Date.now(), category: "General", created_at: nowIso() },
        data
      );
      o.newSnippets.push(s);
      saveOverlay(o);
      return Promise.resolve(s);
    },

    updateSnippet: function (id, patch) {
      var o = overlay();
      o.snippetUpdates[id] = Object.assign({}, o.snippetUpdates[id], patch);
      saveOverlay(o);
      return Promise.resolve();
    },

    deleteSnippet: function (id) {
      var o = overlay();
      if (o.deletedSnippets.indexOf(id) === -1) o.deletedSnippets.push(id);
      saveOverlay(o);
      return Promise.resolve();
    },

    getActivity: function (limit) {
      var o = overlay();
      var all = window.VELO_DEMO.activity.concat(o.activity).sort(function (a, b) {
        return a.ts < b.ts ? 1 : -1;
      });
      return Promise.resolve(limit ? all.slice(0, limit) : all);
    },

    logActivity: function (agentName, kind, ref, detail) {
      var o = overlay();
      o.activity.push({
        id: Date.now(),
        ts: nowIso(),
        agent: agentName,
        kind: kind,
        ref: ref || "",
        detail: detail || ""
      });
      saveOverlay(o);
      return Promise.resolve();
    },

    getGuides: function () {
      return Promise.resolve(window.VELO_DEMO.guides);
    }
  };

  /* ===================== Supabase adapter ===================== */

  function makeSupabaseAdapter() {
    var sb = window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_ANON_KEY
    );

    function rows(q) {
      return q.then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
    }

    return {
      mode: "supabase",
      client: sb,

      signIn: function (email, password) {
        return sb.auth
          .signInWithPassword({ email: email, password: password })
          .then(function (res) {
            if (res.error) throw new Error("Wrong email or password.");
            var u = res.data.user;
            return {
              email: u.email,
              name: (u.user_metadata && u.user_metadata.name) || u.email,
              role: "Support Agent"
            };
          });
      },

      signOut: function () {
        return sb.auth.signOut();
      },

      getSession: function () {
        return sb.auth.getSession().then(function (res) {
          var s = res.data.session;
          if (!s) return null;
          var u = s.user;
          return {
            email: u.email,
            name: (u.user_metadata && u.user_metadata.name) || u.email,
            role: "Support Agent"
          };
        });
      },

      getClients: function () {
        return rows(sb.from("clients").select("*").order("account_number"));
      },

      getClient: function (id) {
        return rows(sb.from("clients").select("*").eq("id", id)).then(
          function (d) {
            return d[0] || null;
          }
        );
      },

      createClient: function (data) {
        return rows(sb.from("clients").insert(data).select()).then(function (d) {
          return d[0];
        });
      },

      updateClient: function (id, patch) {
        return rows(sb.from("clients").update(patch).eq("id", id).select());
      },

      getServices: function (clientId) {
        return rows(sb.from("services").select("*").eq("client_id", clientId));
      },

      getAllServices: function () {
        return rows(sb.from("services").select("*"));
      },

      getTickets: function () {
        return rows(
          sb.from("tickets").select("*").order("updated_at", { ascending: false })
        );
      },

      getTicket: function (id) {
        return rows(sb.from("tickets").select("*").eq("id", id)).then(
          function (d) {
            return d[0] || null;
          }
        );
      },

      getMessages: function (ticketId) {
        return rows(
          sb
            .from("ticket_messages")
            .select("*")
            .eq("ticket_id", ticketId)
            .order("sent_at")
        );
      },

      getAllMessages: function () {
        return rows(sb.from("ticket_messages").select("*"));
      },

      addMessage: function (ticketId, author, body, opts) {
        opts = opts || {};
        return rows(
          sb.from("ticket_messages").insert({
            ticket_id: ticketId,
            author: author,
            direction: "outbound",
            internal: !!opts.internal,
            email_status: opts.internal ? null : "queued",
            body: body
          }).select()
        ).then(function (d) {
          sb.from("tickets")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", ticketId)
            .then(function () {});
          return d[0];
        });
      },

      updateMessage: function (id, patch) {
        return rows(sb.from("ticket_messages").update(patch).eq("id", id).select());
      },

      sendEmail: function (payload) {
        // Calls the send-ticket-email Edge Function (see admin/functions/).
        // If the function is not deployed yet, the reply simply stays
        // "queued" in the thread — nothing breaks.
        return sb.functions
          .invoke("send-ticket-email", { body: payload })
          .then(function (res) {
            if (res.error) {
              return { ok: false, email_status: "queued", error: res.error.message };
            }
            return Object.assign({ ok: true }, res.data);
          })
          .catch(function (err) {
            return { ok: false, email_status: "queued", error: String(err) };
          });
      },

      updateTicket: function (ticketId, patch) {
        patch.updated_at = new Date().toISOString();
        return rows(sb.from("tickets").update(patch).eq("id", ticketId).select());
      },

      createTicket: function (data) {
        if (!data.id) {
          // Readable, effectively unique: TK-<last 6 of epoch seconds>
          data.id = "TK-" + String(Math.floor(Date.now() / 1000)).slice(-6);
        }
        return rows(sb.from("tickets").insert(data).select()).then(function (d) {
          return d[0];
        });
      },

      updateClientNotes: function (clientId, notes) {
        return rows(
          sb.from("clients").update({ notes: notes }).eq("id", clientId).select()
        );
      },

      getAgents: function () {
        return rows(sb.from("agents").select("*").eq("active", true).order("name"))
          .catch(function () {
            // agents table missing (upgrade SQL not run yet)
            return [];
          });
      },

      getSnippets: function () {
        return rows(
          sb.from("canned_responses").select("*").order("category").order("title")
        ).catch(function () {
          return [];
        });
      },

      createSnippet: function (data) {
        return rows(sb.from("canned_responses").insert(data).select()).then(
          function (d) {
            return d[0];
          }
        );
      },

      updateSnippet: function (id, patch) {
        return rows(
          sb.from("canned_responses").update(patch).eq("id", id).select()
        );
      },

      deleteSnippet: function (id) {
        return rows(sb.from("canned_responses").delete().eq("id", id).select());
      },

      getActivity: function (limit) {
        var q = sb.from("activity").select("*").order("ts", { ascending: false });
        if (limit) q = q.limit(limit);
        return rows(q).catch(function () {
          return [];
        });
      },

      logActivity: function (agentName, kind, ref, detail) {
        return rows(
          sb.from("activity").insert({
            agent: agentName,
            kind: kind,
            ref: ref || "",
            detail: detail || ""
          }).select()
        ).catch(function () {});
      },

      getGuides: function () {
        // Guides ship with the panel; they are agent documentation,
        // not client data, so no table needed.
        return Promise.resolve(window.VELO_DEMO.guides);
      }
    };
  }

  return hasSupabase ? makeSupabaseAdapter() : demo;
})();
