import { ShoppingCart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface HeaderProps {
  cartItemsCount?: number;
}

export const Header = ({ cartItemsCount = 0 }: HeaderProps) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  
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

          {/* Cart and Admin */}
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
            
            <Link to="/admin/login">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};