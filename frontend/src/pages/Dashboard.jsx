import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Spinner from "../components/ui/Spinner";

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const fetchGroups = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/groups", {
        credentials: "include",
      });

      if (res.status === 401) {
        navigate("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch groups");

      setGroups(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError("");
    setIsCreating(true);

    try {
      const res = await fetch("http://localhost:3000/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name: newGroupName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create group");

      setGroups([data, ...groups]);
      setNewGroupName("");
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col page-enter">
      <Navbar />

      <main className="max-w-5xl mx-auto p-6 w-full flex-1">
        {/* FinTech Header Banner */}
        <div className="mb-10 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-primary-900 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500 opacity-20 rounded-full blur-[80px] -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500 opacity-10 rounded-full blur-[60px] -ml-10 -mb-10"></div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight mb-2 drop-shadow-md">My Groups</h1>
              <p className="text-primary-200 font-medium">Manage your shared expenses and balances</p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-white text-gray-900 hover:bg-gray-100 shadow-xl font-bold px-7 py-3 rounded-2xl transition-transform hover:-translate-y-1">
              + New Group
            </button>
          </div>
        </div>

        {error && <div className="text-red-500 mb-6 bg-red-50 p-4 rounded-lg">{error}</div>}

        {loading ? (
          <div className="py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📭</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No groups yet</h3>
                <p className="text-gray-500 mb-6">Start tracking expenses with your friends.</p>
                <Button onClick={() => setIsModalOpen(true)} className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-6 py-2.5 rounded-full shadow-md">
                  Create your first group
                </Button>
              </div>
            ) : (
              groups.map((group, idx) => (
                <Card 
                  key={group.id} 
                  hover 
                  className="p-6 flex flex-col bg-white border-0 shadow-md hover:shadow-xl rounded-3xl group"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div onClick={() => navigate(`/group/${group.id}`)} className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                        <span className="text-xl font-black text-primary-600">{group.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                        {group.members?.length || 0} Members
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-gray-900 mb-4 truncate group-hover:text-primary-600 transition-colors">{group.name}</h3>
                    
                    <div className="flex -space-x-3 mb-6">
                      {group.members?.slice(0, 4).map((m, i) => (
                        <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white flex items-center justify-center text-sm text-gray-700 font-bold shadow-sm">
                          {(m.user?.username || m.user?.email || '?').charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {group.members?.length > 4 && (
                        <div className="w-10 h-10 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-xs text-gray-500 font-bold shadow-sm">
                          +{group.members.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-50 mt-auto flex justify-between items-center">
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">
                      {new Date(group.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <span className="text-primary-500 group-hover:translate-x-1 transition-transform">
                      &rarr;
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <Card className="w-full max-w-md p-6" animate={false}>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Create New Group</h2>
              <form onSubmit={handleCreateGroup}>
                <Input
                  label="Group Name"
                  type="text"
                  placeholder="e.g., Weekend Trip"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
                <div className="flex justify-end gap-3 mt-8">
                  <Button
                    type="button"
                    variant="glass"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" isLoading={isCreating}>
                    Create
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
