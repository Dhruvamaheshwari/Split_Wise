import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function CreateExpense() {
  const { id: groupId } = useParams();
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [splitType, setSplitType] = useState("EQUAL");
  const [members, setMembers] = useState([]);
  const [splits, setSplits] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/groups`, {
          credentials: "include",
        });
        const groups = await res.json();
        const currentGroup = groups.find((g) => g.id === groupId);
        
        if (currentGroup && currentGroup.members) {
          setMembers(currentGroup.members);
          const initialSplits = {};
          currentGroup.members.forEach((m) => {
            initialSplits[m.user_id] = 0;
          });
          setSplits(initialSplits);
        }
      } catch (err) {}
    };
    fetchMembers();
  }, [groupId]);

  const handleSplitChange = (userId, value) => {
    setSplits((prev) => ({ ...prev, [userId]: parseFloat(value) || 0 }));
  };

  const formatSplitsForBackend = () => {
    let finalSplits = [];

    if (splitType === "EQUAL") {
      finalSplits = members.map((m) => ({
        user_id: m.user_id,
        split_value: null,
      }));
    } else {
      finalSplits = members.map((m) => ({
        user_id: m.user_id,
        split_value: parseFloat(splits[m.user_id]) || 0,
      }));
    }

    return finalSplits;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const finalSplits = formatSplitsForBackend();
    const parsedAmount = parseFloat(amount);
    
    // Unequal validation on frontend (Optional but good for UX)
    if (splitType === "UNEQUAL") {
      const sum = finalSplits.reduce((acc, s) => acc + s.split_value, 0);
      if (Math.abs(sum - parsedAmount) > 0.05) {
        setError(`Unequal splits must equal ${parsedAmount}. Currently at ${sum}`);
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ groupId, amount: parsedAmount, currency, description, splitType, splits: finalSplits }),
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
    <div className="min-h-screen flex flex-col page-enter">
      <Navbar />
      <main className="max-w-2xl mx-auto p-6 w-full flex-1">
        <Card className="p-8">
          <div className="flex items-center mb-8">
            <Button variant="glass" onClick={() => navigate(`/group/${groupId}`)} className="mr-4 px-3 py-1 text-xs">
              &larr; Back
            </Button>
            <h1 className="text-2xl font-extrabold text-gray-900">Add an Expense</h1>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 font-medium animate-fade-in">{error}</div>}

          <form onSubmit={handleSubmit}>
            <Input
              label="Description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Dinner at Mario's"
              required
            />

            <div className="mb-6 relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Total Amount & Currency</label>
              <div className="flex gap-2">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-24 pl-3 pr-8 py-3 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 font-bold"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </select>
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xl">
                    {currency === "INR" ? "₹" : "$"}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 text-2xl font-bold"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Split Method</label>
              <div className="flex flex-wrap gap-2 bg-gray-100 p-1.5 rounded-xl">
                {["EQUAL", "UNEQUAL", "PERCENTAGE", "SHARE"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSplitType(type)}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg capitalize transition-all ${
                      splitType === type ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    {type.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {splitType !== "EQUAL" && (
              <div className="mb-8 bg-gray-50/80 p-5 rounded-xl border border-gray-100 animate-fade-in">
                <h3 className="font-semibold text-gray-800 mb-4 capitalize text-sm tracking-wide">Enter {splitType.toLowerCase()}</h3>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.user_id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-50">
                      <span className="text-gray-800 font-medium">{member.user?.username || member.user?.email}</span>
                      <div className="relative w-32">
                        <input
                          type="number"
                          step={splitType === "SHARE" ? "0.1" : "0.01"}
                          min={splitType === "UNEQUAL" ? "0" : undefined}
                          value={splits[member.user_id] || ""}
                          onChange={(e) => handleSplitChange(member.user_id, e.target.value)}
                          className="w-full border-b-2 border-gray-200 bg-transparent py-1 pr-6 text-right font-bold text-gray-900 focus:outline-none focus:border-primary-500"
                          placeholder="0"
                        />
                        <span className="absolute right-0 top-1.5 text-gray-400 font-bold">
                          {splitType === "PERCENTAGE" ? "%" : splitType === "SHARE" ? "" : (currency === "INR" ? "₹" : "$")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full py-3 text-lg" isLoading={loading}>
              Save Expense
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
