import React from 'react';
import { motion } from 'framer-motion';
import { StyleRecommendations } from './StyleRecommendations';
import { MemoryPanel } from './MemoryPanel';
import { QuickActions } from './QuickActions';
import { RecentActivity } from './RecentActivity';

export function Dashboard() {
  return (
    <div className="h-full p-6 grid grid-cols-12 grid-rows-6 gap-4 overflow-auto">
      {/* Quick Actions - Top Left */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="col-span-4 row-span-2 bg-card rounded-xl border border-border"
      >
        <QuickActions />
      </motion.div>

      {/* Style Recommendations - Top Center */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="col-span-5 row-span-3 bg-card rounded-xl border border-border"
      >
        <StyleRecommendations />
      </motion.div>

      {/* Memory Panel - Top Right */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="col-span-3 row-span-6 bg-card rounded-xl border border-border"
      >
        <MemoryPanel />
      </motion.div>

      {/* Recent Activity - Bottom Left */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="col-span-4 row-span-4 bg-card rounded-xl border border-border"
      >
        <RecentActivity />
      </motion.div>

      {/* Stats - Bottom Center */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="col-span-5 row-span-3 bg-card rounded-xl border border-border p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Style Insights</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-accent/30 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-primary">156</div>
            <div className="text-sm text-muted-foreground">Items Analyzed</div>
          </div>
          <div className="bg-accent/30 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-primary">89%</div>
            <div className="text-sm text-muted-foreground">Match Rate</div>
          </div>
          <div className="bg-accent/30 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-primary">24</div>
            <div className="text-sm text-muted-foreground">Saved Outfits</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Dashboard;
