import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import GroupDetails from './pages/GroupDetails';
import CreateExpense from './pages/CreateExpense';
import ExpenseDetails from './pages/ExpenseDetails';
import Settle from './pages/Settle';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes (Components currently handle their own auth redirects) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/group/:id" element={<GroupDetails />} />
        <Route path="/group/:id/expense/new" element={<CreateExpense />} />
        <Route path="/expense/:id" element={<ExpenseDetails />} />
        <Route path="/settle" element={<Settle />} />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
