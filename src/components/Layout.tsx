import React from "react";
import HeaderNav from "@/components/HeaderNav";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  if (!showNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col w-full">
      <HeaderNav />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
