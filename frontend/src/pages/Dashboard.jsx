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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Your Groups</h1>
          <Button onClick={() => setIsModalOpen(true)} variant="primary">
            + Create Group
          </Button>
        </div>

        {error && <div className="text-red-500 mb-6 bg-red-50 p-4 rounded-lg">{error}</div>}

        {loading ? (
          <div className="py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white/50 rounded-2xl border border-gray-200 border-dashed">
                <p className="text-gray-500 text-lg">You are not in any groups yet.</p>
                <Button onClick={() => setIsModalOpen(true)} variant="glass" className="mt-4">
                  Create your first group
                </Button>
              </div>
            ) : (
              groups.map((group, idx) => (
                <Card 
                  key={group.id} 
                  hover 
                  className="p-6 flex flex-col"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div onClick={() => navigate(`/group/${group.id}`)} className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2 truncate">{group.name}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex -space-x-2">
                        {/* Placeholder avatars for members */}
                        {group.members?.slice(0,3).map((m, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 border-2 border-white flex items-center justify-center text-xs text-white font-bold">
                            {(m.user?.username || m.user?.email || '?').charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <span className="text-gray-500 text-sm font-medium">
                        {group.members?.length || 0} Members
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-100 mt-auto">
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                      Created {new Date(group.created_at).toLocaleDateString()}
                    </p>
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
