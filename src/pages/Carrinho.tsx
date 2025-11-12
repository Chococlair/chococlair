import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from "lucide-react";
import {
  getCart,
  getCartItemsCount,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  validateCartProducts,
  CartItem,
  calculateCartPricing,
  isNatalCategory,
} from "@/lib/cart";
import type { CartPricingSummary } from "@/lib/cart";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getActivePromotions, type PromotionRecord } from "@/lib/promotions";

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Carrinho = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [pricing, setPricing] = useState<CartPricingSummary | null>(null);
  const [isNatalCart, setIsNatalCart] = useState(false);

  const updateCartState = useCallback(
    (items: CartItem[], currentPromotions?: PromotionRecord[]) => {
      const promos = currentPromotions ?? promotions;
      setCart(items);
      setCartCount(getCartItemsCount(items));
      setPricing(calculateCartPricing(items, promos));
      setIsNatalCart(items.length > 0 && items.every((item) => isNatalCategory(item.category)));
    },
    [promotions],
  );

  const loadCartAndValidate = useCallback(async () => {
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

      let updatedCart: CartItem[];

      if (Array.isArray(validationResult)) {
        updatedCart = validationResult;
      } else {
        const { validCart, removedItems } = validationResult;
        updatedCart = validCart;

        if (removedItems.length > 0) {
          toast.warning(
            `${removedItems.length} produto(s) foram removidos do carrinho (indisponíveis para hoje ou incompatíveis com outros itens).`,
            { duration: 5000 },
          );
        }
      }

      const activePromos = getActivePromotions((promotionsData ?? []) as PromotionRecord[]);
      setPromotions(activePromos);
      updateCartState(updatedCart, activePromos);
    } catch (error) {
      console.error('Erro ao validar carrinho:', error);
      toast.error('Não foi possível validar o carrinho neste momento.');
      const currentCart = getCart();
      setPromotions([]);
      updateCartState(currentCart, []);
    }
  }, [updateCartState]);

  useEffect(() => {
    loadCartAndValidate();

    const handleCartUpdate = () => {
      const currentCart = getCart();
      updateCartState(currentCart);
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, [loadCartAndValidate, updateCartState]);

  const handleClearCart = () => {
    clearCart();
    toast.success('Carrinho limpo');
    updateCartState([]);
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    updateCartItemQuantity(itemId, newQuantity);
    const updatedCart = getCart();
    updateCartState(updatedCart);
  };

  const handleRemoveItem = (itemId: string) => {
    removeFromCart(itemId);
    toast.success('Produto removido do carrinho');
    const updatedCart = getCart();
    updateCartState(updatedCart);
  };

  const getItemDescription = (item: CartItem) => {
    const parts: string[] = [];
    
    if (item.category === 'eclair' && item.options?.boxSize) {
      parts.push(`Caixa com ${item.options.boxSize} unidades`);
      
      // Se houver sabores selecionados, mostrar (mas não temos os nomes aqui, apenas IDs)
      if (item.options?.flavors && item.options.flavors.length > 0) {
        parts.push(`${item.options.flavors.length} sabores selecionados`);
      }
    }
    
    if (item.category === 'rocambole' && item.options?.massType) {
      const massLabel = item.options.massType === 'chocolate' ? 'Massa de Chocolate' : 'Massa Branca';
      parts.push(massLabel);
    }
    
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const subtotalFallback = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = pricing?.subtotal ?? subtotalFallback;
  const discountTotal = pricing?.discountTotal ?? 0;
  const total = pricing?.total ?? subtotal;
  const freeShipping = pricing?.freeShipping ?? false;
  const isEmpty = cart.length === 0;

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

  return (
    <div className="flex flex-col min-h-screen">
      <Header cartItemsCount={cartCount} />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-bold">Carrinho de Compras</h1>
            <div className="flex gap-2">
              {!isEmpty && (
                <Button variant="outline" onClick={handleClearCart}>
                  Limpar Carrinho
                </Button>
              )}
              <Link to="/produtos">
                <Button variant="ghost">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Continuar a Comprar
                </Button>
              </Link>
            </div>
          </div>

          {isNatalCart && (
            <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary">
              <p className="font-semibold">Encomenda de Natal</p>
              <p>
                Entregas e recolhas realizadas apenas no dia <strong>24/12</strong> entre 09:00h e 16:30h.
                O pagamento em dinheiro ou MB WAY é feito no momento da entrega/recolha.
              </p>
            </div>
          )}

          {isEmpty ? (
            <Card className="p-12 text-center">
              <ShoppingBag className="h-20 w-20 mx-auto mb-4 text-foreground/50" />
              <h2 className="text-2xl font-semibold mb-2">O seu carrinho está vazio</h2>
              <p className="text-foreground/70 mb-6">
                Adicione produtos ao carrinho para continuar
              </p>
              <Link to="/produtos">
                <Button size="lg">Ver Produtos</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Itens do Carrinho */}
              <Card className="p-6">
                <div className="space-y-4">
                  {cart.map((item, index) => {
                    const itemPricing = pricingMap.get(item.id);
                    const unitPrice = itemPricing?.discountedUnitPrice ?? item.price;
                    const lineTotal = itemPricing?.lineTotal ?? item.price * item.quantity;
                    const hasDiscount = itemPricing ? itemPricing.discountTotal > 0 : false;
                    const originalLineTotal = item.price * item.quantity;

                    return (
                      <div key={item.id}>
                        <div className="flex gap-4">
                          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <span className="text-4xl">🍰</span>
                            )}
                          </div>

                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{item.name}</h3>
                            {getItemDescription(item) && (
                              <p className="text-sm text-foreground/70">{getItemDescription(item)}</p>
                            )}
                            <div className="mt-1 flex flex-col">
                              {hasDiscount && (
                                <span className="text-sm text-foreground/60 line-through">
                                  {item.price.toFixed(2)}€
                                </span>
                              )}
                              <span className="text-primary font-semibold">
                                {unitPrice.toFixed(2)}€
                              </span>
                              {hasDiscount && itemPricing && (
                                <span className="text-xs text-emerald-600 mt-1">
                                  Poupa {itemPricing.discountTotal.toFixed(2)}€
                                </span>
                              )}
                              {itemPricing?.appliedPromotion?.freeShipping && (
                                <span className="text-xs text-primary mt-1">Entrega grátis neste item</span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 mt-3">
                              <div className="flex items-center border rounded-lg">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="px-4 text-sm font-medium">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="text-right">
                            {hasDiscount && (
                              <p className="text-sm text-foreground/60 line-through">
                                {originalLineTotal.toFixed(2)}€
                              </p>
                            )}
                            <p className="font-bold text-lg text-foreground">
                              {lineTotal.toFixed(2)}€
                            </p>
                          </div>
                        </div>
                        {index < cart.length - 1 && <Separator className="mt-4" />}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Resumo do Pedido */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Resumo do Pedido</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-foreground/70">
                    <span>Subtotal</span>
                    <span>{subtotal.toFixed(2)}€</span>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 text-sm">
                      <span>Descontos</span>
                      <span>-{discountTotal.toFixed(2)}€</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-foreground/70">
                    <span>Entrega</span>
                    <span>{freeShipping ? "Grátis com promoção" : "Calculada no checkout"}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-primary">{total.toFixed(2)}€</span>
                  </div>
                </div>

                {appliedPromotionTitles.length > 0 && (
                  <div className="mt-4 text-sm text-foreground/70 space-y-2">
                    <p>Promoções aplicadas:</p>
                    <ul className="list-disc list-inside space-y-1 text-foreground">
                      {appliedPromotionTitles.map((title) => (
                        <li key={title}>{title}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button 
                  className="w-full mt-6" 
                  size="lg"
                  onClick={() => navigate('/checkout')}
                  disabled={isEmpty}
                >
                  Finalizar Pedido
                </Button>

                {isNatalCart && (
                  <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                    <p className="font-medium">Encomenda agendada para 24/12</p>
                    <p>Disponível para entrega ou recolha entre 09:00h e 16:30h.</p>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Carrinho;