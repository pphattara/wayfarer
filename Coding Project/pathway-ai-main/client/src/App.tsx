import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Universities from "./pages/Universities";
import UniversityDetail from "./pages/UniversityDetail";
import Pathway from "./pages/Pathway";
import Chance from "./pages/Chance";
import Tracker from "./pages/Tracker";
import ApplicationDetail from "./pages/ApplicationDetail";
import Essays from "./pages/Essays";
import EssayEditor from "./pages/EssayEditor";
import Interview from "./pages/Interview";
import InterviewSession from "./pages/InterviewSession";
import Scholarships from "./pages/Scholarships";
import Finance from "./pages/Finance";
import Counselor from "./pages/Counselor";
import Documents from "./pages/Documents";
import Notifications from "./pages/Notifications";
import DashboardLayout from "./components/DashboardLayout";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        <DashboardLayout><Dashboard /></DashboardLayout>
      </Route>
      <Route path="/profile">
        <DashboardLayout><Profile /></DashboardLayout>
      </Route>
      <Route path="/universities">
        <DashboardLayout><Universities /></DashboardLayout>
      </Route>
      <Route path="/universities/:id">
        {(params) => <DashboardLayout><UniversityDetail id={Number(params.id)} /></DashboardLayout>}
      </Route>
      <Route path="/pathway">
        <DashboardLayout><Pathway /></DashboardLayout>
      </Route>
      <Route path="/chance-predictor">
        <DashboardLayout><Chance /></DashboardLayout>
      </Route>
      <Route path="/tracker">
        <DashboardLayout><Tracker /></DashboardLayout>
      </Route>
      <Route path="/tracker/:id">
        {(params) => <DashboardLayout><ApplicationDetail id={Number(params.id)} /></DashboardLayout>}
      </Route>
      <Route path="/essays">
        <DashboardLayout><Essays /></DashboardLayout>
      </Route>
      <Route path="/essays/:id">
        {(params) => <DashboardLayout><EssayEditor id={Number(params.id)} /></DashboardLayout>}
      </Route>
      <Route path="/interview">
        <DashboardLayout><Interview /></DashboardLayout>
      </Route>
      <Route path="/interview/:id">
        {(params) => <DashboardLayout><InterviewSession id={Number(params.id)} /></DashboardLayout>}
      </Route>
      <Route path="/scholarships">
        <DashboardLayout><Scholarships /></DashboardLayout>
      </Route>
      <Route path="/finance">
        <DashboardLayout><Finance /></DashboardLayout>
      </Route>
      <Route path="/counselor">
        <DashboardLayout><Counselor /></DashboardLayout>
      </Route>
      <Route path="/documents">
        <DashboardLayout><Documents /></DashboardLayout>
      </Route>
      <Route path="/notifications">
        <DashboardLayout><Notifications /></DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
