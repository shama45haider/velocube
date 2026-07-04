/* Velocube — home.js
   Landing page behavior: stat count-ups, pricing slider, work carousel, quote form. */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Stat count-up ---- */
  var statNums = document.querySelectorAll("[data-count]");

  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var start = null;
    var duration = 1300;

    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      // ease-out cubic
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (statNums.length) {
    if (reducedMotion || !("IntersectionObserver" in window)) {
      statNums.forEach(function (el) {
        el.textContent = el.getAttribute("data-count");
      });
    } else {
      var statIO = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              statIO.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      statNums.forEach(function (el) {
        statIO.observe(el);
      });
    }
  }

  /* ---- Pricing tier slider ---- */
  var range = document.getElementById("tier-range");
  var rangeWrap = document.querySelector(".range-wrap");
  var stopBtns = document.querySelectorAll(".tier-stops button");
  var panels = document.querySelectorAll(".tier-panel");

  function setTier(value) {
    var v = String(value);
    if (range) {
      range.value = v;
      var pct = (Number(v) / (Number(range.max) || 1)) * 100;
      if (rangeWrap) rangeWrap.style.setProperty("--fill", pct + "%");
    }
    panels.forEach(function (panel) {
      panel.classList.toggle("active", panel.getAttribute("data-tier") === v);
    });
    stopBtns.forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-tier") === v));
    });
  }

  if (range) {
    range.addEventListener("input", function () {
      setTier(range.value);
    });
    stopBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        setTier(btn.getAttribute("data-tier"));
      });
    });
    setTier(range.value);
  }

  /* ---- Work carousel ---- */
  var track = document.querySelector(".work-track");

  function slideBy(dir) {
    if (!track) return;
    var card = track.querySelector(".work-card");
    var step = card ? card.getBoundingClientRect().width + 20 : 360;
    track.scrollBy({ left: dir * step, behavior: reducedMotion ? "auto" : "smooth" });
  }

  var prevBtn = document.querySelector("[data-carousel-prev]");
  var nextBtn = document.querySelector("[data-carousel-next]");
  if (prevBtn) prevBtn.addEventListener("click", function () { slideBy(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { slideBy(1); });

  /* ---- Quote form (Formspree) ---- */
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
