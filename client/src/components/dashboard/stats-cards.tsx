import { Card, CardContent } from "@/components/ui/card";
import {
  Truck,
  LayoutGrid,
  Hourglass,
  BadgeCheck,
  Package,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

type Stats = {
  activeOrders: number;
  myAreaOrders: number;
  pendingTransfers: number;
  completedToday: number;
};

export function StatsCards() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Pedidos Activos",
      value: stats?.activeOrders || 0,
      icon: Package,
      bgColor: "bg-[#f2f2f2]",
      iconColor: "text-primary",
    },
    {
      title: "En Mi Área",
      value: stats?.myAreaOrders || 0,
      icon: LayoutGrid,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Pendientes",
      value: stats?.pendingTransfers || 0,
      icon: Hourglass,
      bgColor: "bg-yellow-100",
      iconColor: "text-yellow-600",
    },
    {
      title: "Finalizados Hoy",
      value: stats?.completedToday || 0,
      icon: BadgeCheck,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {statsData.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`${stat.iconColor} text-xl`} size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
