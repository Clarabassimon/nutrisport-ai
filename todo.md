# NutriSport AI — TODO

## Design System
- [x] Configurer le thème mauve pâle (theme.config.js)
- [x] Mettre à jour tailwind.config.js avec les nouvelles couleurs
- [x] Configurer les icônes de navigation (icon-symbol.tsx)

## Onboarding & Profil
- [x] Écran de bienvenue animé
- [x] Formulaire multi-étapes (prénom, âge, sexe, taille, poids)
- [x] Sélection d'objectif (4 options)
- [x] Sélection de sports (multi-sélection)
- [x] Fréquence d'entraînement (slider)
- [x] Calcul BMR/TDEE (formule Mifflin-St Jeor)
- [x] Affichage résultats + macros recommandées
- [x] Persistance du profil (AsyncStorage)
- [x] Écran Profil avec stats, métabolisme, objectifs nutritionnels
- [x] Réinitialisation des données

## Dashboard
- [x] Header avec salutation personnalisée
- [x] Anneau de calories circulaire (consommées/objectif)
- [x] Barres de progression macros (protéines, glucides, lipides)
- [x] Liste des repas du jour
- [x] Bouton flottant "+" pour ajouter un repas
- [x] Carte "Conseil du jour" du coach IA (cliquable)
- [x] Accès rapide : Coach IA, Courses, Journal

## Scanner de repas (IA)
- [x] Import depuis galerie ou caméra (expo-image-picker)
- [x] Appel API LLM pour analyse visuelle du repas
- [x] Affichage résultats (aliments, calories, macros)
- [x] Score nutritionnel (A/B/C/D)
- [x] Ajout au journal alimentaire

## Journal quotidien
- [x] 5 sliders de ressenti (énergie, fatigue, sommeil, performance, faim)
- [x] Section entraînement (type + durée)
- [x] Notes personnelles
- [x] Conseil IA personnalisé basé sur le journal
- [x] Sauvegarde AsyncStorage

## Recettes personnalisées
- [x] Génération de recettes via LLM (basée sur macros restantes)
- [x] Grille de cartes recettes
- [x] Page détail recette (ingrédients, étapes, macros)
- [x] Ajout à la liste de courses

## Liste de courses
- [x] Génération automatique depuis recettes sélectionnées
- [x] Regroupement par catégories (6 catégories)
- [x] Checkbox avec animation
- [x] Barre de progression
- [x] Vider liste / supprimer cochés

## Coach nutritionnel IA
- [x] Interface chat avec historique messages
- [x] Questions rapides prédéfinies
- [x] Réponses IA personnalisées (profil + journal du jour)
- [x] Indicateur de frappe

## Branding & Finalisation
- [x] Génération du logo NutriSport AI
- [x] Mise à jour app.config.ts (nom, logo)
- [x] Tous les écrans connectés dans le Stack root
- [x] TypeScript 0 erreurs
- [x] Checkpoint final
