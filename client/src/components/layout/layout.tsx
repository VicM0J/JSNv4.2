import { useState, ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import { CreateOrderModal } from "@/components/orders/create-order-modal";
import { useWebSocket } from "@/lib/websocket";
import { useAuth } from "@/hooks/use-auth";
import { ReportsPanel } from "../reports/ReportsPanel";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showReports, setShowReports] = useState(false);

  // Inicializar WebSocket para actualizaciones en tiempo real
  useWebSocket();

  const canCreateOrders = user?.area === 'corte' || user?.area === 'admin';

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar 
        onShowNotifications={() => setShowNotifications(true)}
        onCreateOrder={() => setShowCreateOrder(true)}
        onReportsClick={() => setShowReports(true)}
      />

      <main className="flex-1 ml-64 p-6 overflow-y-auto">
        {children}
      </main>

      {/* Modales */}
      {showCreateOrder && canCreateOrders && (
        <CreateOrderModal
          open={showCreateOrder}
          onClose={() => setShowCreateOrder(false)}
        />
      )}

      <NotificationsPanel
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
      <ReportsPanel
        open={showReports}
        onClose={() => setShowReports(false)}
      />
    </div>
  );
}