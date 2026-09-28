import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ComparePage } from './pages/ComparePage';
import { SavedPage } from './pages/SavedPage';
import { AuthPage } from './pages/AuthPage';
import { AdminRatesPage } from './pages/AdminRatesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-paper text-ink font-sans selection:bg-rule">
            <Navbar />
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<ComparePage />} />
                <Route path="/compare/:id" element={<ComparePage />} />
                <Route path="/saved" element={<SavedPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/admin/rates" element={<AdminRatesPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
