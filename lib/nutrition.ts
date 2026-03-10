import type { Gender, Goal, UserProfile } from "./types";

/**
 * Calculate BMR using Mifflin-St Jeor formula
 * Men: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
 * Women: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
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
 * Activity multipliers based on training frequency
 */
function getActivityMultiplier(trainingFrequency: number): number {
  if (trainingFrequency === 0) return 1.2; // Sedentary
  if (trainingFrequency <= 2) return 1.375; // Light (1-2 days)
  if (trainingFrequency <= 4) return 1.55; // Moderate (3-4 days)
  if (trainingFrequency <= 6) return 1.725; // Active (5-6 days)
  return 1.9; // Very active (daily)
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(bmr: number, trainingFrequency: number): number {
  const multiplier = getActivityMultiplier(trainingFrequency);
  return Math.round(bmr * multiplier);
}

/**
 * Calculate target calories based on goal
 */
export function calculateTargetCalories(tdee: number, goal: Goal): number {
  switch (goal) {
    case "weight_loss":
      return Math.round(tdee * 0.8); // -20% deficit
    case "muscle_gain":
      return Math.round(tdee * 1.1); // +10% surplus
    case "maintenance":
      return tdee;
    case "recomposition":
      return tdee; // Maintenance calories, adjust macros
    default:
      return tdee;
  }
}

/**
 * Calculate macro targets in grams
 * Returns { protein, carbs, fat } in grams
 */
export function calculateMacros(
  targetCalories: number,
  weight: number,
  goal: Goal
): { protein: number; carbs: number; fat: number } {
  let proteinRatio: number;
  let fatRatio: number;

  switch (goal) {
    case "muscle_gain":
      proteinRatio = 0.3; // 30% from protein
      fatRatio = 0.25; // 25% from fat
      break;
    case "weight_loss":
      proteinRatio = 0.35; // 35% from protein (preserve muscle)
      fatRatio = 0.3; // 30% from fat
      break;
    case "recomposition":
      proteinRatio = 0.35;
      fatRatio = 0.25;
      break;
    default: // maintenance
      proteinRatio = 0.25;
      fatRatio = 0.3;
  }

  const carbRatio = 1 - proteinRatio - fatRatio;

  const protein = Math.round((targetCalories * proteinRatio) / 4); // 4 kcal/g
  const carbs = Math.round((targetCalories * carbRatio) / 4); // 4 kcal/g
  const fat = Math.round((targetCalories * fatRatio) / 9); // 9 kcal/g

  return { protein, carbs, fat };
}

/**
 * Build a complete UserProfile from onboarding data
 */
export function buildUserProfile(data: {
  firstName: string;
  age: number;
  gender: Gender;
  height: number;
  weight: number;
  goal: Goal;
  sports: import("./types").Sport[];
  trainingFrequency: number;
}): UserProfile {
  const bmr = calculateBMR(data.weight, data.height, data.age, data.gender);
  const tdee = calculateTDEE(bmr, data.trainingFrequency);
  const targetCalories = calculateTargetCalories(tdee, data.goal);
  const macros = calculateMacros(targetCalories, data.weight, data.goal);
  const now = new Date().toISOString();

  return {
    ...data,
    bmr,
    tdee,
    targetCalories,
    targetProtein: macros.protein,
    targetCarbs: macros.carbs,
    targetFat: macros.fat,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Calculate nutrition score (A/B/C/D) based on macro balance
 */
export function calculateNutritionScore(
  macros: { calories: number; protein: number; carbs: number; fat: number },
  targetCalories: number
): "A" | "B" | "C" | "D" {
  const calorieRatio = macros.calories / targetCalories;
  const proteinRatio = (macros.protein * 4) / macros.calories;
  const fatRatio = (macros.fat * 9) / macros.calories;

  let score = 0;

  // Calorie balance (0-40 points)
  if (calorieRatio >= 0.2 && calorieRatio <= 0.4) score += 40;
  else if (calorieRatio >= 0.15 && calorieRatio <= 0.5) score += 25;
  else score += 10;

  // Protein content (0-30 points)
  if (proteinRatio >= 0.25 && proteinRatio <= 0.4) score += 30;
  else if (proteinRatio >= 0.15) score += 20;
  else score += 5;

  // Fat content (0-30 points)
  if (fatRatio >= 0.2 && fatRatio <= 0.35) score += 30;
  else if (fatRatio >= 0.15 && fatRatio <= 0.45) score += 20;
  else score += 5;

  if (score >= 85) return "A";
  if (score >= 65) return "B";
  if (score >= 45) return "C";
  return "D";
}

/**
 * Get nutrition score color
 */
export function getScoreColor(score: "A" | "B" | "C" | "D"): string {
  switch (score) {
    case "A": return "#6EC6A0";
    case "B": return "#9B7FD4";
    case "C": return "#F5A623";
    case "D": return "#E05C5C";
  }
}

/**
 * Format today's date as YYYY-MM-DD
 */
export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Get macro percentage (0-100) capped at 100
 */
export function getMacroPercent(consumed: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(Math.round((consumed / target) * 100), 100);
}
