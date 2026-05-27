import React from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center text-center py-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-xl mb-10 shadow-primary/20">
          <span className="font-serif text-5xl italic pr-1">G</span>
        </div>
        
        <h1 className="text-6xl md:text-7xl mb-6 text-foreground">
          GoalGetter
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-16 font-light max-w-lg">
          Your goals, step by step.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link 
            href="/privacy" 
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-card border border-border/50 text-foreground shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-center group"
          >
            <span className="block font-serif text-2xl mb-1 group-hover:text-primary transition-colors">Privacy Policy</span>
            <span className="text-sm text-muted-foreground">How we protect your data</span>
          </Link>
          
          <Link 
            href="/terms" 
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-card border border-border/50 text-foreground shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-center group"
          >
            <span className="block font-serif text-2xl mb-1 group-hover:text-primary transition-colors">Terms of Service</span>
            <span className="text-sm text-muted-foreground">Rules for using our app</span>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
