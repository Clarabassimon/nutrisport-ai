import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { isOnboardingDone, getUserProfile, getDailyLog } from "@/lib/storage";
import { getTodayDate, formatDate, getMacroPercent } from "@/lib/nutrition";
import type { UserProfile, DailyLog } from "@/lib/types";
import { MEAL_TYPE_LABELS } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useFocusEffect } from "expo-router";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function DashboardScreen() {
  const colors = useColors();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const done = await isOnboardingDone();
    if (!done) {
      router.replace("/onboarding");
      return;
    }
    const [p, log] = await Promise.all([
      getUserProfile(),
      getDailyLog(getTodayDate()),
    ]);
    setProfile(p);
    setTodayLog(log);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading || !profile) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.muted, fontSize: 16 }}>Chargement...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const consumed = todayLog?.totalMacros ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const remaining = Math.max(0, profile.targetCalories - consumed.calories);
  const caloriePercent = getMacroPercent(consumed.calories, profile.targetCalories);
  const proteinPercent = getMacroPercent(consumed.protein, profile.targetProtein);
  const carbsPercent = getMacroPercent(consumed.carbs, profile.targetCarbs);
  const fatPercent = getMacroPercent(consumed.fat, profile.targetFat);
  const today = getTodayDate();
  const formattedDate = formatDate(today);

  const styles = createStyles(colors);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const getCoachTip = () => {
    const tips = [
      "Hydrate-toi bien ! Vise 2L d'eau minimum aujourd'hui. 💧",
      "N'oublie pas tes protéines après l'entraînement pour optimiser la récupération. 💪",
      "Mange lentement et écoute tes signaux de satiété. 🧘",
      "Les légumes verts sont tes alliés pour les micronutriments essentiels. 🥦",
      "Un bon sommeil est aussi important que la nutrition pour tes performances. 😴",
      "Pense à varier tes sources de protéines pour un profil d'acides aminés complet. 🥩",
    ];
    const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return tips[dayOfYear % tips.length];
  };

  // Circular progress calculation
  const CIRCLE_SIZE = 180;
  const STROKE_WIDTH = 14;
  const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE * (1 - caloriePercent / 100);

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>
              {getGreeting()} 👋
            </Text>
            <Text style={[styles.userName, { color: colors.foreground }]}>
              {profile.firstName}
            </Text>
            <Text style={[styles.date, { color: colors.muted }]}>
              {formattedDate}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.profileBtn, { backgroundColor: colors.primaryLight }]}
