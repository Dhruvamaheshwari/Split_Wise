import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";

export default function CreateExpense() {
  const { id: groupId } = useParams();
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [splitType, setSplitType] = useState("equal"); // equal, unequal, percentage, shares
  const [members, setMembers] = useState([]);
  const [splits, setSplits] = useState({}); // user_id -> custom split value (e.g. $, %, or shares)
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch(`/api/groups`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const groups = await res.json();
        const currentGroup = groups.find((g) => g.id === groupId);
        
        if (currentGroup && currentGroup.members) {
          setMembers(currentGroup.members);
          
          // Initialize splits based on default splitType
          const initialSplits = {};
          currentGroup.members.forEach((m) => {
            initialSplits[m.user_id] = 0;
          });
          setSplits(initialSplits);
        }
      } catch (err) {
        console.error("Failed to fetch group members", err);
      }
    };
    fetchMembers();
  }, [groupId]);

  const handleSplitChange = (userId, value) => {
    setSplits((prev) => ({
      ...prev,
      [userId]: parseFloat(value) || 0,
    }));
  };

  const calculateFinalSplits = () => {
    const totalAmount = parseFloat(amount) || 0;
    const numMembers = members.length;
    let finalSplits = [];

    if (splitType === "equal") {
      const equalAmount = totalAmount / numMembers;
      finalSplits = members.map((m) => ({
        user_id: m.user_id,
        amount_owed: Number(equalAmount.toFixed(2)),
      }));
    } else if (splitType === "unequal") {
      finalSplits = members.map((m) => ({
        user_id: m.user_id,
        amount_owed: Number(splits[m.user_id] || 0),
      }));
    } else if (splitType === "percentage") {
      finalSplits = members.map((m) => ({
        user_id: m.user_id,
        amount_owed: Number(((splits[m.user_id] || 0) / 100) * totalAmount).toFixed(2),
      }));
    } else if (splitType === "shares") {
      const totalShares = Object.values(splits).reduce((acc, val) => acc + val, 0) || 1;
      finalSplits = members.map((m) => ({
        user_id: m.user_id,
        amount_owed: Number(((splits[m.user_id] || 0) / totalShares) * totalAmount).toFixed(2),
      }));
    }

    return finalSplits;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const finalSplits = calculateFinalSplits();
    
    // Quick frontend validation
    const sum = finalSplits.reduce((acc, s) => acc + parseFloat(s.amount_owed), 0);
    const parsedAmount = parseFloat(amount);
    
    if (Math.abs(sum - parsedAmount) > 0.05) {
      setError(`Splits must add up to $${parsedAmount}. Current sum is $${sum.toFixed(2)}`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          groupId,
          amount: parsedAmount,
          description,
          splits: finalSplits,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create expense");

      navigate(`/group/${groupId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto p-6">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">Add an Expense</h1>

          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Dinner at Mario's"
                className="w-full border p-2 rounded focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">Total Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border p-2 rounded focus:outline-none focus:border-blue-500 text-2xl font-bold text-center"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-3">Split Method</label>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                {["equal", "unequal", "percentage", "shares"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSplitType(type)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md capitalize ${
                      splitType === type ? "bg-white shadow text-blue-600" : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Inputs */}
            {splitType !== "equal" && (
              <div className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-4 capitalize">Enter {splitType}</h3>
                {members.map((member) => (
                  <div key={member.user_id} className="flex justify-between items-center mb-3">
                    <span className="text-gray-700">{member.user?.username || member.user?.email}</span>
                    <div className="relative w-32">
                      <input
                        type="number"
                        step={splitType === "shares" ? "1" : "0.01"}
                        min="0"
                        value={splits[member.user_id] || ""}
                        onChange={(e) => handleSplitChange(member.user_id, e.target.value)}
                        className="w-full border p-2 pr-8 rounded text-right focus:outline-none focus:border-blue-500"
                      />
                      <span className="absolute right-3 top-2 text-gray-400">
                        {splitType === "percentage" ? "%" : splitType === "shares" ? "" : "$"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-4 mt-8">
              <button
                type="button"
                onClick={() => navigate(`/group/${groupId}`)}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:bg-blue-400"
              >
                {loading ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
