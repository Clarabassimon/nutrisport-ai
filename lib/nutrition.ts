import type { Gender, Goal, UserProfile } from "./types";

// ─────────────────────────────────────────────────────────────────
// MÉTHODE CROSSFIT (Coach Julie) — formule en livres
// Répartition cible : 40% Glucides / 30% Protéines / 30% Lipides
// ─────────────────────────────────────────────────────────────────

/**
 * Niveaux d'activité CrossFit (Coach Julie)
 * 0.8 = Inactif/sédentaire
 * 0.9 = Activité modérée (3x/semaine)
 * 1.0 = Actif (4-5x/semaine)
 * 1.2 = Très actif (quotidien ou plusieurs fois/jour)
 */
export function getCrossfitActivityLevel(trainingFrequency: number): number {
  if (trainingFrequency === 0) return 0.8;
  if (trainingFrequency <= 3) return 0.9;
  if (trainingFrequency <= 5) return 1.0;
  return 1.2;
}

export function getCrossfitActivityLabel(na: number): string {
  if (na <= 0.8) return "Inactif / Sédentaire";
  if (na <= 0.9) return "Activité modérée (3x/sem)";
  if (na <= 1.0) return "Actif (4-5x/sem)";
  return "Très actif (quotidien)";
}

/**
 * Méthode CrossFit (Coach Julie) :
 * a) Poids en LBS = poids(kg) × 2.2
 * b) Protéines(g) = LBS × NA
 * c) Glucides(g) = Protéines × 1.33
 * d) Lipides(g) = Protéines × 4/9
 */
export function calculateCrossfitMacros(
  weightKg: number,
  trainingFrequency: number
): { protein: number; carbs: number; fat: number; calories: number; na: number; weightLbs: number } {
  const na = getCrossfitActivityLevel(trainingFrequency);
  const weightLbs = Math.round(weightKg * 2.2);
  const protein = Math.round(weightLbs * na);
  const carbs = Math.round(protein * 1.33);
  const fat = Math.round((protein * 4) / 9);
  const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  return { protein, carbs, fat, calories, na, weightLbs };
}

// ─────────────────────────────────────────────────────────────────
// MÉTHODE CLASSIQUE (par kg de poids de corps)
// ─────────────────────────────────────────────────────────────────

/**
 * Méthode classique :
 * - Glucides : 4 à 7g/kg PDC (4g pour 2-3x/sem, 7g pour 5-6x/sem)
 * - Protéines : 1.6 à 2.2g/kg PDC
 * - Lipides : 0.8 à 1g/kg PDC
 */
export function calculateClassicMacros(
  weightKg: number,
  trainingFrequency: number
): { protein: number; carbs: number; fat: number; calories: number } {
  let carbsPerKg: number;
  let proteinPerKg: number;
  let fatPerKg: number;

  if (trainingFrequency === 0) {
    carbsPerKg = 3;
    proteinPerKg = 1.4;
    fatPerKg = 0.8;
  } else if (trainingFrequency <= 2) {
    carbsPerKg = 4;
    proteinPerKg = 1.6;
    fatPerKg = 0.8;
  } else if (trainingFrequency <= 3) {
    carbsPerKg = 4.5;
    proteinPerKg = 1.8;
    fatPerKg = 0.9;
  } else if (trainingFrequency <= 4) {
    carbsPerKg = 5;
    proteinPerKg = 2.0;
    fatPerKg = 0.9;
  } else if (trainingFrequency <= 5) {
    carbsPerKg = 6;
    proteinPerKg = 2.0;
    fatPerKg = 1.0;
  } else {
    carbsPerKg = 7;
    proteinPerKg = 2.2;
    fatPerKg = 1.0;
  }

  const protein = Math.round(weightKg * proteinPerKg);
  const carbs = Math.round(weightKg * carbsPerKg);
  const fat = Math.round(weightKg * fatPerKg);
  const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  return { protein, carbs, fat, calories };
}

// ─────────────────────────────────────────────────────────────────
// MÉTHODE MIFFLIN-ST JEOR (BMR/TDEE classique)
// ─────────────────────────────────────────────────────────────────

/**
 * Calculate BMR using Mifflin-St Jeor formula
 */
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: Gender
): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(gender === "male" ? base + 5 : base - 161);
}

/**
 * Activity multipliers (Mifflin-St Jeor TDEE)
 */
function getActivityMultiplier(trainingFrequency: number): number {
  if (trainingFrequency === 0) return 1.2;
  if (trainingFrequency <= 2) return 1.375;
  if (trainingFrequency <= 4) return 1.55;
  if (trainingFrequency <= 6) return 1.725;
  return 1.9;
}

export function calculateTDEE(bmr: number, trainingFrequency: number): number {
  return Math.round(bmr * getActivityMultiplier(trainingFrequency));
}

export function calculateTargetCalories(tdee: number, goal: Goal): number {
  switch (goal) {
    case "weight_loss": return Math.round(tdee * 0.8);
    case "muscle_gain": return Math.round(tdee * 1.1);
    case "maintenance": return tdee;
    case "recomposition": return tdee;
    default: return tdee;
  }
}

