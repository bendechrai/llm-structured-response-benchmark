import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { ApiKeysProvider } from "@/lib/api-keys-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LLM Structured Output Benchmark",
  description: "Test structured output adherence across LLM providers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900`}
      >
        <ApiKeysProvider>
          <div className="min-h-screen flex flex-col">
            <Navigation />
            <main className="container mx-auto px-4 py-8 flex-1">
              {children}
            </main>
            <footer className="border-t border-gray-200 dark:border-gray-700 py-6 mt-8">
              <div className="container mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>
                  &copy; 2025{" "}
                  <a href="https://bendechr.ai" className="hover:text-gray-700 dark:hover:text-gray-200 underline">
                    Ben Dechrai
                  </a>
                </p>
                <p className="mt-2 flex items-center justify-center gap-4">
                  <a
                    href="https://bsky.app/profile/bendechr.ai"
                    className="hover:text-gray-700 dark:hover:text-gray-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Bluesky
                  </a>
                  <a
                    href="https://linkedin.com/in/bendechrai"
                    className="hover:text-gray-700 dark:hover:text-gray-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn
                  </a>
                </p>
              </div>
            </footer>
          </div>
        </ApiKeysProvider>
      </body>
    </html>
  );
}
