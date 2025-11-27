import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { MapPin, BadgeCheck, Heart, MessageCircle } from "lucide-react";
import { toast } from "sonner";

// Patch TS pour Supabase sans types générés
type AnySupabase = any;
const supa = supabase as AnySupabase;

type Category = {
  id: string;
  name: string;
};

type Seller = {
  id: string;
  full_name: string;
  is_verified_pro: boolean;
  account_type: string;
  phone_number: string | null;
  city: string | null;
};

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  photo_urls: string[] | null;
  location_city: string;
  condition: string;
  created_at: string;
  seller_id: string;
  category_id: string;
  category?: Category | null;
  seller?: Seller | null;
};

const ProductDetail = () => {
  const params = useParams();
  const id = params.id as string | undefined;
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      toast.error("Produit introuvable");
      navigate("/home");
      return;
    }
    loadProduct(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProduct = async (productId: string) => {
    setLoading(true);

    // 1) Récup produit
    const { data: productRow, error: productError } = await supa
      .from("products")
      .select(
        `
        id,
        title,
        description,
        price,
        currency,
        photo_urls,
        location_city,
        condition,
        created_at,
        seller_id,
        category_id
      `
      )
      .eq("id", productId)
      .maybeSingle();

    if (productError || !productRow) {
      console.error("Erreur produit :", productError);
      toast.error("Produit introuvable");
      navigate("/home");
      setLoading(false);
      return;
    }

    // 2) Récup catégorie + vendeur
    const [{ data: category }, { data: seller }] = await Promise.all([
      supa
        .from("categories")
        .select("id, name")
        .eq("id", productRow.category_id)
        .maybeSingle(),
      supa
        .from("profiles")
        .select(
          `
          id,
          full_name,
          is_verified_pro,
          account_type,
          phone_number,
          city
        `
        )
        .eq("id", productRow.seller_id)
        .maybeSingle(),
    ]);

    const fullProduct: Product = {
      ...productRow,
      photo_urls: productRow.photo_urls ?? [],
      category: category ?? null,
      seller: seller ?? null,
    };

    setProduct(fullProduct);
    setLoading(false);
  };

  // Normalisation simple numéro WhatsApp (RDC par défaut)
  const normalizePhoneForWhatsApp = (raw?: string | null) => {
    if (!raw) return null;

    let phone = raw.replace(/[^0-9+]/g, "");

    if (phone.startsWith("+")) {
      phone = phone.slice(1);
    } else if (phone.startsWith("0")) {
      phone = "243" + phone.slice(1);
    } else if (!phone.startsWith("243")) {
      phone = "243" + phone;
    }

    return phone;
  };

  // Bouton WhatsApp
  const handleContactWhatsApp = () => {
    if (!product || !product.seller) {
      toast.error("Informations vendeur indisponibles");
      return;
    }

    const normalized = normalizePhoneForWhatsApp(product.seller.phone_number);
    if (!normalized) {
      toast.error("Le vendeur n'a pas renseigné de numéro WhatsApp");
      return;
    }

    const message = `Bonjour, je suis intéressé(e) par votre annonce "${product.title}" sur Teka Somba.`;
    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(
      message
    )}`;

    window.open(url, "_blank");
  };

  // Bouton "Contacter le vendeur" (future messagerie interne)
  const handleContactInternal = () => {
    toast.info("Messagerie interne à venir (prochaine étape 😉)");
    // plus tard : navigate(`/conversation/${product?.seller_id}`)
  };

  // Bouton "Voir profil"
  const handleViewProfile = () => {
    if (!product?.seller_id) return;
    navigate(`/profile/${product.seller_id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Chargement du produit...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Produit introuvable.</p>
        </div>
      </div>
    );
  }

  const hasPhotos = product.photo_urls && product.photo_urls.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          ← Retour
        </Button>

        <div className="mt-4 grid gap-8 lg:grid-cols-2">
          {/* Zone images */}
          <div className="space-y-3">
            {hasPhotos ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {product.photo_urls!.map((url, index) => (
                    <CarouselItem key={index}>
                      <div className="aspect-square w-full overflow-hidden rounded-lg border bg-muted">
                        <img
                          src={url}
                          alt={`${product.title} - photo ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            ) : (
              <div className="aspect-square w-full rounded-lg border bg-muted flex items-center justify-center text-muted-foreground">
                Pas de photo
              </div>
            )}
          </div>

          {/* Zone infos produit + vendeur */}
          <div className="space-y-4">
            {/* Infos produit */}
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">{product.title}</h1>

              <p className="text-3xl font-bold text-amber-600">
                {product.price} {product.currency}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{product.location_city}</span>
                {product.category && (
                  <>
                    <span>•</span>
                    <span>{product.category.name}</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{product.condition}</Badge>
                <Badge variant="secondary">
                  Publié le{" "}
                  {new Date(product.created_at).toLocaleDateString("fr-FR")}
                </Badge>
              </div>
            </div>

            {/* Bloc vendeur style maquette */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Vendeur</CardTitle>
                {product.seller && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewProfile}
                  >
                    Voir profil
                  </Button>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Nom du vendeur */}
                {product.seller ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {product.seller.full_name}
                    </span>
                    {product.seller.is_verified_pro && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <BadgeCheck className="w-3 h-3" />
                        Pro vérifié
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Vendeur particulier
                  </p>
                )}

                {/* Bouton "Contacter le vendeur" */}
                <Button
                  className="w-full h-11 text-base flex items-center justify-center gap-2"
                  onClick={handleContactInternal}
                >
                  <MessageCircle className="w-4 h-4" />
                  Contacter le vendeur
                </Button>

                {/* Bouton WhatsApp vert */}
                <Button
                  className="w-full h-11 text-base flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleContactWhatsApp}
                >
                  <MessageCircle className="w-4 h-4" />
                  Contacter via WhatsApp
                </Button>

                {/* Ajout favoris */}
                <button
                  type="button"
                  className="mt-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    toast.info("Fonction favoris à venir (prochaine étape)")
                  }
                >
                  <Heart className="w-4 h-4" />
                  <span>Ajouter aux favoris</span>
                </button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Description */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">
              {product.description}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductDetail;
