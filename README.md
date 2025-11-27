# 🛒 Teka Somba — Marketplace RDC (React + Supabase)

Teka Somba est une plateforme web moderne permettant aux utilisateurs de RDC (et diaspora) d’acheter, vendre et publier des annonces locales.  
Projet développé en **React + Vite**, **Supabase**, **Tailwind CSS**, **shadcn-ui** et supportant les **PWA**.

---

## 🚀 Fonctionnalités principales

### ✅ Authentification & Profils
- Inscription / connexion avec email & mot de passe  
- Sélection du **pays & indicatif international** (avec drapeaux emoji)  
- Stockage des informations dans Supabase `auth.users`  
- **Création automatique du profil** lors de la première connexion  
- Stockage des données profil dans `public.profiles` :
  - Nom complet  
  - Numéro WhatsApp  
  - Type de compte (particulier / professionnel)  
  - Champs extensibles (ville, pays, avatar, badge pro…)

### 🛍️ Annonces & Marketplace
- Création d’annonce avec :
  - Titre  
  - Description  
  - Prix  
  - Devise (CDF / USD)  
  - Catégorie  
  - Condition (neuf, bon état…)  
  - Photos (upload Supabase Storage)  
- Affichage dynamique des annonces sur la page d’accueil  
- Filtre : catégorie, ville, recherche texte  

### 📸 Upload & Stockage Supabase
- Upload multiple (max 4 photos)  
- Bucket `product-photos`  
- Règles RLS sécurisées  
- Génération d’URL publiques automatiques  

### 💬 Contact vendeur
- Bouton **Contacter via WhatsApp**  
- Message pré-rempli incluant le titre de l’annonce  
- Format international du numéro  
- Compatible mobile & WhatsApp Web  

---

## 🧱 Stack Technique

| Technologie | Utilisation |
|------------|-------------|
| **React + Vite** | Interface rapide & performante |
| **TypeScript** | Typage strict & fiabilité |
| **Supabase (Auth, Database, Storage)** | Backend complet |
| **Tailwind CSS** | Design moderne et responsive |
| **shadcn-ui** | Composants UI élégants |
| **Lucide Icons** | Icônes légères et belles |
| **PWA-ready** | Rapidité et installation mobile |

---

## 📦 Structure du projet

