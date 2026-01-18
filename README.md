# Grospiron Fine Art - Gestion Logistique Exposition

Cette application permet de gérer la logistique, l'emballage et les devis pour des expositions d'art internationales.

## Fonctionnalités Clés

- **Gestion des Œuvres** : Inventaire détaillé avec dimensions et valeurs d'assurance.
- **Moteur de Colisage** : Calcul automatique du type de caisse (T1 Galerie / T2 Musée) et des dimensions.
- **Calcul de Coûts** : Estimation précise des coûts de fabrication des caisses (PR et Prix de vente).
- **Planificateur Logistique** : Gestion des flux (Fret aérien, Route, National) et des équipes.
- **Générateur de Démo** : Un bouton "Générer Démo Appel d'Ooffre" sur le tableau de bord permet de peupler instantanément l'app avec 15 œuvres et 3 pays.

## Installation Locale

1. Clonez le dépôt GitHub.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Créez un fichier `.env.local` et ajoutez votre clé Gemini :
   ```env
   NEXT_PUBLIC_GEMINI_API_KEY=votre_cle_ici
   ```
4. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

## Déploiement sur Vercel

1. Connectez votre dépôt GitHub à Vercel.
2. **Important** : Ajoutez la variable d'environnement `NEXT_PUBLIC_GEMINI_API_KEY` dans les paramètres du projet sur Vercel.
3. Le déploiement se fera automatiquement à chaque "push" sur la branche `main`.
