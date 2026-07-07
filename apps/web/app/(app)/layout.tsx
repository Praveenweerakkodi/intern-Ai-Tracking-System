'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, LayoutDashboard, FileText, Kanban, MessageSquare, Settings, LogOut, ChevronLeft, Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'CV Optimizer', href: '/cv-optimizer', icon: FileText },
  { name: 'Applications', href: '/applications', icon: Kanban },
  { name: 'AI Coach', href: '/ai-coach', icon: MessageSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login');
      else setUser(user);
    });
  }, [supabase, router]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-grid flex">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-35"
          />
        )}
      </AnimatePresence>

      {/* Mobile Top Bar */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex items-center justify-between px-6 z-30">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-base gradient-text" style={{ fontFamily: 'Sora, sans-serif' }}>
              Nexus Career Ai
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--glass-hover)] transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Sidebar */}
      <motion.aside
        animate={isMobile ? { x: mobileOpen ? 0 : -260, width: 260 } : { x: 0, width: collapsed ? 80 : 260 }}
        transition={{ duration: 0.3, ease: 'anticipate' }}
        className="sidebar flex flex-col justify-between"
      >
        <div>
          {/* Logo */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-[var(--border-subtle)]">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="min-w-10 min-h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <Brain className="w-5 h-5 text-white" />
              </div>
              {(!collapsed || isMobile) && (
                <span
                  className="font-bold text-lg gradient-text whitespace-nowrap"
                  style={{ fontFamily: 'Sora, sans-serif' }}
                >
                  Nexus Career Ai
                </span>
              )}
            </Link>
            {isMobile && (
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--glass-hover)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="p-4 flex flex-col gap-2 mt-4">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {(!collapsed || isMobile) && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Area */}
        <div className="p-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={handleLogout}
            className="nav-item w-full !text-[#ef4444] hover:!bg-[rgba(239,68,68,0.1)] mb-4"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {(!collapsed || isMobile) && <span>Logout</span>}
          </button>

          {!isMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--glass-hover)] transition-colors"
            >
              {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <motion.main
        animate={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 260) }}
        transition={{ duration: 0.3, ease: 'anticipate' }}
        className={`flex-1 min-h-screen relative min-w-0 overflow-hidden ${isMobile ? 'pt-16' : ''}`}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top, rgba(99,102,241,0.05) 0%, transparent 70%)' }} />

        {children}
      </motion.main>
    </div>
  );
}
