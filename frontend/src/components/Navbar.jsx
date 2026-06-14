import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Button from "./ui/Button";
import { useTheme } from "../context/ThemeContext";

// Simple bell icon SVG component
const BellIcon = ({ hasUnread }) => (
  <div className="relative">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
    {hasUnread && (
      <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
    )}
  </div>
);

export default function Navbar() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setshowDropdown] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/auth/session`, { credentials: "include" });
        const data = await res.json();
        if (data && data.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.error("Failed to fetch session:", err);
      }
    };

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/expenses/notifications/recent`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchSession();
    fetchNotifications();

    // Setup basic polling for notifications (every 30 seconds)
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    // Fetch CSRF Token (Required by Auth.js for signout)
    const csrfRes = await fetch(`/api/auth/csrf`, { credentials: "include" });
    const { csrfToken } = await csrfRes.json();

    await fetch(`/api/auth/signout`, {
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
        <Link to="/dashboard" className="font-heading text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400 tracking-tight">
          Splitwise MVP
        </Link>
        <div className="flex items-center gap-4 relative">
          
          {/* Theme Toggle Button */}
          <button onClick={toggleTheme} className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 transition-colors focus:outline-none">
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            )}
          </button>

          {/* Notifications Button */}
          {user && (
            <div className="relative">
              <button onClick={() => setshowDropdown(!showDropdown)} className="p-2 focus:outline-none">
                <BellIcon hasUnread={notifications.length > 0} />
              </button>
              
              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 py-2 z-50 animate-fade-in">
                  <div className="px-4 py-2 border-b border-gray-50 dark:border-slate-700 flex justify-between items-center">
                    <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">Notifications</span>
                    <span className="text-xs bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">{notifications.length}</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No new messages.</div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-50 dark:border-slate-700 last:border-0 transition-colors"
                          onClick={() => {
                            setshowDropdown(false);
                            navigate(`/expense/${notif.expense_id}`);
                          }}
                        >
                          <p className="text-sm text-gray-800 dark:text-gray-200">
                            <span className="font-bold text-primary-600 dark:text-primary-400">{notif.user?.username || notif.user?.email}</span>
                            {" "}commented on <span className="font-semibold text-gray-900 dark:text-white">"{notif.expense?.description}"</span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 italic">"{notif.content}"</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {user && (
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 hidden sm:inline-block">
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
