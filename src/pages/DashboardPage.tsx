import React from 'react';
import HeaderNav from '@/components/layout/HeaderNav';
import { Dashboard } from '@/components/dashboard/Dashboard';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeaderNav />
      <main className="flex-1 overflow-auto min-h-[calc(100vh-4rem)]">
        <Dashboard />
      </main>
    </div>
  );
}
