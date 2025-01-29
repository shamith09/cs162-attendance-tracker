"use client";

import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/app/theme-provider";
import { Providers } from "@/app/providers";
import { ThemeToggle } from "./ThemeToggle";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/";

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Providers>
          <div className="relative min-h-screen">
            {!isLoginPage && (
              <div className="absolute top-4 right-4 flex gap-2 w-[120px] justify-center z-40">
                <ThemeToggle />
                <LogoutButton />
              </div>
            )}
            {children}
          </div>
        </Providers>
      </ThemeProvider>
    </SessionProvider>
  );
}
