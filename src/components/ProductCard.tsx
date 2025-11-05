import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ShoppingCart } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  description?: string;
}

export const ProductCard = ({ id, name, category, price, image, description }: ProductCardProps) => {
  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      eclair: "Éclair",
      chocotone: "Chocotone",
      rocambole: "Rocambole"
    };
    return labels[cat] || cat;
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      eclair: "bg-primary",
      chocotone: "bg-accent",
      rocambole: "bg-secondary"
    };
    return colors[cat] || "bg-muted";
  };

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
      <Link to={`/produto/${id}`}>
        <div className="aspect-square overflow-hidden bg-muted">
          {image ? (
            <img 
              src={image} 
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl">🍰</span>
            </div>
          )}
        </div>
      </Link>
      
      <CardContent className="p-4">
        <Badge className={`${getCategoryColor(category)} mb-2`}>
          {getCategoryLabel(category)}
        </Badge>
        <Link to={`/produto/${id}`}>
          <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
            {name}
          </h3>
        </Link>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div className="text-xl font-bold text-primary">
          {price.toFixed(2)}€
        </div>
        <Link to={`/produto/${id}`}>
          <Button size="sm" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Ver Detalhes
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};