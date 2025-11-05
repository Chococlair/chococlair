import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, LogOut, Lock, Package, Truck } from "lucide-react";
import { getCartItemsCount } from "@/lib/cart";
import { Link } from "react-router-dom";

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
  delivery_type: string;
}

const Perfil = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Password update
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setCartCount(getCartItemsCount([]));
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Por favor, faça login para acessar seu perfil");
      navigate("/auth");
      return;
    }
    setUser(session.user);
    await loadOrders();
  };

  const loadOrders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Buscar pedidos do usuário através do email
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, status, created_at, delivery_type')
        .eq('customer_email', session.user.email)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        toast.error("As senhas não coincidem");
        setLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        toast.error("A senha deve ter no mínimo 6 caracteres");
        setLoading(false);
        return;
      }

      // Atualizar senha
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Senha atualizada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      toast.error(error.message || "Erro ao atualizar senha");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Sessão encerrada com sucesso");
      navigate("/");
    } catch (error: any) {
      toast.error("Erro ao encerrar sessão");
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendente: 'Pendente',
      confirmado: 'Confirmado',
      em_preparacao: 'Em Preparação',
      a_caminho: 'A Caminho',
      concluido: 'Concluído',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'text-green-600';
      case 'a_caminho':
        return 'text-blue-600';
      case 'em_preparacao':
        return 'text-yellow-600';
      default:
        return 'text-muted-foreground';
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header cartItemsCount={cartCount} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">A carregar...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header cartItemsCount={cartCount} />
      
      <main className="flex-1 py-12 bg-gradient-to-b from-background to-secondary/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Meu Perfil</h1>
            <p className="text-muted-foreground">Gerencie sua conta e acompanhe seus pedidos</p>
          </div>

          <Tabs defaultValue="perfil" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="perfil">
                <User className="h-4 w-4 mr-2" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="senha">
                <Lock className="h-4 w-4 mr-2" />
                Segurança
              </TabsTrigger>
              <TabsTrigger value="pedidos">
                <Package className="h-4 w-4 mr-2" />
                Meus Pedidos
              </TabsTrigger>
            </TabsList>

            {/* Aba Perfil */}
            <TabsContent value="perfil" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>
                    Visualize suas informações de conta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">
                        {user.user_metadata?.name || 'Usuário'}
                      </h3>
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Nome</Label>
                      <p className="font-medium">
                        {user.user_metadata?.name || 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Email</Label>
                      <p className="font-medium">{user.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">ID do Usuário</Label>
                      <p className="font-mono text-xs text-muted-foreground">
                        {user.id.slice(0, 8)}...
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Membro desde</Label>
                      <p className="font-medium">
                        {new Date(user.created_at).toLocaleDateString('pt-PT', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button variant="destructive" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Finalizar Sessão
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Segurança */}
            <TabsContent value="senha" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Alterar Senha</CardTitle>
                  <CardDescription>
                    Atualize sua senha para manter sua conta segura
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nova Senha</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Digite a senha novamente"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Atualizando..." : "Atualizar Senha"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Pedidos */}
            <TabsContent value="pedidos" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Meus Pedidos</CardTitle>
                  <CardDescription>
                    Acompanhe seus pedidos recentes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">
                        Você ainda não fez nenhum pedido
                      </p>
                      <Link to="/produtos">
                        <Button>Ver Produtos</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold">
                                Pedido #{order.id.slice(0, 8).toUpperCase()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString('pt-PT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">
                                {order.total.toFixed(2)}€
                              </p>
                              <p className={`text-sm font-medium ${getStatusColor(order.status)}`}>
                                {getStatusLabel(order.status)}
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-4">
                            <Badge variant="outline">
                              {order.delivery_type === 'entrega' ? (
                                <><Truck className="h-3 w-3 mr-1" /> Entrega</>
                              ) : (
                                <><Package className="h-3 w-3 mr-1" /> Recolher</>
                              )}
                            </Badge>
                            <Link to={`/pedido/${order.id}`}>
                              <Button variant="outline" size="sm">
                                Ver Detalhes
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Perfil;

