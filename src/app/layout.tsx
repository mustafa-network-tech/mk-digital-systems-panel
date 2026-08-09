import type { Metadata } from "next";import "./globals.css";import { Toaster } from "sonner";
export const metadata:Metadata={title:"MK Digital Vault",description:"MK Digital Systems proje kasası"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="tr"><body>{children}<Toaster richColors position="top-right"/></body></html>}
