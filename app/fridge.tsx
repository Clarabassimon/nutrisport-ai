import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getUserProfile, saveToCollection } from "@/lib/storage";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import type { SavedRecipe } from "@/lib/types";

// ─── Types locaux ────────────────────────────────────────────────────────────

interface LocalIngredient {
  id: string;
  name: string;
  quantity: string;
}

interface FridgeRecipe {
  name: string;
  description: string;
  prepTime: number;
  ingredients: Array<{ name: string; quantity: string }>;
  steps: string[];
  macros: { calories: number; protein: number; carbs: number; fat: number };
}

type Screen = "add" | "list" | "recipes" | "recipe_detail";

// ─── Écran principal ─────────────────────────────────────────────────────────

export default function FridgeScreen() {
  const colors = useColors();

  const [screen, setScreen] = useState<Screen>("add");
  const [ingredientName, setIngredientName] = useState("");
  const [ingredientQty, setIngredientQty] = useState("");
  const quantityRef = useRef<TextInput>(null);

  const [ingredients, setIngredients] = useState<LocalIngredient[]>([]);
  const [recipes, setRecipes] = useState<FridgeRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<FridgeRecipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<Record<string, "to_try" | "favorites">>({});

  const generateFridgeRecipes = trpc.nutrition.generateFridgeRecipes.useMutation();

  const handleAddIngredient = useCallback(() => {
    const name = ingredientName.trim();
    if (!name) return;
    const qty = ingredientQty.trim();
    const newItem: LocalIngredient = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name,
      quantity: qty || "qté libre",
    };
    setIngredients((prev) => [...prev, newItem]);
    setIngredientName("");
    setIngredientQty("");
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [ingredientName, ingredientQty]);

  const handleRemoveIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  const handleGenerateRecipes = useCallback(async () => {
    if (ingredients.length === 0) return;
    setLoading(true);
    setScreen("recipes");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const profile = await getUserProfile();
      const ingredientStrings = ingredients.map(
        (i) => `${i.name}${i.quantity !== "qté libre" ? ` (${i.quantity})` : ""}`
      );
      const result = await generateFridgeRecipes.mutateAsync({
        ingredients: ingredientStrings,
        targetProtein: profile?.targetProtein,
        targetCarbs: profile?.targetCarbs,
        targetFat: profile?.targetFat,
        goal: profile?.goal,
      });
      setRecipes(result.recipes ?? []);
    } catch (e) {
      console.error(e);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [ingredients, generateFridgeRecipes]);

  const handleSaveRecipe = async (recipe: FridgeRecipe, collection: "to_try" | "favorites") => {
    const recipeId = `fridge_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const saved: SavedRecipe = {
      id: recipeId,
      name: recipe.name,
      description: recipe.description,
      prepTime: recipe.prepTime,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      macros: recipe.macros,
      savedAt: new Date().toISOString(),
      collection,
      source: "fridge",
    };
    await saveToCollection(saved);
    setSavedIds((prev) => ({ ...prev, [recipe.name]: collection }));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      collection === "to_try" ? "✅ Ajoutée à essayer !" : "⭐ Ajoutée aux favoris !",
      `"${recipe.name}" a été sauvegardée dans ${collection === "to_try" ? "Mes recettes à essayer" : "Mes recettes préférées"}.`,
      [{ text: "OK" }]
    );
  };

  const styles = createStyles(colors);

  const handleBack = () => {
    if (screen === "recipe_detail") setScreen("recipes");
    else if (screen === "recipes") setScreen("list");
    else if (screen === "list") setScreen("add");
    else router.back();
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {screen === "add" && "🧊 Mon Frigo"}
          {screen === "list" && `🧊 Mes ingrédients (${ingredients.length})`}
          {screen === "recipes" && "🍳 5 Recettes suggérées"}
          {screen === "recipe_detail" && "📋 Recette"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* ── Saisie ingrédient ── */}
      {screen === "add" && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.addContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[styles.infoCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Text style={[styles.infoTitle, { color: colors.primary }]}>🧊 Qu'est-ce qu'il y a dans ton frigo ?</Text>
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                Saisis tes ingrédients un par un avec leur quantité. Ensuite, l'IA te proposera 5 recettes adaptées à ce que tu as !
              </Text>
            </View>

            <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>Ingrédient</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Ex: Poulet, Riz, Brocoli..."
                placeholderTextColor={colors.muted}
                value={ingredientName}
                onChangeText={setIngredientName}
                returnKeyType="next"
                onSubmitEditing={() => quantityRef.current?.focus()}
                autoCapitalize="words"
              />
              <Text style={[styles.inputLabel, { color: colors.foreground, marginTop: 12 }]}>Quantité (optionnel)</Text>
              <TextInput
                ref={quantityRef}
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Ex: 200g, 3 unités, 1 boîte..."
                placeholderTextColor={colors.muted}
                value={ingredientQty}
                onChangeText={setIngredientQty}
                returnKeyType="done"
                onSubmitEditing={handleAddIngredient}
              />
              <TouchableOpacity
                style={[styles.okBtn, { backgroundColor: ingredientName.trim() ? colors.primary : colors.border }]}
                onPress={handleAddIngredient}
                disabled={!ingredientName.trim()}
              >
                <Text style={[styles.okBtnText, { color: ingredientName.trim() ? "#fff" : colors.muted }]}>
                  ✓ OK — Ajouter
                </Text>
              </TouchableOpacity>
            </View>

            {ingredients.length > 0 && (
              <View style={styles.addedSection}>
                <Text style={[styles.addedTitle, { color: colors.foreground }]}>
                  Ingrédients ajoutés ({ingredients.length})
                </Text>
                {ingredients.map((item) => (
                  <View key={item.id} style={[styles.addedItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={styles.addedEmoji}>🥗</Text>
                    <View style={styles.addedInfo}>
                      <Text style={[styles.addedName, { color: colors.foreground }]}>{item.name}</Text>
                      <Text style={[styles.addedQty, { color: colors.muted }]}>{item.quantity}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveIngredient(item.id)} style={styles.removeBtn}>
                      <IconSymbol name="xmark" size={14} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {ingredients.length > 0 && (
              <TouchableOpacity
                style={[styles.continueBtn, { backgroundColor: colors.primary }]}
                onPress={() => setScreen("list")}
              >
                <Text style={styles.continueBtnText}>
                  Voir ma liste ({ingredients.length} ingrédient{ingredients.length > 1 ? "s" : ""}) →
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── Liste des ingrédients ── */}
      {screen === "list" && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={ingredients}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View>
                <View style={[styles.listSummary, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                  <Text style={[styles.listSummaryTitle, { color: colors.primary }]}>
                    🧊 {ingredients.length} ingrédient{ingredients.length > 1 ? "s" : ""} dans ton frigo
                  </Text>
                  <Text style={[styles.listSummaryText, { color: colors.foreground }]}>
                    Vérifie ta liste et clique sur "Créer 5 recettes" pour que l'IA te propose des idées !
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.addMoreBtn, { borderColor: colors.primary }]}
                  onPress={() => setScreen("add")}
                >
                  <IconSymbol name="plus" size={16} color={colors.primary} />
                  <Text style={[styles.addMoreText, { color: colors.primary }]}>Ajouter un ingrédient</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.listItemEmoji}>🥗</Text>
                <View style={styles.listItemInfo}>
                  <Text style={[styles.listItemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.listItemQty, { color: colors.muted }]}>{item.quantity}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveIngredient(item.id)}>
                  <IconSymbol name="xmark.circle.fill" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            )}
            ListFooterComponent={<View style={{ height: 120 }} />}
          />
          <View style={[styles.generateBtnContainer, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[styles.generateBtn, { backgroundColor: colors.primary }]}
              onPress={handleGenerateRecipes}
            >
              <Text style={styles.generateBtnEmoji}>🍳</Text>
              <Text style={styles.generateBtnText}>Créer 5 recettes avec mes ingrédients</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Recettes générées ── */}
      {screen === "recipes" && (
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.foreground }]}>
                L'IA crée 5 recettes avec tes ingrédients...
              </Text>
              <Text style={[styles.loadingSubtext, { color: colors.muted }]}>
                Cela prend environ 10-15 secondes
              </Text>
            </View>
          ) : recipes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>😕</Text>
              <Text style={[styles.emptyText, { color: colors.foreground }]}>Aucune recette générée</Text>
              <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={handleGenerateRecipes}>
                <Text style={styles.retryBtnText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={recipes}
              keyExtractor={(_, i) => `recipe_${i}`}
              contentContainerStyle={styles.recipesContent}
              ListHeaderComponent={
                <Text style={[styles.recipesHeader, { color: colors.muted }]}>
                  {recipes.length} recette{recipes.length > 1 ? "s" : ""} créée{recipes.length > 1 ? "s" : ""} avec tes ingrédients
                </Text>
              }
              renderItem={({ item, index }) => {
                const isSaved = savedIds[item.name];
                return (
                  <TouchableOpacity
                    style={[styles.recipeCard, { backgroundColor: colors.surface, borderColor: isSaved ? colors.primary : colors.border }]}
                    onPress={() => { setSelectedRecipe(item); setScreen("recipe_detail"); }}
                  >
                    <View style={styles.recipeCardHeader}>
                      <View style={[styles.recipeNumber, { backgroundColor: colors.primary }]}>
                        <Text style={styles.recipeNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.recipeTitleBlock}>
                        <Text style={[styles.recipeCardName, { color: colors.foreground }]}>{item.name}</Text>
                        <Text style={[styles.recipeCardDesc, { color: colors.muted }]} numberOfLines={2}>{item.description}</Text>
                      </View>
                    </View>
                    <View style={styles.recipeMacros}>
                      {[
                        { label: "kcal", value: item.macros.calories, color: colors.primary },
                        { label: "P", value: item.macros.protein, color: "#9B7FD4" },
                        { label: "G", value: item.macros.carbs, color: "#6EC6A0" },
                        { label: "L", value: item.macros.fat, color: "#F5A623" },
                      ].map((m) => (
                        <View key={m.label} style={[styles.macroChip, { backgroundColor: m.color + "22" }]}>
                          <Text style={[styles.macroChipValue, { color: m.color }]}>{m.value}</Text>
                          <Text style={[styles.macroChipLabel, { color: m.color }]}>{m.label}</Text>
                        </View>
                      ))}
                      <Text style={[styles.prepTime, { color: colors.muted }]}>⏱ {item.prepTime} min</Text>
                    </View>
                    {isSaved ? (
                      <View style={[styles.savedBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.savedBadgeText, { color: colors.primary }]}>
                          {isSaved === "to_try" ? "✅ Ajoutée à essayer" : "⭐ Ajoutée aux favoris"}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.saveButtons}>
                        <TouchableOpacity
                          style={[styles.saveBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                          onPress={() => handleSaveRecipe(item, "to_try")}
                        >
                          <Text style={[styles.saveBtnText, { color: colors.primary }]}>✅ À essayer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.saveBtn, { backgroundColor: "#F5A62322", borderColor: "#F5A623" }]}
                          onPress={() => handleSaveRecipe(item, "favorites")}
                        >
                          <Text style={[styles.saveBtnText, { color: "#F5A623" }]}>⭐ Favoris</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListFooterComponent={<View style={{ height: 40 }} />}
            />
          )}
        </View>
      )}

      {/* ── Détail recette ── */}
      {screen === "recipe_detail" && selectedRecipe && (
        <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.detailName, { color: colors.foreground }]}>{selectedRecipe.name}</Text>
          <Text style={[styles.detailDesc, { color: colors.muted }]}>{selectedRecipe.description}</Text>

          <View style={[styles.detailMacrosCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailSectionTitle, { color: colors.foreground }]}>Valeurs nutritionnelles</Text>
            <View style={styles.detailMacrosRow}>
              {[
                { label: "Calories", value: `${selectedRecipe.macros.calories} kcal`, color: colors.primary },
                { label: "Protéines", value: `${selectedRecipe.macros.protein}g`, color: "#9B7FD4" },
                { label: "Glucides", value: `${selectedRecipe.macros.carbs}g`, color: "#6EC6A0" },
                { label: "Lipides", value: `${selectedRecipe.macros.fat}g`, color: "#F5A623" },
              ].map((m) => (
                <View key={m.label} style={[styles.detailMacroItem, { backgroundColor: m.color + "22" }]}>
                  <Text style={[styles.detailMacroValue, { color: m.color }]}>{m.value}</Text>
                  <Text style={[styles.detailMacroLabel, { color: colors.muted }]}>{m.label}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.detailPrepTime, { color: colors.muted }]}>⏱ Préparation : {selectedRecipe.prepTime} min</Text>
          </View>

          <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailSectionTitle, { color: colors.foreground }]}>🛒 Ingrédients</Text>
            {selectedRecipe.ingredients.map((ing, i) => (
              <View key={i} style={styles.detailIngredient}>
                <Text style={[styles.detailIngredientDot, { color: colors.primary }]}>•</Text>
                <Text style={[styles.detailIngredientText, { color: colors.foreground }]}>
                  <Text style={{ fontWeight: "700" }}>{ing.quantity}</Text> {ing.name}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailSectionTitle, { color: colors.foreground }]}>👨‍🍳 Préparation</Text>
            {selectedRecipe.steps.map((step, i) => (
              <View key={i} style={styles.detailStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
              </View>
            ))}
          </View>

          {savedIds[selectedRecipe.name] ? (
            <View style={[styles.savedBadgeLarge, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Text style={[styles.savedBadgeLargeText, { color: colors.primary }]}>
                {savedIds[selectedRecipe.name] === "to_try" ? "✅ Ajoutée à Mes recettes à essayer" : "⭐ Ajoutée à Mes recettes préférées"}
              </Text>
            </View>
          ) : (
            <View style={styles.detailSaveButtons}>
              <TouchableOpacity
                style={[styles.detailSaveBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                onPress={() => handleSaveRecipe(selectedRecipe, "to_try")}
              >
                <Text style={[styles.detailSaveBtnText, { color: colors.primary }]}>✅ Ajouter à "Mes recettes à essayer"</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.detailSaveBtn, { backgroundColor: "#F5A62322", borderColor: "#F5A623" }]}
                onPress={() => handleSaveRecipe(selectedRecipe, "favorites")}
              >
                <Text style={[styles.detailSaveBtnText, { color: "#F5A623" }]}>⭐ Ajouter à "Mes recettes préférées"</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },

    addContent: { padding: 16, gap: 16 },
    infoCard: { padding: 14, borderRadius: 14, borderWidth: 1.5, gap: 6 },
    infoTitle: { fontSize: 15, fontWeight: "700" },
    infoText: { fontSize: 13, lineHeight: 19 },
    inputCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 4 },
    inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
    textInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
    okBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
    okBtnText: { fontSize: 16, fontWeight: "700" },
    addedSection: { gap: 8 },
    addedTitle: { fontSize: 15, fontWeight: "700" },
    addedItem: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
    addedEmoji: { fontSize: 20 },
    addedInfo: { flex: 1 },
    addedName: { fontSize: 14, fontWeight: "600" },
    addedQty: { fontSize: 12 },
    removeBtn: { padding: 4 },
    continueBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center" },
    continueBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    listContent: { padding: 16, gap: 10 },
    listSummary: { padding: 14, borderRadius: 14, borderWidth: 1.5, gap: 6, marginBottom: 12 },
    listSummaryTitle: { fontSize: 15, fontWeight: "700" },
    listSummaryText: { fontSize: 13, lineHeight: 18 },
    addMoreBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", justifyContent: "center", marginBottom: 8 },
    addMoreText: { fontSize: 14, fontWeight: "600" },
    listItem: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
    listItemEmoji: { fontSize: 22 },
    listItemInfo: { flex: 1 },
    listItemName: { fontSize: 15, fontWeight: "600" },
    listItemQty: { fontSize: 12, marginTop: 2 },
    generateBtnContainer: { paddingHorizontal: 16, paddingVertical: 12 },
    generateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 18 },
    generateBtnEmoji: { fontSize: 22 },
    generateBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

    loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
    loadingText: { fontSize: 16, fontWeight: "600", textAlign: "center" },
    loadingSubtext: { fontSize: 13, textAlign: "center" },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
    emptyEmoji: { fontSize: 48 },
    emptyText: { fontSize: 16, fontWeight: "600" },
    retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    retryBtnText: { color: "#fff", fontWeight: "700" },
    recipesContent: { padding: 16, gap: 14 },
    recipesHeader: { fontSize: 13, marginBottom: 4, textAlign: "center" },
    recipeCard: { borderRadius: 18, borderWidth: 1.5, padding: 16, gap: 12 },
    recipeCardHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    recipeNumber: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    recipeNumberText: { color: "#fff", fontSize: 15, fontWeight: "800" },
    recipeTitleBlock: { flex: 1 },
    recipeCardName: { fontSize: 16, fontWeight: "700" },
    recipeCardDesc: { fontSize: 13, lineHeight: 18, marginTop: 2 },
    recipeMacros: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    macroChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: "center" },
    macroChipValue: { fontSize: 13, fontWeight: "700" },
    macroChipLabel: { fontSize: 10 },
    prepTime: { fontSize: 12, marginLeft: "auto" },
    saveButtons: { flexDirection: "row", gap: 8 },
    saveBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, alignItems: "center" },
    saveBtnText: { fontSize: 13, fontWeight: "700" },
    savedBadge: { paddingVertical: 8, borderRadius: 10, alignItems: "center" },
    savedBadgeText: { fontSize: 13, fontWeight: "700" },

    detailContent: { padding: 16, gap: 16 },
    detailName: { fontSize: 24, fontWeight: "800" },
    detailDesc: { fontSize: 14, lineHeight: 20 },
    detailMacrosCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
    detailSectionTitle: { fontSize: 16, fontWeight: "700" },
    detailMacrosRow: { flexDirection: "row", gap: 8 },
    detailMacroItem: { flex: 1, padding: 10, borderRadius: 12, alignItems: "center", gap: 2 },
    detailMacroValue: { fontSize: 15, fontWeight: "800" },
    detailMacroLabel: { fontSize: 10 },
    detailPrepTime: { fontSize: 13 },
    detailSection: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
    detailIngredient: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
    detailIngredientDot: { fontSize: 16, lineHeight: 22 },
    detailIngredientText: { flex: 1, fontSize: 14, lineHeight: 22 },
    detailStep: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    stepNumber: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 2 },
    stepNumberText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    stepText: { flex: 1, fontSize: 14, lineHeight: 21 },
    detailSaveButtons: { gap: 10 },
    detailSaveBtn: { paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, alignItems: "center" },
    detailSaveBtnText: { fontSize: 15, fontWeight: "700" },
    savedBadgeLarge: { paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, alignItems: "center" },
    savedBadgeLargeText: { fontSize: 15, fontWeight: "700" },
  });
}
