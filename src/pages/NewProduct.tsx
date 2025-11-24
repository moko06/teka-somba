import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { z } from "zod";

const productSchema = z.object({
  title: z
    .string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(200),
  description: z
    .string()
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(2000),
  price: z.number().positive("Le prix doit être positif"),
  location_city: z.string().min(2, "Veuillez sélectionner une ville"),
  category_id: z.string().uuid("Veuillez sélectionner une catégorie"),
});

interface Category {
  id: string;
  name: string;
}

const NewProduct = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    currency: "CDF" as "CDF" | "USD",
    condition: "bon état" as "neuf" | "comme neuf" | "bon état" | "à retaper",
    location_city: "",
    category_id: "",
  });

  // état pour les photos (on branchera l’UI juste après)
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        toast.error("Vous devez être connecté pour poster une annonce");
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

    loadCategories();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");

    setCategories(data || []);
  };
    const uploadPhotos = async (files: File[]) => {
    if (!files || files.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { data, error } = await supabase.storage
        .from("product-photos")
        .upload(fileName, file);

      if (error) {
        console.error("Erreur upload photo", error);
        toast.error("Une photo n’a pas pu être envoyée");
        continue;
      }

      const { data: publicData } = supabase.storage
        .from("product-photos")
        .getPublicUrl(data.path);

      if (publicData?.publicUrl) {
        uploadedUrls.push(publicData.publicUrl);
      }
    }

    return uploadedUrls;
  };

  // ✅ une seule fonction handleSubmit
  const handleSubmit = async (e: any) => {
  e.preventDefault();

  if (!session) {
    toast.error("Vous devez être connecté");
    return;
  }

  setLoading(true);

  try {
    // 1. Validation des champs texte
    const validatedData = productSchema.parse({
      ...formData,
      price: parseFloat(formData.price),
    });

    // 2. Upload des photos dans Supabase Storage
    //    (bucket à créer plus tard : "product-photos")
    let photoUrls: string[] = [];

    if (photoFiles.length > 0) {
      const uploadedUrls: string[] = [];

      for (const file of photoFiles) {
        const ext = file.name.split(".").pop();
        const fileName = `${session.user.id}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase
          .storage
          .from("product-photos")
          .upload(filePath, file);

        if (uploadError) {
          console.error(uploadError);
          toast.error("Impossible d'envoyer certaines photos. L'annonce sera publiée sans ces photos.");
          continue; // on passe au fichier suivant
        }

        const { data: publicData } = supabase
          .storage
          .from("product-photos")
          .getPublicUrl(filePath);

        if (publicData?.publicUrl) {
          uploadedUrls.push(publicData.publicUrl);
        }
      }

      photoUrls = uploadedUrls;
    }

    // 3. Insertion de l’annonce avec les URLs des photos
    const { data, error } = await supabase
      .from("products")
      .insert({
        title: validatedData.title,
        description: validatedData.description,
        price: validatedData.price,
        location_city: validatedData.location_city,
        category_id: validatedData.category_id,
        currency: formData.currency,
        condition: formData.condition,
        seller_id: session.user.id,
        photo_urls: photoUrls, // IMPORTANT : on enregistre les photos ici
      })
      .select()
      .single();

    if (error) throw error;

    toast.success("Annonce publiée avec succès !");
    navigate(`/product/${data.id}`);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      toast.error(error.errors[0].message);
    } else {
      toast.error(error.message || "Erreur lors de la publication");
    }
  } finally {
    setLoading(false);
  }
};


  // ✅ fonction séparée pour gérer les fichiers (sans toucher au submit)
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);

  // On ajoute les nouvelles photos à celles déjà choisies (max 4)
  setPhotoFiles((prev) => [...prev, ...files].slice(0, 4));

  setPhotoPreviews((prev) => [
    ...prev,
    ...files.map((file) => (window as any).URL.createObjectURL(file)),
  ].slice(0, 4));
};


  const cities = [
    "Kinshasa",
    "Lubumbashi",
    "Goma",
    "Bukavu",
    "Matadi",
    "Kisangani",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Poster une annonce</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Titre de l'annonce *</Label>
                <Input
                  id="title"
                  placeholder="Ex: iPhone 13 Pro en excellent état"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez votre produit en détail..."
                  required
                  rows={6}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Prix *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="0"
                    required
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Devise *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value: "CDF" | "USD") =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CDF">
                        CDF (Franc congolais)
                      </SelectItem>
                      <SelectItem value="USD">USD (Dollar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">État du produit *</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, condition: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neuf">Neuf</SelectItem>
                    <SelectItem value="comme neuf">Comme neuf</SelectItem>
                    <SelectItem value="bon état">Bon état</SelectItem>
                    <SelectItem value="à retaper">À retaper</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_city">Ville *</Label>
                <Select
                  value={formData.location_city}
                  onValueChange={(value) =>
                    setFormData({ ...formData, location_city: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une ville" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* on ajoutera ici plus tard l’input de photos + preview */}
              <div className="space-y-2">
  <Label htmlFor="photos">Photos du produit</Label>
  
  <Input
    id="photos"
    type="file"
    accept="image/*"
    multiple
    onChange={handlePhotoChange}
  />

  {/* Aperçu des photos */}
  <div className="grid grid-cols-3 gap-3 mt-3">
    {photoPreviews.map((src, index) => (
      <img
        key={index}
        src={src}
        alt={`preview-${index}`}
        className="w-full h-24 object-cover rounded-md border"
      />
    ))}
  </div>
</div>
      
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? "Publication..." : "Publier l'annonce"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewProduct;
