export const messages = {
  EN: {
    dashboard: "Dashboard", inventory: "Inventory", sales: "Sales", receipts: "Receipts", reports: "Reports",
    settings: "Settings", search: "Find a product", notifications: "Notifications", signOut: "Sign out",
    welcome: "Welcome back", signInHelp: "Sign in to keep running your store.", email: "Email", password: "Password",
    signIn: "Sign in", newStore: "Set up a new store", greeting: "Good morning", attention: "Needs your attention",
    summary: "Today's summary", quickActions: "Quick actions", recent: "Recent activity", insights: "Helpful insights",
  },
  FIL: {
    dashboard: "Buod", inventory: "Imbentaryo", sales: "Benta", receipts: "Resibo", reports: "Ulat",
    settings: "Mga Setting", search: "Maghanap ng produkto", notifications: "Mga Abiso", signOut: "Mag-sign out",
    welcome: "Maligayang pagbabalik", signInHelp: "Mag-sign in para ipagpatuloy ang iyong tindahan.", email: "Email",
    password: "Password", signIn: "Mag-sign in", newStore: "Mag-set up ng bagong tindahan", greeting: "Magandang umaga",
    attention: "Kailangan ng iyong pansin", summary: "Buod ngayong araw", quickActions: "Mabilisang gawain",
    recent: "Kamakailang aktibidad", insights: "Kapaki-pakinabang na impormasyon",
  },
} as const;

export type Locale = keyof typeof messages;
export function dictionary(locale: string | undefined) {
  return messages[locale === "FIL" ? "FIL" : "EN"];
}
