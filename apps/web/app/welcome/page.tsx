'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Brain, Sparkles, ChevronRight, Zap, Shield, Cpu, Target, TrendingUp, Star } from 'lucide-react';

// ─── Floating holographic card ────────────────────────────────────────────────
function HoloCard({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`relative p-4 rounded-2xl border border-white/10 backdrop-blur-md ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)',
        boxShadow: '0 4px 24px rgba(99,102,241,0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Animated typing text ─────────────────────────────────────────────────────
function TypedLine({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) { clearInterval(interval); setDone(true); }
      }, 28);
      return () => clearInterval(interval);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return (
    <span>
      {displayed}
      {!done && <span className="inline-block w-0.5 h-4 bg-[#818cf8] ml-0.5 animate-pulse" />}
    </span>
  );
}

// ─── Neural particle canvas ───────────────────────────────────────────────────
function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const mouse = { x: -9999, y: -9999 };

    const COUNT = Math.min(120, Math.floor((W * H) / 12000));
    const LINK_DIST = 110;
    const MOUSE_REPEL = 120;

    interface P { x: number; y: number; vx: number; vy: number; r: number; hue: number }
    const pts: P[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 1.8 + 0.6,
      hue: Math.random() < 0.6 ? 243 : Math.random() < 0.5 ? 267 : 160,
    }));

    function tick() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, W, H);

      for (const p of pts) {
        // Soft mouse repulsion
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < MOUSE_REPEL) {
          const f = (MOUSE_REPEL - d) / MOUSE_REPEL * 0.015;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }

        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.99; p.vy *= 0.99;
        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        if (p.x > W) { p.x = W; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        if (p.y > H) { p.y = H; p.vy *= -1; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},80%,70%,0.55)`;
        ctx.fill();
      }

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const p1 = pts[i], p2 = pts[j];
          const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (d < LINK_DIST) {
            const a = (1 - d / LINK_DIST) * 0.18;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `hsla(${(p1.hue + p2.hue) / 2},75%,65%,${a})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(tick);
    }
    tick();

    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-70" />;
}

// ─── Orbiting ring ────────────────────────────────────────────────────────────
function OrbitRing({ size, duration, clockwise = true }: { size: number; duration: number; clockwise?: boolean }) {
  return (
    <motion.div
      className="absolute rounded-full border border-white/[0.06]"
      style={{ width: size, height: size, margin: 'auto', inset: 0 }}
      animate={{ rotate: clockwise ? 360 : -360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
    >
      {/* dot on ring */}
      <div
        className="absolute w-1.5 h-1.5 rounded-full bg-[#818cf8]/60 shadow-[0_0_6px_#818cf8]"
        style={{ top: '50%', left: 0, transform: 'translate(-50%,-50%)' }}
      />
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WelcomePage() {
  const supabase = createClient();
  const router = useRouter();

  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [launchProgress, setLaunchProgress] = useState(0);

  // Parallax cursor for 3D tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 60, damping: 20 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 60, damping: 20 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      rotateX.set(((e.clientY - cy) / cy) * -8);
      rotateY.set(((e.clientX - cx) / cx) * 8);
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [rotateX, rotateY, mouseX, mouseY]);

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();

      const name = profile?.full_name
        ? profile.full_name.split(' ')[0]
        : session.user.email?.split('@')[0] ?? 'Explorer';
      setUserName(name);
      setLoading(false);
    }
    check();
  }, [supabase, router]);

  const handleLaunch = () => {
    setLaunching(true);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18 + 4;
      if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => router.push('/dashboard'), 400); }
      setLaunchProgress(Math.min(p, 100));
    }, 80);
  };

  if (loading) return (
    <div className="fixed inset-0 bg-[#080810] flex items-center justify-center">
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.6, repeat: Infinity }}>
        <Brain className="w-10 h-10 text-[#6366f1]" />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080810] text-white overflow-y-auto select-none py-12 md:py-0 flex flex-col justify-center" style={{ perspective: 1000 }}>
      {/* ── Background layers ── */}
      <NeuralCanvas />

      {/* Deep glow blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[15%] w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[100px]"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }} />
        <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full opacity-[0.06] blur-[100px]"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
        <div className="absolute top-[60%] left-[50%] w-[350px] h-[350px] rounded-full opacity-[0.04] blur-[100px]"
          style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />
      </div>

      {/* Grid lines */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {!launching ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(12px)' }}
            transition={{ duration: 0.5 }}
            className="relative z-10 min-h-[calc(100vh-6rem)] md:min-h-screen flex flex-col items-center justify-center px-6 gap-8 md:gap-10 py-10 md:py-0"
          >
            {/* ── Orbital logo ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex items-center justify-center"
              style={{ width: 160, height: 160 }}
            >
              {/* Rings */}
              <OrbitRing size={150} duration={8} clockwise />
              <OrbitRing size={110} duration={5} clockwise={false} />
              <OrbitRing size={72} duration={12} clockwise />

              {/* Core */}
              <div className="absolute inset-0 m-auto w-16 h-16 rounded-2xl flex items-center justify-center z-10"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  boxShadow: '0 0 40px rgba(99,102,241,0.6), 0 0 80px rgba(99,102,241,0.2)',
                }}>
                <Brain className="w-8 h-8 text-white" />
              </div>
            </motion.div>

            {/* ── Brand + greeting ── */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-center space-y-3"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#818cf8]/70">
                Nexus Career Ai · AI Career Engine
              </p>
              <h1
                className="text-5xl sm:text-6xl font-extrabold leading-none"
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                Hey,{' '}
                <span style={{
                  background: 'linear-gradient(90deg, #818cf8, #a78bfa, #34d399)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  <TypedLine text={userName} delay={0.6} />
                </span>
              </h1>
              <p className="text-sm sm:text-base text-white/40 max-w-md mx-auto leading-relaxed font-light">
                Your AI-powered career system is online. <br />
                Let's match you to your dream internship.
              </p>
            </motion.div>

            {/* ── Feature holographic cards ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl w-full"
            >
              {[
                { icon: Target, label: 'ATS Matching', value: '98%', color: '#818cf8', delay: 1.0 },
                { icon: Cpu, label: 'CV Optimizer', value: 'Live AI', color: '#a78bfa', delay: 1.1 },
                { icon: Shield, label: 'Pre-Check', value: 'Smart', color: '#34d399', delay: 1.2 },
                { icon: TrendingUp, label: 'Interview Rate', value: '+40%', color: '#f59e0b', delay: 1.3 },
              ].map((item) => (
                <HoloCard key={item.label} delay={item.delay} className="text-center">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
                    style={{ background: `${item.color}18`, border: `1px solid ${item.color}30` }}>
                    <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <div className="text-base font-extrabold" style={{ color: item.color }}>{item.value}</div>
                  <div className="text-[10px] text-white/35 mt-0.5 font-medium">{item.label}</div>
                </HoloCard>
              ))}
            </motion.div>

            {/* ── AI status bar ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
              className="flex items-center justify-center flex-wrap gap-4 md:gap-6 text-[10px] md:text-[11px] text-white/25 font-mono text-center"
            >
              {['NEURAL ENGINE ONLINE', 'GEMINI AI CONNECTED', 'ATS ENGINE READY'].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                  {s}
                </span>
              ))}
            </motion.div>

            {/* ── CTA button ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.7 }}
            >
              <motion.button
                onClick={handleLaunch}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="group relative px-10 py-4 rounded-2xl font-bold text-sm tracking-wide overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #6366f1)',
                  backgroundSize: '200% 100%',
                  boxShadow: '0 0 40px rgba(99,102,241,0.45), 0 0 80px rgba(99,102,241,0.15)',
                }}
              >
                {/* Animated shimmer */}
                <motion.div
                  className="absolute inset-0"
                  animate={{ backgroundPosition: ['0% 50%', '200% 50%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
                    backgroundSize: '200% 100%',
                  }}
                />
                <span className="relative z-10 flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                  Get Ready for My New Career
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
            </motion.div>
          </motion.div>
        ) : (
          /* ── Launch sequence ── */
          <motion.div
            key="launch"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 min-h-[calc(100vh-6rem)] md:min-h-screen flex flex-col items-center justify-center gap-8 text-center px-6 py-10 md:py-0"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 0 60px rgba(99,102,241,0.6)',
              }}
            >
              <Brain className="w-10 h-10 text-white" />
            </motion.div>

            <div className="space-y-3">
              <h2 className="text-2xl font-extrabold" style={{ fontFamily: 'Sora, sans-serif' }}>
                Initializing Your Career Engine
              </h2>
              <p className="text-sm text-white/40">Syncing AI models, loading your profile...</p>
            </div>

            {/* Progress bar */}
            <div className="w-72 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${launchProgress}%`,
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #34d399)',
                }}
                transition={{ duration: 0.1 }}
              />
            </div>

            <p className="text-[11px] font-mono text-[#818cf8]/60">
              {Math.round(launchProgress)}% — {
                launchProgress < 30 ? 'Loading career profile...' :
                  launchProgress < 60 ? 'Calibrating ATS engine...' :
                    launchProgress < 85 ? 'Connecting to Gemini AI...' :
                      'Launching dashboard...'
              }
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
