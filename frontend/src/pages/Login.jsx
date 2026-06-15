import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Fetch CSRF Token (Required by Auth.js)
      const csrfRes = await fetch(`/api/auth/csrf`, { credentials: "include" });
      const { csrfToken } = await csrfRes.json();

      // 2. Perform Login with the Token
      const res = await fetch(`/api/auth/callback/credentials`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Auth-Return-Redirect": "1"
        },
        body: JSON.stringify({ email, password, csrfToken, redirect: false, json: true }),
        credentials: "include"
      });

      const data = await res.json();
      
      // Auth.js returns { url: "..." } on success, or { error: "..." } on failure when redirect: false
      if (!res.ok || data.error) {
        throw new Error(data.error || "Login failed - Invalid credentials");
      }

      // No need to store token in localStorage; Auth.js uses HttpOnly cookies
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center lg:justify-end p-6 lg:p-16 bg-[url('/img1.png')] bg-cover bg-center relative">
      {/* Subtle gradient overlay to make the right side slightly brighter for text readability without hiding the image */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/40 dark:to-slate-900/60 pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] border border-white/50 dark:border-slate-700/50 rounded-[2.5rem] p-10 relative z-10 page-enter">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-600 mb-4 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Welcome Back</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Sign in to Splitwise MVP</p>
        </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-medium animate-fade-in text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />

            <Button type="submit" variant="primary" className="w-full mt-6" isLoading={loading}>
              Sign In
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400 font-medium">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary-600 dark:text-primary-400 font-bold hover:underline transition-all">
              Sign up
            </Link>
          </p>
        </div>
    </div>
  );
}
