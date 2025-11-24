import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";

interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  photo_urls: string[];
  location_city: string;
  seller: {
    full_name: string;
    is_verified_pro: boolean;
  };
}

const Favorites = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        toast.error("Vous devez être connecté");
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) {
      loadFavorites();
    }
  }, [session]);

  const loadFavorites = async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from("favorites")
      .select(`
        product:products(
          *,
          seller:profiles(full_name, is_verified_pro)
        )
      `)
      .eq("user_id", session.user.id);

    if (error) {
      toast.error("Erreur lors du chargement des favoris");
      setLoading(false);
      return;
    }

    const formattedProducts = data
      .filter((fav: any) => fav.product)
      .map((fav: any) => fav.product);

    setProducts(formattedProducts);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-8">Mes favoris</h1>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Vous n'avez pas encore de favoris
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                price={product.price}
                currency={product.currency}
                photo_url={product.photo_urls[0]}
                location_city={product.location_city}
                seller_name={product.seller?.full_name || "Vendeur"}
                is_verified_pro={product.seller?.is_verified_pro || false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
