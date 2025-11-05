import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Clock, Package, Truck, MapPin, Home, ArrowLeft, Loader2, ShoppingBag } from "lucide-react";
import { getCartItemsCount } from "@/lib/cart";

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

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  options: any;
}

const PedidoTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setCartCount(getCartItemsCount([]));
    if (orderId) {
      loadOrder();
      // Poll para atualizações a cada 5 segundos
      const interval = setInterval(loadOrder, 5000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) return;

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (!orderData) {
        toast.error('Pedido não encontrado');
        navigate('/');
        return;
      }

      setOrder(orderData);

      // Carregar itens do pedido
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;
      setOrderItems(itemsData || []);
    } catch (error) {
      console.error('Erro ao carregar pedido:', error);
      toast.error('Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = () => {
    // Se for recolher, não mostrar "A Caminho", mostrar "Pronto para Recolher"
    const isPickup = order?.delivery_type === 'recolher';
    
    let steps;
    if (isPickup) {
      steps = [
        { key: 'pendente', label: 'Pedido Recebido', icon: CheckCircle2, completed: true },
        { key: 'confirmado', label: 'Confirmado', icon: CheckCircle2 },
        { key: 'em_preparacao', label: 'Em Preparação', icon: Package },
        { key: 'pronto_para_recolher', label: 'Pronto para Recolher', icon: ShoppingBag },
        { key: 'concluido', label: 'Concluído', icon: Home },
      ];
    } else {
      steps = [
        { key: 'pendente', label: 'Pedido Recebido', icon: CheckCircle2, completed: true },
        { key: 'confirmado', label: 'Confirmado', icon: CheckCircle2 },
        { key: 'em_preparacao', label: 'Em Preparação', icon: Package },
        { key: 'a_caminho', label: 'A Caminho', icon: Truck },
        { key: 'concluido', label: 'Concluído', icon: Home },
      ];
    }

    // Mapear status "a_caminho" para "pronto_para_recolher" quando for recolher
    let currentStatus = order?.status;
    if (isPickup && currentStatus === 'a_caminho') {
      currentStatus = 'pronto_para_recolher';
    }

    const statusIndex = steps.findIndex(s => s.key === currentStatus);
    
    return steps.map((step, index) => ({
      ...step,
      completed: index <= statusIndex,
      current: index === statusIndex,
    }));
  };

  const getStatusLabel = (status: string) => {
    const isPickup = order?.delivery_type === 'recolher';
    
    // Mapear "a_caminho" para "Pronto para Recolher" quando for recolher
    if (isPickup && status === 'a_caminho') {
      return 'Pronto para Recolher';
    }
    
    const labels: Record<string, string> = {
      pendente: 'Pendente',
      confirmado: 'Confirmado',
      em_preparacao: 'Em Preparação',
      a_caminho: 'A Caminho',
      pronto_para_recolher: 'Pronto para Recolher',
      concluido: isPickup ? 'Recolhido' : 'Concluído',
    };
    return labels[status] || status;
  };

  const getEstimatedTime = (status: string) => {
    const isPickup = order?.delivery_type === 'recolher';
    
    const estimates: Record<string, string> = {
      pendente: 'Aguardando confirmação...',
      confirmado: 'Confirmando pedido...',
      em_preparacao: 'Preparando seu pedido...',
      a_caminho: isPickup ? 'Seu pedido está pronto para recolher!' : 'A caminho da entrega!',
      pronto_para_recolher: 'Seu pedido está pronto para recolher!',
      concluido: isPickup ? 'Pedido recolhido!' : 'Pedido entregue!',
    };
    
    // Mapear "a_caminho" para "pronto_para_recolher" quando for recolher
    if (isPickup && status === 'a_caminho') {
      return estimates.pronto_para_recolher;
    }
    
    return estimates[status] || '';
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header cartItemsCount={cartCount} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header cartItemsCount={cartCount} />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="mb-4">Pedido não encontrado</p>
              <Button onClick={() => navigate('/')}>Voltar ao início</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const steps = getStatusSteps();
  const progressPercentage = ((steps.findIndex(s => s.current) + 1) / steps.length) * 100;

  return (
    <div className="flex flex-col min-h-screen">
      <Header cartItemsCount={cartCount} />
      
      <main className="flex-1 py-8 bg-gradient-to-b from-background to-secondary/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao início
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status do Pedido */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Acompanhar Pedido</span>
                    <Badge variant={order.status === 'concluido' ? 'default' : 'secondary'}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Barra de Progresso */}
                  <div className="space-y-4">
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-primary transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>

                    {/* Etapas */}
                    <div className="flex justify-between">
                      {steps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                          <div key={step.key} className="flex flex-col items-center flex-1">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                                step.completed
                                  ? 'bg-primary text-primary-foreground'
                                  : step.current
                                  ? 'bg-primary/20 text-primary border-2 border-primary'
                                  : 'bg-muted text-foreground/70'
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <p
                              className={`text-xs text-center ${
                                step.completed || step.current
                                  ? 'text-foreground font-medium'
                                  : 'text-foreground/70'
                              }`}
                            >
                              {step.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tempo Estimado */}
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="font-semibold text-foreground">
                      {getEstimatedTime(order.status)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Detalhes do Pedido */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-foreground/70 mb-1">Número do Pedido</p>
                    <p className="font-mono text-sm text-foreground">{order.id.slice(0, 8).toUpperCase()}</p>
                  </div>

                  <div>
                    <p className="text-sm text-foreground/70 mb-1">Data</p>
                    <p className="text-sm text-foreground">
                      {new Date(order.created_at).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-foreground/70 mb-2">Itens do Pedido</p>
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm py-2 border-b last:border-0">
                        <span className="text-foreground">
                          {item.quantity}x {item.product_name}
                        </span>
                        <span className="font-medium text-foreground">{item.total_price.toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-foreground">Subtotal</span>
                      <span className="text-foreground">{order.total.toFixed(2)}€</span>
                    </div>
                    {order.delivery_type === 'entrega' && (
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-foreground/70">Taxa de Entrega</span>
                        <span className="text-foreground/70">1.50€</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span className="text-foreground">Total</span>
                      <span className="text-primary">{order.total.toFixed(2)}€</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Informações de Entrega */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações de Entrega</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-foreground/70 mb-1">Tipo de Entrega</p>
                    <Badge variant={order.delivery_type === 'entrega' ? 'default' : 'secondary'}>
                      {order.delivery_type === 'entrega' ? (
                        <><Truck className="h-3 w-3 mr-1" /> Entrega</>
                      ) : (
                        <><Package className="h-3 w-3 mr-1" /> Recolher</>
                      )}
                    </Badge>
                  </div>

                  {order.delivery_type === 'entrega' && order.delivery_address && (
                    <div>
                      <p className="text-sm text-foreground/70 mb-1 flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        Endereço
                      </p>
                      <p className="text-sm text-foreground">{order.delivery_address}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-foreground/70 mb-1">Pagamento</p>
                    <p className="text-sm text-foreground">
                      {order.payment_method === 'dinheiro' ? 'Dinheiro' : order.payment_method === 'mbway' ? 'MB WAY' : 'MB WAY'}
                    </p>
                  </div>

                  {order.notes && (
                    <div>
                      <p className="text-sm text-foreground/70 mb-1">Observações</p>
                      <p className="text-sm text-foreground">{order.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-foreground font-medium">{order.customer_name}</p>
                  <p className="text-foreground">{order.customer_email}</p>
                  <p className="text-foreground">{order.customer_phone}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PedidoTracking;

