// NutriSport AI — App Types

export type Gender = "male" | "female";
export type Goal = "weight_loss" | "maintenance" | "muscle_gain" | "recomposition";
export type Sport =
  | "musculation"
  | "running"
  | "crossfit"
  | "fitness"
  | "sports_collectifs"
  | "autres";

export type MacroMethod = "crossfit" | "classic";

export interface UserProfile {
  firstName: string;
  age: number;
  gender: Gender;
  height: number; // cm
  weight: number; // kg
  goal: Goal;
  sports: Sport[];
  trainingFrequency: number; // sessions per week (1-7)
  macroMethod: MacroMethod; // méthode de calcul macros
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProtein: number; // g
  targetCarbs: number; // g
  targetFat: number; // g
  createdAt: string;
  updatedAt: string;
}

export interface MacroNutrients {
  calories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

export interface FoodItem {
  id: string;
  name: string;
  quantity: string;
  macros: MacroNutrients;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Meal {
  id: string;
  type: MealType;
  name: string;
  items: FoodItem[];
  totalMacros: MacroNutrients;
  nutritionScore: "A" | "B" | "C" | "D";
  addedAt: string;
  imageUri?: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  meals: Meal[];
  totalMacros: MacroNutrients;
  waterIntake?: number; // ml
  journal?: DailyJournal;
}

export interface DailyJournal {
  date: string;
  energyLevel: number; // 1-5
  fatigue: number; // 1-5
  sleepQuality: number; // 1-5
  sportPerformance: number; // 1-5
  hungerLevel: number; // 1-5
  workoutType?: string;
  workoutDuration?: number; // minutes
  notes?: string;
  aiAdvice?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  prepTime: number; // minutes
  servings: number;
  macros: MacroNutrients;
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: string[];
  goal: Goal[];
}

export interface RecipeIngredient {
  name: string;
  quantity: string;
  category: ShoppingCategory;
}

export type ShoppingCategory =
  | "proteins"
  | "vegetables"
  | "fruits"
  | "starches"
  | "grocery"
  | "fresh";

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  category: ShoppingCategory;
  checked: boolean;
  recipeId?: string;
}

export interface ShoppingList {
  id: string;
  createdAt: string;
  items: ShoppingItem[];
}

export interface MealAnalysisResult {
  foods: Array<{
    name: string;
    quantity: string;
    calories: number;
  }>;
  totalMacros: MacroNutrients;
  nutritionScore: "A" | "B" | "C" | "D";
  scoreReason: string;
  suggestions: string[];
}

export const GOAL_LABELS: Record<Goal, string> = {
  weight_loss: "Perte de poids",
  maintenance: "Maintien",
  muscle_gain: "Prise de masse",
  recomposition: "Recomposition corporelle",
};

export const SPORT_LABELS: Record<Sport, string> = {
  musculation: "Musculation",
  running: "Running",
  crossfit: "CrossFit",
  fitness: "Fitness",
  sports_collectifs: "Sports collectifs",
  autres: "Autres",
};

export const SPORT_ICONS: Record<Sport, string> = {
  musculation: "dumbbell.fill",
  running: "figure.run",
  crossfit: "bolt.fill",
  fitness: "heart.fill",
  sports_collectifs: "trophy.fill",
  autres: "star.fill",
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Collation",
};

export const SHOPPING_CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  proteins: "Protéines",
  vegetables: "Légumes",
  fruits: "Fruits",
  starches: "Féculents",
  grocery: "Épicerie",
  fresh: "Produits frais",
};

export const SHOPPING_CATEGORY_ICONS: Record<ShoppingCategory, string> = {
  proteins: "🥩",
  vegetables: "🥦",
  fruits: "🍎",
  starches: "🍚",
  grocery: "🧂",
  fresh: "🧀",
};

// ─────────────────────────────────────────────────────────────────
// ALIMENTS (base de données)
// ─────────────────────────────────────────────────────────────────

export interface FoodDatabase {
  id: string;
  name: string;
  category: ShoppingCategory;
  cookingKey?: string; // clé pour coefficient de cuisson
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// ─────────────────────────────────────────────────────────────────
// FRIGO INTELLIGENT
// ─────────────────────────────────────────────────────────────────

export interface FridgeIngredient {
  id: string;
  name: string;
  quantity?: string; // ex: "200g", "3 unités"
  category: ShoppingCategory;
  addedAt: string;
}

// ─────────────────────────────────────────────────────────────────
// MENU PERSONNALISÉ
// ─────────────────────────────────────────────────────────────────

export interface CustomMenuIngredient {
  id: string;
  name: string;
  rawWeightG: number; // poids CRU en grammes
  cookedWeightG?: number; // poids cuit estimé
  cookingKey?: string; // clé coefficient cuisson
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  macros: MacroNutrients; // calculé depuis rawWeightG
}

export interface CustomMenu {
  id: string;
  name: string;
  mealType: MealType;
  ingredients: CustomMenuIngredient[];
  totalMacros: MacroNutrients;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────
// COMPLÉMENTS ALIMENTAIRES
// ─────────────────────────────────────────────────────────────────

export type SupplementType =
  | "whey"
  | "omega3"
  | "vitamin_d"
  | "creatine"
  | "glycine"
  | "collagen"
  | "ashwagandha";

export interface SupplementLog {
  date: string; // YYYY-MM-DD
  taken: SupplementType[];
}
