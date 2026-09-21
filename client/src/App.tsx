import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Account from "./pages/Account";
import Admin, { AdminOrderPage } from "./pages/Admin";
import CreateOrder from "./pages/CreateOrder";
import CustomerOrderDetail from "./pages/CustomerOrderDetail";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import OrderSuccess from "./pages/OrderSuccess";

function AdminOrderRoute({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? <AdminOrderPage id={id} /> : <NotFound />;
}

function CustomerOrderRoute({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? <CustomerOrderDetail id={id} /> : <NotFound />;
}

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/create-order" component={CreateOrder} />
    <Route path="/order-success/:number" component={OrderSuccess} />
    <Route path="/account" component={Account} />
    <Route path="/account/orders/:id" component={CustomerOrderRoute} />
    <Route path="/admin/orders/:id" component={AdminOrderRoute} />
    <Route path="/admin/:tab" component={Admin} />
    <Route path="/admin" component={Admin} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-center" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
