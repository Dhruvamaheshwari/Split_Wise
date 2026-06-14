import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Settle() {
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group");
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form State
  const [selectedUser, setSelectedUser] = useState("");
  const [paymentDirection, setPaymentDirection] = useState("I_PAID"); // "I_PAID" or "THEY_PAID"
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Not authenticated");

        // Decode token for current user
        let currentId = null;
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          currentId = payload.sub;
          setCurrentUser(currentId);
        } catch (e) {}

        if (!groupId) throw new Error("Group ID is required");

        // Fetch Groups to get group details
        const groupRes = await fetch("/api/groups", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const groupsData = await groupRes.json();
        const currentGroup = groupsData.find((g) => g.id === groupId);

        if (!currentGroup) throw new Error("Group not found");
        setGroup(currentGroup);

        // Fetch Balances
        const balanceRes = await fetch(`/api/groups/${groupId}/balances`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const balanceData = await balanceRes.json();
        setBalances(balanceData);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId]);

  const handleSettle = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedUser || !amount) {
      setError("Please fill out all fields");
      return;
    }

    const paidByUserId = paymentDirection === "I_PAID" ? currentUser : selectedUser;
    const paidToUserId = paymentDirection === "I_PAID" ? selectedUser : currentUser;

    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          groupId,
          paidByUserId,
          paidToUserId,
          amount,
          // Notes omitted because schema doesn't support it, but we capture it on frontend
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record settlement");

      // Redirect back to group details where balances will naturally re-fetch
      navigate(`/group/${groupId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-center p-8">Loading...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

  const getUserName = (userId) => {
    const member = group.members?.find((m) => m.user_id === userId);
    return member?.user?.username || member?.user?.email || "Unknown User";
  };

  // Filter lists
  const youOwe = balances.filter((b) => b.fromUserId === currentUser);
  const oweYou = balances.filter((b) => b.toUserId === currentUser);

  // Users we can settle with (people we owe or owe us)
  const availableUsersToSettle = [
    ...youOwe.map((b) => ({ id: b.toUserId, amount: b.amount, type: "owe" })),
    ...oweYou.map((b) => ({ id: b.fromUserId, amount: b.amount, type: "owed" })),
  ];

  const handleSelectUser = (userId, type, suggestedAmount) => {
    setSelectedUser(userId);
    setPaymentDirection(type === "owe" ? "I_PAID" : "THEY_PAID");
    setAmount(suggestedAmount.toString());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Col: Balances Summary */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Balances in {group.name}</h2>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <h3 className="text-lg font-bold text-red-600 mb-4">You Owe</h3>
            {youOwe.length === 0 ? (
              <p className="text-gray-500 text-sm">You owe nothing.</p>
            ) : (
              <ul className="space-y-3">
                {youOwe.map((b) => (
                  <li key={`owe-${b.toUserId}`} className="flex justify-between items-center bg-red-50 p-3 rounded">
                    <span>{getUserName(b.toUserId)}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-red-600">${b.amount.toFixed(2)}</span>
                      <button 
                        onClick={() => handleSelectUser(b.toUserId, "owe", b.amount)}
                        className="text-xs bg-red-600 text-white px-2 py-1 rounded"
                      >
                        Settle
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-green-600 mb-4">Owed to You</h3>
            {oweYou.length === 0 ? (
              <p className="text-gray-500 text-sm">Nobody owes you anything.</p>
            ) : (
              <ul className="space-y-3">
                {oweYou.map((b) => (
                  <li key={`owed-${b.fromUserId}`} className="flex justify-between items-center bg-green-50 p-3 rounded">
                    <span>{getUserName(b.fromUserId)}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-green-600">${b.amount.toFixed(2)}</span>
                      <button 
                        onClick={() => handleSelectUser(b.fromUserId, "owed", b.amount)}
                        className="text-xs bg-green-600 text-white px-2 py-1 rounded"
                      >
                        Settle
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Col: Settle Form */}
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 h-fit">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Record a Payment</h2>
          
          <form onSubmit={handleSettle}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Who was involved?</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full border p-2 rounded focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Select a member</option>
                {group.members
                  ?.filter((m) => m.user_id !== currentUser)
                  .map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user?.username || m.user?.email}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mb-4 flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={paymentDirection === "I_PAID"}
                  onChange={() => setPaymentDirection("I_PAID")}
                  className="form-radio text-blue-600"
                />
                <span>I paid them</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={paymentDirection === "THEY_PAID"}
                  onChange={() => setPaymentDirection("THEY_PAID")}
                  className="form-radio text-green-600"
                />
                <span>They paid me</span>
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border p-2 rounded text-2xl font-bold focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Venmo transfer"
                className="w-full border p-2 rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate(`/group/${groupId}`)}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700"
              >
                Save Payment
              </button>
            </div>
          </form>
        </div>

      </main>
    </div>
  );
}
