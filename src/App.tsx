import { Routes, Route } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { ProtectedRoute } from './auth/ProtectedRoute';

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <NavBar />
      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
