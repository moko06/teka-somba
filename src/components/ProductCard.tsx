import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, BadgeCheck } from "lucide-react";

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  currency: string;
  photo_url?: string;
  location_city: string;
  seller_name: string;
  is_verified_pro: boolean;
}

export const ProductCard = ({
  id,
  title,
  price,
  currency,
  photo_url,
  location_city,
  seller_name,
  is_verified_pro,
}: ProductCardProps) => {
  return (
    <Link to={`/product/${id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div className="aspect-square bg-muted relative">
          {photo_url ? (
            <img
              src={photo_url}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Pas de photo
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
            {title}
          </h3>
          <p className="text-2xl font-bold text-primary mb-3">
            {price.toLocaleString()} {currency}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="w-4 h-4" />
            <span>{location_city}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{seller_name}</span>
            {is_verified_pro && (
              <Badge variant="secondary" className="gap-1">
                <BadgeCheck className="w-3 h-3" />
                Pro
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
