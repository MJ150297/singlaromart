import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/store/provider";
import { AuthProvider } from "@/components/AuthProvider";
import { SWRegister, InstallPrompt } from "@/components/PWA";
import { ToastProvider } from "@/components/ui/toast";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Indiyano Food & Baverages | Express Grocery Store",
  description: "Fresh groceries and beverages delivered straight to your home.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Indiyano",
  },
  icons: {
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col`}>
        <ReduxProvider>
          <ToastProvider>
            <AuthProvider>
              {children}
              <PushNotificationPrompt />
            </AuthProvider>
          </ToastProvider>
        </ReduxProvider>
        <SWRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
