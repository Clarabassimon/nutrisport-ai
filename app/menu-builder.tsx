import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { saveCustomMenu, loadCustomMenus, deleteCustomMenu } from "@/lib/storage";
import {
  calculateFoodMacros,
  estimateCookedWeight,
  COOKING_COEFFICIENTS,
} from "@/lib/nutrition";
import type { CustomMenu, CustomMenuIngredient, MealType, MacroNutrients } from "@/lib/types";
import { MEAL_TYPE_LABELS } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_TYPE_EMOJIS: Record<MealType, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

// Base de données locale d'aliments fréquents (pour suggestions rapides)
const QUICK_FOODS = [
  { name: "Blanc de poulet", cookingKey: "poulet", category: "proteins" as const, per100g: { calories: 110, protein: 23, carbs: 0, fat: 2 } },
  { name: "Steak haché 5%", cookingKey: "boeuf", category: "proteins" as const, per100g: { calories: 121, protein: 20, carbs: 0, fat: 5 } },
  { name: "Saumon", cookingKey: "poisson", category: "proteins" as const, per100g: { calories: 208, protein: 20, carbs: 0, fat: 13 } },
  { name: "Thon en boîte", cookingKey: null, category: "proteins" as const, per100g: { calories: 116, protein: 26, carbs: 0, fat: 1 } },
  { name: "Œufs entiers", cookingKey: null, category: "proteins" as const, per100g: { calories: 155, protein: 13, carbs: 1, fat: 11 } },
  { name: "Fromage blanc 0%", cookingKey: null, category: "fresh" as const, per100g: { calories: 45, protein: 8, carbs: 4, fat: 0 } },
  { name: "Riz blanc", cookingKey: "riz", category: "starches" as const, per100g: { calories: 350, protein: 7, carbs: 77, fat: 1 } },
  { name: "Pâtes complètes", cookingKey: "pates", category: "starches" as const, per100g: { calories: 352, protein: 13, carbs: 67, fat: 2 } },
  { name: "Patate douce", cookingKey: "patate_douce", category: "starches" as const, per100g: { calories: 86, protein: 2, carbs: 20, fat: 0 } },
  { name: "Flocons d'avoine", cookingKey: "flocons_avoine", category: "starches" as const, per100g: { calories: 379, protein: 13, carbs: 67, fat: 7 } },
  { name: "Quinoa", cookingKey: "quinoa", category: "starches" as const, per100g: { calories: 368, protein: 14, carbs: 64, fat: 6 } },
  { name: "Lentilles", cookingKey: "lentilles", category: "starches" as const, per100g: { calories: 353, protein: 25, carbs: 60, fat: 2 } },
  { name: "Brocoli", cookingKey: "legumes", category: "vegetables" as const, per100g: { calories: 34, protein: 3, carbs: 7, fat: 0 } },
  { name: "Épinards", cookingKey: "legumes", category: "vegetables" as const, per100g: { calories: 23, protein: 3, carbs: 4, fat: 0 } },
  { name: "Haricots verts", cookingKey: "legumes", category: "vegetables" as const, per100g: { calories: 31, protein: 2, carbs: 7, fat: 0 } },
  { name: "Huile d'olive", cookingKey: null, category: "grocery" as const, per100g: { calories: 884, protein: 0, carbs: 0, fat: 100 } },
  { name: "Banane", cookingKey: null, category: "fruits" as const, per100g: { calories: 89, protein: 1, carbs: 23, fat: 0 } },
  { name: "Yaourt grec 0%", cookingKey: null, category: "fresh" as const, per100g: { calories: 59, protein: 10, carbs: 4, fat: 0 } },
];

