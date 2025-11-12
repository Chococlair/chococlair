import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { getCart, getCartItemsCount, validateCartProducts } from "@/lib/cart";
import { getActivePromotions, getBestPromotionForProduct, type PromotionRecord } from "@/lib/promotions";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  base_price: number;
  description: string | null;
  image_url: string | null;
}

interface ProductView extends Product {
  discountedPrice?: number;
  appliedPromotion?: ReturnType<typeof getBestPromotionForProduct>["appliedPromotion"];
  availableToday: boolean;
  isNatal?: boolean;
  natalSectionKey?: string | null;
}

interface NatalSection {
  key: string;
  title: string;
  description?: string;
  match: (product: Product) => boolean;
}

const NATAL_SECTIONS: NatalSection[] = [
  {
    key: "chocotones",
    title: "Chocotones",
    description: "Clássicos natalícios recheados com sabores irresistíveis.",
    match: (product) => product.name.toLowerCase().includes("chocotone"),
  },
  {
    key: "tortas",
    title: "Tortas Chococlair",
    description: "Tortas especiais feitas por encomenda para a ceia.",
    match: (product) => product.name.toLowerCase().includes("torta"),
  },
  {
    key: "rocamboles",
    title: "Rocamboles",
    description: "Rocamboles artesanais para adoçar o Natal.",
    match: (product) => product.name.toLowerCase().includes("rocambole"),
  },
  {
    key: "trutas",
    title: "Trutas Doces",
    description: "Trutas recheadas de batata doce, uma tradição natalícia.",
    match: (product) => product.name.toLowerCase().includes("truta"),
  },
  {
    key: "tabuleiros",
    title: "Tabuleiros Salgados",
    description: "Pratos prontos para partilhar na mesa de Natal.",
    match: (product) => product.name.toLowerCase().includes("tabuleiro"),
  },
];

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Produtos = () => {
  const [products, setProducts] = useState<ProductView[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  const loadProducts = useCallback(async () => {
    try {
      const today = getTodayDateString();
      const [
        { data: productsData, error: productsError },
        { data: promotionsData, error: promotionsError },
        { data: availabilityData, error: availabilityError },
      ] = await Promise.all([
        supabase
          .from<Product>('products')
          .select('*')
          .eq('available', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('promotions')
          .select(
            'id, title, description, discount_type, discount_value, applies_to_all, free_shipping, starts_at, ends_at, active, promotion_products ( product_id )',
          ),
        supabase
          .from('daily_product_availability')
          .select('product_id')
          .eq('available_date', today)
          .eq('is_active', true),
      ]);

      if (productsError) throw productsError;
      if (promotionsError) throw promotionsError;
      if (availabilityError) throw availabilityError;

      const activePromotions = getActivePromotions((promotionsData ?? []) as PromotionRecord[]);
      const availabilitySet = new Set((availabilityData ?? []).map(({ product_id }) => product_id));

      const enrichedProducts: ProductView[] = (productsData ?? []).map((product) => {
        const basePrice = Number(product.base_price);
        const { discountedUnitPrice, appliedPromotion } = getBestPromotionForProduct(
          product.id,
          basePrice,
          activePromotions,
          1,
        );
        const natalSection = NATAL_SECTIONS.find((section) => section.match(product)) || null;
        const isNatal = Boolean(natalSection);
        return {
          ...product,
          discountedPrice: discountedUnitPrice,
          appliedPromotion,
          availableToday: isNatal || availabilitySet.has(product.id),
          isNatal,
          natalSectionKey: natalSection?.key ?? null,
        };
      });

      setProducts(enrichedProducts);

      if (productsData && productsData.length > 0) {
        const productIds = productsData.map((p) => p.id);
        const availabilityIds = Array.from(availabilitySet);
        const validationResult = await validateCartProducts(productIds, availabilityIds);

        if (Array.isArray(validationResult)) {
          setCartCount(getCartItemsCount(validationResult));
        } else {
          const { validCart, removedItems } = validationResult;
          setCartCount(getCartItemsCount(validCart));
          if (removedItems.length > 0) {
            toast.warning(
              `${removedItems.length} produto(s) foram removidos do carrinho (indisponíveis para hoje ou incompatíveis com outros itens).`,
              { duration: 5000 },
            );
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
    setCartCount(getCartItemsCount(getCart()));
    
    const handleCartUpdate = () => {
      setCartCount(getCartItemsCount(getCart()));
    };
    
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, [loadProducts]);

  const getProductsByCategory = (category: string) => {
    return products.filter((p) => p.category === category);
  };

  const natalGroups = useMemo(() => {
    const groups: Record<string, ProductView[]> = {};
    NATAL_SECTIONS.forEach((section) => {
      groups[section.key] = [];
    });
    products.forEach((product) => {
      if (product.natalSectionKey) {
        if (!groups[product.natalSectionKey]) {
          groups[product.natalSectionKey] = [];
        }
        groups[product.natalSectionKey].push(product);
      }
    });
    return groups;
  }, [products]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header cartItemsCount={cartCount} />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
            Os Nossos Produtos
          </h1>
          <p className="text-center text-foreground/70 mb-12 max-w-2xl mx-auto">
            Descubra a nossa seleção de doces artesanais premium, 
            feitos com ingredientes de qualidade superior
          </p>

          {loading ? (
            <div className="text-center py-20">
              <p className="text-foreground">A carregar produtos...</p>
            </div>
          ) : (
            <Tabs defaultValue="todos" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="eclair">Éclairs</TabsTrigger>
                <TabsTrigger value="natal">Natal</TabsTrigger>
              </TabsList>

              <TabsContent value="todos" className="mt-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      category={product.category}
                      price={Number(product.base_price)}
                      discountedPrice={product.discountedPrice}
                      promotion={product.appliedPromotion || undefined}
                      image={product.image_url || undefined}
                      description={product.description || undefined}
                      availableToday={product.availableToday}
                      isNatal={product.isNatal}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="eclair" className="mt-8">
                <div className="mb-6 p-4 bg-primary/5 rounded-lg">
                  <p className="text-sm text-foreground/80">
                    <strong>Nota:</strong> Os éclairs são vendidos em caixas de 2, 3 ou 6 unidades. 
                    Preço por unidade: 3,50€
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {getProductsByCategory('eclair').map(product => (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      category={product.category}
                      price={Number(product.base_price)}
                      discountedPrice={product.discountedPrice}
                      promotion={product.appliedPromotion || undefined}
                      image={product.image_url || undefined}
                      description={product.description || undefined}
                      availableToday={product.availableToday}
                      isNatal={product.isNatal}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="natal" className="mt-8 space-y-10">
                {NATAL_SECTIONS.map((section) => {
                  const items = natalGroups[section.key] ?? [];
                  if (items.length === 0) return null;

                  return (
                    <div key={section.key} className="space-y-3">
                      <div>
                        <h3 className="text-2xl font-semibold text-foreground">
                          {section.title}
                        </h3>
                        {section.description && (
                          <p className="text-sm text-foreground/70">
                            {section.description}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {items.map((product) => (
                          <ProductCard
                            key={product.id}
                            id={product.id}
                            name={product.name}
                            category={product.category}
                            price={Number(product.base_price)}
                            discountedPrice={product.discountedPrice}
                            promotion={product.appliedPromotion || undefined}
                            image={product.image_url || undefined}
                            description={product.description || undefined}
                            availableToday={product.availableToday}
                            isNatal
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Produtos;