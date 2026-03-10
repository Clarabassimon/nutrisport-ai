import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getUserProfile,
  getDailyLog,
  saveShoppingList,
  getShoppingList,
} from "@/lib/storage";
import { getTodayDate } from "@/lib/nutrition";
import type { Recipe, ShoppingItem } from "@/lib/types";
import { GOAL_LABELS } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { useFocusEffect } from "expo-router";

export default function RecipesScreen() {
  const colors = useColors();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);

  const generateRecipes = trpc.nutrition.generateRecipes.useMutation();

  const loadRecipes = useCallback(async () => {
    const profile = await getUserProfile();
    const log = await getDailyLog(getTodayDate());
    if (!profile) return;

    const consumed = log?.totalMacros ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const remaining = Math.max(0, profile.targetCalories - consumed.calories);
    const remainingProtein = Math.max(0, profile.targetProtein - consumed.protein);

    setLoading(true);
    try {
      const result = await generateRecipes.mutateAsync({
        targetCalories: profile.targetCalories,
        targetProtein: profile.targetProtein,
        targetCarbs: profile.targetCarbs,
        targetFat: profile.targetFat,
        goal: profile.goal,
        remainingCalories: remaining,
        remainingProtein: remainingProtein,
        count: 6,
      });
      setRecipes(result.recipes as Recipe[]);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de générer les recettes. Réessaie.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (recipes.length === 0) {
        loadRecipes();
      }
    }, [loadRecipes, recipes.length])
  );

  const addToShoppingList = async (recipe: Recipe) => {
    setAddingToCart(true);
    try {
      const existing = await getShoppingList();
      const existingItems = existing?.items ?? [];

      const newItems: ShoppingItem[] = recipe.ingredients.map((ing, idx) => ({
        id: `${recipe.id}_${idx}_${Date.now()}`,
        name: ing.name,
        quantity: ing.quantity,
        category: ing.category,
        checked: false,
        recipeId: recipe.id,
      }));

      // Merge, avoid duplicates
      const merged = [...existingItems];
      for (const item of newItems) {
        const dup = merged.find(
          (i) => i.name.toLowerCase() === item.name.toLowerCase()
        );
        if (!dup) merged.push(item);
      }

      await saveShoppingList({
        id: existing?.id ?? Date.now().toString(),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        items: merged,
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "Ajouté à la liste ! 🛒",
        `Les ingrédients de "${recipe.name}" ont été ajoutés à ta liste de courses.`
      );
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'ajouter à la liste de courses.");
    } finally {
      setAddingToCart(false);
    }
  };

  const styles = createStyles(colors);

  const renderRecipeCard = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      style={[styles.recipeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => setSelectedRecipe(item)}
    >
      <View style={[styles.recipeImagePlaceholder, { backgroundColor: colors.primaryLight }]}>
        <Text style={styles.recipeEmoji}>🍽️</Text>
      </View>
      <View style={styles.recipeInfo}>
        <Text style={[styles.recipeName, { color: colors.foreground }]} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.recipeMeta}>
          <View style={styles.recipeMetaItem}>
            <IconSymbol name="clock.fill" size={12} color={colors.muted} />
            <Text style={[styles.recipeMetaText, { color: colors.muted }]}>
              {item.prepTime} min
            </Text>
          </View>
          <View style={styles.recipeMetaItem}>
            <IconSymbol name="flame.fill" size={12} color={colors.primary} />
            <Text style={[styles.recipeMetaText, { color: colors.primary }]}>
              {item.macros.calories} kcal
            </Text>
          </View>
        </View>
        <View style={styles.recipeMacros}>
          <View style={[styles.macroBadge, { backgroundColor: "#EDE8F8" }]}>
            <Text style={[styles.macroBadgeText, { color: "#9B7FD4" }]}>
              P: {item.macros.protein}g
            </Text>
          </View>
          <View style={[styles.macroBadge, { backgroundColor: "#E8F8EF" }]}>
            <Text style={[styles.macroBadgeText, { color: "#6EC6A0" }]}>
              G: {item.macros.carbs}g
            </Text>
          </View>
          <View style={[styles.macroBadge, { backgroundColor: "#FEF3E2" }]}>
            <Text style={[styles.macroBadgeText, { color: "#F5A623" }]}>
              L: {item.macros.fat}g
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Recettes personnalisées
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Générées selon tes besoins nutritionnels
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.primaryLight }]}
          onPress={loadRecipes}
          disabled={loading}
        >
          <IconSymbol name="sparkles" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Génération de tes recettes...
          </Text>
          <Text style={[styles.loadingSubtext, { color: colors.muted }]}>
            L'IA analyse tes besoins 🧠
          </Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderRecipeCard}
          keyExtractor={(item) => item.id}
          numColumns={1}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🍳</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Appuie sur ✨ pour générer tes recettes
              </Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      {/* Recipe Detail Modal */}
      <Modal
        visible={selectedRecipe !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedRecipe(null)}
      >
        {selectedRecipe && (
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.surface }]}
                onPress={() => setSelectedRecipe(null)}
              >
                <IconSymbol name="xmark.circle.fill" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.modalImagePlaceholder, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.modalEmoji}>🍽️</Text>
              </View>
              <View style={styles.modalContent}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {selectedRecipe.name}
                </Text>
                <Text style={[styles.modalDesc, { color: colors.muted }]}>
                  {selectedRecipe.description}
                </Text>

                {/* Meta */}
                <View style={styles.modalMeta}>
                  <View style={[styles.modalMetaItem, { backgroundColor: colors.surface }]}>
                    <IconSymbol name="clock.fill" size={18} color={colors.primary} />
                    <Text style={[styles.modalMetaValue, { color: colors.foreground }]}>
                      {selectedRecipe.prepTime} min
                    </Text>
                    <Text style={[styles.modalMetaLabel, { color: colors.muted }]}>
                      Préparation
                    </Text>
                  </View>
                  <View style={[styles.modalMetaItem, { backgroundColor: colors.surface }]}>
                    <IconSymbol name="flame.fill" size={18} color={colors.primary} />
                    <Text style={[styles.modalMetaValue, { color: colors.foreground }]}>
                      {selectedRecipe.macros.calories}
                    </Text>
                    <Text style={[styles.modalMetaLabel, { color: colors.muted }]}>
                      kcal
                    </Text>
                  </View>
                  <View style={[styles.modalMetaItem, { backgroundColor: colors.surface }]}>
                    <Text style={styles.modalMetaEmoji}>👥</Text>
                    <Text style={[styles.modalMetaValue, { color: colors.foreground }]}>
                      {selectedRecipe.servings}
                    </Text>
                    <Text style={[styles.modalMetaLabel, { color: colors.muted }]}>
                      portion{selectedRecipe.servings > 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>

                {/* Macros */}
                <View style={[styles.macrosCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    Macronutriments
                  </Text>
                  <View style={styles.macrosRow}>
                    {[
                      { label: "Protéines", value: selectedRecipe.macros.protein, color: "#9B7FD4" },
                      { label: "Glucides", value: selectedRecipe.macros.carbs, color: "#6EC6A0" },
                      { label: "Lipides", value: selectedRecipe.macros.fat, color: "#F5A623" },
                    ].map((m) => (
                      <View key={m.label} style={styles.macroItem}>
                        <Text style={[styles.macroValue, { color: m.color }]}>
                          {m.value}g
                        </Text>
                        <Text style={[styles.macroLabel, { color: colors.muted }]}>
                          {m.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Ingredients */}
                <View style={[styles.ingredientsCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    Ingrédients
                  </Text>
                  {selectedRecipe.ingredients.map((ing, i) => (
                    <View
                      key={i}
                      style={[
                        styles.ingredientItem,
                        { borderBottomColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.ingredientName, { color: colors.foreground }]}>
                        {ing.name}
                      </Text>
                      <Text style={[styles.ingredientQty, { color: colors.muted }]}>
                        {ing.quantity}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Steps */}
                <View style={[styles.stepsCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    Préparation
                  </Text>
                  {selectedRecipe.steps.map((step, i) => (
                    <View key={i} style={styles.stepItem}>
                      <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                        <Text style={styles.stepNumText}>{i + 1}</Text>
                      </View>
                      <Text style={[styles.stepText, { color: colors.foreground }]}>
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Add to shopping list */}
                <TouchableOpacity
                  style={[styles.addToCartBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    addToShoppingList(selectedRecipe);
                    setSelectedRecipe(null);
                  }}
                  disabled={addingToCart}
                >
                  <IconSymbol name="cart.fill" size={22} color="#fff" />
                  <Text style={styles.addToCartText}>
                    Ajouter à la liste de courses
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </ScreenContainer>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
    },
    refreshBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    loadingText: {
      fontSize: 16,
      fontWeight: "600",
    },
    loadingSubtext: {
      fontSize: 14,
    },
    list: {
      paddingHorizontal: 20,
      gap: 12,
    },
    recipeCard: {
      flexDirection: "row",
      borderRadius: 20,
      borderWidth: 1,
      overflow: "hidden",
      gap: 0,
    },
    recipeImagePlaceholder: {
      width: 100,
      alignItems: "center",
      justifyContent: "center",
    },
    recipeEmoji: {
      fontSize: 36,
    },
    recipeInfo: {
      flex: 1,
      padding: 14,
      gap: 8,
    },
    recipeName: {
      fontSize: 15,
      fontWeight: "700",
      lineHeight: 20,
    },
    recipeMeta: {
      flexDirection: "row",
      gap: 12,
    },
    recipeMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    recipeMetaText: {
      fontSize: 12,
      fontWeight: "500",
    },
    recipeMacros: {
      flexDirection: "row",
      gap: 6,
    },
    macroBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    macroBadgeText: {
      fontSize: 11,
      fontWeight: "600",
    },
    emptyContainer: {
      alignItems: "center",
      paddingTop: 80,
      gap: 12,
    },
    emptyEmoji: {
      fontSize: 52,
    },
    emptyText: {
      fontSize: 15,
      textAlign: "center",
    },
    modal: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: 16,
    },
    modalCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    modalImagePlaceholder: {
      height: 180,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 20,
      borderRadius: 20,
      marginBottom: 20,
    },
    modalEmoji: {
      fontSize: 64,
    },
    modalContent: {
      paddingHorizontal: 20,
      gap: 16,
      paddingBottom: 40,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: "800",
      lineHeight: 30,
    },
    modalDesc: {
      fontSize: 15,
      lineHeight: 22,
    },
    modalMeta: {
      flexDirection: "row",
      gap: 10,
    },
    modalMetaItem: {
      flex: 1,
      alignItems: "center",
      padding: 14,
      borderRadius: 16,
      gap: 4,
    },
    modalMetaEmoji: {
      fontSize: 18,
    },
    modalMetaValue: {
      fontSize: 20,
      fontWeight: "700",
    },
    modalMetaLabel: {
      fontSize: 11,
    },
    macrosCard: {
      borderRadius: 20,
      padding: 16,
      gap: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
    },
    macrosRow: {
      flexDirection: "row",
      gap: 10,
    },
    macroItem: {
      flex: 1,
      alignItems: "center",
    },
    macroValue: {
      fontSize: 18,
      fontWeight: "700",
    },
    macroLabel: {
      fontSize: 11,
      marginTop: 2,
    },
    ingredientsCard: {
      borderRadius: 20,
      padding: 16,
      gap: 12,
    },
    ingredientItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    ingredientName: {
      fontSize: 14,
      fontWeight: "500",
      flex: 1,
    },
    ingredientQty: {
      fontSize: 14,
    },
    stepsCard: {
      borderRadius: 20,
      padding: 16,
      gap: 14,
    },
    stepItem: {
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
    },
    stepNum: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    stepNumText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "700",
    },
    stepText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 22,
    },
    addToCartBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 18,
      borderRadius: 18,
    },
    addToCartText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
