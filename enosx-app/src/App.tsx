import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { DarkModeProvider, useDarkMode } from "./contexts/DarkModeContext";
import { FounderModeProvider } from "./contexts/FounderModeContext";
import { WindowContextProvider } from "./contexts/WindowContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Suspense, lazy } from "react";

const ChatPage = lazy(() => import("./pages/ChatPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const KnowledgeBankPage = lazy(() => import("./pages/KnowledgeBankPage"));
const MediaLibraryPage = lazy(() => import("./pages/MediaLibraryPage"));
const VisualStoryPage = lazy(() => import("./pages/VisualStoryPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));

function LoadingFallback() {
  return <div className="flex h-screen w-full items-center justify-center bg-background"><div className="text-center"><div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" /><p className="text-muted-foreground">Loading...</p></div></div>;
}

function Router() {
  return <Suspense fallback={<LoadingFallback />}><Switch>
    <Route path="/" component={ChatPage} />
    <Route path="/knowledge-bank" component={KnowledgeBankPage} />
    <Route path="/media-library" component={MediaLibraryPage} />
    <Route path="/projects" component={ProjectsPage} />
    <Route path="/visual-story" component={VisualStoryPage} />
    <Route path="/about" component={AboutPage} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></Suspense>;
}

function AppContent() {
  const { config } = useDarkMode();
  return <ErrorBoundary><AuthProvider><FounderModeProvider><WindowContextProvider><TooltipProvider>
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Toaster theme="dark" position="top-right" visibleToasts={4} toastOptions={{ style: { background: config.surface, border: `1px solid rgba(${config.accentRgb},0.24)`, color: config.text } }} />
      <Router />
    </WouterRouter>
  </TooltipProvider></WindowContextProvider></FounderModeProvider></AuthProvider></ErrorBoundary>;
}

export default function App() {
  return <DarkModeProvider><AppContent /></DarkModeProvider>;
}
