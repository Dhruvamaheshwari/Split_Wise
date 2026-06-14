import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../supabaseClient";

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
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/expenses/${expenseId}`, {
        headers: { Authorization: `Bearer ${token}` }
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

    // Supabase Realtime Subscription for ExpenseComment
    const channel = supabase
      .channel(`expense_comments_${expenseId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ExpenseComment",
          filter: `expense_id=eq.${expenseId}`,
        },
        (payload) => {
          // When a new comment is inserted via the backend, it triggers this realtime event.
          // Since the payload doesn't contain relational data (like User.username),
          // the simplest robust approach is to re-fetch the expense to get the updated comments + relations.
          fetchExpense();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [expenseId]);

  // Auto-scroll to bottom of comments
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add comment");
      }

      setNewComment("");
      // Realtime subscription will catch the insert and re-fetch for us!
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="max-w-4xl mx-auto p-6 w-full flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Col: Expense Details */}
        <div>
          <button 
            onClick={() => navigate(`/group/${expense.group_id}`)}
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            &larr; Back to Group
          </button>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{expense.description}</h1>
            <p className="text-4xl font-bold text-gray-900 mb-4">${expense.amount.toFixed(2)}</p>
            
            <p className="text-gray-600 mb-6">
              Paid by <span className="font-semibold text-gray-800">{expense.paid_by?.username || expense.paid_by?.email}</span> 
              {" "}on {new Date(expense.created_at).toLocaleDateString()}
            </p>

            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Split Breakdown</h3>
            <ul className="space-y-3">
              {expense.splits.map(split => (
                <li key={split.user_id} className="flex justify-between items-center">
                  <span className="text-gray-700">{split.user?.username || split.user?.email}</span>
                  <span className="font-semibold text-gray-900">${split.amount_owed.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Col: Real-time Comments */}
        <div className="flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 h-[600px]">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Discussion</h2>
            <p className="text-sm text-gray-500">Live chat connected via Supabase Realtime</p>
          </div>

          {/* Comment List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {expense.comments.length === 0 ? (
              <p className="text-gray-500 text-center mt-4">No comments yet. Start the discussion!</p>
            ) : (
              expense.comments.map(comment => (
                <div key={comment.id} className="bg-white p-3 rounded shadow-sm border border-gray-100">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-semibold text-sm text-blue-600">
                      {comment.user?.username || comment.user?.email}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-800 text-sm">{comment.content}</p>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Comment Form */}
          <form onSubmit={handleAddComment} className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 border p-2 rounded focus:outline-none focus:border-blue-500"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 disabled:bg-blue-400"
              >
                {isSubmitting ? "..." : "Send"}
              </button>
            </div>
          </form>
        </div>

      </main>
    </div>
  );
}
