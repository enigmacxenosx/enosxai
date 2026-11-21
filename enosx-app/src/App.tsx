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
import { Suspense, lazy } from "react";
import { useTheme } from "./contexts/ThemeContext";

// Lazy load route components to enable code-splitting
const ChatPage = lazy(() => import("./pages/ChatPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const KnowledgeBankPage = lazy(() => import("./pages/KnowledgeBankPage"));
const MediaLibraryPage = lazy(() => import("./pages/MediaLibraryPage"));
const VisualStoryPage = lazy(() => import("./pages/VisualStoryPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));

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
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path={"/"} component={ChatPage} />
        <Route path={"/knowledge-bank"} component={KnowledgeBankPage} />
        <Route path={"/media-library"} component={MediaLibraryPage} />
        <Route path={"/projects"} component={ProjectsPage} />
        <Route path={"/visual-story"} component={VisualStoryPage} />
        <Route path={"/about"} component={AboutPage} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppContent() {
  const { config } = useTheme();

  return (
    <ErrorBoundary>
      <AuthProvider>
          <WallpaperProvider>
            <FounderModeProvider>
              <WindowContextProvider>
                <TooltipProvider>
                  <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                    <Toaster
                      theme={config.isDark ? "dark" : "light"}
                      position="top-right"
                      visibleToasts={4}
                      toastOptions={{
                        style: {
                          background: config.surface,
                          border: `1px solid rgba(${config.accentRgb},0.24)`,
                          color: config.text,
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
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
