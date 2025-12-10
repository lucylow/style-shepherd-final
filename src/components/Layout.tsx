import React from "react";
import MainNav from "@/components/MainNav";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  if (!showNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex w-full">
      <MainNav />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
