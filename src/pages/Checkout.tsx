import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCart, clearCart, getCartTotal, CartItem } from "@/lib/cart";
import { Loader2 } from "lucide-react";

const Checkout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"recolher" | "entrega">("recolher");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"dinheiro" | "mbway">("dinheiro");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Por favor, faça login para continuar");
        navigate("/auth");
        return;
      }
      setUser(session.user);
      setEmail(session.user.email || "");
      setName(session.user.user_metadata?.name || "");
    };

    checkAuth();
    const cartData = getCart();
    if (cartData.length === 0) {
      toast.error("Seu carrinho está vazio");
      navigate("/carrinho");
      return;
    }
    setCart(cartData);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate delivery address for delivery orders
      if (deliveryType === "entrega" && !deliveryAddress.trim()) {
        toast.error("Por favor, insira o endereço de entrega");
        setLoading(false);
        return;
      }

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Por favor, faça login novamente.");
        navigate("/auth");
        return;
      }

      // Prepare order data
      const orderData = {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          category: item.category,
          options: item.options || null,
        })),
        customerData: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          deliveryType,
          deliveryAddress: deliveryType === "entrega" ? deliveryAddress.trim() : null,
          paymentMethod,
          notes: notes.trim() || null,
        },
      };

      console.log('Submitting order:', orderData);

      // Call secure Edge Function
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: orderData,
      });

      if (error) {
        console.error('Error creating order:', error);
        // Try to get error message from response
        let errorMessage = error.message || 'Erro ao criar pedido';
        if (error.context?.msg) {
          errorMessage = error.context.msg;
        }
        throw new Error(errorMessage);
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || 'Erro ao criar pedido';
        console.error('Order creation failed:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('Order created successfully:', data);

      // Clear cart
      clearCart();

      toast.success("Pedido realizado com sucesso!");
      // Redirecionar para página de acompanhamento
      navigate(`/pedido/${data.orderId}`);
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || "Erro ao finalizar pedido");
    } finally {
      setLoading(false);
    }
  };

  const subtotal = getCartTotal(cart);
  const deliveryFee = deliveryType === "entrega" ? 1.5 : 0;
  const total = subtotal + deliveryFee;

  if (!user || cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Finalizar Pedido</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={255}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      maxLength={20}
                      placeholder="+351 912 345 678"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tipo de Entrega</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup value={deliveryType} onValueChange={(value: any) => setDeliveryType(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="recolher" id="recolher" />
                      <Label htmlFor="recolher">Recolher na loja (Grátis)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="entrega" id="entrega" />
                      <Label htmlFor="entrega">Entrega ao domicílio (+1,50€)</Label>
                    </div>
                  </RadioGroup>

                  {deliveryType === "entrega" && (
                    <div>
                      <Label htmlFor="address">Endereço de Entrega *</Label>
                      <Textarea
                        id="address"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Rua, número, código postal, cidade"
                        required
                        maxLength={500}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Método de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dinheiro" id="dinheiro" />
                      <Label htmlFor="dinheiro">Dinheiro (na entrega/recolha)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="mbway" id="mbway" />
                      <Label htmlFor="mbway">MB WAY</Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Observações (opcional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Informações adicionais sobre o pedido..."
                    maxLength={1000}
                  />
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  `Confirmar Pedido (${total.toFixed(2)}€)`
                )}
              </Button>
            </form>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-muted-foreground">Quantidade: {item.quantity}</p>
                    </div>
                    <p className="font-medium">{(item.price * item.quantity).toFixed(2)}€</p>
                  </div>
                ))}
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <p>Subtotal</p>
                    <p>{subtotal.toFixed(2)}€</p>
                  </div>
                  <div className="flex justify-between">
                    <p>Taxa de entrega</p>
                    <p>{deliveryFee.toFixed(2)}€</p>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <p>Total</p>
                    <p>{total.toFixed(2)}€</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
