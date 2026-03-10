import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getShoppingList, saveShoppingList } from "@/lib/storage";
import type { ShoppingItem, ShoppingCategory } from "@/lib/types";
import {
  SHOPPING_CATEGORY_LABELS,
  SHOPPING_CATEGORY_ICONS,
} from "@/lib/types";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";

const CATEGORIES: ShoppingCategory[] = [
  "proteins",
  "vegetables",
  "fruits",
  "starches",
  "grocery",
  "fresh",
];

export default function ShoppingScreen() {
  const colors = useColors();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [listId, setListId] = useState<string>("");
  const [listCreatedAt, setListCreatedAt] = useState<string>("");

  const loadList = useCallback(async () => {
    const list = await getShoppingList();
    if (list) {
      setItems(list.items);
      setListId(list.id);
      setListCreatedAt(list.createdAt);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [loadList])
  );

  const toggleItem = async (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(updated);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await saveShoppingList({
      id: listId || Date.now().toString(),
      createdAt: listCreatedAt || new Date().toISOString(),
      items: updated,
    });
  };

  const clearChecked = async () => {
    Alert.alert(
      "Supprimer les articles cochés",
      "Veux-tu supprimer tous les articles déjà cochés ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const updated = items.filter((i) => !i.checked);
            setItems(updated);
            await saveShoppingList({
              id: listId || Date.now().toString(),
              createdAt: listCreatedAt || new Date().toISOString(),
              items: updated,
            });
          },
        },
      ]
    );
  };

  const clearAll = async () => {
    Alert.alert(
      "Vider la liste",
      "Veux-tu supprimer tous les articles de la liste ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Vider",
          style: "destructive",
          onPress: async () => {
            setItems([]);
            await saveShoppingList({
              id: listId || Date.now().toString(),
              createdAt: listCreatedAt || new Date().toISOString(),
              items: [],
            });
          },
        },
      ]
    );
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

  const styles = createStyles(colors);

  // Group items by category
  const grouped = CATEGORIES.reduce<Record<ShoppingCategory, ShoppingItem[]>>(
    (acc, cat) => {
      acc[cat] = items.filter((i) => i.category === cat);
      return acc;
    },
    {} as Record<ShoppingCategory, ShoppingItem[]>
  );

  const categoriesWithItems = CATEGORIES.filter(
    (cat) => grouped[cat].length > 0
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Liste de courses
          </Text>
          {totalCount > 0 && (
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {checkedCount}/{totalCount} articles
            </Text>
          )}
        </View>
        {checkedCount > 0 && (
          <TouchableOpacity
            style={[styles.clearBtn, { backgroundColor: colors.primaryLight }]}
            onPress={clearChecked}
          >
            <IconSymbol name="checkmark.circle.fill" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${(checkedCount / totalCount) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.muted }]}>
            {Math.round((checkedCount / totalCount) * 100)}% complété
          </Text>
        </View>
      )}

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Ta liste est vide
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Génère des recettes et ajoute leurs ingrédients à ta liste de courses
          </Text>
          <TouchableOpacity
            style={[styles.goToRecipesBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              // @ts-ignore
              router.push("/(tabs)/recipes");
            }}
          >
            <IconSymbol name="fork.knife" size={18} color="#fff" />
            <Text style={styles.goToRecipesBtnText}>Voir les recettes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={categoriesWithItems}
          keyExtractor={(cat) => cat}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item: category }) => (
            <View style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryEmoji}>
                  {SHOPPING_CATEGORY_ICONS[category]}
                </Text>
                <Text style={[styles.categoryTitle, { color: colors.foreground }]}>
                  {SHOPPING_CATEGORY_LABELS[category]}
                </Text>
                <Text style={[styles.categoryCount, { color: colors.muted }]}>
                  {grouped[category].filter((i) => i.checked).length}/
                  {grouped[category].length}
                </Text>
              </View>
              {grouped[category].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemRow,
                    {
                      backgroundColor: item.checked
                        ? colors.surface
                        : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => toggleItem(item.id)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: item.checked
                          ? colors.primary
                          : "transparent",
                        borderColor: item.checked
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    {item.checked && (
                      <IconSymbol
                        name="checkmark"
                        size={12}
                        color="#fff"
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.itemName,
                      {
                        color: item.checked ? colors.muted : colors.foreground,
                        textDecorationLine: item.checked
                          ? "line-through"
                          : "none",
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text style={[styles.itemQty, { color: colors.muted }]}>
                    {item.quantity}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          ListFooterComponent={
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.clearAllBtn, { borderColor: colors.error }]}
                onPress={clearAll}
              >
                <IconSymbol name="trash.fill" size={16} color={colors.error} />
                <Text style={[styles.clearAllText, { color: colors.error }]}>
                  Vider la liste
                </Text>
              </TouchableOpacity>
              <View style={{ height: 100 }} />
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      gap: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCenter: {
      flex: 1,
    },
    title: {
      fontSize: 22,
      fontWeight: "800",
    },
    subtitle: {
      fontSize: 13,
    },
    clearBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    progressContainer: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      gap: 6,
    },
    progressBar: {
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 3,
    },
    progressText: {
      fontSize: 12,
      textAlign: "right",
    },
    list: {
      paddingHorizontal: 20,
      gap: 20,
    },
    categorySection: {
      gap: 8,
    },
    categoryHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    categoryEmoji: {
      fontSize: 18,
    },
    categoryTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700",
    },
    categoryCount: {
      fontSize: 13,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    itemName: {
      flex: 1,
      fontSize: 15,
      fontWeight: "500",
    },
    itemQty: {
      fontSize: 13,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      paddingHorizontal: 40,
    },
    emptyEmoji: {
      fontSize: 64,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "700",
    },
    emptyText: {
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
    },
    goToRecipesBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 16,
      marginTop: 8,
    },
    goToRecipesBtnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
    footer: {
      paddingTop: 20,
    },
    clearAllBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    clearAllText: {
      fontSize: 14,
      fontWeight: "600",
    },
  });
}
