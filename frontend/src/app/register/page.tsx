'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ToastProvider';
import { useRouter } from 'next/navigation';
import { Clock, User, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useApp();
  const { toast } = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace('/');
  }, [isAuthenticated, isLoading, router]);

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      toast.success('Account created successfully! Welcome aboard 🎉');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <main className="min-h-screen flex flex-col md:grid md:grid-cols-12 bg-background relative overflow-hidden">
      
      {/* Left side panel - Hero / Teaser - only visible on md and up */}
      <div className="hidden md:flex md:col-span-5 lg:col-span-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-zinc-950 relative flex-col justify-between p-12 overflow-hidden border-r border-border/10">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        {/* Ambient colored glows inside the hero panel */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Brand Header */}
        <div className="z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            TimeLog
          </span>
        </div>

        {/* Value Proposition & Mock Timeline */}
        <div className="z-10 max-w-md my-auto space-y-8 animate-fade-up">
          <div className="space-y-3">
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Create your free account today
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              No complicated timers or distractions. Simply log your day in seconds and let TimeLog generate automated, beautiful insights.
            </p>
          </div>

          {/* Interactive timeline mockup */}
          <div className="card glass p-6 border-white/5 space-y-4 shadow-2xl relative overflow-hidden bg-white/[0.03]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Today's Flow Preview</p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs text-slate-500 pt-0.5">08:00</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Next.js Learning</p>
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-semibold">📚 Learning</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Setting up state & layouts</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-mono text-xs text-slate-500 pt-0.5">09:30</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Client Project</p>
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">💼 Work</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Database schema design</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-mono text-xs text-slate-500 pt-0.5">12:00</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">Healthy Lunch</p>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">🏃 Health</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="z-10 text-xs text-slate-500 font-medium">
          © {new Date().getFullYear()} TimeLog. Clean tracking & insights.
        </div>
      </div>

      {/* Right side panel - Signup Form */}
      <div className="flex-1 md:col-span-7 lg:col-span-6 flex items-center justify-center p-6 md:p-12 bg-background relative">
        {/* Glows for background details */}
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none md:hidden" />
        <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none md:hidden" />

        <div className="w-full max-w-[400px] animate-scale-in">
          <div className="card glass p-8 shadow-2xl hover:border-primary/10 transition-colors">
            
            {/* Header */}
            <div className="mb-8">
              {/* Logo visible only on mobile split layout */}
              <div className="flex items-center gap-2.5 mb-6 md:hidden">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-bold tracking-tight text-foreground">
                  TimeLog
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">Create your account</h1>
              <p className="text-sm text-muted mt-1.5">Start tracking where your time goes</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                  <input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })); }}
                    placeholder="John Doe"
                    className={`field pl-10 ${errors.name ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' : ''}`}
                  />
                </div>
                {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                    placeholder="name@example.com"
                    className={`field pl-10 ${errors.email ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' : ''}`}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                    placeholder="Min. 6 characters"
                    className={`field pl-10 pr-10 ${errors.password ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' : ''}`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
              </div>

              <button type="submit" disabled={submitting} className="btn btn-primary w-full mt-2 py-3">
                {submitting ? (
                  <><span className="spinner border-white/30 border-t-white" />Creating account...</>
                ) : (
                  <>Create Account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-muted mt-6 pt-5 border-t border-border">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
