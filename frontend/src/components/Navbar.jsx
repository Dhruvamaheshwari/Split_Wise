import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        console.error("Logout failed on server");
      }

      // Clear token and redirect regardless of server response
      localStorage.removeItem("token");
      navigate("/login");
    } catch (err) {
      console.error(err.message);
    }
  };

  return (
    <nav className="bg-gray-800 p-4 text-white flex justify-between items-center">
      <div className="font-bold text-xl cursor-pointer" onClick={() => navigate("/dashboard")}>
        Splitwise Clone
      </div>
      <div>
        <button 
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
