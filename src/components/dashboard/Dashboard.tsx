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
        whileHover={{ y: -4 }}
        className="col-span-4 row-span-2 bg-card rounded-xl border border-border/50 shadow-elevated hover:shadow-elevated-lg transition-all backdrop-blur-sm"
      >
        <QuickActions />
      </motion.div>

      {/* Style Recommendations - Top Center */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        whileHover={{ y: -4 }}
        className="col-span-5 row-span-3 bg-card rounded-xl border border-border/50 shadow-elevated hover:shadow-elevated-lg transition-all backdrop-blur-sm"
      >
        <StyleRecommendations />
      </motion.div>

      {/* Memory Panel - Top Right */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ y: -4 }}
        className="col-span-3 row-span-6 bg-card rounded-xl border border-border/50 shadow-elevated hover:shadow-elevated-lg transition-all backdrop-blur-sm"
      >
        <MemoryPanel />
      </motion.div>

      {/* Recent Activity - Bottom Left */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ y: -4 }}
        className="col-span-4 row-span-4 bg-card rounded-xl border border-border/50 shadow-elevated hover:shadow-elevated-lg transition-all backdrop-blur-sm"
      >
        <RecentActivity />
      </motion.div>

      {/* Stats - Bottom Center */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ y: -4 }}
        className="col-span-5 row-span-3 bg-card rounded-xl border border-border/50 shadow-elevated hover:shadow-elevated-lg transition-all backdrop-blur-sm p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Style Insights</h3>
        <div className="grid grid-cols-3 gap-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 text-center border border-primary/20 hover:border-primary/40 transition-all"
          >
            <div className="text-3xl font-bold text-primary mb-1">156</div>
            <div className="text-sm text-muted-foreground">Items Analyzed</div>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 text-center border border-primary/20 hover:border-primary/40 transition-all"
          >
            <div className="text-3xl font-bold text-primary mb-1">89%</div>
            <div className="text-sm text-muted-foreground">Match Rate</div>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 text-center border border-primary/20 hover:border-primary/40 transition-all"
          >
            <div className="text-3xl font-bold text-primary mb-1">24</div>
            <div className="text-sm text-muted-foreground">Saved Outfits</div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default Dashboard;
