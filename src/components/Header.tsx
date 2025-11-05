import { useState, useEffect } from "react";
import { ShoppingCart, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  cartItemsCount?: number;
}

export const Header = ({ cartItemsCount = 0 }: HeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  useEffect(() => {
    checkSession();
    
    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSession();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
  };

  const handleUserClick = () => {
    if (isLoggedIn) {
      navigate("/perfil");
    } else {
      navigate("/auth");
    }
  };
  
  if (isAdminRoute) return null;
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-baseline space-x-0">
            <span className="font-leckerli text-4xl text-primary leading-none">C</span>
            <span className="font-aoboshi text-3xl text-primary leading-none">hococlair</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/produtos" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Produtos
            </Link>
            <Link 
              to="/#sobre" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Sobre
            </Link>
            <Link 
              to="/#contacto" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Contacto
            </Link>
          </nav>

          {/* Cart and User */}
          <div className="flex items-center space-x-3">
            <Link to="/carrinho">
              <Button variant="outline" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItemsCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {cartItemsCount}
                  </Badge>
                )}
              </Button>
            </Link>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleUserClick}
              title={isLoggedIn ? "Meu Perfil" : "Fazer Login"}
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};