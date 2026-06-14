import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function GroupDetails() {
  const { id: groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // We need to fetch group details, balances, and maybe expenses
  // Since we don't have a specific getGroup endpoint yet, we can filter from /api/groups
  // But ideally we'd fetch specific data. For MVP, we'll hit the balances endpoint and fetch groups.

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        
        // Fetch User's groups to find the current group details
        const groupRes = await fetch("/api/groups", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const groupsData = await groupRes.json();
        const currentGroup = groupsData.find(g => g.id === groupId);
        
        if (!currentGroup) {
          throw new Error("Group not found or you don't have access");
        }
        setGroup(currentGroup);

        // Fetch balances
        const balanceRes = await fetch(`/api/groups/${groupId}/balances`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const balanceData = await balanceRes.json();
        setBalances(balanceData);

        // Optional: fetch expenses if an endpoint exists, or rely on another API.
        // For MVP, we mainly focus on balances per the prompt.

        // Get current user id from JWT token (simple decode)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentUser(payload.sub); // Supabase puts user id in 'sub'
        } catch(e) {}

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-red-500 text-center">{error}</div>;

  // Helpers to get usernames
  const getUserName = (userId) => {
    const member = group.members?.find(m => m.user_id === userId);
    return member?.user?.username || member?.user?.email || "Unknown User";
  };

  // Individual Summary for current user
  let userTotalOwedToOthers = 0;
  let userTotalOwedByOthers = 0;

  balances.forEach(b => {
    if (b.fromUserId === currentUser) {
      userTotalOwedToOthers += b.amount;
    }
    if (b.toUserId === currentUser) {
      userTotalOwedByOthers += b.amount;
    }
  });

  const netBalance = userTotalOwedByOthers - userTotalOwedToOthers;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">{group.name}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/group/${groupId}/expense/new`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Add Expense
            </button>
            <button
              onClick={() => navigate(`/settle?group=${groupId}`)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Settle Up
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Individual Summary */}
          <div className="col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Your Balance</h2>
            <div className={`text-3xl font-bold ${netBalance > 0 ? 'text-green-600' : netBalance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {netBalance > 0 ? `Gets back $${netBalance.toFixed(2)}` : netBalance < 0 ? `Owes $${Math.abs(netBalance).toFixed(2)}` : "Settled up"}
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <p>You owe in total: <span className="font-semibold text-red-500">${userTotalOwedToOthers.toFixed(2)}</span></p>
              <p>You are owed in total: <span className="font-semibold text-green-500">${userTotalOwedByOthers.toFixed(2)}</span></p>
            </div>
          </div>

          {/* Group-wise Balance */}
          <div className="col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Group Balances</h2>
            {balances.length === 0 ? (
              <p className="text-gray-500 italic">Everyone is settled up.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {balances.map((balance, idx) => (
                  <li key={idx} className="py-3 flex justify-between items-center">
                    <span className="font-medium text-gray-800">
                      {getUserName(balance.fromUserId)}
                    </span>
                    <span className="text-gray-500 text-sm mx-2">owes</span>
                    <span className="font-medium text-gray-800">
                      {getUserName(balance.toUserId)}
                    </span>
                    <span className="font-bold text-red-600 ml-4">
                      ${balance.amount.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
