// @ts-nocheck
/// <reference path="../next-declarations.d.ts" />

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import clsx from 'clsx';

const menuItems = [
  { text: 'Dashboard', path: '/dashboard', icon: '📊' },
  { text: 'Connections', path: '/connections', icon: '🔄' },
  { text: 'World Map', path: '/world-map', icon: '🌐' },
  { text: 'Investigation', path: '/investigation', icon: '🔍' },
  { text: 'Logs', path: '/logs', icon: '📜' },
  { text: 'Timeline', path: '/timeline', icon: '⏱️' },
  { text: 'Settings', path: '/settings', icon: '⚙️' },
];

export default function Navigation() {
  const router = useRouter();

  return (
    <nav className="flex-1 py-4 overflow-y-auto">
      <ul className="space-y-1 px-2">
        {menuItems.map((item) => {
          const isActive = router.pathname === item.path;
          
          return (
            <li key={item.text}>
              <Link 
                href={item.path}
                className={clsx(
                  "flex items-center py-3 px-3 rounded-sm font-mono text-sm transition-all duration-200 hover:bg-primary/10 hover:translate-x-1 glitch-hover",
                  {
                    "bg-primary/20 border-l-4 border-primary shadow-neon-green": isActive,
                    "border-l-4 border-transparent": !isActive
                  }
                )}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className={isActive ? "text-primary font-bold" : "text-foreground"}>
                  {item.text.toUpperCase()}
                </span>
                {isActive && (
                  <span className="ml-auto text-primary animate-pulse">▶</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      
      {/* System Status Section */}
      <div className="mt-8 px-4">
        <div className="border border-primary/30 rounded-sm p-3 bg-card/50">
          <h3 className="text-xs font-mono mb-2 text-muted-foreground uppercase">System Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>CPU</span>
              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-3/4"></div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>MEM</span>
              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-1/2"></div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>NET</span>
              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent w-4/5"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 