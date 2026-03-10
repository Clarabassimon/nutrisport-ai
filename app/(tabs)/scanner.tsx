import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { addMealToLog, getUserProfile } from "@/lib/storage";
import { getTodayDate, calculateNutritionScore, getScoreColor } from "@/lib/nutrition";
import type { MealAnalysisResult, MealType } from "@/lib/types";
import { MEAL_TYPE_LABELS } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";

export default function ScannerScreen() {
  const colors = useColors();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<MealAnalysisResult | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  const [adding, setAdding] = useState(false);

  const analyzeMeal = trpc.nutrition.analyzeMeal.useMutation();

  const pickImage = async (fromCamera: boolean) => {
    let permissionResult;
    if (fromCamera) {
      permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    } else {
      permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission requise",
        fromCamera
          ? "Autorise l'accès à la caméra pour scanner tes repas."
          : "Autorise l'accès à la galerie pour importer une photo."
      );
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: "images",
          quality: 0.8,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          quality: 0.8,
          base64: true,
        });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setResult(null);
      await analyzeImage(asset.uri, asset.base64 ?? null);
    }
  };

  const analyzeImage = async (uri: string, base64: string | null) => {
    setAnalyzing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const profile = await getUserProfile();
      const analysisResult = await analyzeMeal.mutateAsync({
        imageUri: uri,
        base64: base64,
        targetCalories: profile?.targetCalories ?? 2000,
      });
      setResult(analysisResult as MealAnalysisResult);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert(
        "Erreur d'analyse",
        "Impossible d'analyser l'image. Réessaie avec une photo plus nette."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const addToJournal = async () => {
    if (!result) return;
    setAdding(true);
    try {
      const meal = {
        id: Date.now().toString(),
        type: selectedMealType,
        name: result.foods.map((f) => f.name).join(", ") || "Repas scanné",
        items: result.foods.map((f) => ({
          id: Date.now().toString() + f.name,
          name: f.name,
          quantity: f.quantity,
          macros: {
            calories: f.calories,
            protein: Math.round(f.calories * 0.15 / 4),
            carbs: Math.round(f.calories * 0.5 / 4),
            fat: Math.round(f.calories * 0.35 / 9),
          },
        })),
        totalMacros: result.totalMacros,
        nutritionScore: result.nutritionScore,
        addedAt: new Date().toISOString(),
        imageUri: imageUri ?? undefined,
      };
      await addMealToLog(getTodayDate(), meal);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "Repas ajouté ! 🎉",
        "Ton repas a été ajouté à ton journal du jour.",
        [{ text: "Voir le dashboard", onPress: () => router.push("/(tabs)") }]
      );
      setImageUri(null);
      setResult(null);
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'ajouter le repas au journal.");
    } finally {
      setAdding(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Scanner un repas
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Prends une photo pour analyser les valeurs nutritionnelles
          </Text>
        </View>

        {/* Image Area */}
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.mealImage}
              contentFit="cover"
            />
            {analyzing && (
              <View style={styles.analyzingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.analyzingText}>Analyse en cours...</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.retakeBtn, { backgroundColor: colors.surface }]}
              onPress={() => {
                setImageUri(null);
                setResult(null);
              }}
            >
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
              <Text style={[styles.retakeBtnText, { color: colors.muted }]}>
                Nouvelle photo
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.cameraPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.cameraEmoji}>📷</Text>
            <Text style={[styles.cameraText, { color: colors.muted }]}>
              Prends ou importe une photo de ton repas
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {!imageUri && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => pickImage(true)}
            >
              <IconSymbol name="camera.fill" size={22} color="#fff" />
              <Text style={styles.actionBtnText}>Prendre une photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtnSecondary, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
              onPress={() => pickImage(false)}
            >
              <IconSymbol name="photo.fill" size={22} color={colors.primary} />
              <Text style={[styles.actionBtnSecondaryText, { color: colors.primary }]}>
                Importer depuis la galerie
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Analysis Results */}
        {result && !analyzing && (
          <View style={styles.resultsContainer}>
            {/* Score */}
            <View style={[styles.scoreCard, { backgroundColor: getScoreColor(result.nutritionScore) }]}>
              <View style={styles.scoreLeft}>
                <Text style={styles.scoreLabel}>Score nutritionnel</Text>
                <Text style={styles.scoreValue}>{result.nutritionScore}</Text>
              </View>
              <View style={styles.scoreRight}>
                <Text style={styles.scoreReason}>{result.scoreReason}</Text>
              </View>
            </View>

            {/* Calories & Macros */}
            <View style={[styles.macrosCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Valeurs nutritionnelles
              </Text>
              <View style={[styles.caloriesRow, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.caloriesLabel, { color: colors.primary }]}>
                  Calories totales
                </Text>
                <Text style={[styles.caloriesValue, { color: colors.primary }]}>
                  {result.totalMacros.calories} kcal
                </Text>
              </View>
              <View style={styles.macroGrid}>
                {[
                  { label: "Protéines", value: result.totalMacros.protein, unit: "g", color: "#9B7FD4" },
                  { label: "Glucides", value: result.totalMacros.carbs, unit: "g", color: "#6EC6A0" },
                  { label: "Lipides", value: result.totalMacros.fat, unit: "g", color: "#F5A623" },
                ].map((m) => (
                  <View key={m.label} style={[styles.macroItem, { borderColor: colors.border }]}>
                    <Text style={[styles.macroValue, { color: m.color }]}>
                      {m.value}{m.unit}
                    </Text>
                    <Text style={[styles.macroLabel, { color: colors.muted }]}>
                      {m.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Foods Detected */}
            <View style={[styles.foodsCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Aliments détectés
              </Text>
              {result.foods.map((food, i) => (
                <View
                  key={i}
                  style={[styles.foodItem, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.foodName, { color: colors.foreground }]}>
                    {food.name}
                  </Text>
                  <Text style={[styles.foodQuantity, { color: colors.muted }]}>
                    {food.quantity}
                  </Text>
                  <Text style={[styles.foodCalories, { color: colors.primary }]}>
                    {food.calories} kcal
                  </Text>
                </View>
              ))}
            </View>

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <View style={[styles.suggestionsCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Text style={[styles.cardTitle, { color: colors.primary }]}>
                  💡 Suggestions du coach
                </Text>
                {result.suggestions.map((s, i) => (
                  <Text key={i} style={[styles.suggestion, { color: colors.foreground }]}>
                    • {s}
                  </Text>
                ))}
              </View>
            )}

            {/* Meal Type Selector */}
            <View style={[styles.mealTypeCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Type de repas
              </Text>
              <View style={styles.mealTypeRow}>
                {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mealTypeBtn,
                      {
                        backgroundColor:
                          selectedMealType === type ? colors.primary : colors.primaryLight,
                        borderColor:
                          selectedMealType === type ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedMealType(type)}
                  >
                    <Text
                      style={[
                        styles.mealTypeBtnText,
                        { color: selectedMealType === type ? "#fff" : colors.primary },
                      ]}
                    >
                      {MEAL_TYPE_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Add to Journal Button */}
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={addToJournal}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <IconSymbol name="plus.circle.fill" size={22} color="#fff" />
                  <Text style={styles.addButtonText}>
                    Ajouter au journal du jour
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 20,
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
    },
    imageContainer: {
      marginHorizontal: 20,
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 16,
      position: "relative",
    },
    mealImage: {
      width: "100%",
      height: 260,
      borderRadius: 20,
    },
    analyzingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    analyzingText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    retakeBtn: {
      position: "absolute",
      top: 12,
      right: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
    },
    retakeBtnText: {
      fontSize: 13,
      fontWeight: "500",
    },
    cameraPlaceholder: {
      marginHorizontal: 20,
      height: 220,
      borderRadius: 20,
      borderWidth: 2,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      marginBottom: 20,
    },
    cameraEmoji: {
      fontSize: 52,
    },
    cameraText: {
      fontSize: 14,
      textAlign: "center",
      paddingHorizontal: 32,
      lineHeight: 20,
    },
    actionButtons: {
      paddingHorizontal: 20,
      gap: 12,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 16,
      borderRadius: 16,
    },
    actionBtnText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
    actionBtnSecondary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 16,
      borderRadius: 16,
      borderWidth: 1.5,
    },
    actionBtnSecondaryText: {
      fontSize: 16,
      fontWeight: "700",
    },
    resultsContainer: {
      paddingHorizontal: 20,
      gap: 16,
    },
    scoreCard: {
      flexDirection: "row",
      padding: 20,
      borderRadius: 20,
      gap: 16,
      alignItems: "center",
    },
    scoreLeft: {
      alignItems: "center",
    },
    scoreLabel: {
      color: "rgba(255,255,255,0.8)",
      fontSize: 11,
      marginBottom: 4,
    },
    scoreValue: {
      color: "#fff",
      fontSize: 48,
      fontWeight: "800",
    },
    scoreRight: {
      flex: 1,
    },
    scoreReason: {
      color: "rgba(255,255,255,0.9)",
      fontSize: 14,
      lineHeight: 20,
    },
    macrosCard: {
      borderRadius: 20,
      padding: 18,
      gap: 14,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
    },
    caloriesRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 14,
      borderRadius: 14,
    },
    caloriesLabel: {
      fontSize: 14,
      fontWeight: "600",
    },
    caloriesValue: {
      fontSize: 18,
      fontWeight: "800",
    },
    macroGrid: {
      flexDirection: "row",
      gap: 10,
    },
    macroItem: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
    },
    macroValue: {
      fontSize: 18,
      fontWeight: "700",
    },
    macroLabel: {
      fontSize: 11,
      marginTop: 2,
    },
    foodsCard: {
      borderRadius: 20,
      padding: 18,
      gap: 12,
    },
    foodItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingBottom: 10,
      borderBottomWidth: 1,
    },
    foodName: {
      flex: 1,
      fontSize: 14,
      fontWeight: "500",
    },
    foodQuantity: {
      fontSize: 13,
      marginRight: 12,
    },
    foodCalories: {
      fontSize: 14,
      fontWeight: "700",
    },
    suggestionsCard: {
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      gap: 8,
    },
    suggestion: {
      fontSize: 14,
      lineHeight: 20,
    },
    mealTypeCard: {
      borderRadius: 20,
      padding: 18,
      gap: 12,
    },
    mealTypeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    mealTypeBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    mealTypeBtnText: {
      fontSize: 13,
      fontWeight: "600",
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 18,
      borderRadius: 18,
    },
    addButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
