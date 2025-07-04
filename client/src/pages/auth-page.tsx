import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    name: "",
    area: "" as any,
    adminPassword: "",
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerData);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left side - Forms */}
      <div className="flex-1 flex items-center justify-center p-12 bg-white">
        <div className="w-full max-w-md rounded-2xl shadow-xl p-10">
          <div className="text-center mb-10">
            <img
              src="./../../public/LogoJASANA.png"
              alt="JASANA Logo"
              className="mx-auto w-35 h-35 object-contain mb-4"
              draggable={false}
            />
            <p className="text-gray-600 mt-1 font-medium">Sistema de Gestión de Pedidos</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 rounded-xl bg-gray-100 shadow-inner mb-4">
              <TabsTrigger
                value="login"
                className="text-gray-700 font-semibold hover:bg-primary hover:text-white transition-colors"
              >
                Iniciar Sesión
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="text-gray-700 font-semibold hover:bg-primary hover:text-white transition-colors"
              >
                Registrarse
              </TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <Card className="mt-2 shadow-md border border-gray-200">
                <CardHeader>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                      <Label htmlFor="login-username" className="font-semibold text-gray-700">
                        Usuario
                      </Label>
                      <Input
                        id="login-username"
                        type="text"
                        value={loginData.username}
                        onChange={(e) =>
                          setLoginData({ ...loginData, username: e.target.value })
                        }
                        required
                        className="mt-1"
                        placeholder="Ingrese su usuario"
                      />
                    </div>
                    <div>
                      <Label htmlFor="login-password" className="font-semibold text-gray-700">
                        Contraseña
                      </Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({ ...loginData, password: e.target.value })
                        }
                        required
                        className="mt-1"
                        placeholder="Ingrese su contraseña"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary-dark text-white font-semibold transition-colors flex justify-center items-center"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending && (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      )}
                      Iniciar Sesión
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register">
              <Card className="mt-2 shadow-md border border-gray-200">
                <CardHeader>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                      <Label htmlFor="register-username" className="font-semibold text-gray-700">
                        Usuario
                      </Label>
                      <Input
                        id="register-username"
                        type="text"
                        value={registerData.username}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, username: e.target.value })
                        }
                        required
                        className="mt-1"
                        placeholder="Ingrese su usuario"
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-password" className="font-semibold text-gray-700">
                        Contraseña
                      </Label>
                      <Input
                        id="register-password"
                        type="password"
                        value={registerData.password}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, password: e.target.value })
                        }
                        required
                        className="mt-1"
                        placeholder="Ingrese su contraseña"
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-name" className="font-semibold text-gray-700">
                        Nombre Completo
                      </Label>
                      <Input
                        id="register-name"
                        type="text"
                        value={registerData.name}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, name: e.target.value })
                        }
                        required
                        className="mt-1"
                        placeholder="Ingrese su nombre completo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-area" className="font-semibold text-gray-700">
                        Área
                      </Label>
                      <Select
                        value={registerData.area}
                        onValueChange={(value) =>
                          setRegisterData({ ...registerData, area: value as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar área" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corte">Corte</SelectItem>
                          <SelectItem value="bordado">Bordado</SelectItem>
                          <SelectItem value="ensamble">Ensamble</SelectItem>
                          <SelectItem value="plancha">Plancha/Empaque</SelectItem>
                          <SelectItem value="calidad">Calidad</SelectItem>
                          <SelectItem value="envios">Envíos</SelectItem>
                          <SelectItem value="patronaje">Patronaje</SelectItem>
                          <SelectItem value="almacen">Almacén</SelectItem>
                          <SelectItem value="diseño">Diseño</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {registerData.area !== "admin" && (
                      <div>
                        <Label htmlFor="admin-password" className="font-semibold text-gray-700">
                          Contraseña de Admin
                        </Label>
                        <Input
                          id="admin-password"
                          type="password"
                          value={registerData.adminPassword}
                          onChange={(e) =>
                            setRegisterData({ ...registerData, adminPassword: e.target.value })
                          }
                          required
                          placeholder="Requerida para registrarse"
                          className="mt-1"
                        />
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary-dark text-white font-semibold transition-colors flex justify-center items-center"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending && (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      )}
                      Registrarse
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Background image with overlay */}
      <div
        className="flex-1 relative flex items-center justify-center p-12"
        style={{
          backgroundImage: `url('/client/public/background.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      > 
        <div className="absolute inset-0 bg-primary bg-opacity-80"></div>

        <div className="relative text-white text-center max-w-lg space-y-8 z-10">
          <h2 className="text-5xl font-extrabold leading-tight">Sistema de Gestión</h2>
          <p className="text-xl font-light max-w-md mx-auto leading-relaxed">
            Controla el flujo completo de pedidos desde Corte hasta Envíos
          </p>
          <div className="grid grid-cols-2 gap-6 text-sm font-medium">
            {[
              {
                title: "7 Áreas Integradas",
                desc: "Corte, Bordado, Ensamble, Plancha, Calidad, Envíos y Admin",
              },
              {
                title: "Transferencias Parciales",
                desc: "Control preciso de piezas entre áreas",
              },
              {
                title: "Historial Completo",
                desc: "Seguimiento detallado de cada pedido",
              },
              {
                title: "Notificaciones",
                desc: "Sistema de aceptar/rechazar transferencias",
              },
            ].map(({ title, desc }) => (
              <div
                key={title}
                className="bg-white bg-opacity-20 p-6 rounded-2xl shadow-md"
              >
                <h3 className="font-semibold mb-1">{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
