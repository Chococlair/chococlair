import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, Package, Euro, Truck, CheckCircle, Clock, TrendingUp, Calendar, DollarSign, ShoppingBag, Filter, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_type: string;
  delivery_address: string | null;
  payment_method: string;
  total: number;
  status: string;
  created_at: string;
  notes: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [periodFilter, setPeriodFilter] = useState<string>("todos");
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [previousOrdersCount, setPreviousOrdersCount] = useState(0);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
      console.log('Orders loaded:', data?.length || 0);
      setOrders(data || []);
      return data || [];
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error("Erro ao carregar pedidos. Você pode continuar usando o painel.");
      // Não bloquear o acesso, apenas mostrar erro
      setOrders([]);
      return [];
    }
  };

  // Realtime subscription para atualizações automáticas
  useEffect(() => {
    if (!isAdmin) return;

    let currentOrdersCount = 0;
    let channel: any = null;

    // Função para tocar notificação sonora (estilo Uber Eats - longo e chamativo)
    const playNotificationSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = audioContext.currentTime;
        
        // Primeira sequência: 3 notas ascendentes (estilo "novo pedido!")
        const playNote = (frequency: number, startTime: number, duration: number, volume: number) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = frequency;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
          gainNode.gain.setValueAtTime(volume, startTime + duration - 0.05);
          gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        };
        
        // Sequência 1: Notas ascendentes (800Hz -> 1000Hz -> 1200Hz)
        playNote(800, now, 0.2, 0.6);
        playNote(1000, now + 0.25, 0.2, 0.7);
        playNote(1200, now + 0.5, 0.25, 0.8);
        
        // Pausa curta
        const pauseTime = now + 0.85;
        
        // Sequência 2: Nota longa e forte (estilo "atenção!")
        playNote(1000, pauseTime, 0.4, 0.9);
        playNote(800, pauseTime + 0.45, 0.35, 0.85);
        
        // Sequência 3: Tremolo final (efeito de vibração)
        const tremoloStart = pauseTime + 0.9;
        for (let i = 0; i < 4; i++) {
          const t = tremoloStart + (i * 0.15);
          const freq = 900 + (i % 2 === 0 ? 200 : -200); // Alterna entre 1100Hz e 700Hz
          playNote(freq, t, 0.1, 0.6 - (i * 0.1));
        }
        
      } catch (error) {
        console.error('Erro ao tocar som de notificação:', error);
      }
    };

    // Configurar subscription para mudanças na tabela orders
    channel = supabase
      .channel(`orders_realtime_${Date.now()}`) // Nome único
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Apenas INSERT para novos pedidos
          schema: 'public',
          table: 'orders',
        },
        async (payload: any) => {
          console.log('🔔🔔🔔 NOVO PEDIDO DETECTADO!', payload);
          console.log('Event type:', payload.eventType);
          console.log('New order:', payload.new);
          
          const newOrder = payload.new as Order;
          
          // Tocar som IMEDIATAMENTE
          playNotificationSound();
          
          // Mostrar notificação grande e chamativa
          toast.success(`🆕 NOVO PEDIDO!`, {
            description: `Pedido #${newOrder.id.slice(0, 8).toUpperCase()}\n${newOrder.customer_name}\n${newOrder.total.toFixed(2)}€`,
            duration: 8000,
            style: {
              fontSize: '18px',
              fontWeight: 'bold',
            },
          });
          
          // Recarregar pedidos
          await loadOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        async () => {
          console.log('🔄 Order updated');
          await loadOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
        },
        async () => {
          console.log('🗑️ Order deleted');
          await loadOrders();
        }
      )
      .subscribe((status: string) => {
        console.log('📡📡📡 REALTIME SUBSCRIPTION STATUS:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅✅✅ REALTIME ATIVO - Aguardando novos pedidos...');
          toast.success('Conexão em tempo real ativa!', { duration: 2000 });
          
          // Carregar pedidos após subscription estar ativa
          loadOrders().then((loadedOrders) => {
            currentOrdersCount = loadedOrders.length;
            setPreviousOrdersCount(loadedOrders.length);
            console.log(`Pedidos carregados: ${loadedOrders.length}`);
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('❌❌❌ ERRO NO REALTIME:', status);
          toast.error('Erro na conexão em tempo real. Recarregue a página.', { duration: 5000 });
        } else {
          console.log('⏳ Subscription status:', status);
        }
      });

    // Cleanup subscription ao desmontar
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Session check:', { session: !!session, error: sessionError });
      
      if (!session) {
        console.log('No session found, redirecting to auth');
        toast.error("Por favor, faça login para continuar");
        setLoading(false);
        navigate("/auth");
        return;
      }

      console.log('User email:', session.user.email);

      // Check if user is admin
      const { data: adminCheck, error: adminError } = await supabase
        .rpc('is_admin');

      console.log('Admin check result:', { adminCheck, error: adminError });

      if (adminError) {
        console.error('Error calling is_admin:', adminError);
        toast.error(`Erro ao verificar permissões: ${adminError.message}`);
        setLoading(false);
        return;
      }

      if (!adminCheck) {
        console.log('User is not admin, email:', session.user.email);
        toast.error(`Acesso negado. Apenas administradores podem acessar esta página. Seu email: ${session.user.email}`);
        setLoading(false);
        navigate("/");
        return;
      }

      console.log('User is admin, loading orders');
      setIsAdmin(true);
      try {
      await loadOrders();
      } catch (error) {
        console.error('Error loading orders:', error);
        // Não bloquear o acesso se houver erro ao carregar pedidos
      }
      setLoading(false);
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast.error(`Erro ao verificar permissões: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setLoading(false);
    }
  };


  const updateOrderStatus = async (orderId: string, newStatus: 'pendente' | 'confirmado' | 'em_preparacao' | 'a_caminho' | 'concluido') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast.success("Status atualizado com sucesso");
      await loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;

    setDeleteLoading(true);
    try {
      console.log('Deleting order:', orderToDelete.id);

      // Usar função RPC para deletar (bypassa problemas de RLS)
      console.log('Chamando função RPC para deletar pedido:', orderToDelete.id);
      
      const { data: deleted, error: rpcError } = await supabase
        .rpc('delete_order', { order_id: orderToDelete.id });

      console.log('Delete RPC result:', { deleted, rpcError });

      if (rpcError) {
        console.error('❌ Error deleting order via RPC:', rpcError);
        console.error('Error code:', rpcError.code);
        console.error('Error message:', rpcError.message);
        console.error('Error details:', JSON.stringify(rpcError, null, 2));
        throw new Error(`Erro ao excluir pedido: ${rpcError.message || 'Erro desconhecido'}`);
      }

      if (!deleted) {
        throw new Error('Pedido não foi deletado. Verifique se o pedido existe e se você tem permissão de admin.');
      }

      console.log('✅ Pedido deletado com sucesso via RPC');

      toast.success("Pedido excluído com sucesso");
      setOrderToDelete(null);
      await loadOrders();
    } catch (error: any) {
      console.error('Error deleting order:', error);
      const errorMessage = error?.message || "Erro ao excluir pedido. Verifique se você tem permissão.";
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleQuickAction = async (order: Order, action: 'confirmar' | 'preparar' | 'sair' | 'pronto' | 'concluir') => {
    let newStatus: 'pendente' | 'confirmado' | 'em_preparacao' | 'a_caminho' | 'concluido';
    
    switch (action) {
      case 'confirmar':
        newStatus = 'confirmado';
        break;
      case 'preparar':
        newStatus = 'em_preparacao';
        break;
      case 'sair':
        newStatus = 'a_caminho';
        break;
      case 'pronto':
        newStatus = order.delivery_type === 'entrega' ? 'a_caminho' : 'concluido';
        break;
      case 'concluir':
        newStatus = 'concluido';
        break;
      default:
        return;
    }

    await updateOrderStatus(order.id, newStatus);
  };

  const getQuickActions = (order: Order) => {
    const actions = [];
    
    if (order.status === 'pendente') {
      actions.push({
        label: 'Confirmar Pedido',
        action: 'confirmar' as const,
        icon: CheckCircle,
        variant: 'default' as const,
      });
    }
    
    if (order.status === 'confirmado') {
      actions.push({
        label: 'Em Preparação',
        action: 'preparar' as const,
        icon: Package,
        variant: 'default' as const,
      });
    }
    
    if (order.status === 'em_preparacao') {
      if (order.delivery_type === 'entrega') {
        actions.push({
          label: 'Sair para Entrega',
          action: 'sair' as const,
          icon: Truck,
          variant: 'default' as const,
        });
      } else {
        actions.push({
          label: 'Pronto para Recolher',
          action: 'pronto' as const,
          icon: CheckCircle,
          variant: 'default' as const,
        });
      }
    }
    
    if (order.status === 'a_caminho') {
      actions.push({
        label: 'Marcar como Entregue',
        action: 'concluir' as const,
        icon: CheckCircle,
        variant: 'default' as const,
      });
    }

    return actions;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'secondary';
      case 'confirmado':
        return 'default';
      case 'em_preparacao':
        return 'default';
      case 'a_caminho':
        return 'outline';
      case 'concluido':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'confirmado':
        return 'Confirmado';
      case 'em_preparacao':
        return 'Em Preparação';
      case 'a_caminho':
        return 'A Caminho';
      case 'concluido':
        return 'Concluído';
      default:
        return status;
    }
  };

  const getFilteredOrders = () => {
    let filtered = [...orders];

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filtro por período
    const now = new Date();
    if (periodFilter === 'hoje') {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.toDateString() === now.toDateString();
      });
    } else if (periodFilter === 'semana') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(order => new Date(order.created_at) >= weekAgo);
    } else if (periodFilter === 'mes') {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      });
    }

    return filtered;
  };

  const getRevenueByDay = () => {
    const revenueByDay: Record<string, number> = {};
    
    orders.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit'
      });
      revenueByDay[date] = (revenueByDay[date] || 0) + order.total;
    });

    return Object.entries(revenueByDay)
      .map(([day, revenue]) => ({ day, revenue: Number(revenue.toFixed(2)) }))
      .sort((a, b) => {
        const [dayA, monthA] = a.day.split('/');
        const [dayB, monthB] = b.day.split('/');
        if (monthA !== monthB) return parseInt(monthA) - parseInt(monthB);
        return parseInt(dayA) - parseInt(dayB);
      })
      .slice(-7); // Últimos 7 dias
  };

  const getOrdersByStatus = () => {
    const statusCounts: Record<string, number> = {};
    
    orders.forEach(order => {
      const statusLabel = getStatusLabel(order.status);
      statusCounts[statusLabel] = (statusCounts[statusLabel] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
  };

  const getMonthlyRevenue = () => {
    const now = new Date();
    return orders
      .filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, order) => sum + order.total, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Package className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-foreground font-medium">A verificar permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="mb-4 text-destructive font-semibold">Acesso Negado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Apenas administradores podem acessar esta página.
            </p>
            <Button onClick={() => navigate("/")}>Voltar ao início</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Painel de Administração</h1>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
              <p className="text-xs text-foreground/70">
                Todos os pedidos registrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}€
              </div>
              <p className="text-xs text-foreground/70">
                Total de todos os pedidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === 'pendente' || o.status === 'confirmado' || o.status === 'em_preparacao').length}
              </div>
              <p className="text-xs text-foreground/70">
                Aguardando processamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === 'concluido').length}
              </div>
              <p className="text-xs text-foreground/70">
                Total finalizados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs para organizar */}
        <Tabs defaultValue="visao-geral" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="visao-geral">
              <TrendingUp className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="estatisticas">
              <Calendar className="h-4 w-4 mr-2" />
              Estatísticas
            </TabsTrigger>
            <TabsTrigger value="pedidos">
              <Package className="h-4 w-4 mr-2" />
              Pedidos
            </TabsTrigger>
          </TabsList>

          {/* Tab Visão Geral */}
          <TabsContent value="visao-geral" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Faturamento por Dia */}
              <Card>
                <CardHeader>
                  <CardTitle>Faturamento por Dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      revenue: {
                        label: "Faturamento",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <BarChart data={getRevenueByDay()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Pedidos por Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Pedidos por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      pedidos: {
                        label: "Pedidos",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <BarChart data={getOrdersByStatus()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-pedidos)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Resumo de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Ticket Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {orders.length > 0 
                      ? (orders.reduce((sum, order) => sum + order.total, 0) / orders.length).toFixed(2) 
                      : '0.00'}€
                  </div>
                  <p className="text-xs text-foreground/70 mt-1">
                    Valor médio por pedido
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Taxa de Entrega</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {orders.length > 0 
                      ? ((orders.filter(o => o.delivery_type === 'entrega').length / orders.length) * 100).toFixed(0) 
                      : '0'}%
                  </div>
                  <p className="text-xs text-foreground/70 mt-1">
                    Pedidos com entrega
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Faturamento do Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {getMonthlyRevenue().toFixed(2)}€
                  </div>
                  <p className="text-xs text-foreground/70 mt-1">
                    Pedidos deste mês
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Estatísticas */}
          <TabsContent value="estatisticas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    vendas: {
                      label: "Vendas",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[400px]"
                >
                  <LineChart data={getRevenueByDay()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--color-vendas)" strokeWidth={2} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Método de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Dinheiro</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ 
                              width: `${orders.length > 0 ? (orders.filter(o => o.payment_method === 'dinheiro').length / orders.length) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {orders.filter(o => o.payment_method === 'dinheiro').length}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">MB WAY</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-accent h-2 rounded-full" 
                            style={{ 
                              width: `${orders.length > 0 ? (orders.filter(o => o.payment_method !== 'dinheiro').length / orders.length) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {orders.filter(o => o.payment_method !== 'dinheiro').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tipo de Entrega</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Entrega</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ 
                              width: `${orders.length > 0 ? (orders.filter(o => o.delivery_type === 'entrega').length / orders.length) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {orders.filter(o => o.delivery_type === 'entrega').length}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Recolher</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-secondary h-2 rounded-full" 
                            style={{ 
                              width: `${orders.length > 0 ? (orders.filter(o => o.delivery_type === 'recolher').length / orders.length) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {orders.filter(o => o.delivery_type === 'recolher').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Pedidos */}
          <TabsContent value="pedidos" className="space-y-4">
            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                        <SelectItem value="em_preparacao">Em Preparação</SelectItem>
                        <SelectItem value="a_caminho">A Caminho</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Período</label>
                    <Select value={periodFilter} onValueChange={setPeriodFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="hoje">Hoje</SelectItem>
                        <SelectItem value="semana">Última Semana</SelectItem>
                        <SelectItem value="mes">Este Mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Pedidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
                  Lista de Pedidos ({getFilteredOrders().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
                {getFilteredOrders().length === 0 ? (
                  <p className="text-center text-foreground py-8">
                Nenhum pedido encontrado
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                          <TableHead>Ação Rápida</TableHead>
                          <TableHead>Alterar Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                        {getFilteredOrders().map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString('pt-PT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          <div>
                                <p className="font-medium text-foreground">{order.customer_name}</p>
                                <p className="text-sm text-foreground">{order.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">{order.customer_phone}</TableCell>
                        <TableCell>
                          <div>
                            <Badge variant={order.delivery_type === 'entrega' ? 'default' : 'secondary'}>
                              {order.delivery_type === 'entrega' ? 'Entrega' : 'Recolher'}
                            </Badge>
                            {order.delivery_address && (
                                  <p className="text-xs text-foreground mt-1 max-w-[200px]">
                                {order.delivery_address}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {order.payment_method === 'dinheiro' ? 'Dinheiro' : 'MB WAY'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 font-medium">
                            <Euro className="h-4 w-4" />
                                {order.total.toFixed(2)}€
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-2">
                                {getQuickActions(order).map((quickAction, idx) => {
                                  const Icon = quickAction.icon;
                                  return (
                                    <Button
                                      key={idx}
                                      size="sm"
                                      variant={quickAction.variant}
                                      onClick={() => handleQuickAction(order, quickAction.action)}
                                      className="w-full justify-start"
                                    >
                                      <Icon className="h-4 w-4 mr-2" />
                                      {quickAction.label}
                                    </Button>
                                  );
                                })}
                                {getQuickActions(order).length === 0 && (
                                  <span className="text-sm text-muted-foreground">Sem ações</span>
                                )}
                              </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.status || 'pendente'}
                            onValueChange={(value) => updateOrderStatus(order.id, value as 'pendente' | 'confirmado' | 'em_preparacao' | 'a_caminho' | 'concluido')}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="confirmado">Confirmado</SelectItem>
                              <SelectItem value="em_preparacao">Em Preparação</SelectItem>
                              <SelectItem value="a_caminho">A Caminho</SelectItem>
                              <SelectItem value="concluido">Concluído</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setOrderToDelete(order)}
                                className="w-full"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground">
              <p className="mb-4">Tem certeza que deseja excluir este pedido?</p>
              <div className="space-y-2 mb-4">
                <p className="text-foreground">
                  <strong className="text-foreground">Pedido:</strong> #{orderToDelete?.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-foreground">
                  <strong className="text-foreground">Cliente:</strong> {orderToDelete?.customer_name}
                </p>
                <p className="text-foreground">
                  <strong className="text-foreground">Total:</strong> {orderToDelete?.total.toFixed(2)}€
                </p>
              </div>
              <p className="text-destructive font-semibold">
                Esta ação não pode ser desfeita!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Excluindo..." : "Excluir Pedido"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
