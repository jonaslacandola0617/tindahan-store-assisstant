const paths = {
  store: <><path d="M3.5 9 4.5 4h15l1 5"/><path d="M4.5 9v10.5h15V9"/><path d="M9.5 19.5v-6h5v6"/></>,
  home: <><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/></>,
  package: <><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/></>,
  bag: <><path d="M6.5 8h11l-1 12h-9l-1-12Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
  receipt: <><path d="M6 2h12v18l-2.5-1.8L13 20l-1.5-1.8L10 20l-2.5-1.8L6 20V2Z"/><path d="M9 7.5h6M9 11h6M9 14.5h4"/></>,
  chart: <><path d="M4 20V11M12 20V4M20 20v-6M2 20h20"/></>,
  sliders: <><path d="M4 6h10M20 12H10M4 18h10"/><circle cx="17" cy="6" r="2"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
  camera: <><path d="M4 8h3.2L9 5.5h6L16.8 8H20v11H4V8Z"/><circle cx="12" cy="13.2" r="3.4"/></>,
  alert: <><path d="M12 3 2 20h20L12 3Z"/><path d="M12 9.5V14M12 17h.01"/></>,
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>,
  logout: <><path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9"/><path d="m16 16 4-4-4-4M20 12H9"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8.5 12.3 2.4 2.4 4.6-5"/></>,
} as const;

export type IconName = keyof typeof paths;
export function Icon({ name, className = "icon icon-native" }: { name: IconName; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
