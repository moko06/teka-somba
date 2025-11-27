import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import { z } from "zod";
import type { Session, User } from "@supabase/supabase-js";

// Patch Typescript pour laisser passer insert/update sans types DB
type AnySupabase = any;
const supa = supabase as AnySupabase;

/*
  Ordre demandé :
  Rdc , Belgique , France , Allemagne , Suisse , Italie, Portugal,
  Luxembourg, Brésil , UK , Canada / USA , Chine , Turquie , Dubai ,
  Afrique du Sud , Angola , Zambie
*/
const COUNTRY_PREFIXES = [
  { code: "+243", label: "🇨🇩 RDC (+243)" },
  { code: "+32", label: "🇧🇪 Belgique (+32)" },
  { code: "+33", label: "🇫🇷 France (+33)" },
  { code: "+49", label: "🇩🇪 Allemagne (+49)" },
  { code: "+41", label: "🇨🇭 Suisse (+41)" },
  { code: "+39", label: "🇮🇹 Italie (+39)" },
  { code: "+351", label: "🇵🇹 Portugal (+351)" },
  { code: "+352", label: "🇱🇺 Luxembourg (+352)" },
  { code: "+55", label: "🇧🇷 Brésil (+55)" },
  { code: "+44", label: "🇬🇧 Royaume-Uni / UK (+44)" },
  { code: "+1", label: "🇨🇦🇺🇸 Canada / USA (+1)" },
  { code: "+86", label: "🇨🇳 Chine (+86)" },
  { code: "+90", label: "🇹🇷 Turquie (+90)" },
  { code: "+971", label: "🇦🇪 Dubaï / EA-U (+971)" },
  { code: "+27", label: "🇿🇦 Afrique du Sud (+27)" },
  { code: "+244", label: "🇦🇴 Angola (+244)" },
  { code: "+260", label: "🇿🇲 Zambie (+260)" },
];

// Validation inscription
const signupSchema = z.object({
  full_name: z.string().min(2, "Nom trop court"),
  phone_prefix: z.string().min(2),
  phone_number: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[0-9]{6,}$/.test(val),
      "Numéro invalide (chiffres uniquement, min 6)"
    ),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe trop court (min 6 caractères)"),
  account_type: z.enum(["particulier", "professionnel"]),
});

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<"login" | "register">(
    params.get("mode") === "register" ? "register" : "login"
  );

  const [formData, setFormData] = useState({
    full_name: "",
    phone_prefix: "+243",
    phone_number: "",
    email: "",
    password: "",
    account_type: "particulier" as "particulier" | "professionnel",
  });

  // Suivi de session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  // 🔐 S'assure qu'un profil existe (créé au 1er login)
  const ensureProfileExists = async (user: User) => {
    try {
      const { data: existing, error: selectError } = await supa
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (selectError) {
        console.error("Erreur vérification profil :", selectError);
        return;
      }

      if (!existing) {
        const meta = (user.user_metadata || {}) as any;

        const full_name: string =
          meta.full_name || user.email?.split("@")[0] || "";

        const phone_number: string | null =
          meta.phone_number && meta.phone_number !== ""
            ? (meta.phone_number as string)
            : null;

        const account_type: "particulier" | "professionnel" =
          meta.account_type || "particulier";

        const { error: insertError } = await supa.from("profiles").insert({
          id: user.id,
          full_name,
          phone_number,
          account_type,
        });

        if (insertError) {
          console.error("Erreur création profil après login :", insertError);
        } else {
          console.log("Profil créé automatiquement après login");
        }
      }
    } catch (e) {
      console.error("Erreur ensureProfileExists :", e);
    }
  };

  // LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      toast.error(error.message || "Erreur lors de la connexion");
      setLoading(false);
      return;
    }

    const user = data.session?.user;
    if (user) {
      await ensureProfileExists(user);
    }

    toast.success("Connexion réussie !");
    navigate("/");
    setLoading(false);
  };

  // INSCRIPTION
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = signupSchema.parse(formData);

      const fullPhone =
        validated.phone_number && validated.phone_number.trim() !== ""
          ? `${validated.phone_prefix}${validated.phone_number}`
          : null;

      // 1) Création du compte auth + métadonnées
      const { error: signupError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: validated.full_name,
            phone_number: fullPhone,
            account_type: validated.account_type,
          },
        },
      });

      if (signupError) throw signupError;

      // ⚠️ Avec RLS, on ne touche PAS à profiles ici.
      // Le profil sera créé au premier login via ensureProfileExists()
      // en utilisant ces métadonnées.

      toast.success("Compte créé ! Vérifiez votre email pour valider.");
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error(err.message || "Erreur lors de l'inscription");
      }
    }

    setLoading(false);
  };

  if (session) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">
            Teka Somba
          </CardTitle>
          <CardDescription className="text-center">
            {mode === "login"
              ? "Connectez-vous à votre compte"
              : "Créez votre compte pour commencer"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={mode === "login" ? handleLogin : handleRegister}
            className="space-y-4"
          >
            {mode === "register" && (
              <>
                <div className="space-y-2">
                  <Label>Nom complet *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Téléphone (WhatsApp)</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.phone_prefix}
                      onValueChange={(v) =>
                        setFormData({ ...formData, phone_prefix: v })
                      }
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Code" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_PREFIXES.map((p) => (
                          <SelectItem key={p.code} value={p.code}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="tel"
                      placeholder="Numéro (ex : 890000000)"
                      value={formData.phone_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phone_number: e.target.value,
                        })
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Le numéro sera enregistré au format international
                    (ex&nbsp;: +243890000000).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Type de compte *</Label>
                  <Select
                    value={formData.account_type}
                    onValueChange={(v: "particulier" | "professionnel") =>
                      setFormData({ ...formData, account_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisissez un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="particulier">Particulier</SelectItem>
                      <SelectItem value="professionnel">
                        Professionnel
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Mot de passe *</Label>
              <Input
                type="password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? "Chargement…"
                : mode === "login"
                ? "Se connecter"
                : "S'inscrire"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              className="text-sm text-muted-foreground hover:text-primary"
              onClick={() =>
                setMode(mode === "login" ? "register" : "login")
              }
            >
              {mode === "login"
                ? "Pas encore de compte ? S'inscrire"
                : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
