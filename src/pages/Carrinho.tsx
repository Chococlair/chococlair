import { useState, useEffect } from "react";
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
  getCartTotal, 
  updateCartItemQuantity, 
  removeFromCart,
  CartItem 
} from "@/lib/cart";
import { toast } from "sonner";

const Carrinho = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    loadCart();
    
    const handleCartUpdate = () => {
      loadCart();
    };
    
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const loadCart = () => {
    const currentCart = getCart();
    setCart(currentCart);
    setCartCount(getCartItemsCount(currentCart));
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    updateCartItemQuantity(itemId, newQuantity);
  };

  const handleRemoveItem = (itemId: string) => {
    removeFromCart(itemId);
    toast.success('Produto removido do carrinho');
  };

  const getItemDescription = (item: CartItem) => {
    const parts: string[] = [];
    
    if (item.category === 'eclair' && item.options?.boxSize) {
      parts.push(`Caixa com ${item.options.boxSize} unidades`);
    }
    
    if (item.category === 'rocambole' && item.options?.massType) {
      const massLabel = item.options.massType === 'chocolate' ? 'Massa de Chocolate' : 'Massa Branca';
      parts.push(massLabel);
    }
    
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const total = getCartTotal(cart);
  const isEmpty = cart.length === 0;

  return (
    <div className="flex flex-col min-h-screen">
      <Header cartItemsCount={cartCount} />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-bold">Carrinho de Compras</h1>
            <Link to="/produtos">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continuar a Comprar
              </Button>
            </Link>
          </div>

          {isEmpty ? (
            <Card className="p-12 text-center">
              <ShoppingBag className="h-20 w-20 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">O seu carrinho está vazio</h2>
              <p className="text-muted-foreground mb-6">
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
                  {cart.map((item) => (
                    <div key={item.id}>
                      <div className="flex gap-4">
                        {/* Imagem */}
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

                        {/* Detalhes */}
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{item.name}</h3>
                          {getItemDescription(item) && (
                            <p className="text-sm text-muted-foreground">
                              {getItemDescription(item)}
                            </p>
                          )}
                          <p className="text-primary font-semibold mt-1">
                            {item.price.toFixed(2)}€
                          </p>

                          {/* Controles de Quantidade */}
                          <div className="flex items-center gap-3 mt-3">
                            <div className="flex items-center border rounded-lg">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="px-4 text-sm font-medium">
                                {item.quantity}
                              </span>
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

                        {/* Subtotal */}
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {(item.price * item.quantity).toFixed(2)}€
                          </p>
                        </div>
                      </div>
                      {cart.indexOf(item) < cart.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Resumo do Pedido */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Resumo do Pedido</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{total.toFixed(2)}€</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-primary">{total.toFixed(2)}€</span>
                  </div>
                </div>

                <Button 
                  className="w-full mt-6" 
                  size="lg"
                  onClick={() => navigate('/checkout')}
                >
                  Finalizar Pedido
                </Button>
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