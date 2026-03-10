# NutriSport AI — Design System & Interface Plan

## Brand Identity

**App Name:** NutriSport AI  
**Tagline:** Ton coach nutritionnel intelligent  
**Palette principale:** Mauve pâle, blanc cassé, accents violets et verts doux

### Color Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `primary` | `#9B7FD4` | `#B89FE8` | CTA, accents, icônes actives |
| `primaryLight` | `#EDE8F8` | `#2D2545` | Fond de cartes, badges |
| `secondary` | `#6EC6A0` | `#5DB891` | Succès, calories restantes, nutrition positive |
| `background` | `#FAF9FE` | `#13111A` | Fond général |
| `surface` | `#FFFFFF` | `#1E1B2E` | Cartes, modales |
| `foreground` | `#1A1535` | `#F0EEFF` | Texte principal |
| `muted` | `#7B7490` | `#9B94B5` | Texte secondaire |
| `border` | `#E8E3F5` | `#2E2A42` | Séparateurs, bordures |
| `warning` | `#F5A623` | `#FBBF24` | Alertes, macros dépassées |
| `error` | `#E05C5C` | `#F87171` | Erreurs |

---

## Screen List

1. **Onboarding** — Écran de bienvenue + setup profil (multi-étapes)
2. **Dashboard** (Home) — Vue d'ensemble journalière
3. **Scanner** — Analyse repas par photo IA
4. **Journal** — Ressenti quotidien + suivi sport
5. **Recettes** — Suggestions personnalisées
6. **Courses** — Liste de courses intelligente
7. **Profil** — Paramètres utilisateur + objectifs

---

## Screen Details

### 1. Onboarding (multi-étapes)
- **Étape 1 :** Bienvenue animée avec logo + slogan
- **Étape 2 :** Informations de base (prénom, âge, sexe)
- **Étape 3 :** Morphologie (taille, poids)
- **Étape 4 :** Objectif (perte de poids / maintien / prise de masse / recomposition)
- **Étape 5 :** Sports pratiqués (multi-sélection avec icônes)
- **Étape 6 :** Fréquence d'entraînement (slider)
- **Étape 7 :** Résultat BMR/TDEE + macros calculées
- Navigation : barre de progression en haut, bouton "Suivant" en bas

### 2. Dashboard (Home)
- Header : "Bonjour [Prénom] 👋" + date du jour
- Anneau de calories (circulaire) : consommées / objectif
- 3 barres de macros : Protéines / Glucides / Lipides
- Repas du jour (liste scrollable) : petit-déjeuner, déjeuner, dîner, collations
- Bouton flottant "+" pour ajouter un repas (scanner ou manuel)
- Carte "Conseil du jour" du coach IA
- Indicateur d'eau (optionnel)

### 3. Scanner de repas
- Viewfinder caméra avec overlay arrondi
- Bouton capture central (grand, blanc)
- Option "Importer depuis galerie"
- Résultat : carte animée avec aliments détectés, calories, macros
- Score nutritionnel (A/B/C/D avec couleur)
- Bouton "Ajouter au journal"

### 4. Journal quotidien
- Date picker (scroll horizontal)
- 5 indicateurs de ressenti (sliders ou étoiles) :
  - Niveau d'énergie ⚡
  - Fatigue 😴
  - Qualité du sommeil 🌙
  - Performance sportive 🏋️
  - Niveau de faim 🍽️
- Section "Entraînement du jour" : type de sport + durée
- Bouton "Sauvegarder" avec animation de confirmation

### 5. Recettes
- Header avec filtre (objectif actuel affiché)
- Grille de cartes recettes (2 colonnes)
- Chaque carte : photo, nom, calories, temps, score macro
- Détail recette : ingrédients, étapes, macros complètes
- Bouton "Ajouter à ma liste de courses"

### 6. Liste de courses
- Générée automatiquement depuis les recettes sélectionnées
- Regroupée par catégories avec icônes :
  - 🥩 Protéines
  - 🥦 Légumes
  - 🍎 Fruits
  - 🍚 Féculents
  - 🧂 Épicerie
  - 🧀 Produits frais
- Checkbox par article (animation de rayure)
- Bouton "Partager la liste"

### 7. Profil
- Avatar + prénom + objectif actuel
- Statistiques : BMR, TDEE, objectif calorique
- Répartition macros cible (graphique donut)
- Paramètres : modifier profil, objectif, sports
- Historique de progression (poids)

---

## Key User Flows

### Flow 1 : Première utilisation
Onboarding étape 1 → ... → étape 7 (résultats) → Dashboard

### Flow 2 : Ajouter un repas via scanner
Dashboard → tap "+" → Scanner → Prendre photo → Voir analyse → "Ajouter au journal" → Dashboard mis à jour

### Flow 3 : Générer une recette et l'ajouter aux courses
Recettes → Parcourir → Tap recette → Voir détail → "Ajouter aux courses" → Courses (article ajouté)

### Flow 4 : Remplir le journal quotidien
Journal → Sélectionner date → Remplir ressenti (5 sliders) → Ajouter entraînement → Sauvegarder → Feedback IA

---

## Navigation Structure

Tab bar (5 onglets) :
1. 🏠 Dashboard (index)
2. 📷 Scanner
3. 📓 Journal
4. 🍽️ Recettes
5. 👤 Profil

La liste de courses est accessible depuis l'onglet Recettes (bouton dans le header).

---

## Typography

- **Titres :** SF Pro Display Bold (natif iOS) / Roboto Bold (Android)
- **Corps :** SF Pro Text Regular
- **Taille base :** 16px corps, 24px titres, 12px labels

---

## Component Patterns

- **Cards :** `rounded-2xl`, `shadow-sm`, `bg-surface`, padding `p-4`
- **Buttons primaires :** `bg-primary`, `rounded-full`, `py-4`, texte blanc bold
- **Buttons secondaires :** `bg-primaryLight`, `rounded-full`, texte `text-primary`
- **Progress bars :** hauteur 8px, `rounded-full`, couleur selon macro
- **Sliders :** thumb mauve, track gris clair
- **Badges :** `rounded-full`, `px-3 py-1`, petite taille
