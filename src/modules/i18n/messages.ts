export const messages = {
  EN: {
    dashboard: "Dashboard", inventory: "Inventory", sales: "Sales", receipts: "Receipts", reports: "Reports",
    settings: "Settings", search: "Find a product", notifications: "Notifications", signOut: "Sign out",
    welcome: "Welcome back", signInHelp: "Sign in to keep running your store.", email: "Email address", password: "Password",
    signIn: "Sign in", newStore: "Set up a new store", authTagline: "Your store, organized.", authDescription: "Scan receipts, track what's running low, and record sales in seconds — right from the counter.", passwordHint: "Enter the password for your Tindahan account.", or: "or", greeting: "Good morning", attention: "Needs your attention",
    summary: "Today's summary", quickActions: "Quick actions", recent: "Recent activity", insights: "Helpful insights",
  },
  FIL: {
    dashboard: "Buod", inventory: "Imbentaryo", sales: "Benta", receipts: "Resibo", reports: "Ulat",
    settings: "Mga Setting", search: "Maghanap ng produkto", notifications: "Mga Abiso", signOut: "Mag-sign out",
    welcome: "Maligayang pagbabalik", signInHelp: "Mag-sign in para ipagpatuloy ang iyong tindahan.", email: "Email address",
    password: "Password", signIn: "Mag-sign in", newStore: "Mag-set up ng bagong tindahan", authTagline: "Ang tindahan mo, maayos.", authDescription: "I-scan ang resibo, alamin kung ano ang paubos na, at itala ang benta sa ilang segundo lang — mula mismo sa counter.", passwordHint: "Ilagay ang password ng iyong Tindahan account.", or: "o", greeting: "Magandang umaga",
    attention: "Kailangan ng iyong pansin", summary: "Buod ngayong araw", quickActions: "Mabilisang gawain",
    recent: "Kamakailang aktibidad", insights: "Kapaki-pakinabang na impormasyon",
  },
} as const;

export type Locale = keyof typeof messages;
export function dictionary(locale: string | undefined) {
  return messages[locale === "FIL" ? "FIL" : "EN"];
}

export const loadingMessages = {
  EN: {
    tindahan: "Loading Tindahan", products: "Loading products", inventory: "Loading inventory", productDetails: "Loading product details",
    sales: "Loading sales", saleDetails: "Loading sale details", receipts: "Loading receipts", reports: "Loading reports",
    notifications: "Loading notifications", searchResults: "Loading search results", recentActivity: "Loading recent activity",
    signingIn: "Signing in", settingUpStore: "Setting up your store", savingChanges: "Saving changes", addingProduct: "Adding product",
    updatingInventory: "Updating inventory", recordingSale: "Recording sale", confirmingReceipt: "Confirming receipt",
    generatingBarcode: "Generating barcode", preparingLabel: "Preparing label", uploadingReceipt: "Uploading receipt",
    processingReceipt: "Processing receipt", tryingAgain: "Trying again", linkingProduct: "Linking product", creatingProduct: "Creating product",
    correctingSale: "Correcting sale", changingLanguage: "Changing language", lookingForBarcode: "Looking for a barcode", reversingReceipt: "Reversing receipt",
  },
  FIL: {
    tindahan: "Nilo-load ang Tindahan", products: "Kinukuha ang mga produkto", inventory: "Kinukuha ang imbentaryo", productDetails: "Kinukuha ang detalye ng produkto",
    sales: "Kinukuha ang mga benta", saleDetails: "Kinukuha ang detalye ng benta", receipts: "Kinukuha ang mga resibo", reports: "Kinukuha ang mga ulat",
    notifications: "Kinukuha ang mga abiso", searchResults: "Hinahanap ang mga resulta", recentActivity: "Kinukuha ang kamakailang aktibidad",
    signingIn: "Nagsa-sign in", settingUpStore: "Inihahanda ang iyong tindahan", savingChanges: "Sine-save ang mga pagbabago", addingProduct: "Idinaragdag ang produkto",
    updatingInventory: "Ina-update ang imbentaryo", recordingSale: "Itinatala ang benta", confirmingReceipt: "Kinukumpirma ang resibo",
    generatingBarcode: "Gumagawa ng barcode", preparingLabel: "Inihahanda ang label", uploadingReceipt: "Ina-upload ang resibo",
    processingReceipt: "Inihahanda ang resibo", tryingAgain: "Sinusubukan ulit", linkingProduct: "Iniuugnay ang produkto", creatingProduct: "Ginagawa ang produkto",
    correctingSale: "Itinatama ang benta", changingLanguage: "Pinapalitan ang wika", lookingForBarcode: "Hinahanap ang barcode", reversingReceipt: "Binabaligtad ang resibo",
  },
} as const;

export type LoadingMessageKey = keyof typeof loadingMessages.EN;
export function loadingCopy(locale: Locale, key: LoadingMessageKey) { return loadingMessages[locale][key]; }
