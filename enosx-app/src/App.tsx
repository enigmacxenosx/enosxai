import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FounderModeProvider } from "./contexts/FounderModeContext";
import { WindowContextProvider } from "./contexts/WindowContext";
import { WallpaperProvider } from "./contexts/WallpaperContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Suspense, lazy, useState } from "react";

// Lazy load route components to enable code-splitting
const ChatPage = lazy(() => import("./pages/ChatPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ComputerPage = lazy(() => import("./pages/ComputerPage"));
const WorkspacePage = lazy(() => import("./pages/WorkspacePage"));
const KnowledgeBankPage = lazy(() => import("./pages/KnowledgeBankPage"));
const SplashPage = lazy(() => import("./components/SplashPage"));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  const [showSplash, setShowSplash] = useState(true);
  if (showSplash) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <SplashPage onComplete={() => setShowSplash(false)} />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path={"/"} component={ChatPage} />
        <Route path={"/computer"} component={ComputerPage} />
        <Route path={"/workspace"} component={WorkspacePage} />
        <Route path={"/knowledge-bank"} component={KnowledgeBankPage} />
        <Route path={"/about"} component={AboutPage} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="manus">
        <AuthProvider>
          <WallpaperProvider>
            <FounderModeProvider>
              <WindowContextProvider>
                <TooltipProvider>
                  <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                    <Toaster
                      theme="dark"
                      toastOptions={{
                        style: {
                          background: "rgba(18,18,24,0.95)",
                          border: "1px solid rgba(99,102,241,0.3)",
                          color: "#f0f0f4",
                          backdropFilter: "blur(20px)",
                        },
                      }}
                    />
                    <Router />
                  </WouterRouter>
                </TooltipProvider>
              </WindowContextProvider>
            </FounderModeProvider>
          </WallpaperProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
