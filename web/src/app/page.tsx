"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Terminal, 
  Cpu, 
  Zap, 
  Keyboard, 
  Copy, 
  Check, 
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
};

const CodeBlock = ({ command }: { command: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(command);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="group relative flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 font-mono text-sm text-neutral-300 backdrop-blur transition-all hover:border-neutral-700 hover:bg-neutral-900">
      <span className="shrink-0 text-cyan-500">$</span>
      <span className="flex-1 select-all">{command}</span>
      <button
        onClick={handleCopy}
        className="shrink-0 rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        aria-label="Copy command"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className="group rounded-2xl border border-neutral-800 bg-neutral-900/20 p-6 transition-all hover:border-cyan-500/20 hover:bg-neutral-900/40"
  >
    <div className="mb-4 inline-flex rounded-lg bg-neutral-800/50 p-3 text-cyan-500 group-hover:bg-cyan-950/30 group-hover:text-cyan-400">
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="mb-2 text-xl font-bold text-white">{title}</h3>
    <p className="text-neutral-400">{description}</p>
  </motion.div>
);

const TerminalMockup = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.7 }}
    viewport={{ once: true }}
    className="overflow-hidden rounded-xl border border-neutral-800 bg-black shadow-2xl"
  >
    {/* Terminal Header */}
    <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-2">
      <div className="flex gap-2">
        <div className="h-3 w-3 rounded-full bg-red-500/80" />
        <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
        <div className="h-3 w-3 rounded-full bg-green-500/80" />
      </div>
      <div className="text-xs font-medium text-neutral-500">gaze — 80x24</div>
      <div className="w-10" />
    </div>
    
    {/* Terminal Content */}
    <div className="p-4 font-mono text-xs sm:text-sm md:p-6">
      <div className="mb-4 border-b border-neutral-800 pb-2">
        <span className="font-bold text-cyan-400">GAZE</span> - Next.js Development Monitor
      </div>
      
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Left Pane: Errors */}
        <div className="flex-1 border border-cyan-500/50 p-2">
          <div className="mb-2 flex justify-between border-b border-neutral-800 pb-1 text-neutral-500">
            <span>Error [1/3]</span>
          </div>
          <div className="space-y-2">
            <div className="text-yellow-400">[10:42:15 AM]</div>
            <div className="text-red-400">ReferenceError: window is not defined</div>
            <div className="pl-2 text-neutral-400">
              at Page (app/page.tsx:14:5)<br/>
              at renderWithHooks (...)
            </div>
          </div>
        </div>

        {/* Right Pane: AI Insight */}
        <div className="flex-1 border border-green-500/50 p-2">
          <div className="mb-2 border-b border-neutral-800 pb-1 text-neutral-500">
            <span>AI Insight</span>
          </div>
          <div className="space-y-3 text-neutral-300">
            <p>The error <span className="text-red-400">ReferenceError: window is not defined</span> occurs because you are trying to access the browser-only <code className="bg-neutral-800 px-1">window</code> object during server-side rendering (SSR).</p>
            <p>
              <span className="text-green-400">Fix:</span> Wrap the code in a <code className="bg-neutral-800 px-1">useEffect</code> hook or check <code className="bg-neutral-800 px-1">typeof window !== 'undefined'</code>.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-neutral-800 pt-2 text-neutral-500">
        <div className="flex items-center gap-2">
          <span className="text-green-500">●</span> PORT:3000 | AI:<span className="text-green-500">ON</span>
        </div>
        <div className="hidden text-[10px] md:block">
          <span className="text-cyan-500">h</span>← <span className="text-cyan-500">j</span>↓ <span className="text-cyan-500">k</span>↑ <span className="text-cyan-500">l</span>→ <span className="text-cyan-500">a</span>:ai <span className="text-cyan-500">q</span>:quit
        </div>
      </div>
    </div>
  </motion.div>
);

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Navbar */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-neutral-800 bg-black/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tighter text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950 text-cyan-400">
              <Terminal className="h-5 w-5" />
            </div>
            GAZE
          </div>
          <a 
            href="https://github.com/10xdevs-net/gaze" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-neutral-400 transition-colors hover:text-white"
          >
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-32 pb-20 md:pt-48 md:pb-32">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -z-10 h-[500px] w-[1000px] -translate-x-1/2 rounded-full bg-cyan-950/20 blur-[120px]" />
        
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-950/10 px-3 py-1 text-xs font-medium text-cyan-400 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
              </span>
              v0.0.5 Now Available
            </div>
            
            <h1 className="mb-8 text-5xl font-bold tracking-tight text-white md:text-7xl">
              Monitor Next.js with <br />
              <span className="bg-gradient-to-b from-cyan-300 to-cyan-600 bg-clip-text text-transparent">Superpowers</span>
            </h1>
            
            <p className="mx-auto mb-10 max-w-2xl text-lg text-neutral-400 md:text-xl">
              A blazing fast terminal interface for your Next.js development server. 
              Real-time error tracking and AI-powered insights, right where you work.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <CodeBlock command="bunx @10xdevs/gaze" />
              <span className="text-sm text-neutral-500">or</span>
              <CodeBlock command="bun add -g @10xdevs/gaze" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Terminal Preview */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <TerminalMockup />
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">Everything you need to debug faster</h2>
            <p className="text-neutral-400">Streamline your development workflow with these powerful features.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard 
              icon={Terminal}
              title="Terminal UI"
              description="Stay in your flow. No need to switch windows to check browser console logs."
              delay={0.1}
            />
            <FeatureCard 
              icon={Cpu}
              title="AI Insights"
              description="Get instant explanations and code fixes for complex errors using GenAI."
              delay={0.2}
            />
            <FeatureCard 
              icon={Keyboard}
              title="Vim Navigation"
              description="Navigate through errors efficiently with h/j/k/l bindings."
              delay={0.3}
            />
            <FeatureCard 
              icon={Zap}
              title="Instant Setup"
              description="Zero config. Just run the command and point to your Next.js port."
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* Usage Section */}
      <section className="border-t border-neutral-900 bg-neutral-900/20 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-white">How to use</h2>
          
          <div className="space-y-8">
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="flex-1 space-y-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-900/30 font-bold text-cyan-400">1</div>
                <h3 className="text-xl font-bold text-white">Run Gaze</h3>
                <p className="text-neutral-400">
                  Execute the command in your terminal. By default, it connects to port 3000.
                </p>
                <div className="mt-2">
                  <CodeBlock command="bunx @10xdevs/gaze" />
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-900/30 font-bold text-cyan-400">2</div>
                <h3 className="text-xl font-bold text-white">Custom Port</h3>
                <p className="text-neutral-400">
                  Running Next.js on a different port? Just pass it as an argument.
                </p>
                <div className="mt-2">
                  <CodeBlock command="bunx @10xdevs/gaze 3001" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-black/40 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <Keyboard className="h-5 w-5 text-neutral-500" />
                Controls
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-cyan-400">h / l</span>
                  <span className="text-sm text-neutral-500">Prev/Next Error</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-cyan-400">j / k</span>
                  <span className="text-sm text-neutral-500">Scroll View</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-cyan-400">a</span>
                  <span className="text-sm text-neutral-500">Toggle AI</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-cyan-400">q</span>
                  <span className="text-sm text-neutral-500">Quit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-black py-12 text-center">
        <div className="flex items-center justify-center gap-2 text-xl font-bold tracking-tighter text-white">
          <Terminal className="h-5 w-5 text-cyan-500" />
          GAZE
        </div>
        <p className="mt-4 text-sm text-neutral-500">
          Built with ❤️ by 10xDevelopers. Open source and free forever.
        </p>
      </footer>
    </main>
  );
}