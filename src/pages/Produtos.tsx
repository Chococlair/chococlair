import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { getCart, getCartItemsCount } from "@/lib/cart";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  base_price: number;
  description: string | null;
  image_url: string | null;
}

const Produtos = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    loadProducts();
    setCartCount(getCartItemsCount(getCart()));
    
    const handleCartUpdate = () => {
      setCartCount(getCartItemsCount(getCart()));
    };
    
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const loadProducts = async () => {
    try {
      // @ts-ignore - Tipos do Supabase serão gerados automaticamente
      const { data, error } = await supabase
        // @ts-ignore
        .from('products')
        .select('*')
        .eq('available', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const getProductsByCategory = (category: string) => {
    return products.filter(p => p.category === category);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header cartItemsCount={cartCount} />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
            Os Nossos Produtos
          </h1>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Descubra a nossa seleção de doces artesanais premium, 
            feitos com ingredientes de qualidade superior
          </p>

          {loading ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">A carregar produtos...</p>
            </div>
          ) : (
            <Tabs defaultValue="todos" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-4 mb-8">
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="eclair">Éclairs</TabsTrigger>
                <TabsTrigger value="chocotone">Chocotones</TabsTrigger>
                <TabsTrigger value="rocambole">Rocamboles</TabsTrigger>
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
                      image={product.image_url || undefined}
                      description={product.description || undefined}
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
                      image={product.image_url || undefined}
                      description={product.description || undefined}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="chocotone" className="mt-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {getProductsByCategory('chocotone').map(product => (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      category={product.category}
                      price={Number(product.base_price)}
                      image={product.image_url || undefined}
                      description={product.description || undefined}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="rocambole" className="mt-8">
                <div className="mb-6 p-4 bg-secondary/10 rounded-lg">
                  <p className="text-sm text-foreground/80">
                    <strong>Nota:</strong> Pode escolher entre massa de chocolate ou massa branca
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {getProductsByCategory('rocambole').map(product => (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      category={product.category}
                      price={Number(product.base_price)}
                      image={product.image_url || undefined}
                      description={product.description || undefined}
                    />
                  ))}
                </div>
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