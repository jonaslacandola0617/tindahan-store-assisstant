/* ==========================================================================
   APP.JS — shell-level behavior shared by every page
   Theme, language, toasts, modals, drawers, popovers.
   Note: theme/language apply instantly to the current page. Because this is
   a framework-free, multi-page static prototype (no backend, no storage
   APIs per the environment's constraints), preference does not persist
   across a full page navigation — this is a documented prototype limitation,
   see design/CODEX_HANDOFF.md.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------- *
   * Theme toggle (light / dark)
   * ---------------------------------------------------------------- */
  function initTheme() {
    const root = document.documentElement;
    const toggles = document.querySelectorAll("[data-theme-toggle]");

    function apply(theme) {
      if (theme === "dark") {
        root.setAttribute("data-theme", "dark");
      } else {
        root.removeAttribute("data-theme");
      }
      toggles.forEach((btn) => {
        btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
        const useEl = btn.querySelector("use");
        if (useEl) useEl.setAttribute("href", theme === "dark" ? "assets/icons/sprite.svg#icon-sun" : "assets/icons/sprite.svg#icon-moon");
      });
    }

    toggles.forEach((btn) => {
      btn.addEventListener("click", () => {
        const isDark = root.getAttribute("data-theme") === "dark";
        apply(isDark ? "light" : "dark");
      });
    });
  }

  /* ---------------------------------------------------------------- *
   * Language toggle (English / Filipino)
   * Elements opt in with: <span class="i18n" data-en="Add product" data-fil="Magdagdag ng produkto">Add product</span>
   * ---------------------------------------------------------------- */
  function initLanguage() {
    const toggles = document.querySelectorAll("[data-lang-toggle]");
    const nodes = document.querySelectorAll(".i18n");
    let current = "en";

    function apply(lang) {
      current = lang;
      document.documentElement.lang = lang === "fil" ? "fil" : "en";
      nodes.forEach((el) => {
        const text = el.dataset[lang === "fil" ? "fil" : "en"];
        if (text) el.textContent = text;
      });
      document.querySelectorAll("[data-aria-en]").forEach((el) => {
        const label = lang === "fil" ? el.dataset.ariaFil : el.dataset.ariaEn;
        if (label) el.setAttribute("aria-label", label);
      });
      toggles.forEach((t) => {
        t.querySelectorAll("[data-lang-option]").forEach((opt) => {
          opt.classList.toggle("active", opt.getAttribute("data-lang-option") === lang);
        });
      });
      document.querySelectorAll("[data-lang-badge]").forEach((b) => {
        b.textContent = lang === "fil" ? "FIL" : "EN";
      });
      window.tindahanLanguage = lang;
      document.dispatchEvent(new CustomEvent("tindahan:languagechange", { detail: { lang } }));
    }

    toggles.forEach((toggle) => {
      toggle.querySelectorAll("[data-lang-option]").forEach((opt) => {
        opt.addEventListener("click", () => apply(opt.getAttribute("data-lang-option")));
      });
    });

    window.tindahanSetLanguage = apply;
  }

  /* ---------------------------------------------------------------- *
   * Sidebar collapse (desktop)
   * ---------------------------------------------------------------- */
  function initSidebarCollapse() {
    const shell = document.querySelector(".app-shell");
    const btns = document.querySelectorAll("[data-sidebar-toggle]");
    if (!shell) return;
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        shell.classList.toggle("is-collapsed");
      });
    });
  }

  /* ---------------------------------------------------------------- *
   * Mobile nav drawer (secondary destinations: Reports, Settings)
   * ---------------------------------------------------------------- */
  function initMobileDrawer() {
    const drawer = document.querySelector("[data-drawer='mobile-menu']");
    const scrim = document.querySelector("[data-scrim='mobile-menu']");
    const openers = document.querySelectorAll("[data-drawer-open='mobile-menu']");
    const closers = document.querySelectorAll("[data-drawer-close='mobile-menu']");
    if (!drawer) return;

    let returnFocus = null;
    function focusables(container) {
      return Array.from(container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    }
    function open(e) {
      returnFocus = e && e.currentTarget ? e.currentTarget : document.activeElement;
      drawer.classList.add("is-open");
      scrim && scrim.classList.add("is-open");
      document.body.style.overflow = "hidden";
      const first = focusables(drawer)[0];
      first && first.focus();
    }
    function close() {
      if (!drawer.classList.contains("is-open")) return;
      drawer.classList.remove("is-open");
      scrim && scrim.classList.remove("is-open");
      document.body.style.overflow = "";
      returnFocus && returnFocus.focus();
    }

    openers.forEach((b) => b.addEventListener("click", open));
    closers.forEach((b) => b.addEventListener("click", close));
    scrim && scrim.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab" || !drawer.classList.contains("is-open")) return;
      const items = focusables(drawer);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------------------------------------------------------------- *
   * Generic modal open/close: [data-modal-open="id"] / [data-modal-close]
   * ---------------------------------------------------------------- */
  function initModals() {
    const scrim = document.querySelector("[data-scrim='modal']") || createScrim();
    let returnFocus = null;

    function focusables(container) {
      return Array.from(container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    }

    function createScrim() {
      const el = document.createElement("div");
      el.className = "overlay-scrim";
      el.setAttribute("data-scrim", "modal");
      document.body.appendChild(el);
      return el;
    }

    function open(id) {
      const modal = document.getElementById(id);
      if (!modal) return;
      returnFocus = document.activeElement;
      modal.classList.add("is-open");
      scrim.classList.add("is-open");
      document.body.style.overflow = "hidden";
      const focusable = modal.querySelector("button, input, [href], select, textarea");
      focusable && focusable.focus();
    }
    function closeAll() {
      const hadOpenModal = !!document.querySelector(".modal.is-open");
      document.querySelectorAll(".modal.is-open").forEach((m) => m.classList.remove("is-open"));
      scrim.classList.remove("is-open");
      document.body.style.overflow = "";
      if (hadOpenModal && returnFocus) returnFocus.focus();
    }

    document.querySelectorAll("[data-modal-open]").forEach((btn) => {
      btn.addEventListener("click", () => open(btn.getAttribute("data-modal-open")));
    });
    document.querySelectorAll("[data-modal-close]").forEach((btn) => {
      btn.addEventListener("click", closeAll);
    });
    scrim.addEventListener("click", closeAll);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAll();
      if (e.key !== "Tab") return;
      const modal = document.querySelector(".modal.is-open");
      if (!modal) return;
      const items = focusables(modal);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    window.tindahanOpenModal = open;
    window.tindahanCloseModal = closeAll;
  }

  /* ---------------------------------------------------------------- *
   * Toasts
   * ---------------------------------------------------------------- */
  function ensureToastRegion() {
    let region = document.querySelector(".toast-region");
    if (!region) {
      region = document.createElement("div");
      region.className = "toast-region";
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", "polite");
      document.body.appendChild(region);
    }
    return region;
  }

  function showToast(message, type) {
    const region = ensureToastRegion();
    const toast = document.createElement("div");
    toast.className = "toast" + (type === "error" ? " toast-error" : "");
    const iconName = type === "error" ? "icon-alert-triangle" : "icon-check-circle";
    toast.innerHTML =
      '<svg class="icon toast-icon"><use href="assets/icons/sprite.svg#' + iconName + '"></use></svg>' +
      '<div class="toast-body">' + message + "</div>" +
      '<button class="toast-close" aria-label="Dismiss"><svg class="icon icon-sm"><use href="assets/icons/sprite.svg#icon-x"></use></svg></button>';
    region.appendChild(toast);
    const remove = () => toast.remove();
    toast.querySelector(".toast-close").addEventListener("click", remove);
    setTimeout(remove, 5000);
  }
  window.tindahanToast = showToast;

  /* ---------------------------------------------------------------- *
   * Popover (store switcher, user menu)
   * ---------------------------------------------------------------- */
  function initPopovers() {
    document.querySelectorAll("[data-popover-toggle]").forEach((btn) => {
      const id = btn.getAttribute("data-popover-toggle");
      const pop = document.getElementById(id);
      if (!pop) return;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = pop.classList.contains("is-open");
        document.querySelectorAll(".popover.is-open").forEach((p) => p.classList.remove("is-open"));
        pop.classList.toggle("is-open", !isOpen);
      });
    });
    document.addEventListener("click", () => {
      document.querySelectorAll(".popover.is-open").forEach((p) => p.classList.remove("is-open"));
    });
  }

  /* ---------------------------------------------------------------- *
   * "/" keyboard shortcut → jump to search (matches the kbd hint shown
   * next to the topbar search field)
   * ---------------------------------------------------------------- */
  function initSearchShortcut() {
    const target = document.querySelector(".topbar-search");
    if (!target) return;
    document.addEventListener("keydown", (e) => {
      if (e.key !== "/") return;
      const active = document.activeElement;
      const typing = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
      if (typing) return;
      e.preventDefault();
      target.click();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initLanguage();
    initSidebarCollapse();
    initMobileDrawer();
    initModals();
    initPopovers();
    initSearchShortcut();
  });
})();
