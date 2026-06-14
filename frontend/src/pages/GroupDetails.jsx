import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

export default function GroupDetails() {
  const { id: groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  
  // Add member state
  const [newMemberIdentifier, setNewMemberIdentifier] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberMsg, setAddMemberMsg] = useState({ text: "", type: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const groupRes = await fetch("http://localhost:3000/api/groups", { credentials: "include" });
        const groupsData = await groupRes.json();
        const currentGroup = groupsData.find(g => g.id === groupId);
        
        if (!currentGroup) throw new Error("Group not found or you don't have access");
        setGroup(currentGroup);

        const balanceRes = await fetch(`http://localhost:3000/api/groups/${groupId}/balances`, { credentials: "include" });
        const balanceData = await balanceRes.json();
        setBalances(balanceData);

        const expensesRes = await fetch(`http://localhost:3000/api/groups/${groupId}/expenses`, { credentials: "include" });
        if (expensesRes.ok) {
          const expensesData = await expensesRes.json();
          setExpenses(expensesData);
        }

        try {
          const sessionRes = await fetch("http://localhost:3000/api/auth/session", { credentials: "include" });
          const sessionData = await sessionRes.json();
          setCurrentUser(sessionData?.user?.id);
        } catch(e) {}

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [groupId]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberIdentifier.trim()) return;
    setAddingMember(true);
    setAddMemberMsg({ text: "", type: "" });

    try {
      const res = await fetch(`http://localhost:3000/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: newMemberIdentifier.includes("@") ? newMemberIdentifier : undefined,
          username: !newMemberIdentifier.includes("@") ? newMemberIdentifier : undefined,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member");

      setAddMemberMsg({ text: "Member added successfully!", type: "success" });
      setNewMemberIdentifier("");
      
      // Refresh group data to show new member
      const groupRes = await fetch("http://localhost:3000/api/groups", { credentials: "include" });
      const groupsData = await groupRes.json();
      setGroup(groupsData.find(g => g.id === groupId));

    } catch (err) {
      setAddMemberMsg({ text: err.message, type: "error" });
    } finally {
      setAddingMember(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    
    try {
      const res = await fetch(`http://localhost:3000/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetUserId: currentUser })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to leave group");

      // Redirect to dashboard on successful leave
      navigate("/dashboard");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    
    try {
      const res = await fetch(`http://localhost:3000/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetUserId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove member");

      // Refresh group data
      const groupRes = await fetch("http://localhost:3000/api/groups", { credentials: "include" });
      const groupsData = await groupRes.json();
      setGroup(groupsData.find(g => g.id === groupId));
      
      // Also refresh balances
      const balanceRes = await fetch(`http://localhost:3000/api/groups/${groupId}/balances`, { credentials: "include" });
      setBalances(await balanceRes.json());
      
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50"><Spinner size="lg" /></div>
  );
  if (error) return <div className="p-8 text-red-500 text-center font-bold">{error}</div>;

  const getUserName = (userId) => {
    const member = group.members?.find(m => m.user_id === userId);
    return member?.user?.username || member?.user?.email || "Unknown User";
  };

  const isCreator = group?.members?.find(m => m.user_id === currentUser)?.role === 'creator';

  let userTotalOwedToOthers = 0;
  let userTotalOwedByOthers = 0;

  balances.forEach(b => {
    if (b.fromUserId === currentUser) userTotalOwedToOthers += b.amount;
    if (b.toUserId === currentUser) userTotalOwedByOthers += b.amount;
  });

  const netBalance = userTotalOwedByOthers - userTotalOwedToOthers;
  const totalGroupExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  return (
    <div className="min-h-screen flex flex-col page-enter">
      <Navbar />
      <main className="max-w-4xl mx-auto p-6 w-full flex-1">
        {/* Passbook Header Banner */}
        <div className="mb-8 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-primary-900 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500 opacity-20 rounded-full blur-[80px] -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500 opacity-10 rounded-full blur-[60px] -ml-10 -mb-10"></div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-8">
            <div>
              <button onClick={() => navigate("/dashboard")} className="mb-4 text-xs font-semibold px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-sm transition-colors border border-white/30">
                &larr; Back to Dashboard
              </button>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="font-heading text-4xl font-extrabold tracking-tight drop-shadow-sm">{group.name}</h1>
              </div>
              <p className="text-primary-200 font-medium text-sm flex items-center gap-2 mb-8">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Group
              </p>
              
              <div className="flex flex-wrap gap-4 mt-2">
                <button onClick={() => navigate(`/group/${groupId}/expense/new`)} className="bg-white text-gray-900 hover:bg-gray-100 shadow-xl font-bold px-7 py-3 rounded-2xl transition-transform hover:-translate-y-1">
                  Add Expense
                </button>
                <button onClick={() => navigate(`/settle?group=${groupId}`)} className="bg-primary-500 hover:bg-primary-400 border border-primary-400 text-white shadow-xl font-bold px-7 py-3 rounded-2xl transition-transform hover:-translate-y-1">
                  Settle Up
                </button>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 sm:min-w-[260px] shadow-2xl">
              <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-3">My Net Balance</p>
              {netBalance === 0 ? (
                <p className="text-3xl font-black text-white mb-5">Settled Up</p>
              ) : netBalance > 0 ? (
                <div className="mb-5">
                  <p className="font-mono-num text-4xl font-black text-emerald-400 drop-shadow-md">₹{netBalance.toFixed(2)}</p>
                  <p className="text-sm text-emerald-300/80 mt-1.5 font-medium">You will get overall</p>
                </div>
              ) : (
                <div className="mb-5">
                  <p className="font-mono-num text-4xl font-black text-rose-400 drop-shadow-md">₹{Math.abs(netBalance).toFixed(2)}</p>
                  <p className="text-sm text-rose-300/80 mt-1.5 font-medium">You need to pay</p>
                </div>
              )}
              
              <div className="space-y-3 pt-5 border-t border-white/10 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm font-medium">You owe:</span>
                  <span className="font-mono-num font-bold text-rose-400 text-sm">₹{userTotalOwedToOthers.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm font-medium">You get:</span>
                  <span className="font-mono-num font-bold text-emerald-400 text-sm">₹{userTotalOwedByOthers.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Group-wise Balance Card */}
          <Card className="col-span-1 lg:col-span-2 p-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Settlement Summary</h2>
            {balances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 border-dashed">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-emerald-50">
                    <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-heading text-xl font-black text-gray-900 mb-1">All Settled Up!</h3>
                  <p className="text-gray-500 font-medium text-sm">Everyone is square. No pending balances in this group.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {balances.map((b, i) => (
                    <li key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                          {getUserName(b.fromUserId)[0].toUpperCase()}
                        </div>
                        <span className="text-gray-600 font-medium text-sm">
                          <span className="font-bold text-gray-900">{getUserName(b.fromUserId)}</span> owes <span className="font-bold text-gray-900">{getUserName(b.toUserId)}</span>
                        </span>
                      </div>
                      <span className="font-mono-num font-black text-gray-900 text-lg">₹{b.amount.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
          </Card>
        </div>

        {/* Group Members List & Add Member */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wider text-xs">Group Members</h2>
            <ul className="space-y-3">
              {group.members?.map((m) => (
                <li key={m.user_id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                      {(m.user?.username || m.user?.email || "?")[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800">{m.user?.username || m.user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.role === "creator" && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold">Creator</span>
                    )}
                    {m.user_id === currentUser ? (
                      <button 
                        onClick={handleLeaveGroup}
                        className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                      >
                        Leave
                      </button>
                    ) : (
                      isCreator && (
                        <button 
                          onClick={() => handleRemoveMember(m.user_id)}
                          className="text-xs font-bold text-gray-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                        >
                          Remove
                        </button>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wider text-xs">Add New Member</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              {addMemberMsg.text && (
                <div className={`p-3 rounded-lg text-sm font-medium ${addMemberMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {addMemberMsg.text}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username or Email</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMemberIdentifier}
                    onChange={(e) => setNewMemberIdentifier(e.target.value)}
                    placeholder="e.g. rohan or priya@example.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <Button type="submit" variant="primary" isLoading={addingMember}>
                    Add
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Only the group creator can add members. Users must already have an account.
              </p>
            </form>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
              <h2 className="font-heading text-xl font-black text-gray-900 uppercase tracking-wide">Passbook</h2>
              <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-3">
                <span className="text-sm text-gray-500 font-bold">Total Group Spends</span>
                <span className="font-mono-num text-xl font-black text-primary-600">₹{totalGroupExpenses.toFixed(2)}</span>
              </div>
            </div>
            
            {expenses.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-500 font-medium">No transactions yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {expenses.map((exp) => (
                  <div key={exp.id} className="group relative flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-primary-100 transition-all cursor-pointer overflow-hidden" onClick={() => navigate(`/expense/${exp.id}`)}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-400 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 text-primary-600 flex flex-col items-center justify-center font-bold shadow-sm group-hover:bg-primary-50 transition-colors">
                        <span className="text-xs font-semibold uppercase text-gray-400">{new Date(exp.created_at).toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span className="text-lg leading-none mt-0.5">{new Date(exp.created_at).getDate()}</span>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-gray-900 text-lg group-hover:text-primary-700 transition-colors">{exp.description}</h3>
                        <p className="text-sm text-gray-500 mt-0.5 font-medium">
                          Paid by <span className="font-bold text-gray-700">{exp.paid_by?.username || exp.paid_by?.email}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-num font-black text-gray-900 text-xl">
                        {exp.currency === "USD" ? "$" : "₹"}{(exp.original_amount || exp.amount).toFixed(2)}
                      </div>
                      <div className="inline-block px-2 py-0.5 mt-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-md">
                        {exp.split_type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
