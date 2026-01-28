"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn.email({
        email,
        password,
        callbackURL: "/",
        fetchOptions: {
          onError: (ctx) => {
            toast.error(ctx.error.message);
          },
        },
      });
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Glass Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 p-8 backdrop-blur-xl shadow-2xl shadow-black/50">
        {/* Card glow effect */}
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-zinc-800/30 blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-zinc-800/30 blur-[100px]" />
        
        <div className="relative z-10">
          {/* Logo / Brand */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-zinc-700/50 rounded-lg"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                  Password
                </Label>
                <Link 
                  href="/forgot-password" 
                  className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-zinc-700/50 rounded-lg"
              />
            </div>

            <Button 
              type="submit" 
              className="h-11 w-full bg-white text-black font-semibold hover:bg-zinc-200 transition-all duration-200 shadow-lg disabled:opacity-50 rounded-lg"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sign in
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
            <span className="text-xs text-zinc-600">or</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-zinc-400">
            Don't have an account?{" "}
            <Link 
              href="/register" 
              className="font-semibold text-white hover:text-zinc-300 transition-colors"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-xs text-zinc-600">
        By signing in, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-zinc-400">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-zinc-400">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
