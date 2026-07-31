/* ==========================================================================
   NAVIGATION.JS
   Every page sets <body data-page="dashboard">. Nav links carry
   data-nav="dashboard". This keeps active-state logic in one place instead
   of hand-marking "active" classes on every duplicated shell across 14 files.
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const page = document.body.getAttribute("data-page");
    if (!page) return;

    document.querySelectorAll("[data-nav]").forEach((link) => {
      const isActive = link.getAttribute("data-nav") === page;
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  });
})();
