import { useState, useEffect, useRef } from "react";
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
  
  // CSV Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importReport, setImportReport] = useState(null);
  const fileInputRef = useRef(null);

  const navigate = useNavigate();

  const fetchGroups = async () => {
    try {
      const res = await fetch(`/api/groups`, {
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
      const res = await fetch(`/api/groups`, {
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

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    setIsImporting(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/expenses/import`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import CSV");

      setImportReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsImporting(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
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
              <h1 className="font-heading text-4xl font-extrabold tracking-tight mb-2 drop-shadow-md">My Groups</h1>
              <p className="text-primary-200 font-medium">Manage your shared expenses and balances</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImportCSV}
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isImporting}
                className="bg-transparent border border-white/30 text-white hover:bg-white/10 font-bold px-7 py-3 rounded-2xl transition-all disabled:opacity-50"
              >
                {isImporting ? "Importing..." : "Import (CSV/Excel)"}
              </button>
              <button onClick={() => setIsModalOpen(true)} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 shadow-xl font-bold px-7 py-3 rounded-2xl transition-transform hover:-translate-y-1">
                + New Group
              </button>
            </div>
          </div>
        </div>

        {error && <div className="text-red-500 dark:text-red-400 mb-6 bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">{error}</div>}

        {loading ? (
          <div className="py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center text-center py-24 bg-gray-50 rounded-[2.5rem] border border-gray-200 shadow-sm daisy-card">
                <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-heading text-2xl font-black text-gray-900 mb-3">No groups yet</h3>
                <p className="text-gray-500 font-medium mb-8 max-w-sm">Start tracking expenses, splitting bills, and managing your finances with friends.</p>
                <div className="flex justify-center w-full">
                  <Button onClick={() => setIsModalOpen(true)} className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg hover:-translate-y-1 transition-transform">
                    Create your first group
                  </Button>
                </div>
              </div>
            ) : (
              groups.map((group, idx) => (
                <Card 
                  key={group.id} 
                  hover 
                  className="p-6 flex flex-col bg-gray-50 border-0 shadow-md hover:shadow-xl rounded-3xl group"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div onClick={() => navigate(`/group/${group.id}`)} className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-primary-50 transition-colors shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
                        <span className="text-xl font-black text-primary-600">{group.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-mono-num text-xs font-bold bg-gray-200 text-gray-700 px-3 py-1 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
                        {group.members?.length || 0} Members
                      </span>
                    </div>
                    <h3 className="font-heading text-xl font-extrabold text-gray-900 mb-4 truncate group-hover:text-primary-600 transition-colors">{group.name}</h3>
                    
                    <div className="flex -space-x-3 mb-6">
                      {group.members?.slice(0, 4).map((m, i) => (
                        <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-50 flex items-center justify-center text-sm text-gray-800 font-bold shadow-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
                          {(m.user?.username || m.user?.email || '?').charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {group.members?.length > 4 && (
                        <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-50 flex items-center justify-center text-xs text-gray-600 font-bold shadow-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
                          +{group.members.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200 mt-auto flex justify-between items-center">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">
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

        {/* CSV Import Report Modal */}
        {importReport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 dark:bg-slate-900" animate={false}>
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    📊 File Processing Report
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Processed {importReport.totalRowsProcessed} rows • {importReport.validEntries} valid entries • {importReport.anomaliesFound} anomalies detected
                  </p>
                </div>
                <button onClick={() => setImportReport(null)} className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full transition-colors text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-900">
                {importReport.anomalies && importReport.anomalies.length > 0 ? (
                  importReport.anomalies.map((anomaly, idx) => (
                    <div key={idx} className="border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400 font-mono-num px-3 py-1 rounded-lg text-xs font-bold">
                          Row {anomaly.row}
                        </span>
                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate flex-1">
                          {anomaly.originalData}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {anomaly.issues.map((issue, i) => (
                          <div key={i} className="pl-4 border-l-2 border-amber-300 dark:border-amber-700 py-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{issue.type}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 my-1">{issue.description}</p>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">↳ Action: {issue.action}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Perfect Import!</h3>
                    <p className="text-gray-500 dark:text-gray-400">No anomalies were detected in your file.</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
                <Button onClick={() => setImportReport(null)} className="px-6">Close Report</Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
