import { Routes, Route } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { NotFound } from './pages/NotFound';
import { ProtectedRoute } from './auth/ProtectedRoute';

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <NavBar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-800/80 px-4 py-6 text-center text-sm text-slate-400 sm:px-8">
        <p>&copy; {new Date().getFullYear()} iproject.app</p>
      </footer>
    </div>
  );
}
