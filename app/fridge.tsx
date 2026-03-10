import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { loadUserProfile, loadFridgeIngredients, saveFridgeIngredients } from "@/lib/storage";
import type { FridgeIngredient, ShoppingCategory } from "@/lib/types";
import { SHOPPING_CATEGORY_LABELS, SHOPPING_CATEGORY_ICONS } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";

const CATEGORIES: ShoppingCategory[] = ["proteins", "vegetables", "fruits", "starches", "grocery", "fresh"];

const SUGGESTED_INGREDIENTS: Record<ShoppingCategory, string[]> = {
  proteins: ["Blanc de poulet", "Thon en boîte", "Œufs", "Saumon", "Steak haché", "Tofu", "Fromage blanc 0%", "Jambon blanc"],
  vegetables: ["Épinards", "Brocoli", "Courgette", "Haricots verts", "Tomates", "Poivrons", "Champignons", "Salade"],
  fruits: ["Banane", "Pomme", "Myrtilles", "Fraises", "Orange", "Avocat"],
  starches: ["Riz", "Pâtes", "Patate douce", "Flocons d'avoine", "Pain complet", "Quinoa", "Lentilles"],
  grocery: ["Huile d'olive", "Sauce soja", "Moutarde", "Épices", "Bouillon", "Conserves"],
  fresh: ["Yaourt grec", "Lait", "Fromage", "Beurre", "Crème fraîche"],
};

interface GeneratedRecipe {
  name: string;
  description: string;
  prepTime: number;
  ingredients: Array<{ name: string; quantity: string }>;
  steps: string[];
  macros: { calories: number; protein: number; carbs: number; fat: number };
}

