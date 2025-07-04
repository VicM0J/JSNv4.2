import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Factory, 
  Home, 
  Package, 
  Bell, 
  History, 
  Plus, 
  Settings, 
  LogOut,
  User,
  FileEdit,
  BarChart3,
  Calendar
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface SidebarProps {
  onShowNotifications: () => void;
  onCreateOrder: () => void;
}

export function Sidebar({ onShowNotifications, onCreateOrder }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();

  const { data: pendingTransfers = [] } = useQuery<any[]>({
    queryKey: ["/api/transfers/pending"],
    enabled: !!user,
    refetchInterval: 10000, // Refetch cada 10 segundos
    refetchOnWindowFocus: true,
  });

  const { data: repositionNotifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 10000, // Refetch cada 10 segundos
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await fetch('/api/notifications', {
        credentials: 'include'
      });
      if (!res.ok) {
        console.error('Error fetching notifications:', res.status);
        return [];
      }
      const allNotifications = await res.json();
      console.log('All notifications:', allNotifications);
      // Filtrar solo notificaciones de reposiciones no leídas
      const filteredNotifications = allNotifications.filter((n: any) => 
        !n.read && (
          n.type?.includes('reposition') || 
          n.type?.includes('completion') ||
          n.type === 'new_reposition' ||
          n.type === 'reposition_transfer' ||
          n.type === 'reposition_approved' ||
          n.type === 'reposition_rejected' ||
          n.type === 'reposition_completed' ||
          n.type === 'reposition_deleted' ||
          n.type === 'completion_approval_needed'
        )
      );
      console.log('Filtered reposition notifications:', filteredNotifications);
      return filteredNotifications;
    },
  });

  // Query para contar reposiciones pendientes
  const { data: pendingRepositions = [] } = useQuery({
    queryKey: ["/api/repositions/pending-count"],
    enabled: !!user && (user.area === 'admin' || user.area === 'envios' || user.area === 'operaciones'),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await fetch('/api/repositions/pending-count', {
        credentials: 'include'
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.repositions || [];
    },
  });

  const canCreateOrders = user?.area === 'corte' || user?.area === 'admin';
  const isAdmin = user?.area === 'admin';

  const getAreaDisplayName = (area: string) => {
    const names: Record<string, string> = {
      corte: "Corte",
      bordado: "Bordado", 
      ensamble: "Ensamble",
      plancha: "Plancha/Empaque",
      calidad: "Calidad",
      envios: "Envíos",
      admin: "Admin",
      operaciones: "Operaciones",
      almacen: "Almacén",
      diseño: "Diseño"
    };
    return names[area] || area;
  };

  return (
    <aside className="w-64 bg-white shadow-lg fixed h-full z-10">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F2F2F2' }}>
            <img src="../../../public/logo.svg" alt="Fábrica" className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">JASANA</h1>
            <p className="text-sm text-gray-500">Sistema de Pedidos</p>
          </div>
        </div>
      </div>

      {/*Info del usuario */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="text-white text-sm" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{user?.name}</p>
            <p className="text-sm text-gray-500">
              Área: {user?.area ? getAreaDisplayName(user.area) : ''}
            </p>
            <a
                href={`msteams:/l/chat/0/0?users=${user?.username}`}
            >
            <button className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
              Chatear en Teams
            </button>
            </a>

          </div>
        </div>
      </div>

      {/* Menu de navegacion*/}
      <nav className="p-4">
        <ul className="space-y-2">
          <li>
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${location === '/' ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
              onClick={() => setLocation('/')}
            >
              <Home className="mr-3 h-4 w-4" />
              Tablero
            </Button>
          </li>
          <li>
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${location === '/orders' ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
              onClick={() => setLocation('/orders')}
            >
              <Package className="mr-3 h-4 w-4" />
              Pedidos
            </Button>
          </li>
          <li>
            <Button 
              variant="ghost" 
              className="w-full justify-start relative"
              onClick={onShowNotifications}
            >
              <Bell className="mr-3 h-4 w-4" />
              Notificaciones
              {pendingTransfers.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {pendingTransfers.length}
                </Badge>
              )}
            </Button>
          </li>
          <li>
            <Button 
              variant="ghost" 
              className={`w-full justify-start relative ${location === '/repositions' ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
              onClick={() => setLocation('/repositions')}
            >
              <FileEdit className="mr-3 h-4 w-4" />
              Reposiciones
              {(repositionNotifications.length > 0 || pendingRepositions.length > 0) && (
                <div className="absolute -top-1 -right-1 flex gap-1">
                  {repositionNotifications.length > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                      title="Notificaciones de reposición"
                    >
                      {repositionNotifications.length}
                    </Badge>
                  )}
                  {pendingRepositions.length > 0 && (user?.area === 'admin' || user?.area === 'envios' || user?.area === 'operaciones') && (
                    <Badge 
                      variant="secondary" 
                      className="h-5 w-5 flex items-center justify-center p-0 text-xs bg-orange-500 text-white hover:bg-orange-600"
                      title="Reposiciones pendientes de aprobación"
                    >
                      {pendingRepositions.length}
                    </Badge>
                  )}
                </div>
              )}
            </Button>
          </li>
          <li>
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${location === '/history' ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
              onClick={() => setLocation('/history')}
            >
              <History className="mr-3 h-4 w-4" />
              Historial
            </Button>
          </li>
          {/* <li>
             <Button 
              variant="ghost" 
              className={`w-full justify-start ${location === '/reports' ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
              onClick={() => setLocation('/reports')}
            >
              <BarChart3 className="mr-3 h-4 w-4" />
              Reportes
            </Button>
          </li> */}
          <li>
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${location === '/agenda' ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
              onClick={() => setLocation('/agenda')}
            >
              <Calendar className="mr-3 h-4 w-4" />
              Agenda
            </Button>
          </li>
          {canCreateOrders && (
            <li>
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={onCreateOrder}
              >
                <Plus className="mr-3 h-4 w-4" />
                Crear Pedido
              </Button>
            </li>
          )}
          {isAdmin && (
            <li>
              <Button 
                variant="ghost" 
                className={`w-full justify-start ${location === '/admin' ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
                onClick={() => setLocation('/admin')}
              >
                <Settings className="mr-3 h-4 w-4" />
                Administración
              </Button>
            </li>
          )}
        </ul>
      </nav>

      {/* Cerar sesion */}
      <div className="absolute bottom-4 left-4 right-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  );
}