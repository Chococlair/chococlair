import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, ShoppingCart, Minus, Plus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCart, getCartItemsCount, addToCart, type CartItem, isNatalCategory } from "@/lib/cart";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Product {
  id: string;
  name: string;
  category: string;
  category_id: string;
  base_price: number;
  description: string | null;
  image_url: string | null;
  product_categories: {
    id: string;
    name: string;
    slug: string;
    is_natal: boolean;
  } | null;
}

type BoxSizeOption = "2" | "3" | "6";
type MassType = "chocolate" | "branca";

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatCategoryLabel = (slug: string) =>
  slug
    .split("_")
    .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join(" ");

const Produto = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [allEclairs, setAllEclairs] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [boxSize, setBoxSize] = useState<BoxSizeOption>("2");
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [massType, setMassType] = useState<MassType>("chocolate");
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [availableToday, setAvailableToday] = useState<boolean | null>(null);
  const [isNatalProduct, setIsNatalProduct] = useState(false);

  const loadAllEclairs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from<Product>('products')
        .select('*')
        .eq('category', 'eclair')
        .eq('available', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setAllEclairs(data ?? []);
    } catch (error: unknown) {
      console.error('Erro ao carregar éclairs:', error);
    }
  }, []);

  const loadProduct = useCallback(
    async (productId: string) => {
      try {
        const { data, error } = await supabase
          .from<Product>('products')
          .select(
            'id, name, category, category_id, base_price, description, image_url, product_categories ( id, name, slug, is_natal )',
          )
          .eq('id', productId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          toast.error('Produto não encontrado');
          navigate('/produtos');
          return;
        }
        setProduct(data);
        const natalFlag = data.product_categories?.is_natal ?? isNatalCategory(data.category);
        setIsNatalProduct(Boolean(natalFlag));

        const today = getTodayDateString();
        const { data: availabilityData, error: availabilityError } = await supabase
          .from('daily_product_availability')
          .select('product_id')
          .eq('product_id', productId)
          .eq('available_date', today)
          .eq('is_active', true)
          .maybeSingle();

        if (availabilityError && availabilityError.code !== 'PGRST116') {
          throw availabilityError;
        }

        setAvailableToday(Boolean(availabilityData));

        // Se for éclair, carregar todos os éclairs disponíveis
        if (data.category === 'eclair') {
          await loadAllEclairs();
        }
      } catch (error: unknown) {
        console.error('Erro ao carregar produto:', error);
        toast.error('Erro ao carregar produto');
        navigate('/produtos');
      } finally {
        setLoading(false);
      }
    },
    [loadAllEclairs, navigate],
  );

  useEffect(() => {
    if (id) {
      void loadProduct(id);
    }
    setCartCount(getCartItemsCount(getCart()));
    
    const handleCartUpdate = () => {
      setCartCount(getCartItemsCount(getCart()));
    };
    
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, [id, loadProduct]);

  // Quando o tamanho da caixa muda, resetar sabores selecionados
  useEffect(() => {
    if (product?.category === 'eclair') {
      setSelectedFlavors([]);
    }
  }, [boxSize, product?.category]);

  const handleFlavorAdd = (flavorId: string) => {
    const size = Number(boxSize);
    if (selectedFlavors.length < size) {
      setSelectedFlavors([...selectedFlavors, flavorId]);
    } else {
      toast.error(`Selecione apenas ${size} sabores para uma caixa de ${size} unidades`);
    }
  };

  const handleFlavorRemove = (flavorId: string) => {
    const lastIndex = selectedFlavors.lastIndexOf(flavorId);
    if (lastIndex > -1) {
      const newFlavors = [...selectedFlavors];
      newFlavors.splice(lastIndex, 1);
      setSelectedFlavors(newFlavors);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    const currentCart = getCart();
    const cartHasItems = currentCart.length > 0;
    const cartHasNatal = currentCart.some((item) => item.isNatal ?? isNatalCategory(item.category));
    const cartOnlyNatal = currentCart.length > 0
      ? currentCart.every((item) => item.isNatal ?? isNatalCategory(item.category))
      : false;

    if (isNatalProduct) {
      if (cartHasItems && !cartOnlyNatal) {
        toast.error('Para encomendas de Natal, finalize ou limpe o carrinho atual antes de adicionar este produto.');
        return;
      }
    } else if (cartHasNatal) {
      toast.error('O carrinho contém produtos de Natal. Conclua ou limpe a encomenda antes de adicionar outros produtos.');
      return;
    }

    if (availableToday === false && !isNatalProduct) {
      toast.error('Este produto não está disponível para pedidos hoje.');
      return;
    }

    let finalPrice = Number(product.base_price);
    let finalQuantity = quantity;
    const options: CartItem["options"] = {};
    const isRocamboleCategory = product.category === 'rocamboles' || product.category === 'rocambole';

    // Para éclairs, validar sabores selecionados
    if (product.category === 'eclair') {
      const size = Number(boxSize);
      
      if (selectedFlavors.length !== size) {
        toast.error(`Por favor, selecione exatamente ${size} sabores para a caixa de ${size} unidades`);
        return;
      }

      finalPrice = Number(product.base_price) * size;
      finalQuantity = quantity; // Quantidade de caixas
      options.boxSize = size;
      options.flavors = [...selectedFlavors];
    }

    // Para rocamboles, adicionar tipo de massa
    if (isRocamboleCategory) {
      options.massType = massType;
    }

    // Para éclairs, usar um nome genérico
    const itemName = product.category === 'eclair' 
      ? `Caixa de Éclairs (${parseInt(boxSize)} unidades)`
      : product.name;

    // Para éclairs, usar o primeiro sabor como productId (para compatibilidade com backend)
    // Os sabores selecionados estarão nas options
    addToCart({
      productId: product.category === 'eclair' ? selectedFlavors[0] : product.id,
      name: itemName,
      price: finalPrice,
      quantity: finalQuantity,
      category: product.category,
      isNatal: isNatalProduct,
      options,
      image: product.image_url || undefined
    });

    // Abrir dialog ao invés de apenas mostrar toast
    setShowCartDialog(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header cartItemsCount={cartCount} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-foreground">A carregar produto...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const displayPrice = product.category === 'eclair' 
    ? Number(product.base_price) * Number(boxSize)
    : Number(product.base_price);
  const categoryDisplay = product.product_categories?.name ?? formatCategoryLabel(product.category);
  const isRocamboleCategory = product.category === 'rocamboles' || product.category === 'rocambole';

  const isAvailableToday = isNatalProduct ? true : availableToday !== false;

  const canAddToCart = product.category === 'eclair'
    ? isAvailableToday && selectedFlavors.length === Number(boxSize)
    : isAvailableToday;

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
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge className="w-fit">
                  {categoryDisplay}
                </Badge>
                {(isNatalProduct || availableToday !== null) && (
                  <Badge
                    variant="outline"
                    className={
                      isAvailableToday
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/40"
                        : "bg-muted text-foreground/60 border-muted-foreground/20"
                    }
                  >
                    {isNatalProduct ? "Encomenda Natal" : isAvailableToday ? "Disponível hoje" : "Indisponível hoje"}
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
              {isNatalProduct ? (
                <p className="text-sm text-primary font-medium mb-4">
                  Encomenda exclusiva de Natal. Entregas e recolhas disponíveis apenas no dia 24/12 das 09:00h às 16:30h.
                </p>
              ) : availableToday === false ? (
                <p className="text-sm text-destructive font-medium mb-4">
                  Este produto não está disponível para pedidos hoje. Veja o menu diário ou escolha outra opção.
                </p>
              ) : null}
              
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
                <>
                  <div className="mb-6">
                    <Label className="text-base mb-3 block">Tamanho da Caixa</Label>
                    <RadioGroup value={boxSize} onValueChange={(value) => setBoxSize(value as BoxSizeOption)}>
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

                  <div className="mb-6">
                    <Label className="text-base mb-3 block">
                      Escolha os Sabores ({selectedFlavors.length}/{boxSize} selecionados)
                    </Label>
                    <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                      {allEclairs.length === 0 ? (
                        <p className="text-sm text-foreground/70">A carregar sabores...</p>
                      ) : (
                        allEclairs.map((eclair) => {
                          // Contar quantas vezes este sabor está selecionado
                          const count = selectedFlavors.filter(id => id === eclair.id).length;
                          const canAdd = selectedFlavors.length < Number(boxSize);
                          
                          return (
                            <div key={eclair.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                              <Label className="flex-1 cursor-pointer">
                                {eclair.name}
                              </Label>
                              <div className="flex items-center gap-2">
                                {count > 0 && (
                                  <span className="text-sm font-semibold text-primary min-w-[2rem] text-center">
                                    {count}
                                  </span>
                                )}
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleFlavorRemove(eclair.id)}
                                    disabled={count === 0}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleFlavorAdd(eclair.id)}
                                    disabled={!canAdd}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {selectedFlavors.length > 0 && (
                      <p className="text-sm text-foreground/70 mt-2">
                        Sabores selecionados: {selectedFlavors.length} de {boxSize}
                      </p>
                    )}
                  </div>
                </>
              )}

              {isRocamboleCategory && (
                <div className="mb-6">
                  <Label className="text-base mb-3 block">Tipo de Massa</Label>
                  <RadioGroup value={massType} onValueChange={(value) => setMassType(value as MassType)}>
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
                disabled={!canAddToCart}
              >
                <ShoppingCart className="h-5 w-5" />
                {isAvailableToday
                  ? product.category === 'eclair' && selectedFlavors.length !== Number(boxSize)
                    ? `Selecione ${Number(boxSize) - selectedFlavors.length} sabores restantes`
                    : 'Adicionar ao Carrinho'
                  : 'Indisponível hoje'}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Dialog de Confirmação ao Adicionar ao Carrinho */}
      <Dialog open={showCartDialog} onOpenChange={setShowCartDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-xl">Produto Adicionado!</DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2 text-foreground">
              O produto foi adicionado ao seu carrinho com sucesso.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowCartDialog(false);
                navigate('/produtos');
              }}
              className="w-full sm:w-auto"
            >
              Continuar Comprando
            </Button>
            <Button
              onClick={() => {
                setShowCartDialog(false);
                navigate('/carrinho');
              }}
              className="w-full sm:w-auto gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Ir para o Carrinho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Produto;