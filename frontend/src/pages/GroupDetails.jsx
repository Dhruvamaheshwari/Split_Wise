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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50"><Spinner size="lg" /></div>
  );
  if (error) return <div className="p-8 text-red-500 text-center font-bold">{error}</div>;

  const getUserName = (userId) => {
    const member = group.members?.find(m => m.user_id === userId);
    return member?.user?.username || member?.user?.email || "Unknown User";
  };

  let userTotalOwedToOthers = 0;
  let userTotalOwedByOthers = 0;

  balances.forEach(b => {
    if (b.fromUserId === currentUser) userTotalOwedToOthers += b.amount;
    if (b.toUserId === currentUser) userTotalOwedByOthers += b.amount;
  });

  const netBalance = userTotalOwedByOthers - userTotalOwedToOthers;

  return (
    <div className="min-h-screen flex flex-col page-enter">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6 w-full flex-1">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
          <div>
            <Button variant="glass" onClick={() => navigate('/dashboard')} className="mb-4 text-xs px-3 py-1">
              &larr; Back to Dashboard
            </Button>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{group.name}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigate(`/group/${groupId}/expense/new`)}>
              Add Expense
            </Button>
            <Button variant="primary" onClick={() => navigate(`/settle?group=${groupId}`)}>
              Settle Up
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Individual Summary Card */}
          <Card className="col-span-1 p-6 bg-gradient-to-br from-white to-gray-50 border-t-4 border-t-primary-500">
            <h2 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wider text-xs">Your Balance</h2>
            <div className={`text-3xl font-extrabold mb-2 ${netBalance > 0 ? 'text-emerald-600' : netBalance < 0 ? 'text-rose-600' : 'text-gray-400'}`}>
              {netBalance > 0 ? `+ $${netBalance.toFixed(2)}` : netBalance < 0 ? `- $${Math.abs(netBalance).toFixed(2)}` : "Settled up"}
            </div>
            {netBalance !== 0 && (
              <p className="text-gray-500 text-sm font-medium mb-6">
                {netBalance > 0 ? "You are owed overall" : "You owe overall"}
              </p>
            )}
            
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">You owe:</span>
                <span className="font-bold text-rose-500">${userTotalOwedToOthers.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">You are owed:</span>
                <span className="font-bold text-emerald-500">${userTotalOwedByOthers.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Group-wise Balance Card */}
          <Card className="col-span-1 lg:col-span-2 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6 uppercase tracking-wider text-xs">All Group Balances</h2>
            {balances.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-500 italic">Everyone is perfectly settled up!</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {balances.map((balance, idx) => (
                  <li key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{getUserName(balance.fromUserId)}</span>
                      <span className="text-gray-400 text-xs mt-1">owes {getUserName(balance.toUserId)}</span>
                    </div>
                    <span className="font-extrabold text-rose-500 text-lg">
                      ${balance.amount.toFixed(2)}
                    </span>
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
                  {m.role === "creator" && (
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-bold">Creator</span>
                  )}
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
      </main>
    </div>
  );
}
