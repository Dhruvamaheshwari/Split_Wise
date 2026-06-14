import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Button from "./ui/Button";

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/auth/session", { credentials: "include" });
        const data = await res.json();
        if (data && data.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.error("Failed to fetch session:", err);
      }
    };
    fetchSession();
  }, []);

  const handleLogout = async () => {
    // Fetch CSRF Token (Required by Auth.js for signout)
    const csrfRes = await fetch("http://localhost:3000/api/auth/csrf", { credentials: "include" });
    const { csrfToken } = await csrfRes.json();

    await fetch("http://localhost:3000/api/auth/signout", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Auth-Return-Redirect": "1"
      },
      credentials: "include",
      body: JSON.stringify({ csrfToken, json: true })
    });
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 glass-panel shadow-sm">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">
          Splitwise MVP
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm font-semibold text-gray-700 hidden sm:inline-block">
              Hi, {user.username || user.email}
            </span>
          )}
          <Button variant="glass" onClick={handleLogout} className="text-sm">
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
