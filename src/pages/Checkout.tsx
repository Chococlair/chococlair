import { useState, useEffect, useCallback, useMemo } from "react";
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
import { getCart, clearCart, CartItem, calculateCartPricing, validateCartProducts, isNatalCategory } from "@/lib/cart";
import type { CartPricingSummary } from "@/lib/cart";
import { getActivePromotions, type PromotionRecord } from "@/lib/promotions";
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

type DeliveryType = "recolher" | "entrega";
type PaymentMethod = "dinheiro" | "mbway";

type CreateOrderResponse = {
  success: boolean;
  orderId?: string;
  error?: string;
  [key: string]: unknown;
};

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Checkout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pricing, setPricing] = useState<CartPricingSummary | null>(null);
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("recolher");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [notes, setNotes] = useState("");

  const loadCartWithPromotions = useCallback(async (items?: CartItem[]) => {
    const cartData = items ?? getCart();

    if (cartData.length === 0) {
      setCart([]);
      setPricing(null);
      setPromotions([]);
      return cartData;
    }

    try {
      const today = getTodayDateString();
      const [
        { data: productsData, error: productsError },
        { data: availabilityData, error: availabilityError },
        { data: promotionsData, error: promotionsError },
      ] = await Promise.all([
        supabase.from('products').select('id').eq('available', true),
        supabase
          .from('daily_product_availability')
          .select('product_id')
          .eq('available_date', today)
          .eq('is_active', true),
        supabase
          .from('promotions')
          .select(
            'id, title, description, discount_type, discount_value, applies_to_all, free_shipping, starts_at, ends_at, active, promotion_products ( product_id )',
          ),
      ]);

      if (productsError) throw productsError;
      if (availabilityError) throw availabilityError;
      if (promotionsError) throw promotionsError;

      const availableProductIds = (productsData ?? []).map((product) => product.id);
      const availableTodayIds = (availabilityData ?? []).map(({ product_id }) => product_id);
      const validationResult = await validateCartProducts(availableProductIds, availableTodayIds);

      const sanitizedCart = Array.isArray(validationResult) ? validationResult : validationResult.validCart;
      if (!Array.isArray(validationResult) && validationResult.removedItems.length > 0) {
        toast.warning(
          `${validationResult.removedItems.length} produto(s) foram removidos do carrinho (indisponíveis para hoje ou incompatíveis com outros itens).`,
          { duration: 5000 },
        );
      }

      setCart(sanitizedCart);

      const activePromos = getActivePromotions((promotionsData ?? []) as PromotionRecord[]);
      setPromotions(activePromos);
      setPricing(calculateCartPricing(sanitizedCart, activePromos));
      return sanitizedCart;
    } catch (error) {
      console.error('Erro ao carregar dados para o checkout:', error);
      toast.error('Não foi possível validar o carrinho. Tente novamente.');
      setPromotions([]);
      setPricing(calculateCartPricing(cartData, []));
      setCart(cartData);
      return cartData;
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Por favor, faça login para continuar");
      navigate("/auth");
      return;
    }
    setUser(session.user);
    setEmail(session.user.email || "");
    setName((session.user.user_metadata?.name as string | undefined) || "");
  }, [navigate]);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      const cartData = getCart();
      if (cartData.length === 0) {
        toast.error("Seu carrinho está vazio");
        navigate("/carrinho");
        return;
      }
      await loadCartWithPromotions(cartData);
    };

    void init();
  }, [checkAuth, navigate, loadCartWithPromotions]);

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
      const autoNote = isNatalOrder
        ? "Encomenda de Natal agendada para 24/12 entre 09:00h e 16:30h."
        : "";
      const combinedNotes = [notes.trim(), autoNote].filter(Boolean).join("\n") || null;

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
          notes: combinedNotes,
        },
        scheduledFor: isNatalOrder ? "2024-12-24" : null,
      };

      console.log('Submitting order:', orderData);
      console.log('Payment method:', paymentMethod);
      console.log('Payment method type:', typeof paymentMethod);

      // Call secure Edge Function usando o cliente Supabase
      console.log('📤 Chamando Edge Function via Supabase client...');
      
      try {
        // Obter a sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Erro ao obter sessão:', sessionError);
          throw new Error('Erro ao verificar sessão. Por favor, faça login novamente.');
        }
        
        if (!session) {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }

        console.log('Session token presente:', !!session.access_token);
        console.log('Session token length:', session.access_token?.length || 0);
        
        // Chamar Edge Function usando fetch para ter acesso completo à resposta
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const functionUrl = `${supabaseUrl}/functions/v1/create-order`;
        
        console.log('📤 Chamando:', functionUrl);
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          },
          body: JSON.stringify(orderData),
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response ok:', response.ok);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

        let responseData: CreateOrderResponse | null = null;
        try {
          const text = await response.text();
          console.log('📥 Response text (raw):', text);
          responseData = text ? (JSON.parse(text) as CreateOrderResponse) : null;
          console.log('📥 Response data (parsed):', responseData);
        } catch (parseError: unknown) {
          console.error('Erro ao parsear resposta:', parseError);
          throw new Error('Erro ao processar resposta do servidor');
        }

        if (!response.ok) {
          const errorMsg = responseData?.error || `Erro ${response.status}: ${response.statusText}`;
          console.error('❌ ERROR:', errorMsg);
          console.error('Full response:', responseData);
          throw new Error(errorMsg);
        }

        if (!responseData || !responseData.success) {
          const errorMsg = responseData?.error || 'Erro ao criar pedido';
          console.error('Order creation failed:', errorMsg);
          throw new Error(errorMsg);
        }
        
        if (!responseData.orderId) {
          throw new Error('Resposta inválida do servidor: orderId ausente.');
        }

        console.log('✅ Order created successfully:', responseData);

        // Clear cart
        clearCart();

        toast.success("Pedido realizado com sucesso!");
        // Redirecionar para página de acompanhamento
        navigate(`/pedido/${responseData.orderId}`);
      } catch (error: unknown) {
        console.error('Checkout error:', error);
        const message = error instanceof Error ? error.message : "Erro ao finalizar pedido";
        toast.error(message);
      }
    } catch (error: unknown) {
      console.error('Checkout error (outer):', error);
      const message = error instanceof Error ? error.message : "Erro ao finalizar pedido";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const isNatalOrder = useMemo(
    () => cart.length > 0 && cart.every((item) => item.isNatal ?? isNatalCategory(item.category)),
    [cart],
  );

  const subtotalFallback = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = pricing?.subtotal ?? subtotalFallback;
  const discountTotal = pricing?.discountTotal ?? 0;
  const productsTotal = pricing?.total ?? subtotal;
  const deliveryFee = deliveryType === "entrega" && !(pricing?.freeShipping ?? false) ? 1.5 : 0;
  const total = productsTotal + deliveryFee;
  const pricingMap = useMemo(() => {
    if (!pricing) return new Map<string, ReturnType<typeof calculateCartPricing>["items"][number]>();
    return new Map(pricing.items.map((item) => [item.id, item]));
  }, [pricing]);
  const appliedPromotionTitles = useMemo(() => {
    if (!pricing) return [];
    return Array.from(
      new Set(
        pricing.items
          .map((item) => item.appliedPromotion?.title)
          .filter(Boolean) as string[],
      ),
    );
  }, [pricing]);

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
                  {isNatalOrder && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                      <p className="font-medium">Encomenda de Natal</p>
                      <p>Entrega ou recolha disponível apenas no dia 24/12, entre 09:00h e 16:30h.</p>
                      <p className="mt-1">Pagamento em dinheiro ou MB WAY no momento da entrega/recolha.</p>
                    </div>
                  )}
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
                  <RadioGroup
                    value={deliveryType}
                    onValueChange={(value) => {
                      if (value === "recolher" || value === "entrega") {
                        setDeliveryType(value);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="recolher" id="recolher" />
                      <Label htmlFor="recolher">Recolher na loja (Grátis)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="entrega" id="entrega" />
                      <Label htmlFor="entrega">
                        Entrega ao domicílio{" "}
                        {pricing?.freeShipping ? "(Grátis com promoção)" : "(+1,50€)"}
                      </Label>
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
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(value) => {
                      if (value === "dinheiro" || value === "mbway") {
                        setPaymentMethod(value);
                      }
                    }}
                  >
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
                    placeholder="Ex: Preciso de troco para 20,00€"
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
                {cart.map((item) => {
                  const pricingItem = pricingMap.get(item.id);
                  const lineTotal = pricingItem?.lineTotal ?? item.price * item.quantity;
                  const hasDiscount = pricingItem ? pricingItem.discountTotal > 0 : false;

                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-foreground/70">Quantidade: {item.quantity}</p>
                        {hasDiscount && pricingItem && (
                          <p className="text-xs text-emerald-600">
                            Promoção: -{pricingItem.discountTotal.toFixed(2)}€
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {hasDiscount && (
                          <p className="text-xs text-foreground/60 line-through">
                            {(item.price * item.quantity).toFixed(2)}€
                          </p>
                        )}
                        <p className="font-medium">{lineTotal.toFixed(2)}€</p>
                      </div>
                    </div>
                  );
                })}
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <p>Subtotal</p>
                    <p>{subtotal.toFixed(2)}€</p>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 text-sm">
                      <p>Descontos</p>
                      <p>-{discountTotal.toFixed(2)}€</p>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <p>Taxa de entrega</p>
                    <p>{deliveryFee === 0 ? "Grátis" : `${deliveryFee.toFixed(2)}€`}</p>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <p>Total</p>
                    <p>{total.toFixed(2)}€</p>
                  </div>
                  {isNatalOrder && (
                    <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                      <p className="font-medium">Encomenda agendada para 24/12</p>
                      <p>Entrega ou recolha entre 09:00h e 16:30h. Pagamento no ato da entrega/recolha.</p>
                    </div>
                  )}
                  {appliedPromotionTitles.length > 0 && (
                    <div className="pt-2 text-sm text-foreground/70 space-y-1">
                      <p>Promoções aplicadas:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {appliedPromotionTitles.map((title) => (
                          <li key={title}>{title}</li>
                        ))}
                      </ul>
                    </div>
                  )}
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
