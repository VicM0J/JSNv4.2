import { Layout } from "@/components/layout/layout";
import { AlmacenPanel } from "@/components/repositions/AlmacenPanel";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/lib/websocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useEffect } from "react";

export default function AlmacenPage() {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();

  useEffect(() => {
    console.log('AlmacenPage cargada, WebSocket conectado:', isConnected);
  }, [isConnected]);

  if (user?.area !== 'almacen') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-gray-600">Solo los usuarios de almacén pueden acceder a esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <AlmacenPanel />
      </div>
    </Layout>
  );
}