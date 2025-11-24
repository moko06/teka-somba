import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { MapPin, BadgeCheck, Heart, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  photo_urls: string[];
  location_city: string;
  condition: string;
  created_at: string;
  category: { name: string } | null;
  seller: {
    id: string;
    full_name: string;
    is_verified_pro: boolean;
    account_type: string;
    shop_name: string | null;
    phone_number: string | null;
  };
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
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
    loadProduct();
    if (session) {
      checkFavorite();
    }
  }, [id, session]);

  const loadProduct = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        category:categories(name),
        seller:profiles(*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Produit introuvable");
      navigate("/home");
      return;
    }

    setProduct(data as any);
    setLoading(false);
  };

  const checkFavorite = async () => {
    if (!session) return;

    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("product_id", id)
      .maybeSingle();

    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    if (!session) {
      toast.error("Connectez-vous pour ajouter aux favoris");
      navigate("/auth");
      return;
    }

    if (isFavorite) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", session.user.id)
        .eq("product_id", id);
      setIsFavorite(false);
      toast.success("Retiré des favoris");
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: session.user.id, product_id: id });
      setIsFavorite(true);
      toast.success("Ajouté aux favoris");
    }
  };

  const handleContact = async () => {
    if (!session) {
      toast.error("Connectez-vous pour contacter le vendeur");
      navigate("/auth");
      return;
    }

    if (session.user.id === product?.seller.id) {
      toast.error("Vous ne pouvez pas vous contacter vous-même");
      return;
    }

    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("product_id", id)
      .eq("buyer_id", session.user.id)
      .eq("seller_id", product?.seller.id)
      .maybeSingle();

    if (existingConv) {
      navigate(`/conversations/${existingConv.id}`);
      return;
    }

    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({
        product_id: id,
        buyer_id: session.user.id,
        seller_id: product?.seller.id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de la création de la conversation");
      return;
    }

    navigate(`/conversations/${newConv.id}`);
  };

  const handleWhatsAppContact = () => {
    if (!product?.seller.phone_number) return;
    
    const phoneNumber = product.seller.phone_number.replace(/[^\d+]/g, "");
    const message = encodeURIComponent(`Bonjour, je suis intéressé par ${product.title} sur Teka Somba.`);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
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

  if (!product) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            {product.photo_urls.length > 0 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {product.photo_urls.map((url, index) => (
                    <CarouselItem key={index}>
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                        <img
                          src={url}
                          alt={`${product.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </Carousel>
            ) : (
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Aucune photo</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{product.title}</h1>
              <div className="flex items-center gap-4 text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{product.location_city}</span>
                </div>
                {product.category && (
                  <Badge variant="outline">{product.category.name}</Badge>
                )}
                <Badge variant="outline">{product.condition}</Badge>
              </div>
              <p className="text-4xl font-bold text-primary">
                {product.price.toLocaleString()} {product.currency}
              </p>
            </div>

            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-2">Description</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-3">Vendeur</h2>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{product.seller.shop_name || product.seller.full_name}</p>
                      {product.seller.is_verified_pro && (
                        <Badge variant="secondary" className="gap-1">
                          <BadgeCheck className="w-3 h-3" />
                          Pro
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/profile/${product.seller.id}`)}
                  >
                    Voir profil
                  </Button>

                  {(product.seller.is_verified_pro || product.seller.account_type === "pro") && (
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/store/${product.seller.id}`)}
                    >
                      Voir la boutique
                    </Button>
                  )}


                </div>

                <div className="space-y-2">
                  <Button className="w-full gap-2" size="lg" onClick={handleContact}>
                    <MessageCircle className="w-5 h-5" />
                    Contacter le vendeur
                  </Button>
                  {product.seller.phone_number && (
                    <Button 
                      variant="secondary" 
                      className="w-full gap-2" 
                      size="lg" 
                      onClick={handleWhatsAppContact}
                    >
                      <MessageCircle className="w-5 h-5" />
                      Contacter via WhatsApp
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    size="lg"
                    onClick={toggleFavorite}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? "fill-current text-red-500" : ""}`} />
                    {isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
