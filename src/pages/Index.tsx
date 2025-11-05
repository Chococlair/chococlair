import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Award, Clock } from "lucide-react";
import { getCart, getCartItemsCount } from "@/lib/cart";

const Index = () => {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setCartCount(getCartItemsCount(getCart()));
    
    const handleCartUpdate = () => {
      setCartCount(getCartItemsCount(getCart()));
    };
    
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header cartItemsCount={cartCount} />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-background to-secondary/10 py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="mb-6">
                <span className="font-leckerli text-6xl md:text-8xl text-primary block">C</span>
                <span className="font-aoboshi text-5xl md:text-7xl text-primary">hococlair</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8">
                Confeitaria Artesanal Premium
              </p>
              <p className="text-lg text-foreground/80 mb-10 max-w-2xl mx-auto">
                Delicie-se com os nossos éclairs artesanais, chocotones recheados e rocamboles cremosos. 
                Cada criação é feita com ingredientes premium e muito amor.
              </p>
              <Link to="/produtos">
                <Button size="lg" className="gap-2 text-lg px-8 py-6">
                  Ver Produtos
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Feito com Amor</h3>
                <p className="text-muted-foreground">
                  Cada produto é preparado artesanalmente com dedicação e carinho
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-accent" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Ingredientes Premium</h3>
                <p className="text-muted-foreground">
                  Utilizamos apenas os melhores ingredientes para garantir qualidade máxima
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Sempre Frescos</h3>
                <p className="text-muted-foreground">
                  Produtos preparados diariamente para garantir o máximo de frescura
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Preview */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              As Nossas Especialidades
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div className="aspect-square bg-primary/5 flex items-center justify-center text-8xl">
                  🥖
                </div>
                <div className="p-6 bg-card">
                  <h3 className="text-2xl font-bold mb-2">Éclairs</h3>
                  <p className="text-muted-foreground mb-4">
                    Éclairs artesanais com recheios cremosos e sabores irresistíveis
                  </p>
                  <p className="text-primary font-semibold">A partir de 3,50€</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div className="aspect-square bg-accent/5 flex items-center justify-center text-8xl">
                  🎂
                </div>
                <div className="p-6 bg-card">
                  <h3 className="text-2xl font-bold mb-2">Chocotones</h3>
                  <p className="text-muted-foreground mb-4">
                    Chocotones recheados com sabores exclusivos e surpreendentes
                  </p>
                  <p className="text-accent font-semibold">25,00€</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div className="aspect-square bg-secondary/5 flex items-center justify-center text-8xl">
                  🍰
                </div>
                <div className="p-6 bg-card">
                  <h3 className="text-2xl font-bold mb-2">Rocamboles</h3>
                  <p className="text-muted-foreground mb-4">
                    Rocamboles macios com recheios cremosos de dar água na boca
                  </p>
                  <p className="text-secondary font-semibold">15,00€</p>
                </div>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link to="/produtos">
                <Button size="lg" variant="outline" className="gap-2">
                  Ver Todos os Produtos
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="sobre" className="py-16 bg-secondary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Sobre a Chococlair</h2>
              <p className="text-lg text-foreground/80 mb-6">
                A Chococlair nasceu da paixão pela confeitaria artesanal e pelo desejo de criar 
                experiências únicas através de sabores extraordinários.
              </p>
              <p className="text-lg text-foreground/80">
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
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Entre em Contacto</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Tem alguma dúvida ou quer fazer uma encomenda especial? 
                Estamos aqui para ajudar!
              </p>
              <div className="space-y-4">
                <a 
                  href="mailto:chococlairpt@gmail.com"
                  className="block text-lg text-primary hover:underline"
                >
                  chococlairpt@gmail.com
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