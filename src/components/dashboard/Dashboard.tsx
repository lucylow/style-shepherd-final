import React from 'react';
import { motion } from 'framer-motion';
import { StyleRecommendations } from './StyleRecommendations';
import { MemoryPanel } from './MemoryPanel';
import { QuickActions } from './QuickActions';
import { RecentActivity } from './RecentActivity';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export function Dashboard() {
  return (
    <div className="min-h-full p-3 sm:p-4 md:p-6">
      {/* Mobile-first responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 lg:grid-rows-6 gap-3 sm:gap-4 overflow-auto">
        {/* Quick Actions - Mobile: full width, Tablet: half, Desktop: col-span-4 row-span-2 */}
        <ErrorBoundary>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ y: -4 }}
            className="lg:col-span-4 lg:row-span-2 bg-card rounded-xl border border-border/50 shadow-elevated hover:shadow-elevated-lg transition-all backdrop-blur-sm"
          >
            <QuickActions />
          </motion.div>
        </ErrorBoundary>

        {/* Style Recommendations - Mobile: full width, Tablet: full width, Desktop: col-span-5 row-span-3 */}
        <ErrorBoundary>
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -4 }}
            className="md:col-span-2 lg:col-span-5 lg:row-span-3 bg-card rounded-xl border border-border/50 shadow-elevated hover:shadow-elevated-lg transition-all backdrop-blur-sm"
          >
            <StyleRecommendations />
          </motion.div>
        </ErrorBoundary>

        {/* Memory Panel - Mobile: full width, Tablet: full width, Desktop: col-span-3 row-span-6 */}
        <ErrorBoundary>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -4 }}
            className="md:col-span-2 lg:col-span-3 lg:row-span-6 bg-card rounded-xl border border-border/50 shadow-elevated hover:shadow-elevated-lg transition-all backdrop-blur-sm"
          >
            <MemoryPanel />
          </motion.div>
        </ErrorBoundary>

        {/* Recent Activity - Mobile: full width, Tablet: half, Desktop: col-span-4 row-span-4 */}
        <ErrorBoundary>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -4 }}
            className="md:col-span-2 lg:col-span-4 lg:row-span-4 bg-card rounded-xl border border-border/50 shadow-elevated hover:shadow-elevated-lg transition-all backdrop-blur-sm"
          >
            <RecentActivity />
          </motion.div>
        </ErrorBoundary>

        {/* Stats - Mobile: full width, Tablet: half, Desktop: col-span-5 row-span-3 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ y: -4 }}
          className="md:col-span-2 lg:col-span-5 lg:row-span-3 bg-card rounded-xl border border-border/50 shadow-elevated hover:shadow-elevated-lg transition-all backdrop-blur-sm p-4 sm:p-6"
        >
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Style Insights</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-3 sm:p-4 text-center border border-primary/20 hover:border-primary/40 transition-all"
            >
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">156</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Items Analyzed</div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-3 sm:p-4 text-center border border-primary/20 hover:border-primary/40 transition-all"
            >
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">89%</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Match Rate</div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-3 sm:p-4 text-center border border-primary/20 hover:border-primary/40 transition-all"
            >
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">24</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Saved Outfits</div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Dashboard;
