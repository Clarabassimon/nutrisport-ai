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

// ── Fridge Ingredients ────────────────────────────────────────────────────────

const FRIDGE_KEY = "nutrisport_fridge";
const CUSTOM_MENUS_KEY = "nutrisport_custom_menus";
const SUPPLEMENT_LOG_KEY = "nutrisport_supplement_log";

export async function loadFridgeIngredients(): Promise<import("./types").FridgeIngredient[]> {
  const raw = await AsyncStorage.getItem(FRIDGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveFridgeIngredients(
  items: import("./types").FridgeIngredient[]
): Promise<void> {
  await AsyncStorage.setItem(FRIDGE_KEY, JSON.stringify(items));
}

// ── Custom Menus ──────────────────────────────────────────────────────────────

export async function loadCustomMenus(): Promise<import("./types").CustomMenu[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_MENUS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveCustomMenu(menu: import("./types").CustomMenu): Promise<void> {
  const menus = await loadCustomMenus();
  const idx = menus.findIndex((m) => m.id === menu.id);
  if (idx >= 0) {
    menus[idx] = menu;
  } else {
    menus.push(menu);
  }
  await AsyncStorage.setItem(CUSTOM_MENUS_KEY, JSON.stringify(menus));
}

export async function deleteCustomMenu(menuId: string): Promise<void> {
  const menus = await loadCustomMenus();
  const filtered = menus.filter((m) => m.id !== menuId);
  await AsyncStorage.setItem(CUSTOM_MENUS_KEY, JSON.stringify(filtered));
}

// ── Supplement Log ────────────────────────────────────────────────────────────

export async function loadSupplementLog(
  date: string
): Promise<import("./types").SupplementLog | null> {
  const raw = await AsyncStorage.getItem(`${SUPPLEMENT_LOG_KEY}_${date}`);
  return raw ? JSON.parse(raw) : null;
}

export async function saveSupplementLog(log: import("./types").SupplementLog): Promise<void> {
  await AsyncStorage.setItem(
    `${SUPPLEMENT_LOG_KEY}_${log.date}`,
    JSON.stringify(log)
  );
}

// ── Alias for compatibility ───────────────────────────────────────────────────

export const loadUserProfile = getUserProfile;

// ── Recipe Collections ────────────────────────────────────────────────────────

const RECIPE_COLLECTIONS_KEY = "nutrisport_recipe_collections";

export async function loadRecipeCollections(): Promise<import("./types").RecipeCollections> {
  const raw = await AsyncStorage.getItem(RECIPE_COLLECTIONS_KEY);
  return raw ? JSON.parse(raw) : { to_try: [], favorites: [] };
}

export async function saveToCollection(
  recipe: import("./types").SavedRecipe
): Promise<void> {
  const collections = await loadRecipeCollections();
  const col = recipe.collection;
  // Remove from both collections first (avoid duplicates)
  collections.to_try = collections.to_try.filter((r) => r.id !== recipe.id);
  collections.favorites = collections.favorites.filter((r) => r.id !== recipe.id);
  // Add to target collection
  collections[col].unshift(recipe);
  await AsyncStorage.setItem(RECIPE_COLLECTIONS_KEY, JSON.stringify(collections));
}

export async function removeFromCollection(
  recipeId: string,
  collection: import("./types").RecipeCollectionType
): Promise<void> {
  const collections = await loadRecipeCollections();
  collections[collection] = collections[collection].filter((r) => r.id !== recipeId);
  await AsyncStorage.setItem(RECIPE_COLLECTIONS_KEY, JSON.stringify(collections));
}

export async function moveToCollection(
  recipeId: string,
  from: import("./types").RecipeCollectionType,
  to: import("./types").RecipeCollectionType
): Promise<void> {
  const collections = await loadRecipeCollections();
  const recipe = collections[from].find((r) => r.id === recipeId);
  if (!recipe) return;
  collections[from] = collections[from].filter((r) => r.id !== recipeId);
  recipe.collection = to;
  collections[to].unshift(recipe);
  await AsyncStorage.setItem(RECIPE_COLLECTIONS_KEY, JSON.stringify(collections));
}
