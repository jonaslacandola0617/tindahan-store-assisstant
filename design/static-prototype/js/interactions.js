/* ==========================================================================
   INTERACTIONS.JS
   Page-level interactive behavior. Every initializer guards on the presence
   of its root element so this single file is safe to include on every page.
   ========================================================================== */

(function () {
  "use strict";
  const fmt = (n) => "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 0 });

  /* ---------------------------------------------------------------- *
   * Quantity steppers (record sale, product detail adjustment)
   * ---------------------------------------------------------------- */
  function initSteppers(root) {
    (root || document).querySelectorAll(".stepper").forEach((stepper) => {
      if (stepper.dataset.wired) return;
      stepper.dataset.wired = "true";
      const input = stepper.querySelector("input");
      const max = input.dataset.max ? parseInt(input.dataset.max, 10) : Infinity;
      const min = input.min ? parseInt(input.min, 10) : 0;

      function clamp(v) { return Math.max(min, Math.min(max === Infinity ? v : max, v)); }
      function set(v) {
        const val = clamp(v);
        input.value = val;
        stepper.classList.toggle("stepper-at-max", max !== Infinity && val >= max);
        input.dispatchEvent(new CustomEvent("stepper:change", { bubbles: true, detail: { value: val, max } }));
      }
      stepper.querySelector('[data-step="dec"]').addEventListener("click", () => set((parseInt(input.value, 10) || 0) - 1));
      stepper.querySelector('[data-step="inc"]').addEventListener("click", () => set((parseInt(input.value, 10) || 0) + 1));
      input.addEventListener("change", () => set(parseInt(input.value, 10) || min));
    });
  }

  /* ---------------------------------------------------------------- *
   * Inventory filters, search, and persisted list/grid view
   * ---------------------------------------------------------------- */
  function initInventoryFilters() {
    const list = document.querySelector("[data-inventory-list]");
    if (!list) return;
    const rows = Array.from(list.querySelectorAll("[data-status]"));
    const products = (typeof TINDAHAN_DATA !== "undefined" && TINDAHAN_DATA.products) || [];
    const chips = Array.from(document.querySelectorAll("[data-inventory-filter]"));
    const search = document.querySelector("[data-inventory-search]");
    const grid = document.querySelector("[data-inventory-grid]");
    const viewButtons = Array.from(document.querySelectorAll("[data-inventory-view]"));
    const feedback = document.querySelector("[data-inventory-feedback]");
    const viewLive = document.querySelector("[data-inventory-view-live]");
    const empty = document.querySelector("[data-inventory-empty]");
    const noProducts = document.querySelector("[data-inventory-no-products]");
    const loading = document.querySelector("[data-inventory-loading]");
    const error = document.querySelector("[data-inventory-error]");
    const resetButton = document.querySelector("[data-inventory-reset]");
    const retryButton = document.querySelector("[data-inventory-retry]");
    const storageKey = "tindahan.inventoryView";
    let activeFilter = "all";
    let activeView = "list";

    rows.forEach((row, index) => {
      if (products[index]) row.dataset.productId = products[index].id;
    });

    function language() {
      return window.tindahanLanguage === "fil" ? "fil" : "en";
    }

    function safeStoredView() {
      try {
        const stored = window.localStorage.getItem(storageKey);
        return stored === "grid" || stored === "list" ? stored : "list";
      } catch (err) {
        return "list";
      }
    }

    function storeView(view) {
      try {
        window.localStorage.setItem(storageKey, view);
      } catch (err) {
        /* The preference is optional when storage is unavailable. */
      }
    }

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function statusMeta(status, lang) {
      if (status === "out") {
        return { className: "badge-danger", icon: "icon-x-circle", label: lang === "fil" ? "Ubos na" : "Out of stock" };
      }
      if (status === "low") {
        return { className: "badge-warning", icon: "icon-alert-triangle", label: lang === "fil" ? "Paubos na" : "Low stock" };
      }
      return { className: "badge-success", icon: "icon-check", label: lang === "fil" ? "May stock" : "In stock" };
    }

    function localizedUnit(unit, lang) {
      if (lang !== "fil") return unit || "piece";
      return {
        piece: "piraso",
        bottle: "bote",
        can: "lata",
        pack: "pakete",
        cup: "tasa"
      }[unit] || unit || "piraso";
    }

    function productForRow(row, index) {
      const product = products.find((item) => item.id === row.dataset.productId) || products[index] || {};
      return Object.assign({}, product, {
        name: product.name || row.querySelector(".row-title")?.textContent.trim() || "",
        category: product.category || "",
        status: row.dataset.status || product.status || "ok",
        recentlyUpdated: row.dataset.recent === "true"
      });
    }

    function cardMarkup(item, lang) {
      const product = item.product;
      const meta = statusMeta(product.status, lang);
      const hasBarcode = Boolean(product.manufacturerBarcode || product.internalBarcode);
      const unitLabel = localizedUnit(product.unit, lang);
      const updatedText = lang === "fil"
        ? "Na-update kamakailan"
        : (product.lastUpdated ? "Updated " + product.lastUpdated.toLowerCase() : "Updated recently");
      const barcodeLabel = lang === "fil" ? "May barcode" : "Barcode saved";
      const thumb = product.image
        ? '<img src="' + escapeHtml(product.image) + '" alt="" loading="lazy">'
        : '<svg class="icon" aria-hidden="true"><use href="#icon-package"></use></svg>';

      return (
        '<a class="inventory-card" href="product-details.html" data-product-id="' + escapeHtml(product.id || "") + '">' +
          '<div class="inventory-card-header">' +
            '<span class="inventory-card-thumb" aria-hidden="true">' + thumb + '</span>' +
            '<span class="badge ' + meta.className + '">' +
              '<svg class="icon icon-sm" aria-hidden="true"><use href="#' + meta.icon + '"></use></svg>' +
              escapeHtml(meta.label) +
            '</span>' +
          '</div>' +
          '<div class="inventory-card-copy">' +
            '<span class="inventory-card-name">' + escapeHtml(product.name) + '</span>' +
            '<span class="inventory-card-category">' + escapeHtml(product.category) + '</span>' +
          '</div>' +
          '<div class="inventory-card-stock">' +
            '<span><strong>' + escapeHtml(product.qty == null ? 0 : product.qty) + '</strong> ' + escapeHtml(unitLabel) + '</span>' +
            '<strong>' + escapeHtml(fmt(Number(product.price) || 0)) + '</strong>' +
          '</div>' +
          ((hasBarcode || product.recentlyUpdated) ?
            '<div class="inventory-card-footer">' +
              (hasBarcode ?
                '<span class="inventory-card-barcode"><svg class="icon icon-sm" aria-hidden="true"><use href="#icon-tag"></use></svg>' +
                escapeHtml(barcodeLabel) + '</span>' : "") +
              (product.recentlyUpdated ? '<span>' + escapeHtml(updatedText) + '</span>' : "") +
            '</div>' : "") +
        '</a>'
      );
    }

    function resultMessage(count, q, lang) {
      if (q) {
        return lang === "fil"
          ? count + ' resulta para sa “' + search.value.trim() + '”'
          : count + ' result' + (count === 1 ? "" : "s") + ' for “' + search.value.trim() + '”';
      }
      const labels = lang === "fil"
        ? { all: "produkto", low: "produktong paubos na", out: "produktong ubos na", recent: "produktong na-update kamakailan" }
        : { all: count === 1 ? "product" : "products", low: "low-stock products", out: "out-of-stock products", recent: "recently updated products" };
      return count + " " + labels[activeFilter];
    }

    function setView(view, announce) {
      activeView = view === "grid" ? "grid" : "list";
      const hasResults = rows.some((row) => row.style.display !== "none");
      list.hidden = activeView !== "list" || !hasResults;
      if (grid) grid.hidden = activeView !== "grid" || !hasResults;
      viewButtons.forEach((button) => {
        const selected = button.dataset.inventoryView === activeView;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      storeView(activeView);
      if (announce && viewLive) {
        viewLive.textContent = language() === "fil"
          ? (activeView === "grid" ? "Grid view ang ipinapakita" : "List view ang ipinapakita")
          : (activeView === "grid" ? "Grid view shown" : "List view shown");
      }
    }

    function apply() {
      const q = (search && search.value ? search.value : "").trim().toLowerCase();
      const lang = language();
      const matches = [];

      rows.forEach((row, index) => {
        const product = productForRow(row, index);
        const matchesFilter =
          activeFilter === "all" ? true :
          activeFilter === "recent" ? row.dataset.recent === "true" :
          row.dataset.status === activeFilter;
        const searchText = [
          row.dataset.search,
          product.name,
          product.category,
          product.supplier,
          product.manufacturerBarcode,
          product.internalBarcode
        ].filter(Boolean).join(" ").toLowerCase();
        const matchesSearch = !q || searchText.includes(q);
        const show = matchesFilter && matchesSearch;
        row.style.display = show ? "" : "none";
        if (show) matches.push({ row, product });
      });

      if (grid) grid.innerHTML = matches.map((item) => cardMarkup(item, lang)).join("");
      if (feedback) feedback.textContent = resultMessage(matches.length, q, lang);

      const demoState = new URLSearchParams(window.location.search).get("inventory-state");
      const isLoading = demoState === "loading";
      const isError = demoState === "error";
      const isEmptyInventory = demoState === "empty";
      const noMatches = matches.length === 0 && !isEmptyInventory;

      if (loading) loading.hidden = !isLoading;
      if (error) error.hidden = !isError;
      if (noProducts) noProducts.hidden = !isEmptyInventory;
      if (empty) empty.hidden = !noMatches || isLoading || isError;
      if (feedback) feedback.hidden = isLoading || isError || isEmptyInventory;

      const showResults = !isLoading && !isError && !isEmptyInventory && matches.length > 0;
      list.hidden = activeView !== "list" || !showResults;
      if (grid) grid.hidden = activeView !== "grid" || !showResults;
    }

    chips.forEach((chip) => {
      chip.setAttribute("aria-pressed", chip.dataset.inventoryFilter === activeFilter ? "true" : "false");
      chip.addEventListener("click", () => {
        chips.forEach((c) => {
          c.classList.remove("active");
          c.setAttribute("aria-pressed", "false");
        });
        chip.classList.add("active");
        chip.setAttribute("aria-pressed", "true");
        activeFilter = chip.getAttribute("data-inventory-filter");
        apply();
      });
    });
    viewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setView(button.dataset.inventoryView, true);
        apply();
      });
    });
    search && search.addEventListener("input", apply);
    resetButton && resetButton.addEventListener("click", () => {
      if (search) search.value = "";
      activeFilter = "all";
      chips.forEach((chip) => {
        const selected = chip.dataset.inventoryFilter === "all";
        chip.classList.toggle("active", selected);
        chip.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      apply();
      if (search) search.focus();
    });
    retryButton && retryButton.addEventListener("click", () => {
      window.history.replaceState({}, "", window.location.pathname);
      apply();
    });
    document.addEventListener("tindahan:languagechange", apply);
    activeView = safeStoredView();
    setView(activeView, false);
    apply();
  }

  /* ---------------------------------------------------------------- *
   * Receipt review flow
   * ---------------------------------------------------------------- */
  function initReceiptReview() {
    const root = document.querySelector("[data-review-root]");
    if (!root) return;
    const confirmBtn = document.querySelector("[data-confirm-receipt]");
    const progressText = document.querySelector("[data-review-progress]");
    const progressFill = document.querySelector("[data-review-progress-fill]");

    function pendingCount() {
      return root.querySelectorAll(".review-line.state-attention, .review-line.state-new, .review-line.state-unreadable").length;
    }
    function total() {
      return root.querySelectorAll(".review-line").length;
    }

    function refresh() {
      const pending = pendingCount();
      const done = total() - pending;
      if (progressText) progressText.textContent = done + " of " + total() + " items ready";
      if (progressFill) progressFill.style.width = Math.round((done / total()) * 100) + "%";
      if (confirmBtn) {
        confirmBtn.disabled = pending > 0;
        confirmBtn.title = pending > 0 ? "Check every item before confirming" : "";
      }
    }

    root.addEventListener("click", (e) => {
      const action = e.target.closest("[data-line-action]");
      if (!action) return;
      const line = action.closest(".review-line");
      const act = action.getAttribute("data-line-action");
      if (act === "confirm-match" || act === "add-new" || act === "skip") {
        line.classList.remove("state-attention", "state-new", "state-unreadable");
        line.classList.add("state-ready");
        const status = line.querySelector("[data-line-status]");
        if (status) {
          status.textContent = act === "skip" ? "Skipped" : act === "add-new" ? "Will be added as new" : "Ready";
        }
        const actions = line.querySelector(".review-line-actions");
        if (actions) actions.style.display = "none";
      }
      refresh();
    });

    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        if (confirmBtn.disabled) return;
        window.tindahanOpenModal && window.tindahanOpenModal("receipt-success-modal");
      });
    }

    refresh();
  }

  /* ---------------------------------------------------------------- *
   * Dropzone (receipt upload)
   * ---------------------------------------------------------------- */
  function initDropzone() {
    const zone = document.querySelector("[data-dropzone]");
    if (!zone) return;
    const input = zone.querySelector("input[type=file]");
    const idleView = zone.querySelector("[data-dz-idle]");
    const loadingView = document.querySelector("[data-dz-loading]");
    const doneView = document.querySelector("[data-dz-done]");

    function simulateProcessing() {
      zone.style.display = "none";
      if (loadingView) loadingView.style.display = "flex";
      setTimeout(() => {
        if (loadingView) loadingView.style.display = "none";
        if (doneView) doneView.style.display = "flex";
      }, 1600);
    }

    ["dragenter", "dragover"].forEach((evt) => zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add("is-dragover"); }));
    ["dragleave", "drop"].forEach((evt) => zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.remove("is-dragover"); }));
    zone.addEventListener("drop", simulateProcessing);
    input && input.addEventListener("change", () => { if (input.files.length) simulateProcessing(); });
    zone.querySelectorAll("[data-dz-browse]").forEach((b) => b.addEventListener("click", () => input && input.click()));
  }

  /* ---------------------------------------------------------------- *
   * Record sale
   * ---------------------------------------------------------------- */
  function initRecordSale() {
    const root = document.querySelector("[data-sale-root]");
    if (!root || typeof TINDAHAN_DATA === "undefined") return;
    if (root.dataset.barcodeWired === "true") return;

    const pickerList = document.querySelector("[data-sale-picker]");
    const searchInput = document.querySelector("[data-sale-search]");
    const lineList = document.querySelector("[data-sale-lines]");
    const emptyState = document.querySelector("[data-sale-empty]");
    const totalEl = document.querySelector("[data-sale-total]");
    const countEl = document.querySelector("[data-sale-count]");
    const warningEl = document.querySelector("[data-sale-warning]");
    const confirmBtn = document.querySelector("[data-sale-confirm]");
    const lines = new Map();

    const frequent = TINDAHAN_DATA.products.slice(0, 10);

    function renderPicker(filterText) {
      if (!pickerList) return;
      const q = (filterText || "").toLowerCase().trim();
      const source = q
        ? TINDAHAN_DATA.products.filter((p) => p.name.toLowerCase().includes(q))
        : frequent;
      pickerList.innerHTML = source.slice(0, 8).map((p) => (
        '<button type="button" class="row-item is-interactive" data-pick="' + p.id + '" style="width:100%;text-align:left">' +
          '<span class="product-thumb"><svg class="icon"><use href="assets/icons/sprite.svg#icon-bag"></use></svg></span>' +
          '<span class="row-main"><span class="row-title">' + p.name + '</span><span class="row-meta">' + fmt(p.price) + ' · ' + p.qty + ' in stock</span></span>' +
          '<svg class="icon" style="color:var(--color-text-faint)"><use href="assets/icons/sprite.svg#icon-plus"></use></svg>' +
        '</button>'
      )).join("");
    }

    function renderLines() {
      if (!lineList) return;
      const ids = Array.from(lines.keys());
      lineList.innerHTML = ids.map((id) => {
        const l = lines.get(id);
        return (
          '<div class="row-item" data-line="' + id + '">' +
            '<span class="row-main"><span class="row-title">' + l.name + '</span><span class="row-meta">' + fmt(l.price) + ' each · ' + l.stock + ' in stock</span></span>' +
            '<div class="stepper" style="margin:0 var(--space-2)">' +
              '<button type="button" data-step="dec" aria-label="Decrease quantity"><svg class="icon icon-sm"><use href="assets/icons/sprite.svg#icon-minus"></use></svg></button>' +
              '<input type="number" value="' + l.qty + '" data-max="' + l.stock + '" min="1" aria-label="Quantity for ' + l.name + '">' +
              '<button type="button" data-step="inc" aria-label="Increase quantity"><svg class="icon icon-sm"><use href="assets/icons/sprite.svg#icon-plus"></use></svg></button>' +
            '</div>' +
            '<span class="row-value" style="min-width:72px">' + fmt(l.price * l.qty) + '</span>' +
            '<button type="button" class="btn-icon btn-ghost" data-remove-line="' + id + '" aria-label="Remove ' + l.name + '"><svg class="icon"><use href="assets/icons/sprite.svg#icon-trash"></use></svg></button>' +
          '</div>'
        );
      }).join("");
      initSteppers(lineList);
      refreshTotals();
    }

    function refreshTotals() {
      let total = 0, count = 0, overStock = [];
      lines.forEach((l) => {
        total += l.price * l.qty;
        count += l.qty;
        if (l.qty > l.stock) overStock.push(l.name);
      });
      if (totalEl) totalEl.textContent = fmt(total);
      if (countEl) countEl.textContent = count;
      if (emptyState) emptyState.style.display = lines.size === 0 ? "flex" : "none";
      if (lineList) lineList.style.display = lines.size === 0 ? "none" : "flex";
      if (warningEl) {
        if (overStock.length) {
          warningEl.style.display = "flex";
          warningEl.querySelector("[data-sale-warning-text]").textContent =
            "You're recording more " + overStock[0] + " than you have in stock. Double-check before confirming.";
        } else {
          warningEl.style.display = "none";
        }
      }
      if (confirmBtn) confirmBtn.disabled = lines.size === 0;
    }

    pickerList && pickerList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-pick]");
      if (!btn) return;
      const id = btn.getAttribute("data-pick");
      const product = TINDAHAN_DATA.products.find((p) => p.id === id);
      if (!product) return;
      if (lines.has(id)) {
        lines.get(id).qty += 1;
      } else {
        lines.set(id, { name: product.name, price: product.price, stock: product.qty, qty: 1 });
      }
      renderLines();
    });

    searchInput && searchInput.addEventListener("input", () => renderPicker(searchInput.value));

    lineList && lineList.addEventListener("click", (e) => {
      const rm = e.target.closest("[data-remove-line]");
      if (rm) { lines.delete(rm.getAttribute("data-remove-line")); renderLines(); }
    });
    lineList && lineList.addEventListener("stepper:change", (e) => {
      const row = e.target.closest("[data-line]");
      if (!row) return;
      const id = row.getAttribute("data-line");
      if (lines.has(id)) { lines.get(id).qty = e.detail.value; refreshTotals(); row.querySelector(".row-value").textContent = fmt(lines.get(id).price * lines.get(id).qty); }
    });

    confirmBtn && confirmBtn.addEventListener("click", () => {
      if (confirmBtn.disabled) return;
      window.tindahanOpenModal && window.tindahanOpenModal("sale-success-modal");
    });

    renderPicker();
    refreshTotals();
  }

  /* ---------------------------------------------------------------- *
   * Notifications
   * ---------------------------------------------------------------- */
  function initNotifications() {
    const list = document.querySelector("[data-notif-list]");
    if (!list) return;
    const counter = document.querySelector("[data-notif-unread-count]");
    function refreshCounter() {
      const unread = list.querySelectorAll(".notif-item.is-unread").length;
      if (counter) counter.textContent = unread;
    }
    list.addEventListener("click", (e) => {
      const item = e.target.closest(".notif-item");
      if (!item) return;
      item.classList.remove("is-unread");
      const dot = item.querySelector(".notif-dot");
      if (dot) dot.classList.add("is-read");
      refreshCounter();
    });
    const markAll = document.querySelector("[data-notif-mark-all]");
    markAll && markAll.addEventListener("click", () => {
      list.querySelectorAll(".notif-item").forEach((i) => { i.classList.remove("is-unread"); const d = i.querySelector(".notif-dot"); d && d.classList.add("is-read"); });
      refreshCounter();
    });
    refreshCounter();
  }

  /* ---------------------------------------------------------------- *
   * Global / page search
   * ---------------------------------------------------------------- */
  function initSearchPage() {
    const input = document.querySelector("[data-search-input]");
    const results = document.querySelector("[data-search-results]");
    const empty = document.querySelector("[data-search-empty]");
    const countEl = document.querySelector("[data-search-count]");
    if (!input || !results || typeof TINDAHAN_DATA === "undefined") return;

    function render(list, query) {
      results.innerHTML = list.map((p) => (
        '<a class="row-item is-interactive" href="product-details.html">' +
          '<span class="product-thumb"><svg class="icon"><use href="assets/icons/sprite.svg#icon-bag"></use></svg></span>' +
          '<span class="row-main"><span class="row-title">' + p.name + '</span><span class="row-meta">' +
            (query && /^\d+$/.test(query) ? "Barcode · " + ([p.manufacturerBarcode, p.internalBarcode].find((code) => code && code.includes(query)) || "") : p.category + " · " + p.supplier) +
          '</span></span>' +
          statusBadge(p) +
          '<span class="row-value">' + fmt(p.price) + '</span>' +
        '</a>'
      )).join("");
      if (countEl) countEl.textContent = list.length;
      if (empty) empty.style.display = list.length === 0 ? "flex" : "none";
      results.style.display = list.length === 0 ? "none" : "flex";
    }
    function statusBadge(p) {
      if (p.status === "out") return '<span class="badge badge-danger">Out of stock</span>';
      if (p.status === "low") return '<span class="badge badge-warning">Low stock</span>';
      return '<span class="badge badge-neutral">' + p.qty + ' ' + p.unit + '</span>';
    }
    function run() {
      const q = input.value.trim().toLowerCase();
      if (!q) { results.style.display = "none"; if (empty) empty.style.display = "none"; if (countEl) countEl.textContent = "0"; return; }
      const matches = TINDAHAN_DATA.products.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q) ||
        (p.manufacturerBarcode || "").includes(q) ||
        (p.internalBarcode || "").includes(q)
      );
      render(matches, q);
    }
    input.addEventListener("input", run);
    input.focus();
  }

  function initGreeting() {
    const el = document.querySelector("[data-greeting]");
    if (!el) return;
    const hour = new Date().getHours();
    const en = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const fil = hour < 12 ? "Magandang umaga" : hour < 18 ? "Magandang hapon" : "Magandang gabi";
    el.dataset.en = en + ", Rosa";
    el.dataset.fil = fil + ", Rosa";
    el.textContent = el.dataset.en;
  }

  /* ---------------------------------------------------------------- *
   * Generic tabs: .tabs > [data-tab] toggles [data-tab-panel]
   * ---------------------------------------------------------------- */
  function initTabs() {
    document.querySelectorAll(".tabs").forEach((tabs) => {
      const group = tabs.getAttribute("data-tabs-group");
      const panels = document.querySelectorAll('[data-tab-panel][data-tabs-group="' + group + '"]');
      tabs.querySelectorAll("[data-tab]").forEach((tab) => {
        tab.addEventListener("click", () => {
          tabs.querySelectorAll("[data-tab]").forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
          const target = tab.getAttribute("data-tab");
          panels.forEach((p) => { p.style.display = p.getAttribute("data-tab-panel") === target ? "" : "none"; });
        });
      });
    });
  }

  /* ---------------------------------------------------------------- *
   * Generic accordion row: [data-accordion-toggle] shows/hides the next
   * sibling [data-accordion-panel] and rotates a chevron icon.
   * ---------------------------------------------------------------- */
  function initAccordion() {
    document.querySelectorAll("[data-accordion-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = btn.parentElement.querySelector("[data-accordion-panel]");
        const chevron = btn.querySelector("[data-accordion-chevron]");
        if (!panel) return;
        const open = panel.style.display !== "none";
        panel.style.display = open ? "none" : "block";
        if (chevron) chevron.style.transform = open ? "" : "rotate(180deg)";
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initGreeting();
    initTabs();
    initAccordion();
    initSteppers();
    initInventoryFilters();
    initReceiptReview();
    initDropzone();
    initRecordSale();
    initNotifications();
    initSearchPage();
  });
})();
