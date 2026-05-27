import React from "react";
import { Link } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 selection:text-primary">
      <header className="py-8 px-6 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm group-hover:scale-105 transition-transform duration-300">
              <span className="font-serif text-xl leading-none italic pr-0.5">G</span>
            </div>
            <span className="font-serif text-2xl font-medium tracking-tight">GoalGetter</span>
          </Link>
          
          <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </nav>
        </div>
      </header>

      <main className="py-16 md:py-24 px-6">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>

      <footer className="py-12 border-t border-border/50 bg-card/50">
        <div className="max-w-3xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} GoalGetter. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
