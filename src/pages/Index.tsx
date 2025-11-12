import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Heart, Award, Clock, Phone, Gift, RefreshCcw } from "lucide-react";
import { getCart, getCartItemsCount } from "@/lib/cart";
import {
  getActivePromotions,
  getBestPromotionForProduct,
  hasFreeShippingPromotion,
  type PromotionRecord,
  type AppliedPromotion,
} from "@/lib/promotions";

interface DailyProduct {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  discountedPrice: number;
  appliedPromotion?: AppliedPromotion;
}

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  eclair: "Éclairs",
  chocotone: "Doces de Natal",
  rocambole: "Doces de Natal",
  natal_doces: "Doces de Natal",
  natal_tabuleiros: "Tabuleiros de Natal",
};

const Index = () => {
  const [cartCount, setCartCount] = useState(0);
  const [dailyProducts, setDailyProducts] = useState<DailyProduct[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [activePromotions, setActivePromotions] = useState<PromotionRecord[]>([]);
  const [freeShippingActive, setFreeShippingActive] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<DailyProduct[]>([]);

  const groupedDailyProducts = useMemo(() => {
    const groups: Record<string, DailyProduct[]> = {};
    dailyProducts.forEach((product) => {
      if (!groups[product.category]) {
        groups[product.category] = [];
      }
      groups[product.category].push(product);
    });
    return groups;
  }, [dailyProducts]);

  const highlightPromotion = useMemo(() => {
    if (!activePromotions.length) return undefined;

    const scorePromotion = (promotion: PromotionRecord) => {
      let score = 0;
      if (promotion.applies_to_all) score += 1000;
      if (promotion.free_shipping || promotion.discount_type === "free_shipping") score += 200;
      if (promotion.discount_type === "percentage" && promotion.discount_value !== null) score += promotion.discount_value;
      if (promotion.discount_type === "fixed" && promotion.discount_value !== null) score += promotion.discount_value * 10;
      return score;
    };

    const sorted = [...activePromotions].sort((a, b) => scorePromotion(b) - scorePromotion(a));
    return sorted[0];
  }, [activePromotions]);

  const loadFeaturedProducts = useCallback(
    async (promos: PromotionRecord[]) => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, category, base_price, description, image_url')
          .eq('available', true)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        const mapped: DailyProduct[] = (data ?? [])
          .filter(({ category }) => category !== 'natal_doces' && category !== 'natal_tabuleiros')
          .slice(0, 8)
          .map((product) => {
            const basePrice = Number(product.base_price);
            const { discountedUnitPrice, appliedPromotion } = getBestPromotionForProduct(
              product.id,
              basePrice,
              promos,
            );
            return {
              ...product,
              base_price: basePrice,
              discountedPrice: discountedUnitPrice,
              appliedPromotion,
            };
          });

        setFeaturedProducts(mapped);
      } catch (featuredError) {
        console.error("Erro ao carregar destaques:", featuredError);
        setFeaturedProducts([]);
      }
    },
    [],
  );

  const loadDailyMenu = useCallback(async () => {
    setLoadingMenu(true);
    setMenuError(null);

    try {
      const today = formatDateInput(new Date());

      const [{ data: availabilityData, error: availabilityError }, { data: promotionsData, error: promotionsError }] =
        await Promise.all([
          supabase
            .from('daily_product_availability')
            .select<{ product_id: string }[]>('product_id')
            .eq('available_date', today)
            .eq('is_active', true),
          supabase
            .from('promotions')
            .select('id, title, description, discount_type, discount_value, applies_to_all, free_shipping, starts_at, ends_at, active, promotion_products ( product_id )'),
        ]);

      if (availabilityError) throw availabilityError;
      if (promotionsError) throw promotionsError;

      const activePromos = getActivePromotions((promotionsData ?? []) as PromotionRecord[]);
      setActivePromotions(activePromos);

      const productIds = (availabilityData ?? []).map((item) => item.product_id);

      if (productIds.length === 0) {
        setDailyProducts([]);
        setFreeShippingActive(hasFreeShippingPromotion(activePromos));
        await loadFeaturedProducts(activePromos);
        setLoadingMenu(false);
        return;
      }

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, category, base_price, description, image_url')
        .in('id', productIds)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (productsError) throw productsError;

      const productsWithPromotions: DailyProduct[] = (productsData ?? []).map((product) => {
        const basePrice = Number(product.base_price);
        const { discountedUnitPrice, appliedPromotion } = getBestPromotionForProduct(
          product.id,
          basePrice,
          activePromos,
        );

        return {
          ...product,
          base_price: basePrice,
          discountedPrice: discountedUnitPrice,
          appliedPromotion,
        };
      });

      setDailyProducts(productsWithPromotions);
      setFreeShippingActive(hasFreeShippingPromotion(activePromos, productIds));
      await loadFeaturedProducts(activePromos);
    } catch (error) {
      console.error("Erro ao carregar menu do dia:", error);
      setMenuError("Não foi possível carregar os produtos disponíveis hoje. Tente novamente mais tarde.");
      setDailyProducts([]);
      setActivePromotions([]);
      setFreeShippingActive(false);
      await loadFeaturedProducts([]);
    } finally {
      setLoadingMenu(false);
    }
  }, [loadFeaturedProducts]);

  useEffect(() => {
    setCartCount(getCartItemsCount(getCart()));
    
    const handleCartUpdate = () => {
      setCartCount(getCartItemsCount(getCart()));
    };
    
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  useEffect(() => {
    loadDailyMenu();
  }, [loadDailyMenu]);

  const dailyProductCount = dailyProducts.length;

  const renderPromotionBadge = (promotion: AppliedPromotion | PromotionRecord) => {
    if (promotion.discount_type === "percentage" && promotion.discount_value !== null) {
      return `${promotion.discount_value}% OFF`;
    }
    if (promotion.discount_type === "fixed" && promotion.discount_value !== null) {
      return `- ${promotion.discount_value.toFixed(2)} €`;
    }
    return "Entrega grátis";
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header cartItemsCount={cartCount} />
      
      <main className="flex-1">
        {highlightPromotion && (
          <section className="py-12 bg-secondary/10">
            <div className="container mx-auto px-4">
              <div className="rounded-3xl bg-gradient-to-r from-primary/90 via-primary to-primary/80 text-primary-foreground p-8 md:p-12 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                  <div className="space-y-3">
                    <Badge variant="secondary" className="bg-white/20 text-primary-foreground">
                      Promoção em destaque
                    </Badge>
                    <h2 className="text-3xl md:text-4xl font-bold">{highlightPromotion.title}</h2>
                    {highlightPromotion.description && (
                      <p className="text-primary-foreground/90 text-lg max-w-2xl">
                        {highlightPromotion.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm font-semibold">
                      <span className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                        <Gift className="h-4 w-4" />
                        {renderPromotionBadge(highlightPromotion)}
                      </span>
                      {highlightPromotion.applies_to_all ? (
                        <span className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                          Disponível para todos os produtos
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                          Aproveite nos produtos selecionados de hoje
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 text-primary-foreground/90">
                    <a href="#menu-dia">
                      <Button variant="secondary" size="lg" className="gap-2">
                        Ver produtos com promoção
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </a>
                    <Link to="/produtos">
                      <Button variant="ghost" className="text-primary-foreground">
                        Explorar o catálogo completo
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section id="menu-dia" className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">Disponíveis hoje</h2>
                <p className="text-foreground/70">
                  Seleção fresca e limitada de {new Date().toLocaleDateString('pt-PT', { weekday: 'long' })}.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={loadDailyMenu} disabled={loadingMenu}>
                  <RefreshCcw className={`h-4 w-4 ${loadingMenu ? "animate-spin" : ""}`} />
                  {loadingMenu ? "A atualizar..." : "Atualizar"}
                </Button>
                {freeShippingActive && (
                  <Badge variant="outline" className="gap-2 text-primary">
                    <Gift className="h-4 w-4" />
                    Entrega grátis disponível hoje
                  </Badge>
                )}
              </div>
            </div>

            {loadingMenu ? (
              <div className="py-16 text-center text-foreground/70">A preparar o menu do dia...</div>
            ) : menuError ? (
              <div className="py-16 text-center space-y-4">
                <p className="text-foreground/70">{menuError}</p>
                <Button onClick={loadDailyMenu} className="gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            ) : dailyProducts.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <p className="text-foreground/70">
                  O menu de hoje ainda não foi publicado. Explore o nosso catálogo completo enquanto prepara o apetite!
                </p>
                <Link to="/produtos">
                  <Button>Ver todos os produtos</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-10">
                {Object.entries(groupedDailyProducts).map(([category, products]) => (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-semibold text-foreground">
                        {PRODUCT_CATEGORY_LABELS[category] ?? category}
                      </h3>
                      <span className="text-sm text-foreground/60">{products.length} opção(ões)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {products.map((product) => (
                        <ProductCard
                          key={product.id}
                          id={product.id}
                          name={product.name}
                          category={product.category}
                          price={product.base_price}
                          discountedPrice={product.discountedPrice}
                          promotion={product.appliedPromotion}
                          image={product.image_url ?? undefined}
                          description={product.description ?? undefined}
                          availableToday
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {featuredProducts.length > 0 && (
          <section className="py-16 bg-secondary/10">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
                <div>
                  <Badge variant="outline" className="mb-3 text-primary">
                    Destaques da semana
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                    Experimente os nossos favoritos
                  </h2>
                  <p className="text-foreground/70 max-w-2xl">
                    Uma seleção especial de doces e tabuleiros — faça já a sua encomenda ou descubra novos sabores para o grande dia.
                  </p>
                </div>
                <Link to="/produtos">
                  <Button variant="outline" size="lg" className="gap-2">
                    Ver catálogo completo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    category={product.category}
                    price={product.base_price}
                    discountedPrice={product.discountedPrice}
                    promotion={product.appliedPromotion}
                    image={product.image_url ?? undefined}
                    description={product.description ?? undefined}
                    availableToday={dailyProducts.some((item) => item.id === product.id)}
                    isNatal={product.category === 'natal_doces' || product.category === 'natal_tabuleiros'}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Features */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Feito com Amor</h3>
                <p className="text-foreground">
                  Cada produto é preparado artesanalmente com dedicação e carinho
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-accent" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Ingredientes Premium</h3>
                <p className="text-foreground">
                  Utilizamos apenas os melhores ingredientes para garantir qualidade máxima
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Sempre Frescos</h3>
                <p className="text-foreground">
                  Produtos preparados diariamente para garantir o máximo de frescura
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="sobre" className="py-16 bg-secondary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">Sobre a Chococlair</h2>
              <p className="text-lg text-foreground mb-6">
                A Chococlair nasceu da paixão pela confeitaria artesanal e pelo desejo de criar 
                experiências únicas através de sabores extraordinários.
              </p>
              <p className="text-lg text-foreground">
                Cada produto é cuidadosamente elaborado com ingredientes premium, 
                combinando técnicas tradicionais com criatividade moderna para surpreender 
                o seu paladar em cada mordida.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contacto" className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">Entre em Contacto</h2>
              <p className="text-lg text-foreground mb-8">
                Tem alguma dúvida ou quer fazer uma encomenda especial? 
                Estamos aqui para ajudar!
              </p>
              <div className="space-y-4">
                <a 
                  href="mailto:chococlairpt@gmail.com"
                  className="block text-lg text-primary hover:underline font-medium"
                >
                  chococlairpt@gmail.com
                </a>
                <a 
                  href="tel:+351931662784"
                  className="flex items-center justify-center gap-2 text-lg text-primary hover:underline font-medium"
                >
                  <Phone className="h-5 w-5" />
                  +351 931 662 784
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;