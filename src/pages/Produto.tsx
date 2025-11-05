import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, ShoppingCart, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCart, getCartItemsCount, addToCart } from "@/lib/cart";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  base_price: number;
  description: string | null;
  image_url: string | null;
}

const Produto = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [boxSize, setBoxSize] = useState<string>("2");
  const [massType, setMassType] = useState<string>("chocolate");

  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
    setCartCount(getCartItemsCount(getCart()));
    
    const handleCartUpdate = () => {
      setCartCount(getCartItemsCount(getCart()));
    };
    
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, [id]);

  const loadProduct = async (productId: string) => {
    try {
      // @ts-ignore - Tipos do Supabase serão gerados automaticamente
      const { data, error } = await supabase
        // @ts-ignore
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('Produto não encontrado');
        navigate('/produtos');
        return;
      }
      setProduct(data);
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      toast.error('Erro ao carregar produto');
      navigate('/produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    let finalPrice = Number(product.base_price);
    let finalQuantity = quantity;
    const options: any = {};

    // Para éclairs, calcular preço baseado no tamanho da caixa
    if (product.category === 'eclair') {
      const size = parseInt(boxSize);
      finalPrice = Number(product.base_price) * size;
      finalQuantity = quantity; // Quantidade de caixas
      options.boxSize = size;
    }

    // Para rocamboles, adicionar tipo de massa
    if (product.category === 'rocambole') {
      options.massType = massType;
    }

    addToCart({
      productId: product.id,
      name: product.name,
      price: finalPrice,
      quantity: finalQuantity,
      category: product.category,
      options,
      image: product.image_url || undefined
    });

    toast.success('Produto adicionado ao carrinho!');
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      eclair: "Éclair",
      chocotone: "Chocotone",
      rocambole: "Rocambole"
    };
    return labels[cat] || cat;
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header cartItemsCount={cartCount} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">A carregar produto...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const displayPrice = product.category === 'eclair' 
    ? Number(product.base_price) * parseInt(boxSize)
    : Number(product.base_price);

  return (
    <div className="flex flex-col min-h-screen">
      <Header cartItemsCount={cartCount} />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => navigate('/produtos')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Produtos
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Imagem do Produto */}
            <div className="aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-9xl">🍰</span>
              )}
            </div>

            {/* Detalhes do Produto */}
            <div className="flex flex-col">
              <Badge className="w-fit mb-4">
                {getCategoryLabel(product.category)}
              </Badge>
              
              <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
              
              {product.description && (
                <p className="text-lg text-foreground/80 mb-6">
                  {product.description}
                </p>
              )}

              <div className="text-3xl font-bold text-primary mb-8">
                {displayPrice.toFixed(2)}€
              </div>

              {/* Opções específicas por categoria */}
              {product.category === 'eclair' && (
                <div className="mb-6">
                  <Label className="text-base mb-3 block">Tamanho da Caixa</Label>
                  <RadioGroup value={boxSize} onValueChange={setBoxSize}>
                    <div className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value="2" id="box-2" />
                      <Label htmlFor="box-2" className="cursor-pointer">
                        Caixa com 2 unidades ({(Number(product.base_price) * 2).toFixed(2)}€)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value="3" id="box-3" />
                      <Label htmlFor="box-3" className="cursor-pointer">
                        Caixa com 3 unidades ({(Number(product.base_price) * 3).toFixed(2)}€)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="6" id="box-6" />
                      <Label htmlFor="box-6" className="cursor-pointer">
                        Caixa com 6 unidades ({(Number(product.base_price) * 6).toFixed(2)}€)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {product.category === 'rocambole' && (
                <div className="mb-6">
                  <Label className="text-base mb-3 block">Tipo de Massa</Label>
                  <RadioGroup value={massType} onValueChange={setMassType}>
                    <div className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value="chocolate" id="massa-chocolate" />
                      <Label htmlFor="massa-chocolate" className="cursor-pointer">
                        Massa de Chocolate
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="branca" id="massa-branca" />
                      <Label htmlFor="massa-branca" className="cursor-pointer">
                        Massa Branca
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Quantidade */}
              <div className="mb-8">
                <Label className="text-base mb-3 block">
                  Quantidade {product.category === 'eclair' && '(caixas)'}
                </Label>
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-xl font-semibold w-12 text-center">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Botão Adicionar ao Carrinho */}
              <Button 
                size="lg" 
                className="w-full gap-2 text-lg"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-5 w-5" />
                Adicionar ao Carrinho
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Produto;