/* Velocube Client Portal — data layer
   Client-scoped calls only. Every query relies on row-level security
   (admin/supabase-portal.sql) to return just this client's rows; the
   policies are the security boundary, not this file. */
window.VeloClientAPI = (function () {
  "use strict";

  var cfg = window.VELO_PORTAL_CONFIG || {};
  var ready =
    !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) &&
    typeof window.supabase !== "undefined";

  if (!ready) {
    var offline = function () {
      return Promise.reject(
        new Error("Portal is not configured. Add Supabase credentials to portal/js/config.js.")
      );
    };
    return {
      ready: false,
      signIn: offline,
      signOut: function () { return Promise.resolve(); },
      getSession: function () { return Promise.resolve(null); }
    };
  }

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  function rows(q) {
    return q.then(function (res) {
      if (res.error) throw res.error;
      return res.data || [];
    });
  }

  function one(q) {
    return rows(q).then(function (d) {
      return d[0] || null;
    });
  }

  // Cached so every view doesn't re-resolve the client record.
  var meCache = null;

  return {
    ready: true,
    client: sb,

    /* ---------------- Auth ---------------- */

    signIn: function (email, password) {
      meCache = null;
      return sb.auth
        .signInWithPassword({ email: email, password: password })
        .then(function (res) {
          if (res.error) throw new Error("Wrong email or password.");
          return res.data.user;
        });
    },

    signOut: function () {
      meCache = null;
      return sb.auth.signOut();
    },

    getSession: function () {
      return sb.auth.getSession().then(function (res) {
        return res.data.session || null;
      });
    },

    changePassword: function (newPassword) {
      return sb.auth.updateUser({ password: newPassword }).then(function (res) {
        if (res.error) throw new Error(res.error.message);
        return true;
      });
    },

    /* ---------------- Identity ---------------- */

    /* Reads the client_self view, which excludes internal staff notes.
       Returns null when the signed-in user has no linked client record —
       the portal treats that as "account not linked yet" rather than an
       error, because that is the safe default for a new auth user. */
    getMe: function (force) {
      if (meCache && !force) return Promise.resolve(meCache);
      return one(sb.from("client_self").select("*")).then(function (me) {
        meCache = me;
        return me;
      });
    },

    /* ---------------- Project ---------------- */

    getMyServices: function () {
      return rows(sb.from("services").select("*").order("id"));
    },

    getUpdates: function (limit) {
      var q = sb
        .from("project_updates")
        .select("*")
        .order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      return rows(q);
    },

    getStagingSites: function () {
      return rows(
        sb.from("staging_sites").select("*").order("last_deploy", { ascending: false })
      );
    },

    /* ---------------- Messages / tickets ---------------- */

    getMyTickets: function () {
      return rows(
        sb.from("tickets").select("*").order("updated_at", { ascending: false })
      );
    },

    getTicket: function (id) {
      return one(sb.from("tickets").select("*").eq("id", id));
    },

    /* RLS filters internal notes out server-side; the extra
       .eq("internal", false) is belt-and-braces so a policy regression
       can never leak staff notes into the client UI. */
    getTicketMessages: function (ticketId) {
      return rows(
        sb
          .from("ticket_messages")
          .select("*")
          .eq("ticket_id", ticketId)
          .eq("internal", false)
          .order("sent_at")
      );
    },

    replyToTicket: function (ticketId, authorName, body) {
      return one(
        sb
          .from("ticket_messages")
          .insert({
            ticket_id: ticketId,
            author: authorName,
            direction: "inbound",
            internal: false,
            body: body
          })
          .select()
      );
    },

    createTicket: function (clientId, subject, body, authorName, priority) {
      var id = "TK-" + String(Math.floor(Date.now() / 1000)).slice(-6);
      return one(
        sb
          .from("tickets")
          .insert({
            id: id,
            client_id: clientId,
            subject: subject,
            status: "open",
            priority: priority || "normal",
            source: "portal",
            assignee: "Unassigned"
          })
          .select()
      ).then(function (t) {
        if (!body) return t;
        return one(
          sb
            .from("ticket_messages")
            .insert({
              ticket_id: t.id,
              author: authorName,
              direction: "inbound",
              internal: false,
              body: body
            })
            .select()
        ).then(function () {
          return t;
        });
      });
    },

    /* ---------------- Documents ---------------- */

    getDocuments: function () {
      return rows(
        sb.from("documents").select("*").order("created_at", { ascending: false })
      );
    },

    getDocument: function (id) {
      return one(sb.from("documents").select("*").eq("id", id));
    },

    /* Simulated signing — see the demo notice in the UI. Records who
       signed and when, but this is a product demonstration and does not
       create a legally binding signature. */
    signDocument: function (id, name, signatureData) {
      return one(
        sb
          .from("documents")
          .update({
            signed_at: new Date().toISOString(),
            signed_name: name,
            signature_data: signatureData || null,
            signed_ip: "demo"
          })
          .eq("id", id)
          .select()
      );
    },

    /* ---------------- Add-ons ---------------- */

    getAddonOrders: function () {
      return rows(
        sb.from("addon_orders").select("*").order("requested_at", { ascending: false })
      );
    },

    /* Creates a request only. No payment is taken here — a Velocube rep
       confirms scope and invoices separately. */
    orderAddon: function (clientId, addon, note) {
      return one(
        sb
          .from("addon_orders")
          .insert({
            client_id: clientId,
            addon_key: addon.key,
            label: addon.label,
            price: addon.price,
            status: "requested",
            note: note || ""
          })
          .select()
      );
    },

    /* ---------------- News ---------------- */

    getAnnouncements: function () {
      return rows(
        sb
          .from("announcements")
          .select("*")
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
      );
    },

    /* ---------------- Hosting ---------------- */

    requestPlanChange: function (clientId, label, note) {
      return one(
        sb
          .from("addon_orders")
          .insert({
            client_id: clientId,
            addon_key: "plan-change",
            label: label,
            price: 0,
            status: "requested",
            note: note || ""
          })
          .select()
      );
    }
  };
})();