export default function FridgeScreen() {
  const colors = useColors();
  const [ingredients, setIngredients] = useState<FridgeIngredient[]>([]);
  const [newIngredient, setNewIngredient] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ShoppingCategory>("proteins");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipe[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"fridge" | "recipes">("fridge");

  useEffect(() => {
    loadFridgeIngredients().then((saved) => {
      if (saved) setIngredients(saved);
    });
  }, []);

  const saveIngredients = async (updated: FridgeIngredient[]) => {
    setIngredients(updated);
    await saveFridgeIngredients(updated);
  };

  const addIngredient = async (name: string, qty?: string) => {
    if (!name.trim()) return;
    const newItem: FridgeIngredient = {
      id: Date.now().toString(),
      name: name.trim(),
      quantity: qty?.trim() || undefined,
      category: selectedCategory,
      addedAt: new Date().toISOString(),
    };
    await saveIngredients([...ingredients, newItem]);
    setNewIngredient("");
    setNewQuantity("");
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeIngredient = async (id: string) => {
    await saveIngredients(ingredients.filter((i) => i.id !== id));
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const clearAll = () => {
    Alert.alert("Vider le frigo", "Supprimer tous les ingrédients ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Vider", style: "destructive", onPress: () => saveIngredients([]) },
    ]);
  };

  const generateRecipes = trpc.nutrition.generateFridgeRecipes.useMutation({
    onSuccess: (data) => {
      setGeneratedRecipes(data.recipes);
      setActiveTab("recipes");
      setIsGenerating(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      setIsGenerating(false);
      Alert.alert("Erreur", "Impossible de générer les recettes. Réessaie.");
    },
  });

  const handleGenerateRecipes = async () => {
    if (ingredients.length === 0) {
      Alert.alert("Frigo vide", "Ajoute des ingrédients avant de générer des recettes.");
      return;
    }
    setIsGenerating(true);
    const profile = await loadUserProfile();
    const ingredientNames = ingredients.map((i) => `${i.name}${i.quantity ? ` (${i.quantity})` : ""}`);
    generateRecipes.mutate({
      ingredients: ingredientNames,
      targetProtein: profile?.targetProtein,
      targetCarbs: profile?.targetCarbs,
      targetFat: profile?.targetFat,
      goal: profile?.goal,
    });
  };

  const groupedIngredients = CATEGORIES.reduce((acc, cat) => {
    const items = ingredients.filter((i) => i.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<ShoppingCategory, FridgeIngredient[]>);

  const styles = createStyles(colors);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>🧊 Mon Frigo</Text>
        {ingredients.length > 0 && (
          <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
            <Text style={[styles.clearText, { color: colors.error }]}>Vider</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(["fridge", "recipes"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.muted }]}>
              {tab === "fridge" ? `🧊 Ingrédients (${ingredients.length})` : "🍽️ Recettes générées"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "fridge" ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Add ingredient */}
          <View style={[styles.addCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.addTitle, { color: colors.foreground }]}>Ajouter un ingrédient</Text>

            {/* Category selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: selectedCategory === cat ? colors.primary : colors.background, borderColor: selectedCategory === cat ? colors.primary : colors.border },
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setShowSuggestions(true);
                  }}
                >
                  <Text style={styles.categoryChipEmoji}>{SHOPPING_CATEGORY_ICONS[cat]}</Text>
                  <Text style={[styles.categoryChipText, { color: selectedCategory === cat ? "#fff" : colors.foreground }]}>
                    {SHOPPING_CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Suggestions */}
            {showSuggestions && (
              <View style={styles.suggestions}>
                <Text style={[styles.suggestionsTitle, { color: colors.muted }]}>Suggestions :</Text>
                <View style={styles.suggestionsGrid}>
                  {SUGGESTED_INGREDIENTS[selectedCategory].map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.suggestionChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                      onPress={() => addIngredient(s)}
                    >
                      <Text style={[styles.suggestionText, { color: colors.primary }]}>+ {s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Manual input */}
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.nameInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                placeholder="Nom de l'ingrédient"
                placeholderTextColor={colors.muted}
                value={newIngredient}
                onChangeText={setNewIngredient}
                returnKeyType="done"
              />
              <TextInput
                style={[styles.qtyInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                placeholder="Qté (opt.)"
                placeholderTextColor={colors.muted}
                value={newQuantity}
                onChangeText={setNewQuantity}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={() => addIngredient(newIngredient, newQuantity)}
              >
                <IconSymbol name="plus" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Ingredients list */}
          {Object.keys(groupedIngredients).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🧊</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Frigo vide</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Ajoute les ingrédients que tu as chez toi pour que l'IA te propose des recettes adaptées à tes macros.
              </Text>
            </View>
          ) : (
            Object.entries(groupedIngredients).map(([cat, items]) => (
              <View key={cat} style={styles.categorySection}>
                <Text style={[styles.categorySectionTitle, { color: colors.muted }]}>
                  {SHOPPING_CATEGORY_ICONS[cat as ShoppingCategory]} {SHOPPING_CATEGORY_LABELS[cat as ShoppingCategory]}
                </Text>
                {items.map((item) => (
                  <View key={item.id} style={[styles.ingredientRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.ingredientInfo}>
                      <Text style={[styles.ingredientName, { color: colors.foreground }]}>{item.name}</Text>
                      {item.quantity && (
                        <Text style={[styles.ingredientQty, { color: colors.muted }]}>{item.quantity}</Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => removeIngredient(item.id)} style={styles.removeBtn}>
                      <IconSymbol name="xmark" size={16} color={colors.muted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))
          )}

          {/* Generate button */}
          {ingredients.length > 0 && (
            <TouchableOpacity
              style={[styles.generateBtn, { backgroundColor: colors.primary }]}
              onPress={handleGenerateRecipes}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.generateBtnText}>✨ Générer des recettes avec mon frigo</Text>
                  <Text style={[styles.generateBtnSub, { color: "rgba(255,255,255,0.8)" }]}>
                    {ingredients.length} ingrédient{ingredients.length > 1 ? "s" : ""} · Adapté à tes macros
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {generatedRecipes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucune recette générée</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Ajoute des ingrédients dans ton frigo et génère des recettes adaptées à tes macros.
              </Text>
              <TouchableOpacity
                style={[styles.switchTabBtn, { backgroundColor: colors.primaryLight }]}
                onPress={() => setActiveTab("fridge")}
              >
                <Text style={[styles.switchTabText, { color: colors.primary }]}>Aller au frigo →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            generatedRecipes.map((recipe, index) => (
              <View key={index} style={[styles.recipeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.recipeHeader}>
                  <Text style={[styles.recipeName, { color: colors.foreground }]}>{recipe.name}</Text>
                  <View style={[styles.prepTimeBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.prepTimeText, { color: colors.primary }]}>⏱ {recipe.prepTime} min</Text>
                  </View>
                </View>
                <Text style={[styles.recipeDesc, { color: colors.muted }]}>{recipe.description}</Text>

                {/* Macros */}
                <View style={styles.recipeMacros}>
                  {[
                    { label: "Kcal", value: recipe.macros.calories, color: colors.primary },
                    { label: "P", value: recipe.macros.protein, color: "#9B7FD4", unit: "g" },
                    { label: "G", value: recipe.macros.carbs, color: "#6EC6A0", unit: "g" },
                    { label: "L", value: recipe.macros.fat, color: "#F5A623", unit: "g" },
                  ].map((m) => (
                    <View key={m.label} style={[styles.recipeMacroItem, { backgroundColor: colors.background }]}>
                      <Text style={[styles.recipeMacroValue, { color: m.color }]}>{m.value}{m.unit || ""}</Text>
                      <Text style={[styles.recipeMacroLabel, { color: colors.muted }]}>{m.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Ingredients */}
                <Text style={[styles.recipeSection, { color: colors.foreground }]}>Ingrédients :</Text>
                {recipe.ingredients.map((ing, i) => (
                  <Text key={i} style={[styles.recipeIngredient, { color: colors.muted }]}>
                    • {ing.quantity} {ing.name}
                  </Text>
                ))}

                {/* Steps */}
                <Text style={[styles.recipeSection, { color: colors.foreground }]}>Préparation :</Text>
                {recipe.steps.map((step, i) => (
                  <View key={i} style={styles.recipeStep}>
                    <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
                  </View>
                ))}
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
    headerTitle: { flex: 1, fontSize: 20, fontWeight: "700" },
    clearBtn: { padding: 4 },
    clearText: { fontSize: 14, fontWeight: "600" },
    tabs: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 16 },
    tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
    tabText: { fontSize: 13, fontWeight: "600" },
    content: { padding: 16, gap: 16, paddingBottom: 40 },
    addCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
    addTitle: { fontSize: 16, fontWeight: "700" },
    categoryScroll: { marginHorizontal: -4 },
    categoryChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginHorizontal: 4 },
    categoryChipEmoji: { fontSize: 16 },
    categoryChipText: { fontSize: 12, fontWeight: "600" },
    suggestions: { gap: 8 },
    suggestionsTitle: { fontSize: 12, fontWeight: "600" },
    suggestionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    suggestionChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    suggestionText: { fontSize: 12, fontWeight: "600" },
    inputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    nameInput: { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 10, fontSize: 14, height: 44 },
    qtyInput: { width: 80, borderWidth: 1.5, borderRadius: 10, padding: 10, fontSize: 14, height: 44 },
    addBtn: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: "700" },
    emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
    categorySection: { gap: 8 },
    categorySectionTitle: { fontSize: 13, fontWeight: "700", paddingLeft: 4 },
    ingredientRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1 },
    ingredientInfo: { flex: 1, gap: 2 },
    ingredientName: { fontSize: 15, fontWeight: "600" },
    ingredientQty: { fontSize: 12 },
    removeBtn: { padding: 4 },
    generateBtn: { padding: 20, borderRadius: 16, alignItems: "center", gap: 4 },
    generateBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    generateBtnSub: { fontSize: 12 },
    switchTabBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
    switchTabText: { fontSize: 14, fontWeight: "700" },
    recipeCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 10 },
    recipeHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
    recipeName: { flex: 1, fontSize: 17, fontWeight: "700", lineHeight: 22 },
    prepTimeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    prepTimeText: { fontSize: 12, fontWeight: "600" },
    recipeDesc: { fontSize: 13, lineHeight: 18 },
    recipeMacros: { flexDirection: "row", gap: 8 },
    recipeMacroItem: { flex: 1, alignItems: "center", padding: 8, borderRadius: 10 },
    recipeMacroValue: { fontSize: 15, fontWeight: "800" },
    recipeMacroLabel: { fontSize: 10, marginTop: 2 },
    recipeSection: { fontSize: 14, fontWeight: "700", marginTop: 4 },
    recipeIngredient: { fontSize: 13, lineHeight: 20, paddingLeft: 4 },
    recipeStep: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    stepNumber: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 1 },
    stepNumberText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    stepText: { flex: 1, fontSize: 13, lineHeight: 19 },
  });
}
