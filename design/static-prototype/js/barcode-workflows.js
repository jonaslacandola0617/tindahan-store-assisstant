/* ==========================================================================
   BARCODE WORKFLOWS
   Static-prototype behavior for barcode sales, recovery, product creation,
   and printable store-generated labels.
   ========================================================================== */

(function () {
  "use strict";

  const money = (value) => "₱" + Number(value).toLocaleString("en-PH");
  const lang = () => window.tindahanLanguage === "fil" ? "fil" : "en";
  const copy = (en, fil) => lang() === "fil" ? fil : en;
  const normalizeCode = (value) => String(value || "").replace(/[\s-]/g, "").trim();
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  function barcodeFor(code) {
    return TINDAHAN_DATA.products.find((product) =>
      normalizeCode(product.manufacturerBarcode) === code ||
      normalizeCode(product.internalBarcode) === code
    );
  }

  function initBarcodeSale() {
    const root = document.querySelector("[data-sale-root]");
    if (!root || typeof TINDAHAN_DATA === "undefined") return;
    root.dataset.barcodeWired = "true";

    const pickerList = document.querySelector("[data-sale-picker]");
    const searchInput = document.querySelector("[data-sale-search]");
    const lineList = document.querySelector("[data-sale-lines]");
    const emptyState = document.querySelector("[data-sale-empty]");
    const totalEl = document.querySelector("[data-sale-total]");
    const countEl = document.querySelector("[data-sale-count]");
    const warningEl = document.querySelector("[data-sale-warning]");
    const confirmBtn = document.querySelector("[data-sale-confirm]");
    const live = document.querySelector("[data-scan-live]");
    const scannerModal = document.getElementById("barcode-scan-modal");
    const lines = new Map();
    let lastScan = { code: "", time: 0 };
    let unknownCode = "";
    let selectedLinkId = "";

    function announce(message) {
      if (!live) return;
      live.textContent = "";
      window.setTimeout(() => { live.textContent = message; }, 20);
    }

    function showScanView(name) {
      if (!scannerModal) return;
      scannerModal.querySelectorAll("[data-scan-view]").forEach((view) => {
        view.hidden = view.getAttribute("data-scan-view") !== name;
      });
      const manual = scannerModal.querySelector("[data-manual-barcode]");
      if (name === "ready" && manual) manual.value = "";
    }

    function renderPicker(filterText) {
      if (!pickerList) return;
      const query = String(filterText || "").toLowerCase().trim();
      const source = query
        ? TINDAHAN_DATA.products.filter((product) =>
            product.name.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query) ||
            normalizeCode(product.manufacturerBarcode).includes(normalizeCode(query)) ||
            normalizeCode(product.internalBarcode).includes(normalizeCode(query)))
        : TINDAHAN_DATA.products.slice(0, 10);
      pickerList.innerHTML = source.slice(0, 8).map((product) =>
        '<button type="button" class="row-item is-interactive" data-pick="' + product.id + '" style="width:100%;text-align:left">' +
          '<span class="product-thumb"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-bag"></use></svg></span>' +
          '<span class="row-main"><span class="row-title">' + escapeHtml(product.name) + '</span>' +
          '<span class="row-meta">' + money(product.price) + " · " + product.qty + " " + copy("in stock", "nasa stock") + '</span></span>' +
          '<svg class="icon" aria-hidden="true" style="color:var(--color-text-faint)"><use href="assets/icons/sprite.svg#icon-plus"></use></svg>' +
        "</button>"
      ).join("");
    }

    function addProduct(product, source) {
      if (lines.has(product.id)) lines.get(product.id).qty += 1;
      else lines.set(product.id, { product, qty: 1 });
      renderLines();
      const message = product.name + " " + copy("added. Quantity", "idinagdag. Dami") + ": " + lines.get(product.id).qty + ".";
      announce(message);
      if (source === "scan") {
        const foundName = scannerModal && scannerModal.querySelector("[data-scan-found-name]");
        if (foundName) foundName.textContent = message;
        showScanView("found");
      } else {
        window.tindahanToast && window.tindahanToast(escapeHtml(message));
      }
    }

    function renderLines() {
      if (!lineList) return;
      lineList.innerHTML = Array.from(lines.entries()).map(([id, line]) => {
        const product = line.product;
        const conflict = line.qty > product.qty;
        return '<div class="row-item' + (conflict ? " sale-line-conflict" : "") + '" data-line="' + id + '">' +
          '<span class="row-main"><span class="row-title">' + escapeHtml(product.name) + '</span>' +
          '<span class="row-meta">' + money(product.price) + " " + copy("each", "bawat isa") + " · " + product.qty + " " + copy("in stock", "nasa stock") + '</span>' +
          (conflict ? '<span class="field-error">' + copy("Requested", "Hinihingi") + " " + line.qty + " · " + copy("Available", "Mayroon") + " " + product.qty + '</span>' : "") +
          '</span><div class="stepper" style="margin:0 var(--space-2)">' +
            '<button type="button" data-line-step="dec" aria-label="' + copy("Decrease quantity", "Bawasan ang dami") + '"><svg class="icon icon-sm" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-minus"></use></svg></button>' +
            '<input type="number" value="' + line.qty + '" min="1" data-line-input aria-label="' + copy("Quantity for ", "Dami ng ") + escapeHtml(product.name) + '">' +
            '<button type="button" data-line-step="inc" aria-label="' + copy("Increase quantity", "Dagdagan ang dami") + '"><svg class="icon icon-sm" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus"></use></svg></button>' +
          '</div><span class="row-value" style="min-width:72px">' + money(product.price * line.qty) + '</span>' +
          (conflict ? '<button type="button" class="btn btn-soft btn-sm" data-fix-stock="' + id + '">' + (product.qty === 0 ? copy("Remove", "Alisin") : copy("Use " + product.qty, "Gawing " + product.qty)) + '</button>' : "") +
          '<button type="button" class="btn-icon btn-ghost" data-remove-line="' + id + '" aria-label="' + copy("Remove ", "Alisin ang ") + escapeHtml(product.name) + '"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-trash"></use></svg></button>' +
        "</div>";
      }).join("");
      refreshTotals();
    }

    function refreshTotals() {
      let total = 0;
      let count = 0;
      const conflicts = [];
      lines.forEach((line) => {
        total += line.product.price * line.qty;
        count += line.qty;
        if (line.qty > line.product.qty) conflicts.push(line);
      });
      if (totalEl) totalEl.textContent = money(total);
      if (countEl) countEl.textContent = count;
      if (emptyState) emptyState.style.display = lines.size ? "none" : "flex";
      if (lineList) lineList.style.display = lines.size ? "flex" : "none";
      if (warningEl) {
        warningEl.style.display = conflicts.length ? "flex" : "none";
        const warningText = warningEl.querySelector("[data-sale-warning-text]");
        if (warningText && conflicts.length) {
          const line = conflicts[0];
          warningText.textContent = copy(
            line.product.name + ": " + line.product.qty + " in stock, " + line.qty + " requested. Reduce or remove this line.",
            line.product.name + ": " + line.product.qty + " ang stock, " + line.qty + " ang hinihingi. Bawasan o alisin ang item."
          );
        }
      }
      if (confirmBtn) {
        confirmBtn.disabled = !lines.size || conflicts.length > 0;
        confirmBtn.title = conflicts.length ? copy("Resolve stock conflicts before confirming", "Ayusin muna ang kulang na stock") : "";
      }
    }

    function resolveBarcode(rawCode, source) {
      const code = normalizeCode(rawCode);
      const error = scannerModal && scannerModal.querySelector("[data-barcode-error]");
      if (error) error.hidden = true;
      if (!/^\d{8,14}$/.test(code)) {
        const message = copy("Enter a valid 8–14 digit barcode.", "Maglagay ng wastong barcode na 8–14 numero.");
        if (error) { error.textContent = message; error.hidden = false; }
        announce(message);
        return;
      }
      const now = Date.now();
      if (lastScan.code === code && now - lastScan.time < 900) {
        const message = copy("Same barcode read too quickly. It was not added again.", "Masyadong mabilis nabasa ulit ang barcode. Hindi ito muling idinagdag.");
        announce(message);
        window.tindahanToast && window.tindahanToast(message);
        return;
      }
      lastScan = { code, time: now };
      const product = barcodeFor(code);
      if (product) {
        addProduct(product, source);
        return;
      }
      unknownCode = code;
      const unknown = scannerModal && scannerModal.querySelector("[data-unknown-code]");
      const prefill = scannerModal && scannerModal.querySelector("[data-scanned-product-code]");
      if (unknown) unknown.textContent = code;
      if (prefill) prefill.value = code;
      showScanView("unknown");
      if (scannerModal && !scannerModal.classList.contains("is-open")) window.tindahanOpenModal("barcode-scan-modal");
      announce(copy("Barcode not found. Nothing was added.", "Hindi nakita ang barcode. Walang idinagdag."));
    }

    function startCamera() {
      showScanView("scanning");
      announce(copy("Scanning started.", "Nagsimula ang pag-scan."));
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        window.setTimeout(() => showScanView("camera-error"), 700);
        return;
      }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        window.setTimeout(() => resolveBarcode("4800016640017", "scan"), 1200);
      }).catch(() => {
        showScanView("camera-error");
        announce(copy("Camera permission was denied or the camera is unavailable. Enter the barcode instead.", "Hindi pinayagan o hindi magamit ang camera. Ilagay na lang ang barcode."));
      });
    }

    function renderLinkResults(query) {
      const results = scannerModal.querySelector("[data-barcode-link-results]");
      const q = String(query || "").toLowerCase().trim();
      const matches = TINDAHAN_DATA.products.filter((product) => !q || product.name.toLowerCase().includes(q)).slice(0, 6);
      results.innerHTML = matches.map((product) =>
        '<button type="button" class="row-item is-interactive' + (product.id === selectedLinkId ? " is-selected" : "") + '" data-link-product="' + product.id + '" style="width:100%;text-align:left">' +
          '<span class="product-thumb"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-bag"></use></svg></span>' +
          '<span class="row-main"><span class="row-title">' + escapeHtml(product.name) + '</span><span class="row-meta">' + product.qty + " " + copy("in stock", "nasa stock") + "</span></span></button>"
      ).join("");
    }

    pickerList && pickerList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-pick]");
      if (!button) return;
      const product = TINDAHAN_DATA.products.find((item) => item.id === button.dataset.pick);
      if (product) addProduct(product, "picker");
    });
    searchInput && searchInput.addEventListener("input", () => renderPicker(searchInput.value));
    lineList && lineList.addEventListener("click", (event) => {
      const row = event.target.closest("[data-line]");
      if (!row) return;
      const id = row.dataset.line;
      const line = lines.get(id);
      if (event.target.closest("[data-remove-line]")) lines.delete(id);
      if (event.target.closest('[data-line-step="dec"]')) line.qty = Math.max(1, line.qty - 1);
      if (event.target.closest('[data-line-step="inc"]')) line.qty += 1;
      if (event.target.closest("[data-fix-stock]")) {
        if (line.product.qty === 0) lines.delete(id);
        else line.qty = line.product.qty;
      }
      renderLines();
    });
    lineList && lineList.addEventListener("change", (event) => {
      if (!event.target.matches("[data-line-input]")) return;
      const row = event.target.closest("[data-line]");
      const line = lines.get(row.dataset.line);
      line.qty = Math.max(1, parseInt(event.target.value, 10) || 1);
      renderLines();
    });

    document.querySelector("[data-hardware-scanner-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = event.currentTarget.querySelector("[data-hardware-barcode]");
      resolveBarcode(input.value, "hardware");
      input.value = "";
      input.focus();
    });
    document.querySelector("[data-hardware-barcode]")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      resolveBarcode(event.currentTarget.value, "hardware");
      event.currentTarget.value = "";
    });
    scannerModal?.querySelector("[data-manual-barcode-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      resolveBarcode(event.currentTarget.querySelector("[data-manual-barcode]").value, "scan");
    });
    scannerModal?.querySelectorAll("[data-camera-start], [data-camera-retry]").forEach((button) => button.addEventListener("click", startCamera));
    scannerModal?.querySelectorAll("[data-scan-cancel], [data-scan-again]").forEach((button) => button.addEventListener("click", () => showScanView("ready")));
    scannerModal?.querySelectorAll("[data-recovery-back]").forEach((button) => button.addEventListener("click", () => showScanView("unknown")));
    scannerModal?.querySelectorAll("[data-recovery-action]").forEach((button) => button.addEventListener("click", () => {
      const action = button.dataset.recoveryAction;
      showScanView(action === "search" ? "link" : "create");
      if (action === "search") {
        selectedLinkId = "";
        renderLinkResults("");
      }
    }));
    scannerModal?.addEventListener("click", (event) => {
      const recovery = event.target.closest("[data-recovery-action]");
      if (!recovery) return;
      const action = recovery.dataset.recoveryAction;
      showScanView(action === "search" ? "link" : "create");
      if (action === "search") {
        selectedLinkId = "";
        renderLinkResults("");
      }
    });
    scannerModal?.querySelector("[data-barcode-link-search]")?.addEventListener("input", (event) => renderLinkResults(event.target.value));
    scannerModal?.querySelector("[data-barcode-link-results]")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-link-product]");
      if (!button) return;
      selectedLinkId = button.dataset.linkProduct;
      renderLinkResults(scannerModal.querySelector("[data-barcode-link-search]").value);
      const product = TINDAHAN_DATA.products.find((item) => item.id === selectedLinkId);
      const review = scannerModal.querySelector("[data-link-review]");
      review.hidden = false;
      review.querySelector("[data-link-review-text]").textContent = copy(
        "Link " + unknownCode + " to " + product.name + "? Future scans will identify this product.",
        "Iugnay ang " + unknownCode + " sa " + product.name + "? Ito na ang makikilalang produkto sa susunod na pag-scan."
      );
      scannerModal.querySelector("[data-link-confirm]").disabled = false;
    });
    scannerModal?.querySelector("[data-link-confirm]")?.addEventListener("click", () => {
      const product = TINDAHAN_DATA.products.find((item) => item.id === selectedLinkId);
      if (!product) return;
      product.manufacturerBarcode = unknownCode;
      addProduct(product, "scan");
      window.tindahanToast && window.tindahanToast(copy("Barcode linked to ", "Naiugnay ang barcode sa ") + escapeHtml(product.name));
    });
    scannerModal?.querySelector("[data-create-scanned-product]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = event.currentTarget.querySelector("#scanned-product-name").value.trim();
      const price = Number(event.currentTarget.querySelector("#scanned-product-price").value);
      const qty = Number(event.currentTarget.querySelector("#scanned-product-stock").value);
      const unit = event.currentTarget.querySelector("#scanned-product-unit").value;
      const product = {
        id: "p-new-" + Date.now(), name, price, qty, unit, category: "Other",
        supplier: "Not set", reorderAt: 0, status: qty ? "ok" : "out",
        manufacturerBarcode: unknownCode, internalBarcode: null
      };
      TINDAHAN_DATA.products.push(product);
      addProduct(product, "scan");
      window.tindahanToast && window.tindahanToast(copy("Product created and added to the draft.", "Nagawa ang produkto at idinagdag sa draft."));
    });

    confirmBtn?.addEventListener("click", () => {
      if (confirmBtn.disabled) return;
      confirmBtn.disabled = true;
      confirmBtn.classList.add("btn-loading");
      window.setTimeout(() => {
        confirmBtn.classList.remove("btn-loading");
        if (new URLSearchParams(window.location.search).get("sale-fail") === "1") {
          confirmBtn.disabled = false;
          window.tindahanToast && window.tindahanToast(copy("We couldn't record the sale. Your draft is still here. Try again.", "Hindi naitala ang benta. Nandito pa rin ang draft mo. Subukan ulit."), "error");
          return;
        }
        lines.forEach((line) => { line.product.qty -= line.qty; });
        window.tindahanOpenModal && window.tindahanOpenModal("sale-success-modal");
      }, 700);
    });

    document.addEventListener("tindahan:languagechange", () => { renderPicker(searchInput?.value); renderLines(); });
    renderPicker();
    refreshTotals();
  }

  function initAddProductBarcode() {
    const form = document.querySelector("[data-add-product-form]");
    if (!form) return;
    const toggle = form.querySelector("[data-product-barcode-toggle]");
    const panel = form.querySelector("[data-product-barcode-panel]");
    const manufacturerField = form.querySelector("[data-manufacturer-barcode-field]");
    const barcodeInput = form.querySelector("#p-barcode");
    const barcodeError = form.querySelector("[data-product-barcode-error]");
    const unit = form.querySelector("#p-unit");
    const otherField = form.querySelector("[data-other-unit-field]");

    toggle?.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
    });
    form.querySelectorAll('[name="product-barcode-choice"]').forEach((radio) => radio.addEventListener("change", () => {
      manufacturerField.hidden = radio.value !== "manufacturer" || !radio.checked;
    }));
    form.querySelector("[data-fill-sample-barcode]")?.addEventListener("click", () => {
      barcodeInput.value = "4800016640994";
      barcodeInput.focus();
    });
    unit?.addEventListener("change", () => { otherField.hidden = unit.value !== "other"; });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      barcodeError.hidden = true;
      const choice = form.querySelector('[name="product-barcode-choice"]:checked')?.value || "none";
      const code = normalizeCode(barcodeInput.value);
      if (choice === "manufacturer" && (!/^\d{8,14}$/.test(code) || barcodeFor(code))) {
        barcodeError.textContent = copy(
          barcodeFor(code) ? "This barcode is already assigned to another product." : "Enter a valid 8–14 digit barcode.",
          barcodeFor(code) ? "Nakatalaga na ang barcode na ito sa ibang produkto." : "Maglagay ng wastong barcode na 8–14 numero."
        );
        barcodeError.hidden = false;
        barcodeInput.focus();
        return;
      }
      window.tindahanCloseModal && window.tindahanCloseModal();
      window.tindahanToast && window.tindahanToast(choice === "generate"
        ? copy("Product added. Its Tindahan barcode is ready.", "Naidagdag ang produkto. Handa na ang Tindahan barcode nito.")
        : copy("Product added.", "Naidagdag ang produkto."));
      form.reset();
      panel.hidden = true;
      otherField.hidden = true;
    });
  }

  function createBarcodeSvg(svg, code) {
    const width = 240;
    const height = 72;
    const chars = code.split("").map(Number);
    let x = 8;
    let bars = "";
    chars.forEach((digit, index) => {
      const pattern = (digit + index + 3).toString(2).padStart(4, "0");
      pattern.split("").forEach((bit) => {
        const barWidth = bit === "1" ? 3 : 1;
        bars += '<rect x="' + x + '" y="4" width="' + barWidth + '" height="' + (index % 3 === 0 ? 62 : 56) + '" fill="currentColor"/>';
        x += barWidth + 2;
      });
      x += 2;
    });
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.innerHTML = bars;
  }

  function initProductBarcode() {
    const root = document.querySelector("[data-product-barcode-root]");
    if (!root) return;
    const empty = root.querySelector("[data-barcode-empty]");
    const generating = root.querySelector("[data-barcode-generating]");
    const error = root.querySelector("[data-barcode-generation-error]");
    const ready = root.querySelector("[data-barcode-ready]");
    const value = root.querySelector("[data-barcode-value]");
    const svg = root.querySelector("[data-barcode-svg]");
    const price = root.querySelector("[data-label-price]");
    const history = document.querySelector("[data-barcode-history-entry]");
    let currentCode = "2800000000068";
    let generationAttempt = 0;

    function setReady(code, replaced) {
      currentCode = code;
      value.textContent = code;
      createBarcodeSvg(svg, code);
      empty.hidden = true;
      generating.hidden = true;
      error.hidden = true;
      ready.hidden = false;
      history.hidden = false;
      history.querySelector(".row-title").dataset.en = replaced ? "Tindahan barcode replaced" : "Tindahan barcode generated";
      history.querySelector(".row-title").dataset.fil = replaced ? "Pinalitan ang Tindahan barcode" : "Gumawa ng Tindahan barcode";
      history.querySelector(".row-title").textContent = copy(history.querySelector(".row-title").dataset.en, history.querySelector(".row-title").dataset.fil);
    }

    function generate() {
      generationAttempt += 1;
      empty.hidden = true;
      error.hidden = true;
      generating.hidden = false;
      window.setTimeout(() => {
        if (new URLSearchParams(window.location.search).get("barcode-fail") === "1" && generationAttempt === 1) {
          generating.hidden = true;
          error.hidden = false;
          return;
        }
        setReady(currentCode, false);
        window.tindahanToast && window.tindahanToast(copy("Barcode generated.", "Nagawa ang barcode."));
      }, 700);
    }

    root.querySelectorAll("[data-generate-barcode]").forEach((button) => button.addEventListener("click", generate));
    root.querySelectorAll("[data-label-template]").forEach((button) => button.addEventListener("click", () => {
      root.querySelectorAll("[data-label-template]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      price.hidden = button.dataset.labelTemplate !== "price";
      root.querySelector("[data-print-label]").dataset.labelSize = button.dataset.labelTemplate;
    }));
    root.querySelector("[data-print-barcode]")?.addEventListener("click", () => {
      window.tindahanToast && window.tindahanToast(copy("Print preview is ready.", "Handa na ang print preview."));
      window.setTimeout(() => window.print(), 120);
    });
    root.querySelector("[data-reprint-barcode]")?.addEventListener("click", () => {
      window.tindahanToast && window.tindahanToast(copy("Preparing label to reprint.", "Inihahanda ang label para i-print ulit."));
      window.setTimeout(() => window.print(), 120);
    });
    root.querySelector("[data-download-barcode]")?.addEventListener("click", () => {
      try {
        const label = '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220" viewBox="0 0 420 220"><rect width="100%" height="100%" fill="white"/><text x="210" y="34" text-anchor="middle" font-family="sans-serif" font-size="18">Fresh Eggs (Medium)</text><g transform="translate(78 52)" color="black">' + svg.innerHTML + '</g><text x="210" y="180" text-anchor="middle" font-family="monospace" font-size="16">' + currentCode + '</text></svg>';
        const url = URL.createObjectURL(new Blob([label], { type: "image/svg+xml" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "fresh-eggs-barcode-" + currentCode + ".svg";
        anchor.click();
        URL.revokeObjectURL(url);
        window.tindahanToast && window.tindahanToast(copy("Label downloaded.", "Na-download ang label."));
      } catch (downloadError) {
        window.tindahanToast && window.tindahanToast(copy("We couldn't prepare the label. Try again.", "Hindi maihanda ang label. Subukan ulit."), "error");
      }
    });
    document.querySelector("[data-replace-barcode-confirm]")?.addEventListener("click", () => {
      const nextCode = currentCode === "2800000000068" ? "2800000001065" : "2800000002062";
      window.tindahanCloseModal && window.tindahanCloseModal();
      setReady(nextCode, true);
      window.tindahanToast && window.tindahanToast(copy("Barcode replaced. Old labels are no longer active.", "Napalitan ang barcode. Hindi na aktibo ang lumang label."));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initBarcodeSale();
    initAddProductBarcode();
    initProductBarcode();
    document.querySelector("[data-stock-adjust-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      window.tindahanToast && window.tindahanToast(copy("Inventory updated.", "Na-update ang imbentaryo."));
    });
  });
})();
