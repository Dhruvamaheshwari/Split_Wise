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
      const csrfRes = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/csrf`, { credentials: "include" });
      const { csrfToken } = await csrfRes.json();

      // 2. Perform Login with the Token
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth/callback/credentials`, {
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
    <div className="min-h-screen flex items-center justify-center p-6 page-enter">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-500">Sign in to Splitwise MVP</p>
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

          <Button type="submit" variant="primary" className="w-full mt-4" isLoading={loading}>
            Sign In
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary-600 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}
