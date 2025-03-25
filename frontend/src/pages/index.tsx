import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 tech-pattern">
      <div 
        className="relative max-w-md w-full border border-primary/30 bg-card/80 p-8 backdrop-blur-sm rounded-sm overflow-hidden"
      >
        {/* Decorative glitch effect elements */}
        <div className="absolute -top-2 right-0 w-32 h-1 bg-primary/50"></div>
        <div className="absolute -left-2 top-10 w-1 h-20 bg-accent/50"></div>
        <div className="absolute bottom-6 -right-2 w-10 h-1 bg-primary/50"></div>
        
        <div className="circuit-border p-0.5 mb-6">
          <h1 className="text-4xl font-bold text-center font-mono neon-text tracking-tight">
            NAUTSCAN
          </h1>
          <p className="text-muted-foreground text-center text-xs tracking-widest font-mono uppercase mt-1">
            v1.0.0_ALPHA :: SECURE_NETWORK_INTELLIGENCE
          </p>
        </div>
        
        <div className="space-y-4 mt-8">
          <Link href="/dashboard" className="block">
            <button 
              className="cyber-button w-full glitch-hover bg-card hover:bg-primary/90 hover:text-black text-primary font-mono uppercase tracking-wider"
            >
              <span className="mr-2">▶</span> Dashboard
            </button>
          </Link>
          
          <Link href="/connections" className="block">
            <button 
              className="cyber-button w-full glitch-hover bg-card hover:bg-primary/90 hover:text-black text-primary font-mono uppercase tracking-wider"
            >
              <span className="mr-2">▶</span> Network Connections
            </button>
          </Link>
          
          <Link href="/world-map" className="block">
            <button 
              className="cyber-button w-full glitch-hover bg-card hover:bg-primary/90 hover:text-black text-primary font-mono uppercase tracking-wider"
            >
              <span className="mr-2">▶</span> World Map
            </button>
          </Link>
        </div>
        
        <div className="mt-10 pt-4 border-t border-primary/30">
          <div className="flex justify-between items-center text-xs text-muted-foreground font-mono">
            <div className="flex items-center">
              <span className="inline-block w-2 h-2 bg-primary animate-pulse rounded-full mr-2"></span>
              SECURE CONNECTION
            </div>
            <div>{new Date().getFullYear()}</div>
          </div>
          
          <div className="mt-4 grid grid-cols-4 gap-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-1 bg-primary/30"></div>
            ))}
          </div>
          
          {/* Matrix-inspired scrolling data */}
          <div className="mt-3 overflow-hidden h-4">
            <div className="animate-matrix-flow font-mono text-primary/40 text-[8px] leading-none">
              01001110 01000001 01010101 01010100 01010011 01000011 01000001 01001110
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 