import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { toast } from "sonner";

// Patch Typescript pour Supabase
type AnySupabase = any;
const supa = supabase as AnySupabase;

interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  photo_urls: string[] | null;
  location_city: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const Home = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");

  // Charger les catégories au montage
  useEffect(() => {
    loadCategories();
  }, []);

  // Recharger les produits quand les filtres changent
  useEffect(() => {
    loadProducts();
  }, [selectedCategory, selectedCity, searchTerm]);

  const loadCategories = async () => {
    const { data, error } = await supa
      .from("categories")
      .select("id, name, slug")
      .order("name");

    if (error) {
      console.error("Erreur catégories :", error);
      toast.error("Erreur lors du chargement des catégories");
      return;
    }

    setCategories(data || []);
  };

  const loadProducts = async () => {
    setLoading(true);

    let query = supa
      .from("products")
      .select(
        `
        id,
        title,
        price,
        currency,
        photo_urls,
        location_city,
        is_active,
        created_at
      `
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (selectedCategory !== "all") {
      query = query.eq("category_id", selectedCategory);
    }

    if (selectedCity !== "all") {
      query = query.eq("location_city", selectedCity);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim();
      // recherche sur titre + description
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur produits :", error);
      toast.error("Erreur lors du chargement des produits");
      setLoading(false);
      return;
    }

    setProducts((data || []) as Product[]);
    setLoading(false);
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

      <div className="container mx-auto px-4 py-6">
        {/* Barre de recherche */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher un produit..."
              className="pl-10 h-12 text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtres */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Toutes catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Toutes villes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes villes</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Liste produits */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Chargement des produits...
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Aucun produit trouvé
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
                photo_url={product.photo_urls?.[0] ?? ""}
                location_city={product.location_city}
                seller_name={"Vendeur"}
                is_verified_pro={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