// @ts-ignore
            onPress={() => router.push("/(tabs)/profile")}
          >
            <IconSymbol name="person.fill" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Calorie Ring */}
        <View style={[styles.calorieCard, { backgroundColor: colors.surface }]}>
          <View style={styles.calorieRingContainer}>
            {/* SVG-like circle using View */}
            <View style={styles.circleOuter}>
              <View
                style={[
                  styles.circleTrack,
                  { borderColor: colors.border },
                ]}
              />
              <View
                style={[
                  styles.circleFill,
                  {
                    borderColor: colors.primary,
                    transform: [{ rotate: `${-90 + (caloriePercent / 100) * 360}deg` }],
                  },
                ]}
              />
              <View style={styles.circleInner}>
                <Text style={[styles.calorieConsumed, { color: colors.foreground }]}>
                  {consumed.calories}
                </Text>
                <Text style={[styles.calorieUnit, { color: colors.muted }]}>kcal</Text>
                <Text style={[styles.calorieLabel, { color: colors.muted }]}>consommées</Text>
              </View>
            </View>
          </View>
          <View style={styles.calorieInfo}>
            <View style={[styles.calorieInfoItem, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.calorieInfoValue, { color: colors.primary }]}>
                {profile.targetCalories}
              </Text>
              <Text style={[styles.calorieInfoLabel, { color: colors.muted }]}>Objectif</Text>
            </View>
            <View style={[styles.calorieInfoItem, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.calorieInfoValue, { color: remaining > 0 ? colors.secondary : colors.error }]}>
                {remaining}
              </Text>
              <Text style={[styles.calorieInfoLabel, { color: colors.muted }]}>Restantes</Text>
            </View>
          </View>
        </View>

        {/* Macros */}
        <View style={[styles.macrosCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Macronutriments
          </Text>
          {[
            {
              label: "Protéines",
              consumed: consumed.protein,
              target: profile.targetProtein,
              percent: proteinPercent,
              color: "#9B7FD4",
              unit: "g",
            },
            {
              label: "Glucides",
              consumed: consumed.carbs,
              target: profile.targetCarbs,
              percent: carbsPercent,
              color: "#6EC6A0",
              unit: "g",
            },
            {
              label: "Lipides",
              consumed: consumed.fat,
              target: profile.targetFat,
              percent: fatPercent,
              color: "#F5A623",
              unit: "g",
            },
          ].map((macro) => (
            <View key={macro.label} style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.foreground }]}>
                {macro.label}
              </Text>
              <View style={styles.macroBarContainer}>
                <View style={[styles.macroBarTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.macroBarFill,
                      {
                        width: `${macro.percent}%`,
                        backgroundColor: macro.color,
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.macroValue, { color: colors.muted }]}>
                {macro.consumed}/{macro.target}{macro.unit}
              </Text>
            </View>
          ))}
        </View>

        {/* Today's Meals */}
        <View style={styles.mealsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Repas du jour
          </Text>
          {todayLog && todayLog.meals.length > 0 ? (
            todayLog.meals.map((meal) => (
              <View
                key={meal.id}
                style={[styles.mealCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.mealScoreBadge, { backgroundColor: meal.nutritionScore === "A" ? "#6EC6A0" : meal.nutritionScore === "B" ? "#9B7FD4" : meal.nutritionScore === "C" ? "#F5A623" : "#E05C5C" }]}>
                  <Text style={styles.mealScoreText}>{meal.nutritionScore}</Text>
                </View>
                <View style={styles.mealInfo}>
                  <Text style={[styles.mealName, { color: colors.foreground }]}>
                    {meal.name}
                  </Text>
                  <Text style={[styles.mealType, { color: colors.muted }]}>
                    {MEAL_TYPE_LABELS[meal.type]}
                  </Text>
                </View>
                <Text style={[styles.mealCalories, { color: colors.primary }]}>
                  {meal.totalMacros.calories} kcal
                </Text>
              </View>
            ))
          ) : (
            <View style={[styles.emptyMeals, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Aucun repas enregistré aujourd'hui
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.muted }]}>
                Scanne ton repas ou ajoute-le manuellement
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            // @ts-ignore
            onPress={() => router.push("/coach")}
          >
            <Text style={styles.quickActionEmoji}>🧠</Text>
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>Coach IA</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            // @ts-ignore
            onPress={() => router.push("/shopping")}
          >
            <Text style={styles.quickActionEmoji}>🛒</Text>
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            // @ts-ignore
            onPress={() => router.push("/(tabs)/journal")}
          >
            <Text style={styles.quickActionEmoji}>📓</Text>
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>Journal</Text>
          </TouchableOpacity>
        </View>

        {/* Coach Tip */}
        <TouchableOpacity
          style={[styles.coachCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
          // @ts-ignore
          onPress={() => router.push("/coach")}
        >
          <View style={styles.coachHeader}>
            <Text style={styles.coachEmoji}>🧠</Text>
            <Text style={[styles.coachTitle, { color: colors.primary }]}>
              Conseil du coach
            </Text>
            <IconSymbol name="chevron.right" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.coachTip, { color: colors.foreground }]}>
            {getCoachTip()}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB - Add meal */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          // @ts-ignore
          router.push("/(tabs)/scanner");
        }}
      >
        <IconSymbol name="plus" size={28} color="#fff" />
      </TouchableOpacity>
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
      paddingBottom: 20,
    },
    greeting: {
      fontSize: 14,
      fontWeight: "500",
    },
    userName: {
      fontSize: 28,
      fontWeight: "800",
      marginTop: 2,
    },
    date: {
      fontSize: 13,
      marginTop: 4,
      textTransform: "capitalize",
    },
    profileBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    calorieCard: {
      marginHorizontal: 20,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 20,
    },
    calorieRingContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    circleOuter: {
      width: 140,
      height: 140,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    circleTrack: {
      position: "absolute",
      width: 130,
      height: 130,
      borderRadius: 65,
      borderWidth: 12,
    },
    circleFill: {
      position: "absolute",
      width: 130,
      height: 130,
      borderRadius: 65,
      borderWidth: 12,
      borderRightColor: "transparent",
      borderBottomColor: "transparent",
    },
    circleInner: {
      alignItems: "center",
    },
    calorieConsumed: {
      fontSize: 28,
      fontWeight: "800",
    },
    calorieUnit: {
      fontSize: 12,
      fontWeight: "500",
    },
    calorieLabel: {
      fontSize: 10,
    },
    calorieInfo: {
      flex: 1,
      gap: 10,
    },
    calorieInfoItem: {
      padding: 12,
      borderRadius: 14,
      alignItems: "center",
    },
    calorieInfoValue: {
      fontSize: 22,
      fontWeight: "700",
    },
    calorieInfoLabel: {
      fontSize: 11,
      marginTop: 2,
    },
    macrosCard: {
      marginHorizontal: 20,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      gap: 14,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      marginBottom: 4,
    },
    macroRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    macroLabel: {
      fontSize: 13,
      fontWeight: "500",
      width: 72,
    },
    macroBarContainer: {
      flex: 1,
    },
    macroBarTrack: {
      height: 8,
      borderRadius: 4,
      overflow: "hidden",
    },
    macroBarFill: {
      height: "100%",
      borderRadius: 4,
    },
    macroValue: {
      fontSize: 12,
      width: 72,
      textAlign: "right",
    },
    mealsSection: {
      paddingHorizontal: 20,
      marginBottom: 16,
      gap: 10,
    },
    mealCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      gap: 12,
    },
    mealScoreBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    mealScoreText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },
    mealInfo: {
      flex: 1,
    },
    mealName: {
      fontSize: 14,
      fontWeight: "600",
    },
    mealType: {
      fontSize: 12,
      marginTop: 2,
    },
    mealCalories: {
      fontSize: 14,
      fontWeight: "700",
    },
    emptyMeals: {
      alignItems: "center",
      padding: 28,
      borderRadius: 20,
      borderWidth: 1.5,
      borderStyle: "dashed",
      gap: 8,
    },
    emptyEmoji: {
      fontSize: 36,
    },
    emptyText: {
      fontSize: 15,
      fontWeight: "600",
    },
    emptySubtext: {
      fontSize: 13,
      textAlign: "center",
    },
    coachCard: {
      marginHorizontal: 20,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      gap: 10,
      marginBottom: 16,
    },
    coachHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    coachEmoji: {
      fontSize: 22,
    },
    coachTitle: {
      fontSize: 15,
      fontWeight: "700",
    },
    coachTip: {
      fontSize: 14,
      lineHeight: 22,
    },
    fab: {
      position: "absolute",
      bottom: 90,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#9B7FD4",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
    quickActions: {
      flexDirection: "row",
      paddingHorizontal: 20,
      gap: 10,
      marginBottom: 16,
    },
    quickActionBtn: {
      flex: 1,
      alignItems: "center",
      padding: 14,
      borderRadius: 18,
      borderWidth: 1,
      gap: 6,
    },
    quickActionEmoji: {
      fontSize: 24,
    },
    quickActionText: {
      fontSize: 12,
      fontWeight: "600",
    },
  });
}
