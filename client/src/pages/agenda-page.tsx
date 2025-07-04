
import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/layout";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Calendar as CalendarIcon, Edit, Trash2, Users, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface AgendaEvent {
  id: number;
  createdBy: number;
  assignedToArea: string;
  title: string;
  description: string;
  date: string;
  time: string;
  priority: 'alta' | 'media' | 'baja';
  status: 'pendiente' | 'completado' | 'cancelado';
  createdAt: string;
  updatedAt: string;
  creatorName?: string;
}

export default function AgendaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    return monday;
  });
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const canCreateEdit = user?.area === 'admin' || user?.area === 'envios';

  const [eventForm, setEventForm] = useState({
    assignedToArea: 'corte',
    title: '',
    description: '',
    date: selectedDate.toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    priority: 'media' as const,
    status: 'pendiente' as const
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    setEventForm(prev => ({
      ...prev,
      date: selectedDate.toISOString().split('T')[0]
    }));
  }, [selectedDate]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/agenda');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las tareas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingEvent ? `/api/agenda/${editingEvent.id}` : '/api/agenda';
      const method = editingEvent ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventForm),
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: editingEvent ? "Tarea actualizada" : "Tarea creada",
        });
        fetchEvents();
        setShowEventModal(false);
        resetForm();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la tarea",
        variant: "destructive"
      });
    }
  };

  const handleStatusUpdate = async (eventId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/agenda/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Estado de la tarea actualizado",
        });
        fetchEvents();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (eventId: number) => {
    try {
      const response = await fetch(`/api/agenda/${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Tarea eliminada",
        });
        fetchEvents();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la tarea",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setEventForm({
      assignedToArea: 'corte',
      title: '',
      description: '',
      date: selectedDate.toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      priority: 'media',
      status: 'pendiente'
    });
    setEditingEvent(null);
  };

  const startEdit = (event: AgendaEvent) => {
    setEventForm({
      assignedToArea: event.assignedToArea,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      priority: event.priority,
      status: event.status
    });
    setEditingEvent(event);
    setShowEventModal(true);
  };

  // Generar solo los días laborales (lunes a viernes)
  const getWeekDays = (weekStart: Date) => {
    const days = [];
    for (let i = 0; i < 5; i++) { // Solo 5 días laborales
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays(currentWeekStart);

  // Navegar semanas
  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    setCurrentWeekStart(monday);
  };

  // Filtrar eventos por día
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'bg-red-500';
      case 'media': return 'bg-yellow-500';
      case 'baja': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completado': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      case 'pendiente': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAreaDisplayName = (area: string) => {
    const names: Record<string, string> = {
      corte: 'Corte',
      bordado: 'Bordado',
      ensamble: 'Ensamble',
      plancha: 'Plancha/Empaque',
      calidad: 'Calidad',
      envios: 'Envíos',
      admin: 'Administración',
      operaciones: 'Operaciones'
    };
    return names[area] || area;
  };

  const formatDisplayTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('es-MX', { weekday: 'long' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Sistema de Asignación de Tareas</h1>
            <p className="text-gray-600">
              {canCreateEdit 
                ? 'Gestiona y asigna tareas a las diferentes áreas'
                : `Tareas asignadas al área de ${getAreaDisplayName(user?.area || '')}`
              }
            </p>
          </div>
          {canCreateEdit && (
            <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Tarea
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingEvent ? 'Editar Tarea' : 'Nueva Tarea'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="assignedToArea">Asignar a Área</Label>
                    <Select 
                      value={eventForm.assignedToArea} 
                      onValueChange={(value) => setEventForm({...eventForm, assignedToArea: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corte">Corte</SelectItem>
                        <SelectItem value="bordado">Bordado</SelectItem>
                        <SelectItem value="ensamble">Ensamble</SelectItem>
                        <SelectItem value="plancha">Plancha/Empaque</SelectItem>
                        <SelectItem value="calidad">Calidad</SelectItem>
                        <SelectItem value="operaciones">Operaciones</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="title">Título de la Tarea</Label>
                    <Input
                      id="title"
                      value={eventForm.title}
                      onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={eventForm.description}
                      onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="date">Fecha</Label>
                      <Input
                        id="date"
                        type="date"
                        value={eventForm.date}
                        onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="time">Hora</Label>
                      <Input
                        id="time"
                        type="time"
                        value={eventForm.time}
                        onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="priority">Prioridad</Label>
                      <Select 
                        value={eventForm.priority} 
                        onValueChange={(value: any) => setEventForm({...eventForm, priority: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                          <SelectItem value="baja">Baja</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status">Estado</Label>
                      <Select 
                        value={eventForm.status} 
                        onValueChange={(value: any) => setEventForm({...eventForm, status: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="completado">Completado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowEventModal(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingEvent ? 'Actualizar' : 'Crear'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendario */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                Calendario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Vista semanal */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Vista Semanal
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                    Hoy
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {currentWeekStart.toLocaleDateString('es-MX', { 
                  day: 'numeric', 
                  month: 'long' 
                })} - {weekDays[4].toLocaleDateString('es-MX', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Cargando tareas...</p>
              ) : (
                <div className="grid grid-cols-5 gap-4">
                  {weekDays.map((day, index) => {
                    const dayEvents = getEventsForDate(day);
                    const dayName = getDayName(day).charAt(0).toUpperCase() + getDayName(day).slice(1);
                    
                    return (
                      <div key={index} className={`border rounded-lg overflow-hidden min-h-[320px] ${
                        isToday(day) ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
                      }`}>
                        {/* Header del día */}
                        <div className={`text-center py-3 border-b ${
                          isToday(day) ? 'bg-blue-100 border-blue-200' : 'bg-white border-gray-200'
                        }`}>
                          <div className={`text-sm font-semibold uppercase tracking-wide ${
                            isToday(day) ? 'text-blue-700' : 'text-gray-600'
                          }`}>
                            {dayName}
                          </div>
                          <div className={`text-2xl font-bold ${
                            isToday(day) ? 'text-blue-800' : 'text-gray-800'
                          }`}>
                            {day.getDate()}
                          </div>
                        </div>
                        
                        {/* Lista de tareas */}
                        <div className="p-3 space-y-2 max-h-[260px] overflow-y-auto">
                          {dayEvents.map((event) => (
                            <div
                              key={event.id}
                              className="bg-white border border-gray-200 rounded-md p-3 hover:shadow-sm cursor-pointer group transition-all duration-150 hover:border-gray-300"
                              onClick={() => canCreateEdit && startEdit(event)}
                            >
                              {/* Header de la tarea */}
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getPriorityColor(event.priority)}`} />
                                  <span className="text-xs font-medium text-gray-500">
                                    {formatDisplayTime(event.time)}
                                  </span>
                                </div>
                                <Badge className={`${getStatusColor(event.status)} text-xs px-1.5 py-0.5 font-medium`}>
                                  {event.status}
                                </Badge>
                              </div>
                              
                              {/* Título de la tarea */}
                              <div className="font-medium text-gray-900 text-sm mb-2 leading-tight">
                                {event.title}
                              </div>
                              
                              {/* Área asignada */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                  {getAreaDisplayName(event.assignedToArea)}
                                </span>
                              </div>
                              
                              {/* Descripción */}
                              {event.description && (
                                <div className="text-xs text-gray-600 leading-relaxed line-clamp-2 mb-2">
                                  {event.description}
                                </div>
                              )}
                              
                              {/* Botones de acción */}
                              {canCreateEdit && (
                                <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEdit(event);
                                    }}
                                    className="h-6 w-6 p-0 hover:bg-blue-100"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(event.id);
                                    }}
                                    className="h-6 w-6 p-0 hover:bg-red-100"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              {!canCreateEdit && event.assignedToArea === user?.area && event.status === 'pendiente' && (
                                <div className="flex justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusUpdate(event.id, 'completado');
                                    }}
                                    className="h-6 w-6 p-0 text-green-600 hover:bg-green-100"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                          {dayEvents.length === 0 && (
                            <div className="text-gray-400 text-center text-xs py-8">
                              Sin tareas programadas
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
