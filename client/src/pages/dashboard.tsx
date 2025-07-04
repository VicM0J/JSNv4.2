import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { OrdersTable } from "@/components/orders/orders-table";
import { TransferModal } from "@/components/orders/transfer-modal";
import { OrderHistoryModal } from "@/components/orders/order-history-modal";
import { OrderDetailsModal } from "@/components/orders/order-details-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const canCreateOrders = user?.area === 'corte' || user?.area === 'admin';

  const handleTransferOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowTransfer(true);
  };

  const handleViewHistory = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowHistory(true);
  };

  const handleViewDetails = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowDetails(true);
  };

  return (
    <Layout>
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tablero</h2>
          <p className="text-gray-600">Gestión de pedidos en tiempo real</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar por folio..."
              className="w-64 pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Recent Activity */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Actividad Reciente</h3>
        <RecentActivity />
      </div>

      {/* Orders Table */}
      <OrdersTable
        searchTerm={searchTerm}
        onTransferOrder={handleTransferOrder}
        onViewHistory={handleViewHistory}
        onViewDetails={handleViewDetails}
      />

      {/* Modals */}
      {showTransfer && selectedOrderId && (
        <TransferModal
          open={showTransfer}
          onClose={() => setShowTransfer(false)}
          orderId={selectedOrderId}
        />
      )}

      {showHistory && selectedOrderId && (
        <OrderHistoryModal
          open={showHistory}
          onClose={() => setShowHistory(false)}
          orderId={selectedOrderId}
        />
      )}

      {showDetails && selectedOrderId && (
        <OrderDetailsModal
          open={showDetails}
          onClose={() => setShowDetails(false)}
          orderId={selectedOrderId}
        />
      )}
    </Layout>
  );
}
