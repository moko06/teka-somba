import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
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

const ConversationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
      loadConversation();
      loadMessages();
    }
  }, [id, session]);

  const loadConversation = async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        *,
        product:products(title, photo_urls),
        buyer:profiles!conversations_buyer_id_fkey(full_name),
        seller:profiles!conversations_seller_id_fkey(full_name)
      `)
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Conversation introuvable");
      navigate("/conversations");
      return;
    }

    setConversation(data as any);
    setLoading(false);
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Erreur lors du chargement des messages");
      return;
    }

    setMessages(data || []);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session || !newMessage.trim()) return;

    setSending(true);

    const { error } = await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: session.user.id,
      content: newMessage.trim(),
    });

    if (error) {
      toast.error("Erreur lors de l'envoi du message");
      setSending(false);
      return;
    }

    setNewMessage("");
    setSending(false);
    loadMessages();
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

  if (!conversation) return null;

  const otherPerson = 
    conversation.buyer_id === session?.user.id 
      ? conversation.seller 
      : conversation.buyer;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col max-w-4xl">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden">
                {conversation.product.photo_urls[0] ? (
                  <img
                    src={conversation.product.photo_urls[0]}
                    alt={conversation.product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">
                    📦
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{conversation.product.title}</h2>
                <p className="text-sm text-muted-foreground font-normal">
                  Conversation avec {otherPerson.full_name}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="flex-1 flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Pas encore de messages. Démarrez la conversation !
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_id === session?.user.id;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="break-words">{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>

          <CardContent className="border-t p-4">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                placeholder="Tapez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
              />
              <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConversationDetail;
