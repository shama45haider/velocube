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
