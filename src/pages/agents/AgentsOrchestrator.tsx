/**
 * Agents Orchestrator Page
 * Main page for the multi-agent orchestrator UI
 */

import React from 'react';
import AgentsOrchestratorUI from '@/components/agents/AgentsOrchestratorUI';

export default function AgentsOrchestratorPage() {
  return (
    <div className="min-h-screen bg-background">
      <AgentsOrchestratorUI />
    </div>
  );
}
