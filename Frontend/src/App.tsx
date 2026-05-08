import { HashRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./components/PageTransition";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ApproverDashboard from "./pages/Dashboard/Approver";
import ReleaseDashboard from "./pages/Dashboard/ReleaseDashboard";
import ExpDetails from "./pages/Release/ExpDetails";
import CabDetails from "./pages/Release/CabDetails";
import ApproverDetails from "./pages/Release/ApproverDetails";
import ExecutionDetails from "./pages/Release/ExecutionDetails";
import History from "./pages/Release/History";
import Flow from "./pages/ExpRequest/Flow";
import NotFound from "./pages/NotFound";

import ExpReport from "./pages/Reports/ExpReport";
import CabReport from "./pages/Reports/CabReport";
import ReportDetails from "./pages/Reports/ReportDetails";
import { useSessionTimeout } from "./hooks/useSessionTimeout";

function AnimatedRoutes() {
  const location = useLocation();
  useSessionTimeout();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/Login" replace />} />
        <Route path="/Login" element={<PageTransition><Login /></PageTransition>} />
        
        {/* Dashboard (wrapped with AppLayout — Sidebar + Header) */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/Dashboard/Index" element={<PageTransition><Dashboard /></PageTransition>} />
        </Route>

        {/* Standalone dashboards (own sidebar layout from original MVC) */}
        <Route path="/Dashboard/Approver" element={<ProtectedRoute><PageTransition><ApproverDashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/Dashboard/Release" element={<ProtectedRoute><PageTransition><ReleaseDashboard /></PageTransition></ProtectedRoute>} />

        {/* Standalone pages (no sidebar, own header — matches original MVC _TailwindLayout) */}
        <Route path="/Reports/ExpReport" element={<ProtectedRoute><PageTransition><ExpReport /></PageTransition></ProtectedRoute>} />
        <Route path="/Reports/CabReport" element={<ProtectedRoute><PageTransition><CabReport /></PageTransition></ProtectedRoute>} />
        <Route path="/Reports/Details" element={<ProtectedRoute><PageTransition><ReportDetails /></PageTransition></ProtectedRoute>} />
        <Route path="/Release/ExpDetails" element={<ProtectedRoute><PageTransition><ExpDetails /></PageTransition></ProtectedRoute>} />
        <Route path="/Release/CabDetails" element={<ProtectedRoute><PageTransition><CabDetails /></PageTransition></ProtectedRoute>} />
        <Route path="/Release/ApproverDetails" element={<ProtectedRoute><PageTransition><ApproverDetails /></PageTransition></ProtectedRoute>} />
        <Route path="/Release/ExecutionDetails" element={<ProtectedRoute><PageTransition><ExecutionDetails /></PageTransition></ProtectedRoute>} />
        <Route path="/Release/History" element={<ProtectedRoute><PageTransition><History /></PageTransition></ProtectedRoute>} />
        <Route path="/ExpRequest/Flow" element={<ProtectedRoute><PageTransition><Flow /></PageTransition></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}

export default App;

