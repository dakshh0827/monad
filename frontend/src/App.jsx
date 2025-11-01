import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LandingPage from "./pages/LandingPage";
import CuratedArticlesPage from "./pages/CuratedArticlesPage";
import ArticleDetailPage from "./pages/ArticleDetailsPage";

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#171717', // bg-neutral-900
            color: '#e5e5e5',     // text-neutral-200
            border: '1px solid #404040', // border-neutral-700
            borderRadius: '8px',
            padding: '16px',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#a855f7', // purple-500
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444', // red-500
              secondary: '#fff',
            },
          },
        }}
      />
      {/* Root wrapper for consistent background */}
      <div className="min-h-screen bg-[#0A0A0A]">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/curated" element={<CuratedArticlesPage />} />
          <Route path="/curated/:id" element={<ArticleDetailPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;