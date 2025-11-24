import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  full_name: string;
  account_type: string;
  shop_name: string | null;
  bio: string | null;
  city: string | null;
  is_verified_pro: boolean;
}

interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  photo_urls: string[];
  location_city: string;
}

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadProfile();
    loadProducts();
  }, [id]);

  const loadProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Profil introuvable");
      navigate("/home");
      return;
    }

    setProfile(data);
    setLoading(false);
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    setProducts(data || []);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const isOwnProfile = session?.user.id === id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6">
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">
                    {profile.shop_name || profile.full_name}
                  </h1>
                  {profile.is_verified_pro && (
                    <Badge variant="secondary" className="gap-1">
                      <BadgeCheck className="w-4 h-4" />
                      Pro
                    </Badge>
                  )}
                </div>

                {profile.city && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.city}</span>
                  </div>
                )}

                {profile.bio && (
                  <p className="text-muted-foreground mb-4">{profile.bio}</p>
                )}

                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="font-semibold">{products.length}</span>
                    <span className="text-muted-foreground"> annonces</span>
                  </div>
                </div>
              </div>

              {isOwnProfile && (
                <Button variant="outline" onClick={() => navigate("/profile/edit")}>
                  Modifier le profil
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold mb-6">
          {isOwnProfile ? "Mes annonces" : "Annonces de ce vendeur"}
        </h2>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">Aucune annonce pour le moment</p>
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
                seller_name={profile.shop_name || profile.full_name}
                is_verified_pro={profile.is_verified_pro}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
