import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { loadRecipeCollections, removeFromCollection, moveToCollection } from "@/lib/storage";
import type { SavedRecipe, RecipeCollectionType } from "@/lib/types";
import * as Haptics from "expo-haptics";

type Tab = "to_try" | "favorites";
type DetailScreen = null | SavedRecipe;

export default function MyRecipesScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<Tab>("to_try");
  const [toTry, setToTry] = useState<SavedRecipe[]>([]);
  const [favorites, setFavorites] = useState<SavedRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<DetailScreen>(null);

  const loadCollections = useCallback(async () => {
    const cols = await loadRecipeCollections();
    setToTry(cols.to_try);
    setFavorites(cols.favorites);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCollections();
    }, [loadCollections])
  );

  const handleDelete = (recipe: SavedRecipe) => {
    Alert.alert(
      "Supprimer la recette",
      `Supprimer "${recipe.name}" de ta collection ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await removeFromCollection(recipe.id, recipe.collection);
            await loadCollections();
            if (selectedRecipe?.id === recipe.id) setSelectedRecipe(null);
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  };

  const handleMove = async (recipe: SavedRecipe) => {
    const from = recipe.collection;
    const to: RecipeCollectionType = from === "to_try" ? "favorites" : "to_try";
    await moveToCollection(recipe.id, from, to);
    await loadCollections();
    if (selectedRecipe?.id === recipe.id) {
      setSelectedRecipe({ ...recipe, collection: to });
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      to === "favorites" ? "⭐ Déplacée aux favoris !" : "✅ Déplacée à essayer !",
      `"${recipe.name}" a été déplacée.`,
      [{ text: "OK" }]
    );
  };

  const styles = createStyles(colors);
  const currentList = activeTab === "to_try" ? toTry : favorites;

  // ── Détail recette ────────────────────────────────────────────────────────
  if (selectedRecipe) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedRecipe(null)} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>📋 Recette</Text>
          <TouchableOpacity onPress={() => handleDelete(selectedRecipe)} style={styles.deleteBtn}>
            <IconSymbol name="trash" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
          {/* Badge collection */}
          <View style={[
            styles.collectionBadge,
            { backgroundColor: selectedRecipe.collection === "favorites" ? "#F5A62322" : colors.primaryLight }
          ]}>
            <Text style={[
              styles.collectionBadgeText,
              { color: selectedRecipe.collection === "favorites" ? "#F5A623" : colors.primary }
            ]}>
              {selectedRecipe.collection === "favorites" ? "⭐ Mes recettes préférées" : "✅ Mes recettes à essayer"}
            </Text>
          </View>

          <Text style={[styles.detailName, { color: colors.foreground }]}>{selectedRecipe.name}</Text>
          <Text style={[styles.detailDesc, { color: colors.muted }]}>{selectedRecipe.description}</Text>

          {/* Macros */}
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

          {/* Ingrédients */}
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

          {/* Étapes */}
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

          {/* Bouton déplacer */}
          <TouchableOpacity
            style={[styles.moveBtn, {
              backgroundColor: selectedRecipe.collection === "to_try" ? "#F5A62322" : colors.primaryLight,
              borderColor: selectedRecipe.collection === "to_try" ? "#F5A623" : colors.primary,
            }]}
            onPress={() => handleMove(selectedRecipe)}
          >
            <Text style={[styles.moveBtnText, {
              color: selectedRecipe.collection === "to_try" ? "#F5A623" : colors.primary,
            }]}>
              {selectedRecipe.collection === "to_try"
                ? "⭐ Déplacer vers Mes recettes préférées"
                : "✅ Déplacer vers Mes recettes à essayer"}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ── Liste des collections ─────────────────────────────────────────────────
  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>📚 Mes Recettes</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "to_try" && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
          onPress={() => setActiveTab("to_try")}
        >
          <Text style={[styles.tabText, { color: activeTab === "to_try" ? colors.primary : colors.muted }]}>
            ✅ À essayer ({toTry.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "favorites" && { borderBottomColor: "#F5A623", borderBottomWidth: 2.5 }]}
          onPress={() => setActiveTab("favorites")}
        >
          <Text style={[styles.tabText, { color: activeTab === "favorites" ? "#F5A623" : colors.muted }]}>
            ⭐ Préférées ({favorites.length})
          </Text>
        </TouchableOpacity>
      </View>

      {currentList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>{activeTab === "to_try" ? "✅" : "⭐"}</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {activeTab === "to_try" ? "Aucune recette à essayer" : "Aucune recette favorite"}
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {activeTab === "to_try"
              ? "Génère des recettes depuis le Frigo et sauvegarde celles qui t'intéressent !"
              : "Marque tes recettes préférées depuis le Frigo ou depuis \"À essayer\"."}
          </Text>
          <TouchableOpacity
            style={[styles.goFridgeBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/fridge" as any)}
          >
            <Text style={styles.goFridgeBtnText}>🧊 Aller au Frigo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.recipeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSelectedRecipe(item)}
            >
              <View style={styles.recipeCardHeader}>
                <View style={styles.recipeTitleBlock}>
                  <Text style={[styles.recipeCardName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.recipeCardDesc, { color: colors.muted }]} numberOfLines={2}>{item.description}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.cardDeleteBtn}>
                  <IconSymbol name="trash" size={16} color={colors.error} />
                </TouchableOpacity>
              </View>

              {/* Macros */}
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

              {/* Source */}
              <Text style={[styles.sourceText, { color: colors.muted }]}>
                {item.source === "fridge" ? "🧊 Depuis le Frigo" : item.source === "ai" ? "🤖 Générée par IA" : "✏️ Créée manuellement"}
                {" · "}
                {new Date(item.savedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </Text>
            </TouchableOpacity>
          )}
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      )}
    </ScreenContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    backBtn: { padding: 4 },
    deleteBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },

    tabs: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 4 },
    tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
    tabText: { fontSize: 14, fontWeight: "600" },

    listContent: { padding: 16, gap: 12 },
    recipeCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
    recipeCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    recipeTitleBlock: { flex: 1 },
    recipeCardName: { fontSize: 16, fontWeight: "700" },
    recipeCardDesc: { fontSize: 13, lineHeight: 18, marginTop: 2 },
    cardDeleteBtn: { padding: 4 },
    recipeMacros: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    macroChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: "center" },
    macroChipValue: { fontSize: 13, fontWeight: "700" },
    macroChipLabel: { fontSize: 10 },
    prepTime: { fontSize: 12, marginLeft: "auto" },
    sourceText: { fontSize: 11 },

    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
    emptyEmoji: { fontSize: 52 },
    emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
    emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
    goFridgeBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
    goFridgeBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

    // Detail
    detailContent: { padding: 16, gap: 16 },
    collectionBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: "flex-start" },
    collectionBadgeText: { fontSize: 13, fontWeight: "700" },
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
    moveBtn: { paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, alignItems: "center" },
    moveBtnText: { fontSize: 15, fontWeight: "700" },
  });
}
