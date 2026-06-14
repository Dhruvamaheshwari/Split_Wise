import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Pusher from "pusher-js";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

export default function ExpenseDetails() {
  const { id: expenseId } = useParams();
  const navigate = useNavigate();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsEndRef = useRef(null);

  const fetchExpense = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/expenses/${expenseId}`, {
        credentials: "include"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch expense");
      setExpense(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpense();
    
    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER
    });

    const channel = pusher.subscribe(`expense-${expenseId}`);
    channel.bind('new-comment', function(data) {
      // Re-fetch expense to get the new comment with relations
      fetchExpense();
    });

    return () => { 
      pusher.unsubscribe(`expense-${expenseId}`); 
    };
  }, [expenseId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [expense?.comments]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:3000/api/expenses/${expenseId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newComment }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      setNewComment("");
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Spinner size="lg" /></div>;
  if (error) return <div className="text-center p-8 text-red-500 font-bold">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col page-enter">
      <Navbar />
      <main className="max-w-6xl mx-auto p-6 w-full flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Col: Details */}
        <div className="animate-slide-up">
          <Button variant="glass" onClick={() => navigate(`/group/${expense.group_id}`)} className="mb-6 text-xs px-3 py-1">
            &larr; Back to Group
          </Button>

          <Card className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{expense.description}</h1>
              <p className="text-5xl font-black text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400 mb-4">
                ${expense.amount.toFixed(2)}
              </p>
              <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold">
                  {expense.paid_by?.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Paid by <span className="font-bold">{expense.paid_by?.username}</span> on {new Date(expense.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b pb-2 mb-4">Split Breakdown</h3>
            <ul className="space-y-3">
              {expense.splits.map(split => (
                <li key={split.user_id} className="flex justify-between items-center bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                  <span className="text-gray-800 font-semibold">{split.user?.username || split.user?.email}</span>
                  <span className="font-extrabold text-gray-900">${split.amount_owed.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right Col: Chat */}
        <Card className="flex flex-col h-[650px]" animate={false}>
          <div className="p-5 border-b border-gray-100 bg-white/50">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Live Discussion
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
            {expense.comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p className="text-lg font-medium">No comments yet</p>
                <p className="text-sm">Start the discussion below!</p>
              </div>
            ) : (
              expense.comments.map(comment => (
                <div key={comment.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm text-primary-600">
                      {comment.user?.username || comment.user?.email}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-800 text-sm leading-relaxed">{comment.content}</p>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          <form onSubmit={handleAddComment} className="p-4 border-t border-gray-100 bg-white">
            <div className="flex gap-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
                disabled={isSubmitting}
              />
              <Button type="submit" disabled={isSubmitting || !newComment.trim()} className="px-6 rounded-xl shadow-md">
                Send
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
