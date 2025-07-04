
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Package, Settings } from 'lucide-react';

interface RecentOrder {
  id: number;
  folio: string;
  cliente: string;
  status: string;
  currentArea: string;
  createdAt: string;
}

interface RecentReposition {
  id: number;
  folio: string;
  type: string;
  status: string;
  currentArea: string;
  createdAt: string;
}

export function RecentActivity() {
  const { data: activity } = useQuery({
    queryKey: ['/api/dashboard/recent-activity'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/recent-activity');
      if (!response.ok) throw new Error('Failed to fetch recent activity');
      return response.json();
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Mexico_City'
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Pedidos Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activity?.orders?.length > 0 ? (
              activity.orders.map((order: RecentOrder) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{order.folio}</p>
                    <p className="text-xs text-gray-600">{order.cliente}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={order.status === 'active' ? 'default' : 'secondary'}>
                      {order.status}
                    </Badge>
                    <p className="text-xs text-gray-600 mt-1">{order.currentArea}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No hay pedidos recientes</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            Reposiciones Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activity?.repositions?.length > 0 ? (
              activity.repositions.map((reposition: RecentReposition) => (
                <div key={reposition.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{reposition.folio}</p>
                    <p className="text-xs text-gray-600">{reposition.type}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(reposition.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={reposition.status === 'pendiente' ? 'secondary' : 'default'}>
                      {reposition.status}
                    </Badge>
                    <p className="text-xs text-gray-600 mt-1">{reposition.currentArea}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No hay reposiciones recientes</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
