import {
  useState,
  useEffect,
  FormEvent,
  ChangeEvent,
} from "react";
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

interface ProductFormData {
  title: string;
  description: string;
  price: string;
  currency: "CDF" | "USD";
  condition: "neuf" | "comme neuf" | "bon état" | "à retaper";
  location_city: string;
  category_id: string;
}

const NewProduct = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState<ProductFormData>({
    title: "",
    description: "",
    price: "",
    currency: "CDF",
    condition: "bon état",
    location_city: "",
    category_id: "",
  });

  // État pour les photos
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const currentSession = data.session;
      setSession(currentSession);
      if (!currentSession) {
        toast.error("Vous devez être connecté pour poster une annonce");
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        navigate("/auth");
      }
    });

    loadCategories();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Erreur chargement catégories :", error);
      toast.error("Impossible de charger les catégories");
      return;
    }

    setCategories(data || []);
  };

  // Upload des photos vers Supabase Storage
  const uploadPhotos = async (files: File[]) => {
    if (!files || files.length === 0) {
      console.log("uploadPhotos: aucun fichier reçu");
      return [];
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      console.log(
        "uploadPhotos: start upload",
        file.name,
        file.size,
        file.type
      );

      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;
      const filePath = `products/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from("product-photos")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Erreur upload photo :", uploadError);
        toast.error("Upload photo impossible : " + uploadError.message);
        continue;
      }

      console.log("uploadPhotos: upload OK, filePath =", filePath, "data =", data);

      const { data: publicData } = supabase.storage
        .from("product-photos")
        .getPublicUrl(filePath);

      console.log("uploadPhotos: public URL =", publicData);

      if (publicData?.publicUrl) {
        uploadedUrls.push(publicData.publicUrl);
      }
    }

    console.log("uploadPhotos: uploadedUrls =", uploadedUrls);
    return uploadedUrls;
  };

  // Submit du formulaire
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!session) {
      toast.error("Vous devez être connecté");
      return;
    }

    setLoading(true);

    try {
      console.log(
        "handleSubmit: nb de photos à uploader =",
        photoFiles.length,
        photoFiles
      );

      // Validation des champs texte
      const validatedData = productSchema.parse({
        ...formData,
        price: parseFloat(formData.price),
      });

      // Upload des photos via la fonction uploadPhotos
      const photoUrls = await uploadPhotos(photoFiles);

      console.log("handleSubmit: photoUrls retournées =", photoUrls);

      // Insertion de l’annonce avec les URLs des photos
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
          photo_urls: photoUrls,
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
        console.error(error);
        toast.error(error.message || "Erreur lors de la publication");
      }
    } finally {
      setLoading(false);
    }
  };

  // Gestion des fichiers sélectionnés
  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []); // File[]

    console.log("handlePhotoChange: fichiers sélectionnés =", files.length, files);

    // On limite à 4 photos max
    const newFiles = [...photoFiles, ...files].slice(0, 4);
    setPhotoFiles(newFiles);

    const newPreviews = [
      ...photoPreviews,
      ...files.map((file) => URL.createObjectURL(file)),
    ].slice(0, 4);
    setPhotoPreviews(newPreviews);
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
                <Label htmlFor="title">Titre de l&apos;annonce *</Label>
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
                  onValueChange={(
                    value: ProductFormData["condition"]
                  ) =>
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

              {/* Photos du produit */}
              <div className="space-y-2">
                <Label htmlFor="photos">Photos du produit</Label>

                <Input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                />

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
