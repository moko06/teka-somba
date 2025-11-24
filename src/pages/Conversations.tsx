import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  last_message: string | null;
  updated_at: string;
  product: {
    title: string;
    photo_urls: string[];
  };
  buyer: {
    full_name: string;
  };
  seller: {
    full_name: string;
  };
}

const Conversations = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
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
      loadConversations();
    }
  }, [session]);

  const loadConversations = async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from("conversations")
      .select(`
        *,
        product:products(title, photo_urls),
        buyer:profiles!conversations_buyer_id_fkey(full_name),
        seller:profiles!conversations_seller_id_fkey(full_name)
      `)
      .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des conversations");
      setLoading(false);
      return;
    }

    setConversations(data as any || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Mes conversations</h1>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Vous n'avez pas encore de conversations
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => {
              const otherPerson = 
                conversation.buyer_id === session?.user.id 
                  ? conversation.seller 
                  : conversation.buyer;

              return (
                <Card
                  key={conversation.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/conversations/${conversation.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {conversation.product.photo_urls[0] ? (
                          <img
                            src={conversation.product.photo_urls[0]}
                            alt={conversation.product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            Pas de photo
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate mb-1">
                          {conversation.product.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-1">
                          Avec {otherPerson.full_name}
                        </p>
                        {conversation.last_message && (
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.last_message}
                          </p>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(conversation.updated_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversations;
