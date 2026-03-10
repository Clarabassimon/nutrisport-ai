import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  UserProfile,
  DailyLog,
  DailyJournal,
  ShoppingList,
  Recipe,
} from "./types";

const KEYS = {
  USER_PROFILE: "nutrisport_profile",
  DAILY_LOGS: "nutrisport_daily_logs",
  SHOPPING_LIST: "nutrisport_shopping_list",
  SAVED_RECIPES: "nutrisport_saved_recipes",
  ONBOARDING_DONE: "nutrisport_onboarding_done",
};

// ── User Profile ──────────────────────────────────────────────────────────────

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return raw ? JSON.parse(raw) : null;
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export async function setOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, "true");
}

export async function isOnboardingDone(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.ONBOARDING_DONE);
  return val === "true";
}

// ── Daily Logs ────────────────────────────────────────────────────────────────

export async function getAllDailyLogs(): Promise<Record<string, DailyLog>> {
  const raw = await AsyncStorage.getItem(KEYS.DAILY_LOGS);
  return raw ? JSON.parse(raw) : {};
}

export async function getDailyLog(date: string): Promise<DailyLog | null> {
  const logs = await getAllDailyLogs();
  return logs[date] ?? null;
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  const logs = await getAllDailyLogs();
  logs[log.date] = log;
  await AsyncStorage.setItem(KEYS.DAILY_LOGS, JSON.stringify(logs));
}

export async function saveDailyJournal(journal: DailyJournal): Promise<void> {
  const log = (await getDailyLog(journal.date)) ?? {
    date: journal.date,
    meals: [],
    totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  };
  log.journal = journal;
  await saveDailyLog(log);
}

export async function addMealToLog(date: string, meal: import("./types").Meal): Promise<void> {
  const log = (await getDailyLog(date)) ?? {
    date,
    meals: [],
    totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  };
  log.meals.push(meal);
  // Recalculate totals
  log.totalMacros = log.meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.totalMacros.calories,
      protein: acc.protein + m.totalMacros.protein,
      carbs: acc.carbs + m.totalMacros.carbs,
      fat: acc.fat + m.totalMacros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  await saveDailyLog(log);
}

export async function removeMealFromLog(date: string, mealId: string): Promise<void> {
  const log = await getDailyLog(date);
  if (!log) return;
  log.meals = log.meals.filter((m) => m.id !== mealId);
  log.totalMacros = log.meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.totalMacros.calories,
      protein: acc.protein + m.totalMacros.protein,
      carbs: acc.carbs + m.totalMacros.carbs,
      fat: acc.fat + m.totalMacros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  await saveDailyLog(log);
}

// ── Shopping List ─────────────────────────────────────────────────────────────

export async function getShoppingList(): Promise<ShoppingList | null> {
  const raw = await AsyncStorage.getItem(KEYS.SHOPPING_LIST);
  return raw ? JSON.parse(raw) : null;
}

export async function saveShoppingList(list: ShoppingList): Promise<void> {
  await AsyncStorage.setItem(KEYS.SHOPPING_LIST, JSON.stringify(list));
}

// ── Saved Recipes ─────────────────────────────────────────────────────────────

export async function getSavedRecipes(): Promise<Recipe[]> {
  const raw = await AsyncStorage.getItem(KEYS.SAVED_RECIPES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveRecipe(recipe: Recipe): Promise<void> {
  const recipes = await getSavedRecipes();
  const exists = recipes.findIndex((r) => r.id === recipe.id);
  if (exists >= 0) {
    recipes[exists] = recipe;
  } else {
    recipes.push(recipe);
  }
  await AsyncStorage.setItem(KEYS.SAVED_RECIPES, JSON.stringify(recipes));
}

export async function removeRecipe(recipeId: string): Promise<void> {
  const recipes = await getSavedRecipes();
  const filtered = recipes.filter((r) => r.id !== recipeId);
  await AsyncStorage.setItem(KEYS.SAVED_RECIPES, JSON.stringify(filtered));
}

// ── Clear All Data ────────────────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
