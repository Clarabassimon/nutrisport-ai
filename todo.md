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

## Adaptation Coach CrossFit Julie (PDFs)
- [x] Refonte calcul macros : méthode CrossFit (lbs × NA) + méthode classique (g/kg PDC)
- [x] Onboarding : choix de la méthode de calcul + affichage comparatif des 2 méthodes
- [x] Profil : affichage des macros selon méthode choisie + explication Coach Julie
- [x] Mise à jour lib/nutrition.ts avec les 2 formules CrossFit
- [x] Frigo intelligent : écran de saisie des ingrédients disponibles
- [x] Frigo intelligent : génération de recettes IA selon ingrédients frigo + macros restantes
- [x] Créateur de menus : ajout d'ingrédients avec quantité en grammes CRU
- [x] Créateur de menus : calcul automatique macros totales du repas
- [x] Créateur de menus : affichage poids cuit estimé (coefficients par aliment)
- [x] Créateur de menus : sauvegarde dans bibliothèque personnelle
- [x] Base de données aliments avec macros pour 100g (protéines, glucides, lipides, calories)
- [x] Coefficients de cuisson (riz ×2.5, pâtes ×2.2, viandes ×0.75, légumineuses ×2.5, légumes ×0.85)
- [x] Section Compléments alimentaires (Coach Julie) : Whey, Oméga3, Vit D, Créatine, Glycine, Collagène, Ashwagandha
- [x] Mise à jour du coach IA avec la méthodologie Coach Julie
- [x] Dashboard mis à jour avec grille 6 accès rapides (Frigo, Menus, Compléments)

## Améliorations v2.1

- [x] Suppression de toutes les références à la "Coach Julie" dans l'app
- [x] Optimisation du prompt IA pour réduire le temps de génération des recettes
- [x] Refonte du flux Frigo : saisie ingrédient + quantité → bouton OK → liste → "Créer 5 recettes"
- [x] Génération de 5 recettes (au lieu de 3) avec macros détaillées
- [x] Collection "Mes recettes à essayer" (sauvegarde depuis le Frigo)
- [x] Collection "Mes recettes préférées" (sauvegarde depuis le Frigo)
- [x] Écran "Mes Recettes" avec onglets À essayer / Préférées
- [x] Possibilité de déplacer une recette d'une collection à l'autre
- [x] Suppression de recettes depuis les collections
- [x] Bouton "Mes Recettes" ajouté dans les accès rapides du dashboard
