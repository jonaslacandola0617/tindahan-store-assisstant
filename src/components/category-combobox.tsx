"use client";

import { KeyboardEvent, useRef, useState } from "react";
import { Icon } from "./icon";
import { InlineLoading } from "./loading";

type CategorySuggestion = { id: string; name: string; productCount: number };

export function CategoryCombobox({ id, label, locale, defaultValue = "" }: { id: string; label: string; locale: "EN" | "FIL"; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const listId = `${id}-suggestions`;
  const copy = locale === "FIL"
    ? { heading: "Mga kasalukuyang kategorya", hint: "Pumili ng kasalukuyang kategorya para maiwasan ang duplicate.", one: "produkto", many: "produkto", loading: "Naghahanap ng kategorya" }
    : { heading: "Existing categories", hint: "Choose an existing category to avoid duplicates.", one: "product", many: "products", loading: "Searching categories" };
  const [loading, setLoading] = useState(false);

  function queueSuggestions(query: string, immediate = false) {
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
    setLoading(true);
    timer.current = setTimeout(async () => {
      const nextController = new AbortController();
      controller.current = nextController;
      try {
        const response = await fetch(`/api/inventory/categories?q=${encodeURIComponent(query.trim())}`, { signal: nextController.signal });
        if (!response.ok) throw new Error();
        const result = await response.json() as { items: CategorySuggestion[] };
        setSuggestions(result.items);
        setActiveIndex(-1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSuggestions([]);
      } finally {
        if (!nextController.signal.aborted) setLoading(false);
      }
    }, immediate ? 0 : 180);
  }

  function choose(category: CategorySuggestion) {
    setValue(category.name);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); queueSuggestions(value, true); }
      return;
    }
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex(index => Math.min(index + 1, suggestions.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex(index => Math.max(index - 1, 0)); }
    else if (event.key === "Enter" && activeIndex >= 0) { event.preventDefault(); choose(suggestions[activeIndex]!); }
    else if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
  }

  return <div className="field category-combobox">
    <label className="field-label" htmlFor={id}>{label}</label>
    <input className="input" id={id} name="category" value={value} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
      onFocus={() => { setOpen(true); queueSuggestions(value, true); }}
      onBlur={() => setOpen(false)}
      onChange={event => { setValue(event.target.value); setOpen(true); setActiveIndex(-1); queueSuggestions(event.target.value); }}
      onKeyDown={onKeyDown}/>
    {open && <div className="category-suggestions" id={listId} role="listbox" aria-label={copy.heading} aria-busy={loading}>
      <div className="category-suggestions-header"><strong>{copy.heading}</strong><span>{copy.hint}</span></div>
      {loading && suggestions.length === 0 ? <div className="category-suggestions-status"><InlineLoading message={copy.loading} size="compact"/></div>
        : suggestions.length > 0 ? <div className="category-suggestions-list">{suggestions.map((category, index) => <button id={`${id}-option-${index}`} type="button" role="option" aria-selected={activeIndex === index} className={`category-suggestion${activeIndex === index ? " is-active" : ""}`} key={category.id}
          onMouseDown={event => event.preventDefault()} onClick={() => choose(category)} onMouseEnter={() => setActiveIndex(index)}>
          <span className="category-suggestion-icon"><Icon name="tag" className="icon icon-sm"/></span><span className="category-suggestion-name">{category.name}</span><span className="category-suggestion-count">{category.productCount} {category.productCount === 1 ? copy.one : copy.many}</span>
        </button>)}</div>
        : <div className="category-suggestions-status">{locale === "FIL" ? "Walang kaparehong kategorya. Gagamitin ang bagong pangalan." : "No matching category. The new name will be used."}</div>}
    </div>}
  </div>;
}
