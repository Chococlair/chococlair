import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ShoppingCart } from "lucide-react";
import type { AppliedPromotion } from "@/lib/promotions";

interface ProductCardProps {
  id: string;
  name: string;
  category: string;
  categoryLabel?: string;
  price: number;
  image?: string;
  description?: string;
  discountedPrice?: number;
  promotion?: AppliedPromotion;
  availableToday?: boolean;
  isNatal?: boolean;
}

export const ProductCard = ({
  id,
  name,
  category,
  price,
  image,
  description,
  discountedPrice,
  promotion,
  availableToday,
  isNatal = false,
  categoryLabel,
}: ProductCardProps) => {
  const normalizeLabel = (slug: string) =>
    slug
      .split("_")
      .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1)))
      .join(" ");

  const categoryBadgeLabel = categoryLabel ?? normalizeLabel(category);

  const getCategoryClasses = (cat: string, natal: boolean) => {
    if (cat === "eclair") {
      return "bg-primary text-primary-foreground";
    }
    if (natal) {
      return "bg-rose-500/10 text-rose-700 border border-rose-500/20";
    }
    return "bg-muted text-foreground/80";
  };

  const hasDiscount = discountedPrice !== undefined && discountedPrice < price;
  const displayPrice = hasDiscount ? discountedPrice : price;

  const getPromotionBadgeLabel = (promotion: AppliedPromotion) => {
    if (promotion.discountType === "percentage" && promotion.discountValue !== null) {
      return `${promotion.discountValue}% OFF`;
    }
    if (promotion.discountType === "fixed" && promotion.discountValue !== null) {
      return `- ${promotion.discountValue.toFixed(2)} €`;
    }
    return "Entrega grátis";
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
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge className={getCategoryClasses(category, isNatal)}>
            {categoryBadgeLabel}
          </Badge>
          {promotion && (
            <Badge variant="outline" className="text-primary border-primary/40">
              {getPromotionBadgeLabel(promotion)}
            </Badge>
          )}
          {typeof availableToday === "boolean" && (
            <Badge
              variant="outline"
              className={availableToday ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/40" : "bg-muted text-foreground/60 border-muted-foreground/20"}
            >
              {isNatal
                ? "Encomenda Natal"
                : availableToday
                  ? "Disponível hoje"
                  : "Indisponível hoje"}
            </Badge>
          )}
        </div>
        <Link to={`/produto/${id}`}>
          <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
            {name}
          </h3>
        </Link>
        {description && (
          <p className="text-sm text-foreground/70 line-clamp-2">{description}</p>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div className="flex flex-col">
          {hasDiscount && (
            <span className="text-sm text-foreground/60 line-through">
              {price.toFixed(2)}€
            </span>
          )}
          <span className="text-xl font-bold text-primary">
            {displayPrice.toFixed(2)}€
          </span>
          {promotion?.freeShipping && (
            <span className="text-xs text-primary mt-1">Entrega grátis</span>
          )}
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