export function calculateMacros(
  targetCalories: number,
  weight: number,
  goal: Goal
): { protein: number; carbs: number; fat: number } {
  let proteinRatio: number;
  let fatRatio: number;

  switch (goal) {
    case "muscle_gain":
      proteinRatio = 0.3; fatRatio = 0.25; break;
    case "weight_loss":
      proteinRatio = 0.35; fatRatio = 0.3; break;
    case "recomposition":
      proteinRatio = 0.35; fatRatio = 0.25; break;
    default:
      proteinRatio = 0.25; fatRatio = 0.3;
  }

  const carbRatio = 1 - proteinRatio - fatRatio;
  const protein = Math.round((targetCalories * proteinRatio) / 4);
  const carbs = Math.round((targetCalories * carbRatio) / 4);
  const fat = Math.round((targetCalories * fatRatio) / 9);
  return { protein, carbs, fat };
}

// ─────────────────────────────────────────────────────────────────
// BUILD USER PROFILE
// ─────────────────────────────────────────────────────────────────

export function buildUserProfile(data: {
  firstName: string;
  age: number;
  gender: Gender;
  height: number;
  weight: number;
  goal: Goal;
  sports: import("./types").Sport[];
  trainingFrequency: number;
  macroMethod?: "crossfit" | "classic";
}): UserProfile {
  const method = data.macroMethod ?? "crossfit";
  const bmr = calculateBMR(data.weight, data.height, data.age, data.gender);
  const tdee = calculateTDEE(bmr, data.trainingFrequency);
  const targetCalories = calculateTargetCalories(tdee, data.goal);
  const now = new Date().toISOString();

  let targetProtein: number;
  let targetCarbs: number;
  let targetFat: number;

  if (method === "crossfit") {
    const cf = calculateCrossfitMacros(data.weight, data.trainingFrequency);
    targetProtein = cf.protein;
    targetCarbs = cf.carbs;
    targetFat = cf.fat;
  } else {
    const cl = calculateClassicMacros(data.weight, data.trainingFrequency);
    targetProtein = cl.protein;
    targetCarbs = cl.carbs;
    targetFat = cl.fat;
  }

  return {
    ...data,
    macroMethod: method,
    bmr,
    tdee,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    createdAt: now,
    updatedAt: now,
  };
}

// ─────────────────────────────────────────────────────────────────
// COEFFICIENTS DE CUISSON (cru → cuit)
// ─────────────────────────────────────────────────────────────────

export const COOKING_COEFFICIENTS: Record<string, { coefficient: number; label: string }> = {
  riz: { coefficient: 2.5, label: "Riz" },
  pates: { coefficient: 2.2, label: "Pâtes" },
  quinoa: { coefficient: 2.8, label: "Quinoa" },
  lentilles: { coefficient: 2.5, label: "Lentilles" },
  pois_chiches: { coefficient: 2.4, label: "Pois chiches" },
  haricots: { coefficient: 2.5, label: "Haricots" },
  poulet: { coefficient: 0.75, label: "Poulet" },
  boeuf: { coefficient: 0.75, label: "Bœuf" },
  porc: { coefficient: 0.72, label: "Porc" },
  poisson: { coefficient: 0.78, label: "Poisson" },
  legumes: { coefficient: 0.85, label: "Légumes" },
  pomme_de_terre: { coefficient: 0.8, label: "Pomme de terre" },
  patate_douce: { coefficient: 0.85, label: "Patate douce" },
  flocons_avoine: { coefficient: 3.0, label: "Flocons d'avoine" },
};

/**
 * Calcule le poids cuit estimé à partir du poids cru
 */
export function estimateCookedWeight(rawWeightG: number, foodKey: string): number {
  const coeff = COOKING_COEFFICIENTS[foodKey]?.coefficient ?? 1.0;
  return Math.round(rawWeightG * coeff);
}

/**
 * Calcule les macros pour un aliment donné selon son poids cru (en g)
 * macrosPer100g : { protein, carbs, fat, calories } pour 100g
 */
export function calculateFoodMacros(
  rawWeightG: number,
  macrosPer100g: { protein: number; carbs: number; fat: number; calories: number }
): { protein: number; carbs: number; fat: number; calories: number } {
  const ratio = rawWeightG / 100;
  return {
    protein: Math.round(macrosPer100g.protein * ratio * 10) / 10,
    carbs: Math.round(macrosPer100g.carbs * ratio * 10) / 10,
    fat: Math.round(macrosPer100g.fat * ratio * 10) / 10,
    calories: Math.round(macrosPer100g.calories * ratio),
  };
}

// ─────────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────────

export function calculateNutritionScore(
  macros: { calories: number; protein: number; carbs: number; fat: number },
  targetCalories: number
): "A" | "B" | "C" | "D" {
  const calorieRatio = macros.calories / targetCalories;
  const proteinRatio = (macros.protein * 4) / macros.calories;
  const fatRatio = (macros.fat * 9) / macros.calories;

  let score = 0;
  if (calorieRatio >= 0.2 && calorieRatio <= 0.4) score += 40;
  else if (calorieRatio >= 0.15 && calorieRatio <= 0.5) score += 25;
  else score += 10;

  if (proteinRatio >= 0.25 && proteinRatio <= 0.4) score += 30;
  else if (proteinRatio >= 0.15) score += 20;
  else score += 5;

  if (fatRatio >= 0.2 && fatRatio <= 0.35) score += 30;
  else if (fatRatio >= 0.15 && fatRatio <= 0.45) score += 20;
  else score += 5;

  if (score >= 85) return "A";
  if (score >= 65) return "B";
  if (score >= 45) return "C";
  return "D";
}

export function getScoreColor(score: "A" | "B" | "C" | "D"): string {
  switch (score) {
    case "A": return "#6EC6A0";
    case "B": return "#9B7FD4";
    case "C": return "#F5A623";
    case "D": return "#E05C5C";
  }
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function getMacroPercent(consumed: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(Math.round((consumed / target) * 100), 100);
}
