
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { LibraryProvider } from "@/contexts/LibraryContext";
import HomePage from "./pages/HomePage";
import CheckInDashboard from "./pages/CheckInDashboard";
import CheckOutDashboard from "./pages/CheckOutDashboard";
import ProtectedAdminPage from "./pages/ProtectedAdminPage";
import ProtectedStaffPage from "./pages/ProtectedStaffPage";
import AuthenticatorApp from "./pages/AuthenticatorApp";
import StaffAuthenticatorApp from "./pages/StaffAuthenticatorApp";
import NotFound from "./pages/NotFound";

const App = () => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false,
      },
    },
  }));

  // Initialize theme
  useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LibraryProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <div className="min-h-screen bg-background">
              <main>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/check-in" element={<CheckInDashboard />} />
                  <Route path="/check-out" element={<CheckOutDashboard />} />
                  <Route path="/admin" element={<ProtectedAdminPage />} />
                  <Route path="/staff" element={<ProtectedStaffPage />} />
                  <Route path="/authenticator" element={<AuthenticatorApp />} />
                  <Route path="/staff-authenticator" element={<StaffAuthenticatorApp />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </HashRouter>
        </LibraryProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
