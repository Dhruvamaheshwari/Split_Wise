import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Spinner from "../components/ui/Spinner";

export default function Settle() {
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group");
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedUser, setSelectedUser] = useState("");
  const [paymentDirection, setPaymentDirection] = useState("I_PAID");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let currentId = null;
        try {
          const sessionRes = await fetch(`/api/auth/session`, { credentials: "include" });
          const sessionData = await sessionRes.json();
          currentId = sessionData?.user?.id;
          if (!currentId) throw new Error("Not authenticated");
          setCurrentUser(currentId);
        } catch (e) {}

        if (!groupId) throw new Error("Group ID is required");

        const groupRes = await fetch(`/api/groups`, { credentials: "include" });
        const groupsData = await groupRes.json();
        const currentGroup = groupsData.find((g) => g.id === groupId);

        if (!currentGroup) throw new Error("Group not found");
        setGroup(currentGroup);

        const balanceRes = await fetch(`/api/groups/${groupId}/balances`, { credentials: "include" });
        setBalances(await balanceRes.json());
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
    setIsSubmitting(true);
    const paidByUserId = paymentDirection === "I_PAID" ? currentUser : selectedUser;
    const paidToUserId = paymentDirection === "I_PAID" ? selectedUser : currentUser;

    try {
      const res = await fetch(`/api/settlements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ groupId, paidByUserId, paidToUserId, amount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record settlement");

      navigate(`/group/${groupId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Spinner size="lg" /></div>;
  if (error) return <div className="text-center p-8 text-red-500 font-bold">{error}</div>;

  const getUserName = (userId) => {
    const member = group.members?.find((m) => m.user_id === userId);
    return member?.user?.username || member?.user?.email || "Unknown User";
  };

  const youOwe = balances.filter((b) => b.fromUserId === currentUser);
  const oweYou = balances.filter((b) => b.toUserId === currentUser);

  const handleSelectUser = (userId, type, suggestedAmount) => {
    setSelectedUser(userId);
    setPaymentDirection(type === "owe" ? "I_PAID" : "THEY_PAID");
    setAmount(suggestedAmount.toString());
  };

  return (
    <div className="min-h-screen flex flex-col page-enter">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6 w-full flex-1">
        <div className="mb-6">
          <Button variant="glass" onClick={() => navigate(`/group/${groupId}`)} className="text-xs px-3 py-1 mb-4">
            &larr; Back to Group
          </Button>
          <h1 className="font-heading text-3xl font-extrabold text-gray-900 tracking-tight">Settle Up</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Col: Balances Summary */}
          <div className="space-y-6 animate-slide-up">
            <Card className="p-6 border-t-4 border-t-rose-500">
              <h3 className="text-lg font-bold text-rose-600 mb-4 uppercase tracking-wide text-xs">You Owe</h3>
              {youOwe.length === 0 ? (
                <p className="text-gray-500 italic text-sm">You owe nothing.</p>
              ) : (
                <ul className="space-y-3">
                  {youOwe.map((b) => (
                    <li key={`owe-${b.toUserId}`} className="flex justify-between items-center bg-rose-50/50 p-3 rounded-lg border border-rose-100">
                      <span className="font-semibold text-gray-800">{getUserName(b.toUserId)}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono-num font-extrabold text-rose-600">₹{b.amount.toFixed(2)}</span>
                        <Button variant="danger" onClick={() => handleSelectUser(b.toUserId, "owe", b.amount)} className="text-xs px-2 py-1">
                          Pay
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-6 border-t-4 border-t-emerald-500">
              <h3 className="text-lg font-bold text-emerald-600 mb-4 uppercase tracking-wide text-xs">Owed to You</h3>
              {oweYou.length === 0 ? (
                <p className="text-gray-500 italic text-sm">Nobody owes you anything.</p>
              ) : (
                <ul className="space-y-3">
                  {oweYou.map((b) => (
                    <li key={`owed-${b.fromUserId}`} className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                      <span className="font-semibold text-gray-800">{getUserName(b.fromUserId)}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono-num font-extrabold text-emerald-600">₹{b.amount.toFixed(2)}</span>
                        <Button onClick={() => handleSelectUser(b.fromUserId, "owed", b.amount)} className="bg-emerald-600 hover:bg-emerald-500 text-xs px-2 py-1 text-white">
                          Receive
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Right Col: Settle Form */}
          <Card className="p-8 h-fit">
            <h2 className="font-heading text-2xl font-extrabold mb-6 text-gray-900">Record a Payment</h2>
            <form onSubmit={handleSettle}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Who was involved?</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 hover:border-gray-300 transition-all font-medium text-gray-800"
                  required
                >
                  <option value="">Select a member...</option>
                  {group.members?.filter((m) => m.user_id !== currentUser).map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user?.username || m.user?.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6 flex flex-col gap-3">
                <label className="block text-sm font-semibold text-gray-700 ml-1">Direction</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${paymentDirection === "I_PAID" ? "border-primary-500 bg-primary-50 text-primary-700 font-bold" : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}>
                    <input type="radio" className="hidden" checked={paymentDirection === "I_PAID"} onChange={() => setPaymentDirection("I_PAID")} />
                    I paid them
                  </label>
                  <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${paymentDirection === "THEY_PAID" ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold" : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}>
                    <input type="radio" className="hidden" checked={paymentDirection === "THEY_PAID"} onChange={() => setPaymentDirection("THEY_PAID")} />
                    They paid me
                  </label>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xl">₹</span>
                  <input
                    type="number"
                    step="0.01" min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="font-mono-num w-full pl-10 pr-4 py-3 bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-2xl font-bold"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-3 text-lg bg-gray-900 hover:bg-black text-white" isLoading={isSubmitting}>
                Save Payment
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
