/* Velocube Support Panel — Demo Mode dataset
   Mirrors the Supabase schema in supabase-setup.sql. Used only when
   config.js has no Supabase credentials. */
window.VELO_DEMO = {
  agent: {
    email: "demo@velocube.net",
    password: "VeloDemo2026",
    name: "Demo Agent",
    role: "Support Agent"
  },

  clients: [
    {
      id: 1,
      account_number: "VC-10001",
      business: "East Village Buyers",
      contact: "Marcus Reid",
      email: "marcus@eastvillagebuyers.com",
      phone: "(212) 555-0134",
      plan: "Managed Hosting",
      monthly: 150,
      term: "12 months, 15% off",
      storage_used: 2.1,
      storage_limit: 5,
      client_since: "2025-03-12",
      renewal_date: "2026-08-01",
      status: "active",
      notes: "Prefers phone calls over email. Big redesign delivered June 2026, very happy with turnaround."
    },
    {
      id: 2,
      account_number: "VC-10002",
      business: "Frontline Jerk",
      contact: "Alicia Thompson",
      email: "alicia@frontlinejerk.com",
      phone: "(718) 555-0187",
      plan: "Website Management",
      monthly: 200,
      term: "6 months, 10% off",
      storage_used: 6.4,
      storage_limit: 10,
      client_since: "2025-01-20",
      renewal_date: "2026-09-15",
      status: "active",
      notes: "Menu changes come in most Mondays. Wants weekly SEO report summarized in plain English."
    },
    {
      id: 3,
      account_number: "VC-10003",
      business: "BoUnit NYC",
      contact: "Devon Carter",
      email: "devon@bounitnyc.com",
      phone: "(917) 555-0142",
      plan: "Self-Managed Hosting",
      monthly: 25,
      term: "Monthly",
      storage_used: 0.7,
      storage_limit: 1,
      client_since: "2025-06-02",
      renewal_date: "2026-08-02",
      status: "active",
      notes: "Comfortable in the client panel. Asked about upgrading to Managed Hosting when the new store launches."
    },
    {
      id: 4,
      account_number: "VC-10004",
      business: "Hudson Dental Studio",
      contact: "Dr. Priya Nair",
      email: "priya@hudsondentalstudio.com",
      phone: "(201) 555-0169",
      plan: "Website Management",
      monthly: 200,
      term: "12 months, 15% off",
      storage_used: 3.8,
      storage_limit: 10,
      client_since: "2024-11-08",
      renewal_date: "2026-11-08",
      status: "active",
      notes: "Booking system is business critical. Any booking outage is an automatic urgent escalation to dev."
    },
    {
      id: 5,
      account_number: "VC-10005",
      business: "Cortado Coffee Co.",
      contact: "Sam Alvarez",
      email: "sam@cortadocoffee.co",
      phone: "(347) 555-0128",
      plan: "Managed Hosting",
      monthly: 150,
      term: "3 months, 5% off",
      storage_used: 4.6,
      storage_limit: 5,
      client_since: "2025-09-30",
      renewal_date: "2026-07-30",
      status: "past_due",
      notes: "Invoice for July renewal unpaid. Sam mentioned switching cards, follow up before suspending anything."
    },
    {
      id: 6,
      account_number: "VC-10006",
      business: "Ironclad Fitness",
      contact: "Jordan Blake",
      email: "jordan@ironcladfit.com",
      phone: "(646) 555-0195",
      plan: "Website Management",
      monthly: 200,
      term: "Monthly",
      storage_used: 8.9,
      storage_limit: 10,
      client_since: "2025-05-16",
      renewal_date: "2026-08-16",
      status: "active",
      notes: "Storage nearly full from class videos. Proactively offered extra storage at $5/GB, awaiting answer."
    },
    {
      id: 7,
      account_number: "VC-10007",
      business: "Luna Petals Florist",
      contact: "Grace Kim",
      email: "grace@lunapetals.com",
      phone: "(929) 555-0173",
      plan: "Self-Managed Hosting",
      monthly: 25,
      term: "12 months, 15% off",
      storage_used: 0.4,
      storage_limit: 1,
      client_since: "2026-02-14",
      renewal_date: "2027-02-14",
      status: "active",
      notes: "New client from the Valentine's campaign. Very responsive by email."
    },
    {
      id: 8,
      account_number: "VC-10008",
      business: "Atlas Moving Group",
      contact: "Tony Russo",
      email: "tony@atlasmovinggroup.com",
      phone: "(718) 555-0156",
      plan: "None",
      monthly: 0,
      term: "No subscription",
      storage_used: 0,
      storage_limit: 0,
      client_since: "2026-06-25",
      renewal_date: null,
      status: "prospect",
      notes: "Quote sent for a Business Website plus Managed Hosting bundle. Deciding between us and a franchise vendor."
    }
  ],

  services: [
    { id: 1, client_id: 1, name: "Business Website", type: "project", price: 900, status: "completed", progress: 100, started: "2025-03-14", delivered: "2025-04-02" },
    { id: 2, client_id: 1, name: "SEO Bundle", type: "project", price: 2400, status: "completed", progress: 100, started: "2025-05-01", delivered: "2025-06-10" },
    { id: 3, client_id: 1, name: "Managed Hosting", type: "subscription", price: 150, status: "active", progress: null, started: "2025-04-02", delivered: null },
    { id: 4, client_id: 2, name: "Online Store", type: "project", price: 3800, status: "completed", progress: 100, started: "2025-01-22", delivered: "2025-03-15" },
    { id: 5, client_id: 2, name: "Website Management", type: "subscription", price: 200, status: "active", progress: null, started: "2025-03-15", delivered: null },
    { id: 6, client_id: 2, name: "SEO Blog Articles", type: "add-on", price: 300, status: "in_progress", progress: 60, started: "2026-07-01", delivered: null },
    { id: 7, client_id: 3, name: "Single Page", type: "project", price: 250, status: "completed", progress: 100, started: "2025-06-03", delivered: "2025-06-12" },
    { id: 8, client_id: 3, name: "Self-Managed Hosting", type: "subscription", price: 25, status: "active", progress: null, started: "2025-06-12", delivered: null },
    { id: 9, client_id: 3, name: "Online Store Build", type: "project", price: 3800, status: "in_progress", progress: 35, started: "2026-06-20", delivered: null },
    { id: 10, client_id: 4, name: "Advanced Build", type: "project", price: 2200, status: "completed", progress: 100, started: "2024-11-10", delivered: "2025-01-05" },
    { id: 11, client_id: 4, name: "Website Management", type: "subscription", price: 200, status: "active", progress: null, started: "2025-01-05", delivered: null },
    { id: 12, client_id: 4, name: "AI Chatbot Training", type: "add-on", price: 900, status: "in_progress", progress: 80, started: "2026-06-28", delivered: null },
    { id: 13, client_id: 5, name: "Business Website", type: "project", price: 900, status: "completed", progress: 100, started: "2025-10-02", delivered: "2025-10-28" },
    { id: 14, client_id: 5, name: "Managed Hosting", type: "subscription", price: 150, status: "past_due", progress: null, started: "2025-10-28", delivered: null },
    { id: 15, client_id: 6, name: "Complete Platform", type: "project", price: 6500, status: "completed", progress: 100, started: "2025-05-18", delivered: "2025-08-22" },
    { id: 16, client_id: 6, name: "Website Management", type: "subscription", price: 200, status: "active", progress: null, started: "2025-08-22", delivered: null },
    { id: 17, client_id: 6, name: "Membership System", type: "add-on", price: 1800, status: "in_progress", progress: 15, started: "2026-07-10", delivered: null },
    { id: 18, client_id: 7, name: "Single Page", type: "project", price: 250, status: "completed", progress: 100, started: "2026-02-15", delivered: "2026-02-24" },
    { id: 19, client_id: 7, name: "Self-Managed Hosting", type: "subscription", price: 25, status: "active", progress: null, started: "2026-02-24", delivered: null },
    { id: 20, client_id: 7, name: "Logo Refresh", type: "project", price: 450, status: "scheduled", progress: 0, started: null, delivered: null },
    { id: 21, client_id: 8, name: "Business Website Quote", type: "project", price: 900, status: "scheduled", progress: 0, started: null, delivered: null }
  ],

  tickets: [
    {
      id: "TK-2401",
      client_id: 4,
      subject: "Booking form not sending confirmation emails",
      status: "open",
      priority: "urgent",
      source: "email",
      assignee: "Demo Agent",
      created_at: "2026-07-16T09:12:00",
      updated_at: "2026-07-16T14:40:00"
    },
    {
      id: "TK-2402",
      client_id: 2,
      subject: "Update Monday menu and add catering page",
      status: "open",
      priority: "normal",
      source: "email",
      assignee: "Demo Agent",
      created_at: "2026-07-15T10:05:00",
      updated_at: "2026-07-15T10:05:00"
    },
    {
      id: "TK-2403",
      client_id: 5,
      subject: "Card declined on July renewal",
      status: "pending",
      priority: "high",
      source: "phone",
      assignee: "Demo Agent",
      created_at: "2026-07-14T15:30:00",
      updated_at: "2026-07-15T09:20:00"
    },
    {
      id: "TK-2404",
      client_id: 6,
      subject: "Storage almost full, options?",
      status: "pending",
      priority: "normal",
      source: "email",
      assignee: "Demo Agent",
      created_at: "2026-07-13T11:45:00",
      updated_at: "2026-07-14T16:10:00"
    },
    {
      id: "TK-2405",
      client_id: 8,
      subject: "Quote request: new website plus hosting",
      status: "open",
      priority: "high",
      source: "quote form",
      assignee: "Unassigned",
      created_at: "2026-07-13T08:20:00",
      updated_at: "2026-07-13T08:20:00"
    },
    {
      id: "TK-2406",
      client_id: 3,
      subject: "How do I add product photos in the client panel?",
      status: "resolved",
      priority: "low",
      source: "email",
      assignee: "Demo Agent",
      created_at: "2026-07-10T13:00:00",
      updated_at: "2026-07-10T17:35:00"
    },
    {
      id: "TK-2407",
      client_id: 1,
      subject: "Switch billing to 12 month term",
      status: "resolved",
      priority: "normal",
      source: "phone",
      assignee: "Demo Agent",
      created_at: "2026-07-09T10:10:00",
      updated_at: "2026-07-09T12:00:00"
    },
    {
      id: "TK-2408",
      client_id: 7,
      subject: "Logo refresh timeline question",
      status: "open",
      priority: "low",
      source: "email",
      assignee: "Unassigned",
      created_at: "2026-07-16T08:05:00",
      updated_at: "2026-07-16T08:05:00"
    },
    {
      id: "TK-2409",
      client_id: 2,
      subject: "SEO report clarification",
      status: "resolved",
      priority: "low",
      source: "email",
      assignee: "Demo Agent",
      created_at: "2026-07-07T09:40:00",
      updated_at: "2026-07-08T10:15:00"
    },
    {
      id: "TK-2410",
      client_id: 6,
      subject: "Membership system kickoff details",
      status: "pending",
      priority: "normal",
      source: "email",
      assignee: "Demo Agent",
      created_at: "2026-07-11T14:25:00",
      updated_at: "2026-07-12T09:00:00"
    }
  ],

  messages: [
    { id: 1, ticket_id: "TK-2401", author: "Dr. Priya Nair", direction: "inbound", body: "Patients booked this morning and none of them received confirmation emails. Two showed up unsure if their appointment was real. This is urgent for us.", sent_at: "2026-07-16T09:12:00" },
    { id: 2, ticket_id: "TK-2401", author: "Demo Agent", direction: "outbound", body: "Thank you for flagging this, Dr. Nair. We reproduced the issue and our developers are investigating the email service connection now. Bookings themselves are saving correctly. I will update you within the hour.", sent_at: "2026-07-16T10:02:00" },
    { id: 3, ticket_id: "TK-2401", author: "Dr. Priya Nair", direction: "inbound", body: "Understood, thank you. Please confirm as soon as it is fixed, we have a full afternoon of bookings.", sent_at: "2026-07-16T14:40:00" },
    { id: 4, ticket_id: "TK-2402", author: "Alicia Thompson", direction: "inbound", body: "Hi team. New menu attached for Monday. Also, we are launching catering next month. Can we get a catering page added with a request form?", sent_at: "2026-07-15T10:05:00" },
    { id: 5, ticket_id: "TK-2403", author: "Demo Agent", direction: "outbound", body: "Hi Sam, your July renewal payment did not go through. No rush and nothing is suspended. When you have the new card ready, reply here or call us and we will run it again.", sent_at: "2026-07-14T15:45:00" },
    { id: 6, ticket_id: "TK-2403", author: "Sam Alvarez", direction: "inbound", body: "Thanks for the heads up. New card arrives Friday, I will call then.", sent_at: "2026-07-15T09:20:00" },
    { id: 7, ticket_id: "TK-2404", author: "Jordan Blake", direction: "inbound", body: "Got the storage warning. What are my options? The class videos are important for members.", sent_at: "2026-07-13T11:45:00" },
    { id: 8, ticket_id: "TK-2404", author: "Demo Agent", direction: "outbound", body: "Hi Jordan. Two options: extra storage at $5 per GB per month, or we can move the class videos to a video host and embed them, which frees most of your space. Happy to walk through either.", sent_at: "2026-07-14T16:10:00" },
    { id: 9, ticket_id: "TK-2405", author: "Tony Russo", direction: "inbound", body: "We need a professional website for our moving company. About 6 pages, and we want you to host and maintain it. What would that cost and how fast can it be live?", sent_at: "2026-07-13T08:20:00" },
    { id: 10, ticket_id: "TK-2406", author: "Devon Carter", direction: "inbound", body: "Trying to add photos for the new drop but not sure where they go in the panel.", sent_at: "2026-07-10T13:00:00" },
    { id: 11, ticket_id: "TK-2406", author: "Demo Agent", direction: "outbound", body: "Hey Devon. In your client panel go to Content, then Gallery, then Upload. Drag the photos in and hit Publish. They compress automatically. Full steps with screenshots are in the guide I attached.", sent_at: "2026-07-10T17:35:00" },
    { id: 12, ticket_id: "TK-2406", author: "Devon Carter", direction: "inbound", body: "Got it, all uploaded. Thanks!", sent_at: "2026-07-10T17:50:00" },
    { id: 13, ticket_id: "TK-2407", author: "Demo Agent", direction: "outbound", body: "Hi Marcus, confirming your switch to the 12 month term at 15% off. Your Managed Hosting is now $127.50 per month, effective on the August renewal. Thanks for committing longer!", sent_at: "2026-07-09T12:00:00" },
    { id: 14, ticket_id: "TK-2408", author: "Grace Kim", direction: "inbound", body: "Hi! Just checking when the logo refresh might start. No rush, planning some packaging around it.", sent_at: "2026-07-16T08:05:00" },
    { id: 15, ticket_id: "TK-2409", author: "Alicia Thompson", direction: "inbound", body: "In this week's report, what does 'impressions' actually mean for us?", sent_at: "2026-07-07T09:40:00" },
    { id: 16, ticket_id: "TK-2409", author: "Demo Agent", direction: "outbound", body: "Great question. Impressions are how many times your site showed up in someone's Google results, even if they did not click. Yours are up 32% this month, which means more people are seeing you when they search for jerk chicken in Brooklyn.", sent_at: "2026-07-08T10:15:00" },
    { id: 17, ticket_id: "TK-2410", author: "Jordan Blake", direction: "inbound", body: "Excited about the membership system. What do you need from me to get started?", sent_at: "2026-07-11T14:25:00" },
    { id: 18, ticket_id: "TK-2410", author: "Demo Agent", direction: "outbound", body: "Hi Jordan. Three things to kick off: your membership tiers and pricing, what content is members-only, and whether existing clients get grandfathered pricing. Reply here and dev starts this week.", sent_at: "2026-07-12T09:00:00" }
  ],

  agents: [
    { id: 1, name: "Demo Agent", email: "demo@velocube.net", role: "Support Agent", active: true },
    { id: 2, name: "Sana Malik", email: "sana@velocube.net", role: "Support Lead", active: true },
    { id: 3, name: "Chris Okafor", email: "chris@velocube.net", role: "Support Agent", active: true }
  ],

  snippets: [
    { id: 1, category: "General", title: "Acknowledge + investigating", body: "Hi {name},\n\nThanks for reaching out — we've received your request and are looking into it now. I'll follow up shortly with an update.\n\nBest,\n{agent}\nVelocube Support" },
    { id: 2, category: "Managed Hosting", title: "Change request received", body: "Hi {name},\n\nGot it — your change request is logged and in the queue. Text and image updates are usually live the same business day; new sections take 2–3 days. I'll confirm here with a link once it's done.\n\nBest,\n{agent}\nVelocube Support" },
    { id: 3, category: "Billing", title: "Payment failed — friendly nudge", body: "Hi {name},\n\nA quick heads up: your latest renewal payment didn't go through. No rush and nothing is suspended — most of the time it's just an expired card. Reply here or call us when you'd like us to run it again.\n\nBest,\n{agent}\nVelocube Support" },
    { id: 4, category: "Sales", title: "Quote follow-up", body: "Hi {name},\n\nThanks for your interest in Velocube! To give you an exact quote I have a couple of quick questions:\n\n1. \n2. \n\nOnce I hear back, you'll have a firm number within 24 hours.\n\nBest,\n{agent}\nVelocube Support" },
    { id: 5, category: "General", title: "Resolved + closing", body: "Hi {name},\n\nThis is done — everything should be working on your end now. I'm marking the ticket resolved, but just reply here if anything else comes up and it will reopen automatically.\n\nBest,\n{agent}\nVelocube Support" },
    { id: 6, category: "Hosting", title: "Storage options", body: "Hi {name},\n\nYou're getting close to your storage limit. Two options:\n\n• Extra storage at $5 per GB per month, added to your current plan\n• We move large video files to a video host and embed them, which usually frees most of your space\n\nHappy to walk through either — just let me know.\n\nBest,\n{agent}\nVelocube Support" }
  ],

  activity: [
    { id: 1, ts: "2026-07-16T14:40:00", agent: "System", kind: "reply_received", ref: "TK-2401", detail: "Dr. Priya Nair replied" },
    { id: 2, ts: "2026-07-16T10:02:00", agent: "Demo Agent", kind: "reply_sent", ref: "TK-2401", detail: "Replied to Hudson Dental Studio" },
    { id: 3, ts: "2026-07-16T09:12:00", agent: "System", kind: "ticket_created", ref: "TK-2401", detail: "Booking form not sending confirmation emails" },
    { id: 4, ts: "2026-07-16T08:05:00", agent: "System", kind: "ticket_created", ref: "TK-2408", detail: "Logo refresh timeline question" },
    { id: 5, ts: "2026-07-15T09:20:00", agent: "System", kind: "reply_received", ref: "TK-2403", detail: "Sam Alvarez replied" },
    { id: 6, ts: "2026-07-14T16:10:00", agent: "Demo Agent", kind: "reply_sent", ref: "TK-2404", detail: "Storage options sent to Ironclad Fitness" },
    { id: 7, ts: "2026-07-14T15:45:00", agent: "Demo Agent", kind: "status_changed", ref: "TK-2403", detail: "Status set to pending" },
    { id: 8, ts: "2026-07-13T08:20:00", agent: "System", kind: "ticket_created", ref: "TK-2405", detail: "Quote request from Atlas Moving Group" },
    { id: 9, ts: "2026-07-10T17:35:00", agent: "Demo Agent", kind: "status_changed", ref: "TK-2406", detail: "Resolved: product photo help" },
    { id: 10, ts: "2026-07-09T12:00:00", agent: "Demo Agent", kind: "status_changed", ref: "TK-2407", detail: "Resolved: billing term switch" }
  ],

  guides: [
    {
      id: 1,
      category: "Plans & Billing",
      title: "Explaining the three hosting plans",
      summary: "How to describe Self-Managed, Managed, and Website Management so clients pick the right one.",
      steps: [
        "Ask one question first: do you want to make changes yourself, or send them to us?",
        "Self-Managed Hosting ($25/mo, 1 GB): we host and secure the site, the client edits everything from their client panel. Best for hands-on owners.",
        "Managed Hosting ($150/mo, 5 GB): the client emails any change request and we make it. No panel to learn. Best for busy owners.",
        "Website Management ($200/mo, 10 GB): everything in Managed Hosting plus proactive updates, security monitoring, weekly SEO and analytics reports, priority support, and discounted new work.",
        "All plans include SSL, daily backups, and 99.9% uptime monitoring. Never present one plan as 'worse', frame it as how hands-on they want to be."
      ]
    },
    {
      id: 2,
      category: "Plans & Billing",
      title: "Term discounts and how the math works",
      summary: "Quoting 3, 6, and 12 month terms correctly.",
      steps: [
        "Discounts: 3 months saves 5%, 6 months saves 10%, 12 months saves 15%. They apply to hosting plans and monthly services, never to one-time project builds.",
        "Multiply the monthly price by the discount. Example: Managed Hosting at $150 on a 12 month term is $150 x 0.85 = $127.50/mo.",
        "Always quote the total saved too. Example: $22.50 x 12 = $270 saved over the year.",
        "The term starts on the next renewal date, not mid-cycle. Note the change in the account's internal notes.",
        "Clients can upgrade plans mid-term and keep their discount. Downgrades take effect at the end of the term."
      ]
    },
    {
      id: 3,
      category: "Plans & Billing",
      title: "Handling a failed or late payment",
      summary: "What to do when a renewal payment does not go through.",
      steps: [
        "Check the account status. 'Past due' shows on the account header in this panel.",
        "Nothing is suspended automatically in the first 14 days. Reassure the client their site is safe.",
        "Send a friendly note through the ticket, never lead with consequences. Most failures are expired cards.",
        "If the client needs time, note the promised date in internal notes and set the ticket to pending.",
        "Past 14 days unpaid, escalate to an admin. Only admins pause hosting."
      ]
    },
    {
      id: 4,
      category: "Hosting Support",
      title: "Walking a client through the client panel",
      summary: "The five things Self-Managed clients ask about most.",
      steps: [
        "Login: clients sign in at their panel link from their welcome email. Password resets are self-service from the login screen.",
        "Editing text: Content, then Pages, click any section, edit, then Publish. Changes are live in about a minute.",
        "Photos: Content, then Gallery, then Upload. Images compress automatically, no resizing needed.",
        "Business hours and contact info: Settings, then Business Info. This updates the site footer and contact page together.",
        "If they seem overwhelmed, mention Managed Hosting: for $150/mo they can just email us changes instead."
      ]
    },
    {
      id: 5,
      category: "Hosting Support",
      title: "Managed Hosting change requests by email",
      summary: "How the email change flow works and what to promise.",
      steps: [
        "Managed and Website Management clients send changes to hr@velocube.net or reply to any ticket.",
        "Log every request as a ticket linked to their account, even small ones.",
        "Standard turnaround: same business day for text and image swaps, 2 to 3 days for new sections or layout changes.",
        "Anything that needs new development (a form, a feature, a new page type) gets quoted first. Create the quote request and tell the client the price before work starts.",
        "Confirm completion in the ticket with a link to the changed page."
      ]
    },
    {
      id: 6,
      category: "Hosting Support",
      title: "Storage limits and upgrades",
      summary: "What counts toward storage and how to sell more of it.",
      steps: [
        "Limits: Self-Managed 1 GB, Managed 5 GB, Website Management 10 GB. Usage shows on the account page in this panel.",
        "Images, uploaded files, and backups count. The site code itself does not.",
        "Extra storage is $5 per GB per month, added to any plan.",
        "At 90% usage, reach out proactively before the client hits the wall.",
        "Large video files are usually the culprit. Offer to move video to a video host and embed it, which is often better than buying storage."
      ]
    },
    {
      id: 7,
      category: "Tickets & Quotes",
      title: "Handling a quote form lead",
      summary: "Turning a Get a Quote submission into a client.",
      steps: [
        "Quote form submissions arrive as tickets with source 'quote form'. Respond within 24 hours, that is a public promise on the website.",
        "Read what they asked for and match it to a tier: Single Page $250+, Business Website $900+, Advanced Build $2,200+, Online Store $3,800+, Complete Platform $6,500+, SEO Bundle $2,400+.",
        "Always offer hosting with the build. A Business Website plus Managed Hosting is our most common bundle.",
        "If the request is vague, reply with two or three specific questions rather than a generic price range.",
        "Once they accept, an admin creates the account and the project enters the services list."
      ]
    },
    {
      id: 8,
      category: "Tickets & Quotes",
      title: "Refunds and cancellations",
      summary: "What support can promise and what needs an admin.",
      steps: [
        "Hosting and monthly plans: clients can cancel anytime, effective at the end of the paid period. No partial-month refunds.",
        "Term commitments: cancelling early forfeits the discount on the months already used. An admin calculates the adjustment.",
        "Project builds: the deposit is non-refundable once work starts. Remaining milestones are only billed as delivered.",
        "Never promise a refund amount in writing. Say you will confirm the exact figure and escalate to an admin the same day.",
        "Always ask why they are leaving and log it in the ticket. Retention offers (a free month, a plan downgrade) are admin approved."
      ]
    },
    {
      id: 9,
      category: "Escalation",
      title: "When to escalate to developers",
      summary: "Support fixes vs dev fixes, and how to hand off cleanly.",
      steps: [
        "Escalate immediately: site fully down, checkout or booking broken, security warnings, data loss. Mark the ticket urgent.",
        "Escalate same day: broken forms, layout glitches on real devices, email delivery failures.",
        "Do not escalate: content changes, plan questions, billing, anything covered by a guide here.",
        "A good handoff includes: the account number, exact steps to reproduce, a screenshot or the client's description, and what you already checked.",
        "Tell the client a human is on it and give a realistic window. Under-promise, over-deliver."
      ]
    }
  ]
};
