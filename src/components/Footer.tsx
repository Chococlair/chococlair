import { Mail, Phone, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sobre */}
          <div>
            <div className="flex items-center space-x-1 mb-4">
              <span className="font-leckerli text-3xl">C</span>
              <span className="font-aoboshi text-2xl">hococlair</span>
            </div>
            <p className="text-sm text-primary-foreground/80">
              Confeitaria artesanal premium, especializada em éclairs, chocotones e rocamboles com sabores exclusivos.
            </p>
          </div>

          {/* Links Rápidos */}
          <div>
            <h3 className="font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/produtos" className="hover:text-accent transition-colors">
                  Produtos
                </Link>
              </li>
              <li>
                <Link to="/#sobre" className="hover:text-accent transition-colors">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link to="/carrinho" className="hover:text-accent transition-colors">
                  Carrinho
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="font-semibold mb-4">Contacto</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:chococlairpt@gmail.com" className="hover:text-accent transition-colors">
                  chococlairpt@gmail.com
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>+351 XXX XXX XXX</span>
              </li>
              <li className="flex items-center space-x-2">
                <Instagram className="h-4 w-4" />
                <a href="#" className="hover:text-accent transition-colors">
                  @chococlair
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-primary-foreground/20 text-center text-sm text-primary-foreground/60">
          <p>&copy; {new Date().getFullYear()} Chococlair. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};