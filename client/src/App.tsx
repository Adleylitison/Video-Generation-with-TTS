import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const prevAuthRef = useRef<boolean>();
  const hasShownToastRef = useRef(false);

  // Track auth state transitions
  useEffect(() => {
    if (!isLoading) {
      // Reset toast flag when user becomes authenticated
      if (isAuthenticated) {
        hasShownToastRef.current = false;
      }
      
      // Detect transition from authenticated to unauthenticated
      if (prevAuthRef.current === true && isAuthenticated === false && !hasShownToastRef.current) {
        hasShownToastRef.current = true;
        toast({
          title: "Session Expired",
          description: "Redirecting to login...",
          variant: "destructive",
        });
        // Redirect to login after showing toast
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1500);
      }
      prevAuthRef.current = isAuthenticated;
    }
  }, [isAuthenticated, isLoading, toast]);

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Route path="/" component={Home} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