function sumMacros(ingredients: CustomMenuIngredient[]): MacroNutrients {
  return ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + ing.macros.calories,
      protein: acc.protein + ing.macros.protein,
      carbs: acc.carbs + ing.macros.carbs,
      fat: acc.fat + ing.macros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export default function MenuBuilderScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<"builder" | "library">("builder");

  // Builder state
  const [menuName, setMenuName] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [ingredients, setIngredients] = useState<CustomMenuIngredient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof QUICK_FOODS>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");

  // Library state
  const [savedMenus, setSavedMenus] = useState<CustomMenu[]>([]);

  useEffect(() => {
    loadCustomMenus().then(setSavedMenus);
  }, []);

  const searchFoodMacros = trpc.nutrition.searchFoodMacros.useMutation({
    onSuccess: (data) => {
      const result = [{
        name: data.name,
        cookingKey: data.cookingKey ?? undefined,
        category: data.category,
        per100g: data.per100g,
      }];
      setSearchResults(result as typeof QUICK_FOODS);
      setIsSearching(false);
    },
    onError: () => {
      setIsSearching(false);
      // Fall back to local search
      const local = QUICK_FOODS.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(local);
    },
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      const local = QUICK_FOODS.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(local);
      return;
    }
    // First try local
    const local = QUICK_FOODS.filter((f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (local.length > 0) {
      setSearchResults(local);
    } else {
      // Use AI to get macros
      setIsSearching(true);
      searchFoodMacros.mutate({ query: searchQuery });
    }
  };

  const addIngredient = (food: typeof QUICK_FOODS[0], rawWeightG = 100) => {
    const macros = calculateFoodMacros(rawWeightG, food.per100g);
    const cookedWeightG = food.cookingKey
      ? estimateCookedWeight(rawWeightG, food.cookingKey)
      : undefined;

    const newIng: CustomMenuIngredient = {
      id: `${Date.now()}_${Math.random()}`,
      name: food.name,
      rawWeightG,
      cookedWeightG,
      cookingKey: food.cookingKey ?? undefined,
      per100g: food.per100g,
      macros,
    };
    setIngredients((prev) => [...prev, newIng]);
    setSearchQuery("");
    setSearchResults([]);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const updateIngredientWeight = (id: string, newWeight: number) => {
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id !== id) return ing;
        const macros = calculateFoodMacros(newWeight, ing.per100g);
        const cookedWeightG = ing.cookingKey
          ? estimateCookedWeight(newWeight, ing.cookingKey)
          : undefined;
        return { ...ing, rawWeightG: newWeight, cookedWeightG, macros };
      })
    );
    setEditingIngredient(null);
    setEditWeight("");
  };

  const removeIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveMenu = async () => {
    if (!menuName.trim()) {
      Alert.alert("Nom requis", "Donne un nom à ton menu.");
      return;
    }
    if (ingredients.length === 0) {
      Alert.alert("Menu vide", "Ajoute au moins un ingrédient.");
      return;
    }
    const menu: CustomMenu = {
      id: Date.now().toString(),
      name: menuName.trim(),
      mealType,
      ingredients,
      totalMacros: sumMacros(ingredients),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveCustomMenu(menu);
    setSavedMenus((prev) => [...prev, menu]);
    setMenuName("");
    setIngredients([]);
    setActiveTab("library");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("✅ Menu sauvegardé", `"${menu.name}" a été ajouté à ta bibliothèque.`);
  };

  const handleDeleteMenu = (menuId: string, menuName: string) => {
    Alert.alert("Supprimer", `Supprimer "${menuName}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await deleteCustomMenu(menuId);
          setSavedMenus((prev) => prev.filter((m) => m.id !== menuId));
        },
      },
    ]);
  };

  const totalMacros = sumMacros(ingredients);
  const styles = createStyles(colors);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>🍽️ Mes Menus</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(["builder", "library"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.muted }]}>
              {tab === "builder" ? "✏️ Créer un menu" : `📚 Bibliothèque (${savedMenus.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "builder" ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Menu name & type */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Informations du menu</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
              placeholder="Nom du menu (ex: Repas post-entraînement)"
              placeholderTextColor={colors.muted}
              value={menuName}
              onChangeText={setMenuName}
              returnKeyType="done"
            />
            <Text style={[styles.label, { color: colors.muted }]}>Type de repas</Text>
            <View style={styles.mealTypeRow}>
              {MEAL_TYPES.map((mt) => (
                <TouchableOpacity
                  key={mt}
                  style={[
                    styles.mealTypeBtn,
                    { backgroundColor: mealType === mt ? colors.primary : colors.background, borderColor: mealType === mt ? colors.primary : colors.border },
                  ]}
                  onPress={() => setMealType(mt)}
                >
                  <Text style={styles.mealTypeEmoji}>{MEAL_TYPE_EMOJIS[mt]}</Text>
                  <Text style={[styles.mealTypeText, { color: mealType === mt ? "#fff" : colors.foreground }]}>
                    {MEAL_TYPE_LABELS[mt]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Search food */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Ajouter un aliment</Text>
            <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
              ⚖️ Tous les poids sont en grammes CRU
            </Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.searchInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                placeholder="Rechercher un aliment..."
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={(t) => {
                  setSearchQuery(t);
                  if (t.length > 1) {
                    const local = QUICK_FOODS.filter((f) =>
                      f.name.toLowerCase().includes(t.toLowerCase())
                    );
                    setSearchResults(local);
                  } else {
                    setSearchResults([]);
                  }
                }}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity
                style={[styles.searchBtn, { backgroundColor: colors.primary }]}
                onPress={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <IconSymbol name="magnifyingglass" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {/* Quick suggestions */}
            {searchResults.length === 0 && searchQuery.length === 0 && (
              <View style={styles.quickSuggestions}>
                <Text style={[styles.quickTitle, { color: colors.muted }]}>Aliments fréquents :</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {QUICK_FOODS.slice(0, 8).map((food) => (
                    <TouchableOpacity
                      key={food.name}
                      style={[styles.quickChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                      onPress={() => addIngredient(food, 100)}
                    >
                      <Text style={[styles.quickChipText, { color: colors.primary }]}>+ {food.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Search results */}
            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.map((food) => (
                  <TouchableOpacity
                    key={food.name}
                    style={[styles.searchResultRow, { borderBottomColor: colors.border }]}
                    onPress={() => addIngredient(food, 100)}
                  >
                    <View style={styles.searchResultInfo}>
                      <Text style={[styles.searchResultName, { color: colors.foreground }]}>{food.name}</Text>
                      <Text style={[styles.searchResultMacros, { color: colors.muted }]}>
                        {food.per100g.calories} kcal · P {food.per100g.protein}g · G {food.per100g.carbs}g · L {food.per100g.fat}g (pour 100g)
                      </Text>
                    </View>
                    <View style={[styles.addFoodBtn, { backgroundColor: colors.primary }]}>
                      <IconSymbol name="plus" size={16} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Ingredients list */}
          {ingredients.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Composition du menu ({ingredients.length} aliment{ingredients.length > 1 ? "s" : ""})
              </Text>

              {ingredients.map((ing) => (
                <View key={ing.id} style={[styles.ingredientCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.ingredientHeader}>
                    <Text style={[styles.ingredientName, { color: colors.foreground }]}>{ing.name}</Text>
                    <TouchableOpacity onPress={() => removeIngredient(ing.id)}>
                      <IconSymbol name="xmark" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>

                  {/* Weight editor */}
                  {editingIngredient === ing.id ? (
                    <View style={styles.weightEditor}>
                      <TextInput
                        style={[styles.weightInput, { borderColor: colors.primary, color: colors.foreground, backgroundColor: colors.surface }]}
                        value={editWeight}
                        onChangeText={setEditWeight}
                        keyboardType="decimal-pad"
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => {
                          const w = parseFloat(editWeight);
                          if (!isNaN(w) && w > 0) updateIngredientWeight(ing.id, w);
                          else setEditingIngredient(null);
                        }}
                      />
                      <Text style={[styles.weightUnit, { color: colors.muted }]}>g CRU</Text>
                      <TouchableOpacity
                        style={[styles.confirmWeightBtn, { backgroundColor: colors.primary }]}
                        onPress={() => {
                          const w = parseFloat(editWeight);
                          if (!isNaN(w) && w > 0) updateIngredientWeight(ing.id, w);
                          else setEditingIngredient(null);
                        }}
                      >
                        <IconSymbol name="checkmark" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.weightDisplay}
                      onPress={() => {
                        setEditingIngredient(ing.id);
                        setEditWeight(ing.rawWeightG.toString());
                      }}
                    >
                      <View style={[styles.weightBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.weightBadgeText, { color: colors.primary }]}>
                          ⚖️ {ing.rawWeightG}g CRU
                        </Text>
                      </View>
                      {ing.cookedWeightG && ing.cookingKey && (
                        <View style={[styles.cookedBadge, { backgroundColor: colors.surface }]}>
                          <Text style={[styles.cookedBadgeText, { color: colors.muted }]}>
                            🍳 ≈ {ing.cookedWeightG}g cuit
                          </Text>
                        </View>
                      )}
                      <IconSymbol name="pencil" size={14} color={colors.muted} />
                    </TouchableOpacity>
                  )}

                  {/* Macros */}
                  <View style={styles.ingredientMacros}>
                    {[
                      { label: "Kcal", value: ing.macros.calories, color: colors.primary },
                      { label: "P", value: ing.macros.protein, color: "#9B7FD4", unit: "g" },
                      { label: "G", value: ing.macros.carbs, color: "#6EC6A0", unit: "g" },
                      { label: "L", value: ing.macros.fat, color: "#F5A623", unit: "g" },
                    ].map((m) => (
                      <View key={m.label} style={[styles.macroChip, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.macroChipValue, { color: m.color }]}>{m.value}{m.unit || ""}</Text>
                        <Text style={[styles.macroChipLabel, { color: colors.muted }]}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              {/* Total */}
              <View style={[styles.totalCard, { backgroundColor: colors.primary }]}>
                <Text style={styles.totalTitle}>Total du menu</Text>
                <View style={styles.totalMacros}>
                  {[
                    { label: "Calories", value: totalMacros.calories, unit: "kcal" },
                    { label: "Protéines", value: totalMacros.protein, unit: "g" },
                    { label: "Glucides", value: totalMacros.carbs, unit: "g" },
                    { label: "Lipides", value: totalMacros.fat, unit: "g" },
                  ].map((m) => (
                    <View key={m.label} style={styles.totalMacroItem}>
                      <Text style={styles.totalMacroValue}>{m.value}{m.unit}</Text>
                      <Text style={styles.totalMacroLabel}>{m.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Save button */}
          {ingredients.length > 0 && (
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.success }]}
              onPress={saveMenu}
            >
              <IconSymbol name="checkmark.circle.fill" size={22} color="#fff" />
              <Text style={styles.saveBtnText}>Sauvegarder ce menu</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {savedMenus.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📚</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucun menu sauvegardé</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Crée ton premier menu personnalisé avec les quantités exactes en grammes CRU.
              </Text>
              <TouchableOpacity
                style={[styles.switchTabBtn, { backgroundColor: colors.primaryLight }]}
                onPress={() => setActiveTab("builder")}
              >
                <Text style={[styles.switchTabText, { color: colors.primary }]}>Créer un menu →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            savedMenus.map((menu) => (
              <View key={menu.id} style={[styles.savedMenuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.savedMenuHeader}>
                  <View style={styles.savedMenuTitleRow}>
                    <Text style={styles.savedMenuEmoji}>{MEAL_TYPE_EMOJIS[menu.mealType]}</Text>
                    <View>
                      <Text style={[styles.savedMenuName, { color: colors.foreground }]}>{menu.name}</Text>
                      <Text style={[styles.savedMenuType, { color: colors.muted }]}>
                        {MEAL_TYPE_LABELS[menu.mealType]} · {menu.ingredients.length} aliment{menu.ingredients.length > 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteMenu(menu.id, menu.name)}>
                    <IconSymbol name="trash" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>

                {/* Macros totales */}
                <View style={styles.savedMenuMacros}>
                  {[
                    { label: "Kcal", value: menu.totalMacros.calories, color: colors.primary },
                    { label: "P", value: menu.totalMacros.protein, color: "#9B7FD4", unit: "g" },
                    { label: "G", value: menu.totalMacros.carbs, color: "#6EC6A0", unit: "g" },
                    { label: "L", value: menu.totalMacros.fat, color: "#F5A623", unit: "g" },
                  ].map((m) => (
                    <View key={m.label} style={[styles.savedMacroItem, { backgroundColor: colors.background }]}>
                      <Text style={[styles.savedMacroValue, { color: m.color }]}>{m.value}{m.unit || ""}</Text>
                      <Text style={[styles.savedMacroLabel, { color: colors.muted }]}>{m.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Ingredients detail */}
                <View style={styles.ingredientsList}>
                  {menu.ingredients.map((ing) => (
                    <View key={ing.id} style={styles.ingredientLine}>
                      <Text style={[styles.ingredientLineName, { color: colors.foreground }]}>{ing.name}</Text>
                      <View style={styles.ingredientLineWeights}>
                        <View style={[styles.rawBadge, { backgroundColor: colors.primaryLight }]}>
                          <Text style={[styles.rawBadgeText, { color: colors.primary }]}>{ing.rawWeightG}g CRU</Text>
                        </View>
                        {ing.cookedWeightG && (
                          <Text style={[styles.cookedText, { color: colors.muted }]}>≈ {ing.cookedWeightG}g cuit</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: "700", textAlign: "center" },
    tabs: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 16 },
    tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
    tabText: { fontSize: 13, fontWeight: "600" },
    content: { padding: 16, gap: 16, paddingBottom: 40 },
    card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
    cardTitle: { fontSize: 16, fontWeight: "700" },
    cardSubtitle: { fontSize: 12, marginTop: -6 },
    label: { fontSize: 13, fontWeight: "600" },
    input: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 15, height: 48 },
    mealTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    mealTypeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
    mealTypeEmoji: { fontSize: 16 },
    mealTypeText: { fontSize: 13, fontWeight: "600" },
    searchRow: { flexDirection: "row", gap: 8 },
    searchInput: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 14, height: 46 },
    searchBtn: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    quickSuggestions: { gap: 8 },
    quickTitle: { fontSize: 12, fontWeight: "600" },
    quickChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8 },
    quickChipText: { fontSize: 12, fontWeight: "600" },
    searchResults: { gap: 0 },
    searchResultRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
    searchResultInfo: { flex: 1, gap: 2 },
    searchResultName: { fontSize: 15, fontWeight: "600" },
    searchResultMacros: { fontSize: 11 },
    addFoodBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    ingredientCard: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
    ingredientHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    ingredientName: { fontSize: 15, fontWeight: "700", flex: 1 },
    weightDisplay: { flexDirection: "row", alignItems: "center", gap: 8 },
    weightBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    weightBadgeText: { fontSize: 13, fontWeight: "700" },
    cookedBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    cookedBadgeText: { fontSize: 12 },
    weightEditor: { flexDirection: "row", alignItems: "center", gap: 8 },
    weightInput: { width: 80, borderWidth: 2, borderRadius: 10, padding: 8, fontSize: 16, fontWeight: "700", textAlign: "center" },
    weightUnit: { fontSize: 13, fontWeight: "600" },
    confirmWeightBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    ingredientMacros: { flexDirection: "row", gap: 6 },
    macroChip: { flex: 1, alignItems: "center", padding: 6, borderRadius: 8 },
    macroChipValue: { fontSize: 13, fontWeight: "800" },
    macroChipLabel: { fontSize: 10 },
    totalCard: { padding: 16, borderRadius: 14, gap: 8 },
    totalTitle: { color: "#fff", fontSize: 14, fontWeight: "700", textAlign: "center" },
    totalMacros: { flexDirection: "row", justifyContent: "space-around" },
    totalMacroItem: { alignItems: "center" },
    totalMacroValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
    totalMacroLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 },
    saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16 },
    saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: "700" },
    emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
    switchTabBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
    switchTabText: { fontSize: 14, fontWeight: "700" },
    savedMenuCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
    savedMenuHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    savedMenuTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    savedMenuEmoji: { fontSize: 28 },
    savedMenuName: { fontSize: 16, fontWeight: "700" },
    savedMenuType: { fontSize: 12, marginTop: 2 },
    savedMenuMacros: { flexDirection: "row", gap: 8 },
    savedMacroItem: { flex: 1, alignItems: "center", padding: 8, borderRadius: 10 },
    savedMacroValue: { fontSize: 15, fontWeight: "800" },
    savedMacroLabel: { fontSize: 10, marginTop: 2 },
    ingredientsList: { gap: 6 },
    ingredientLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    ingredientLineName: { fontSize: 13, fontWeight: "600", flex: 1 },
    ingredientLineWeights: { flexDirection: "row", alignItems: "center", gap: 6 },
    rawBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    rawBadgeText: { fontSize: 11, fontWeight: "700" },
    cookedText: { fontSize: 11 },
  });
}
