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

interface ProductView extends Product {
  discountedPrice?: number;
  appliedPromotion?: ReturnType<typeof getBestPromotionForProduct>["appliedPromotion"];
  availableToday: boolean;
  isNatal?: boolean;
  categoryName: string;
  natalSectionKey?: string | null;
}

const formatCategoryLabel = (slug: string) =>
  slug
    .split("_")
    .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join(" ");

const NATAL_SECTION_CONFIG: Record<
  string,
  {
    title: string;
    description?: string;
  }
> = {
  chocotones: {
    title: "Chocotones",
    description: "Clássicos natalícios recheados com sabores irresistíveis.",
  },
  tortas_chococlair: {
    title: "Tortas Chococlair",
    description: "Tortas especiais feitas por encomenda para a ceia.",
  },
  rocamboles: {
    title: "Rocamboles",
    description: "Rocamboles artesanais para adoçar o Natal.",
  },
  trutas: {
    title: "Trutas Doces",
    description: "Trutas tradicionais com recheio generoso.",
  },
  natal_doces: {
    title: "Doces de Natal",
    description: "Clássicos natalícios preparados com carinho.",
  },
  natal_tabuleiros: {
    title: "Tabuleiros de Natal",
    description: "Pratos pensados para partilhar em família.",
  },
};

const NATAL_SECTION_ORDER = ["chocotones", "tortas_chococlair", "trutas", "rocamboles", "natal_doces", "natal_tabuleiros"];

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
          .select(
            'id, name, category, category_id, base_price, description, image_url, product_categories ( id, name, slug, is_natal )',
          )
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
        const categoryInfo = product.product_categories;
        const categoryName = categoryInfo?.name ?? formatCategoryLabel(product.category);
        const isNatal = Boolean(categoryInfo?.is_natal);
        const natalSectionKey = isNatal ? product.category : null;
        return {
          ...product,
          discountedPrice: discountedUnitPrice,
          appliedPromotion,
          availableToday: isNatal || availabilitySet.has(product.id),
          isNatal,
          categoryName,
          natalSectionKey,
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
    const groups: Record<string, { title: string; description?: string; products: ProductView[] }> = {};
    products.forEach((product) => {
      if (!product.isNatal) return;
      const slug = product.natalSectionKey ?? product.category;
      const config = NATAL_SECTION_CONFIG[slug];
      const title = config?.title ?? product.categoryName ?? formatCategoryLabel(slug);
      const description = config?.description;
      if (!groups[slug]) {
        groups[slug] = { title, description, products: [] };
      }
      groups[slug].products.push(product);
    });
    return groups;
  }, [products]);

  const orderedNatalSections = useMemo(() => {
    const keys = Object.keys(natalGroups);
    if (keys.length === 0) return [];
    const orderedKeys = NATAL_SECTION_ORDER.filter((slug) => keys.includes(slug));
    const remainingKeys = keys
      .filter((slug) => !NATAL_SECTION_ORDER.includes(slug))
      .sort((a, b) =>
        (natalGroups[a]?.title ?? formatCategoryLabel(a)).localeCompare(
          natalGroups[b]?.title ?? formatCategoryLabel(b),
          'pt-PT',
        ),
      );
    return [...orderedKeys, ...remainingKeys].map((key) => ({
      key,
      ...natalGroups[key],
    }));
  }, [natalGroups]);

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
                    categoryLabel={product.categoryName}
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
                      categoryLabel={product.categoryName}
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
                {orderedNatalSections.length === 0 ? (
                  <div className="text-center py-10 text-foreground/70">
                    Nenhum produto de Natal disponível no momento.
                  </div>
                ) : (
                  orderedNatalSections.map((section) => (
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
                        {section.products.map((product) => (
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
                            categoryLabel={product.categoryName}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
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