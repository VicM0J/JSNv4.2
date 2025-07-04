import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Users, RotateCcw, Shield, TrendingUp, Package } from "lucide-react";
import { type User, type Order } from "@shared/schema";

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: "", username: "", area: "", newPassword: "" });
  const [showEditModal, setShowEditModal] = useState(false);

  if (user?.area !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-gray-600">Solo los administradores pueden acceder a esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return await res.json();
    }
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const res = await apiRequest("POST", "/api/admin/reset-password", {
        userId,
        newPassword: password
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Contraseña restablecida",
        description: "La contraseña ha sido restablecida exitosamente",
      });
      setShowResetModal(false);
      setNewPassword("");
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al restablecer contraseña",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/admin/users/${data.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Usuario actualizado correctamente" });
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: err => toast({ title: "Error al actualizar", description: err.message, variant: "destructive" })
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Usuario eliminado correctamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: err => toast({ title: "Error al eliminar usuario", description: err.message, variant: "destructive" })
  });

  const openEditModal = (u: User) => {
    setEditUser(u);
    setEditForm({ name: u.name, username: u.username, area: u.area, newPassword: "" });
    setShowEditModal(true);
  };

  const handleResetPassword = () => {
    if (!selectedUser || !newPassword) return;
    resetPasswordMutation.mutate({ userId: selectedUser.id, password: newPassword });
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    const payload: any = { id: editUser.id, name: editForm.name, username: editForm.username, area: editForm.area };
    if (editForm.newPassword) payload.newPassword = editForm.newPassword;
    updateUserMutation.mutate(payload);
  };

  const getAreaDisplayName = (area: string) => {
    const names: Record<string, string> = {
      corte: 'Corte',
      bordado: 'Bordado',
      ensamble: 'Ensamble',
      plancha: 'Plancha/Empaque',
      calidad: 'Calidad',
      envios: 'Envíos',
      almacen: 'Almacén',
      admin: 'Admin',
      diseño: 'Diseño'
    };
    return names[area] || area;
  };

  const getAreaBadgeColor = (area: string) => {
    const colors: Record<string, string> = {
      corte: "bg-green-100 text-green-800",
      bordado: "bg-blue-100 text-blue-800",
      ensamble: "bg-purple-100 text-purple-800",
      plancha: "bg-orange-100 text-orange-800",
      calidad: "bg-pink-100 text-pink-800",
      envios: "bg-purple-100 text-purple-800",
      admin: "bg-gray-100 text-gray-800",
    };
    return colors[area] || "bg-gray-100 text-gray-800";
  };

  const activeOrders = orders.filter(order => order.status === 'active');
  const completedOrders = orders.filter(order => order.status === 'completed');
  const todayCompletedOrders = completedOrders.filter(order => 
    order.completedAt && 
    new Date(order.completedAt).toDateString() === new Date().toDateString()
  );

  return (
    <Layout>
      <div className="space-y-6">
         {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
          <Settings className="text-white text-2xl" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Panel de Administración</h1>
          <p className="text-gray-600">Gestión del sistema JASANA</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pedidos Activos</p>
                <p className="text-2xl font-bold text-gray-900">{activeOrders.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="text-blue-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Finalizados Hoy</p>
                <p className="text-2xl font-bold text-gray-900">{todayCompletedOrders.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-green-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Completados</p>
                <p className="text-2xl font-bold text-gray-900">{completedOrders.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="text-purple-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Usuarios Registrados</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="text-orange-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Gestión de Usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Gestión de Usuarios</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>{u.id}</TableCell>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{u.name}</TableCell>
                      <TableCell><Badge className={getAreaBadgeColor(u.area)}>{getAreaDisplayName(u.area)}</Badge></TableCell>
                      <TableCell>{u.active ? "Activo" : "Inactivo"}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(u)}>Editar</Button>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedUser(u); setShowResetModal(true); }}>Reset Pwd</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteUserMutation.mutate(u.id)}>Eliminar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-gray-500">No hay usuarios registrados.</p>
            )}
          </CardContent>
        </Card>

        {/* System Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Configuración del Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Configuración General</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">Nombre de la empresa</span>
                  <span className="text-sm font-medium">JASANA</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">Áreas activas</span>
                  <span className="text-sm font-medium">7 áreas</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">Base de datos</span>
                  <span className="text-sm font-medium text-green-600">Conectada</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Acciones de Administrador</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" disabled>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Respaldar Base de Datos
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurar Notificaciones
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Users className="mr-2 h-4 w-4" />
                  Exportar Reportes
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{order.folio}</p>
                  <p className="text-sm text-gray-600">{order.clienteHotel}</p>
                </div>
                <div className="text-right">
                  <Badge className={getAreaBadgeColor(order.currentArea)}>
                    {getAreaDisplayName(order.currentArea)}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(order.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

        {/* Modales */}
        <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
          <DialogContent>
            <DialogHeader><DialogTitle>Restablecer Contraseña</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Usuario</Label><Input readOnly value={selectedUser?.username || ""} /></div>
              <div><Label>Nueva Contraseña</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowResetModal(false)}>Cancelar</Button><Button onClick={handleResetPassword} disabled={!newPassword}>Restablecer</Button></div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Usuario</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nombre</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div><Label>Username</Label><Input value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} /></div>
              <div><Label>Área</Label>
                <Select value={editForm.area} onValueChange={val => setEditForm({ ...editForm, area: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["admin","corte","bordado","ensamble","plancha","calidad","envios"].map(a => (
                    <SelectItem key={a} value={a}>{getAreaDisplayName(a)}</SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>
              <div><Label>Nueva Contraseña (opcional)</Label><Input type="password" value={editForm.newPassword} onChange={e => setEditForm({ ...editForm, newPassword: e.target.value })} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button><Button onClick={handleSaveEdit}>Guardar Cambios</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
