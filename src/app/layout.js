export const metadata = { title: "Inventory | Worldwide Electrical Services", description: "Equipment inventory tracking" };
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };
export default function RootLayout({ children }) {
  return (<html lang="en"><head><meta name="apple-mobile-web-app-capable" content="yes"/></head><body style={{margin:0,background:"#f1f5f9"}}>{children}</body></html>);
}
