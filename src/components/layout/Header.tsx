import React from 'react';
import { Clock, Wifi, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  currentSession?: string;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
}

export function Header({ 
  currentSession = 'Active Session',
  connectionStatus = 'connected' 
}: HeaderProps) {
  const now = new Date();
  const sessionTime = now.toLocaleTimeString();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-background border-b border-border z-50">
      <div className="flex items-center justify-between h-full px-6">
        {/* Logo & Title */}
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Style Shepherd</h1>
              <p className="text-xs text-muted-foreground">AI Fashion Assistant Dashboard</p>
            </div>
          </Link>
        </div>

        {/* Session Info */}
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Session</div>
            <div className="text-sm font-medium text-foreground">{currentSession}</div>
          </div>
          
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">{sessionTime}</span>
          </div>

          {/* Connection Status */}
          <div className={`flex items-center space-x-2 ${
            connectionStatus === 'connected' ? 'text-green-500' : 
            connectionStatus === 'connecting' ? 'text-yellow-500' : 'text-destructive'
          }`}>
            <Wifi className="w-4 h-4" />
            <span className="text-sm capitalize">{connectionStatus}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
