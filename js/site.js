/* Velocube — site.js
   Shared behavior: header state, mobile nav, scroll reveals, footer year,
   contact form submit (Formspree). */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Sticky header state ---- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Mobile navigation ---- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-menu");

  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("open", open);
    document.body.classList.toggle("nav-open", open);
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });

    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---- Scroll reveal ---- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length && !reducedMotion && "IntersectionObserver" in window) {
    document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
      group.querySelectorAll("[data-reveal]").forEach(function (el, i) {
        el.style.setProperty("--reveal-delay", Math.min(i * 60, 480) + "ms");
      });
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
    );

    revealEls.forEach(function (el) {
      io.observe(el);
    });

    // Safety net: if the observer never fires (rare browser states),
    // reveal everything rather than leave content invisible.
    setTimeout(function () {
      if (!document.querySelector("[data-reveal].revealed")) {
        revealEls.forEach(function (el) {
          el.classList.add("revealed");
        });
      }
    }, 2000);
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("revealed");
    });
  }

  /* ---- Services category filter ---- */
  var filterTabs = document.querySelectorAll(".filter-tab");
  var svcCards = document.querySelectorAll("#svc-grid .svc-mini");

  if (filterTabs.length && svcCards.length) {
    filterTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var filter = tab.getAttribute("data-filter");

        filterTabs.forEach(function (t) {
          t.setAttribute("aria-selected", String(t === tab));
        });

        svcCards.forEach(function (card) {
          var show = filter === "all" || card.getAttribute("data-category") === filter;
          card.classList.toggle("is-hidden", !show);
        });
      });
    });
  }

  /* ---- Billing term selector (hosting page) ----
     Picking a term updates every element with data-base-price:
     plan cards get a struck original price and a savings line,
     rate rows just show the discounted monthly figure. */
  var termTabs = document.querySelectorAll(".term-tab");
  var priceEls = document.querySelectorAll("[data-base-price]");

  if (termTabs.length && priceEls.length) {
    var applyTerm = function (months, discountPct) {
      priceEls.forEach(function (el) {
        var base = parseFloat(el.getAttribute("data-base-price"));
        var discounted = Math.round(base * (1 - discountPct / 100));
        el.innerHTML = "$" + discounted.toLocaleString() + "<small>/mo</small>";
        el.classList.remove("price-tick");
        void el.offsetWidth; // restart the animation
        el.classList.add("price-tick");

        // Plan cards carry a sibling .plan-save line for the detail text.
        var save = el.parentElement.querySelector(".plan-save");
        if (save) {
          if (discountPct > 0) {
            var totalSaved = Math.round(base * months * (discountPct / 100));
            save.innerHTML =
              '<span class="was">$' + base.toLocaleString() + "/mo</span>" +
              '<span class="save-amt">Save $' + totalSaved.toLocaleString() +
              " over " + months + " months</span>";
          } else {
            save.innerHTML = "";
          }
        }
      });
    };

    termTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        termTabs.forEach(function (t) {
          t.setAttribute("aria-selected", String(t === tab));
        });
        applyTerm(
          parseInt(tab.getAttribute("data-term"), 10),
          parseFloat(tab.getAttribute("data-discount"))
        );
      });
    });
  }

  /* ---- Footer year ---- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---- Contact form (Formspree) ---- */
  var form = document.getElementById("quote-form");
  var status = document.getElementById("form-status");

  if (form && status) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";
      status.textContent = "";

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var submitBtn = form.querySelector('button[type="submit"]');
      var originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            status.className = "form-status ok";
            status.textContent =
              "Thanks, we got it. Expect a reply from hr@velocube.net within 12 to 24 hours.";
          } else {
            throw new Error("Request failed");
          }
        })
        .catch(function () {
          status.className = "form-status err";
          status.textContent =
            "Something went wrong sending the form. Email us directly at hr@velocube.net or call (718) 635-0662.";
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        });
    });
  }
})();
