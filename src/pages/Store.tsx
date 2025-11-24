import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

const Store = () => {
  const { id } = useParams();
  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);

    // Récupération des infos du vendeur (profiles)
    const { data: sellerData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    setSeller(sellerData);

    // Récupération des produits du vendeur
    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", id);

    setProducts(productsData || []);
    setLoading(false);
  };

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!seller) {
    return <div className="p-6">Vendeur introuvable.</div>;
  }

  return (
    <div>
      <Navbar />

      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-4">
          {seller.shop_name || seller.full_name}
        </h1>

        <p className="text-muted-foreground mb-6 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> {seller.city || "Ville non renseignée"}
        </p>

        <h2 className="text-xl font-semibold mb-4">Produits en vente</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="cursor-pointer">
              <CardContent className="p-0">
                <img
                  src={product.photo_urls?.[0]}
                  alt={product.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="p-4">
                  <h3 className="font-semibold">{product.title}</h3>
                  <p className="text-primary font-bold text-lg">
                    {product.price} {product.currency}
                  </p>
                  <Badge variant="outline">{product.condition}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {products.length === 0 && (
          <p className="text-muted-foreground mt-4">
            Aucun produit disponible pour ce vendeur.
          </p>
        )}
      </div>
    </div>
  );
};

export default Store;
