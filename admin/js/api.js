/* Velocube Support Panel — data layer
   One async interface, two adapters:
   - Supabase adapter when config.js has credentials and supabase-js loaded
   - Demo adapter otherwise: VELO_DEMO dataset plus a localStorage overlay
     so replies, status changes, notes, and new tickets survive reloads. */
window.VeloAPI = (function () {
  "use strict";

  var cfg = window.VELO_CONFIG || {};
  var hasSupabase =
    !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) &&
    typeof window.supabase !== "undefined";

  /* ======================= Demo adapter ======================= */

  var LS_KEY = "velo_admin_demo_v1";
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
    o.ticketUpdates = o.ticketUpdates || {};
    o.notes = o.notes || {};
    o.newTickets = o.newTickets || [];
    return o;
  }

  function demoTickets() {
    var o = overlay();
    var base = window.VELO_DEMO.tickets.concat(o.newTickets);
    return base.map(function (t) {
      var patch = o.ticketUpdates[t.id] || {};
      return Object.assign({}, t, patch);
    });
  }

  function demoMessages(ticketId) {
    var o = overlay();
    return window.VELO_DEMO.messages
      .concat(o.messages)
      .filter(function (m) {
        return m.ticket_id === ticketId;
      })
      .sort(function (a, b) {
        return a.sent_at < b.sent_at ? -1 : 1;
      });
  }

  function demoClients() {
    var o = overlay();
    return window.VELO_DEMO.clients.map(function (c) {
      return o.notes[c.id] !== undefined
        ? Object.assign({}, c, { notes: o.notes[c.id] })
        : c;
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

    addMessage: function (ticketId, author, body) {
      var o = overlay();
      var msg = {
        id: Date.now(),
        ticket_id: ticketId,
        author: author,
        direction: "outbound",
        body: body,
        sent_at: new Date().toISOString().slice(0, 19)
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

    updateTicket: function (ticketId, patch) {
      var o = overlay();
      o.ticketUpdates[ticketId] = Object.assign(
        {},
        o.ticketUpdates[ticketId],
        patch,
        { updated_at: new Date().toISOString().slice(0, 19) }
      );
      saveOverlay(o);
      return Promise.resolve();
    },

    createTicket: function (data) {
      var o = overlay();
      var num =
        2410 + o.newTickets.length + 1;
      var t = Object.assign(
        {
          id: "TK-" + num,
          status: "open",
          source: "manual",
          assignee: "Unassigned",
          created_at: new Date().toISOString().slice(0, 19),
          updated_at: new Date().toISOString().slice(0, 19)
        },
        data
      );
      o.newTickets.push(t);
      saveOverlay(o);
      return Promise.resolve(t);
    },

    updateClientNotes: function (clientId, notes) {
      var o = overlay();
      o.notes[clientId] = notes;
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

      addMessage: function (ticketId, author, body) {
        return rows(
          sb.from("ticket_messages").insert({
            ticket_id: ticketId,
            author: author,
            direction: "outbound",
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

      updateTicket: function (ticketId, patch) {
        patch.updated_at = new Date().toISOString();
        return rows(sb.from("tickets").update(patch).eq("id", ticketId).select());
      },

      createTicket: function (data) {
        return rows(sb.from("tickets").insert(data).select()).then(function (d) {
          return d[0];
        });
      },

      updateClientNotes: function (clientId, notes) {
        return rows(
          sb.from("clients").update({ notes: notes }).eq("id", clientId).select()
        );
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
