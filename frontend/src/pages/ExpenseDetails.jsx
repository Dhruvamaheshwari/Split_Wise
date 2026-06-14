import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

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
      const res = await fetch(`/api/expenses/${expenseId}`, {
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
    
    // Polling every 3 seconds for real-time updates since Pusher is not configured
    const interval = setInterval(() => {
      fetchExpense();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [expenseId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [expense?.comments]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/expenses/${expenseId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newComment }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      setNewComment("");
      
      // Fetch expense immediately so the message shows up instantly for the sender
      await fetchExpense();
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
        
        {/* Left Col: Receipt Detail */}
        <div className="animate-slide-up">
          <Button variant="glass" onClick={() => navigate(`/group/${expense.group_id}`)} className="mb-6 text-xs px-3 py-1">
            &larr; Back to Group
          </Button>

          <Card className="p-0 overflow-hidden border-0 shadow-2xl rounded-3xl relative">
            <div className="bg-primary-600 p-8 text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/10">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-primary-100 font-medium mb-1">Paid Successfully</p>
              <h1 className="font-mono-num text-5xl font-black mb-4 tracking-tight">
                {expense.currency === "USD" ? "$" : "₹"}{(expense.original_amount || expense.amount).toFixed(2)}
              </h1>
              <h2 className="font-heading text-xl font-bold text-white/90">{expense.description}</h2>
            </div>
            
            {/* Perforated edge effect */}
            <div className="flex justify-between items-center -mt-3 z-10 relative px-4">
              <div className="w-6 h-6 rounded-full bg-[#f8fafc] -ml-7 shadow-inner"></div>
              <div className="flex-1 border-t-2 border-dashed border-gray-300/50 mx-2"></div>
              <div className="w-6 h-6 rounded-full bg-[#f8fafc] -mr-7 shadow-inner"></div>
            </div>

            <div className="p-8 pt-6 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100 dark:border-slate-700">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Paid by</p>
                  <p className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-slate-700 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs">
                      {expense.paid_by?.username?.charAt(0).toUpperCase() || "U"}
                    </span>
                    {expense.paid_by?.username}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Date</p>
                  <p className="font-bold text-gray-900 dark:text-white text-lg">
                    {new Date(expense.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>

              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Split Breakdown</h3>
              <ul className="space-y-4">
                {expense.splits.map(split => (
                  <li key={split.user_id} className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold text-sm">{split.user?.username || split.user?.email}</span>
                    <span className="font-mono-num font-extrabold text-gray-900 dark:text-white">₹{split.amount_owed.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        {/* Right Col: Chat */}
        <Card className="flex flex-col h-[650px] dark:bg-slate-800" animate={false}>
          <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Live Discussion
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 dark:bg-slate-900/20">
            {expense.comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <p className="text-lg font-medium">No comments yet</p>
                <p className="text-sm">Start the discussion below!</p>
              </div>
            ) : (
              expense.comments.map(comment => (
                <div key={comment.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 animate-fade-in">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm text-primary-600 dark:text-primary-400">
                      {comment.user?.username || comment.user?.email}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                      {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{comment.content}</p>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          <form onSubmit={handleAddComment} className="p-4 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex gap-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
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
