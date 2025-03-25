import { ReactNode } from 'react';
import Navigation from './Navigation';
import Link from 'next/link';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="fixed z-10 w-64 h-full border-r border-primary/30 bg-card tech-pattern">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-primary/30">
            <h1 className="text-2xl font-bold font-mono neon-text">
              <Link href="/" className="hover:text-primary transition-colors">
                NAUTSCAN
              </Link>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">NETWORK INTELLIGENCE</p>
          </div>
          
          <Navigation />
          
          <div className="mt-auto p-4 text-xs text-muted-foreground border-t border-primary/30">
            <div className="flex justify-between">
              <span>Signal: ACTIVE</span>
              <span className="text-primary">••••</span>
            </div>
            <div className="circuit-border mt-2 p-2">
              <div className="flex justify-between">
                <span>Connections:</span>
                <span className="text-primary">42</span>
              </div>
              <div className="flex justify-between">
                <span>Nodes:</span>
                <span className="text-primary">128</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
} 