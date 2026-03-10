import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getUserProfile, clearAllData } from "@/lib/storage";
import { calculateBMR, calculateTDEE } from "@/lib/nutrition";
import type { UserProfile } from "@/lib/types";
import { GOAL_LABELS } from "@/lib/types";

const TRAINING_FREQ_LABELS: Record<number, string> = {
  0: "Sédentaire",
  1: "Légèrement actif",
  2: "Légèrement actif",
  3: "Modérément actif",
  4: "Modérément actif",
  5: "Très actif",
  6: "Très actif",
  7: "Extrêmement actif",
};
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

export default function ProfileScreen() {
  const colors = useColors();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      getUserProfile().then(setProfile);
    }, [])
  );

  const handleEditProfile = () => {
    // @ts-ignore
    router.push("/onboarding");
  };

  const handleResetData = () => {
    Alert.alert(
      "Réinitialiser les données",
      "Es-tu sûr de vouloir supprimer toutes tes données ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await clearAllData();
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            // @ts-ignore
            router.replace("/onboarding");
          },
        },
      ]
    );
  };

  if (!profile) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.muted }}>Chargement...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  const tdee = calculateTDEE(profile.bmr, profile.trainingFrequency);

  const styles = createStyles(colors);

  const statItems = [
    { label: "Âge", value: `${profile.age} ans`, emoji: "🎂" },
    { label: "Poids", value: `${profile.weight} kg`, emoji: "⚖️" },
    { label: "Taille", value: `${profile.height} cm`, emoji: "📏" },
    { label: "Sexe", value: profile.gender === "male" ? "Homme" : "Femme", emoji: "👤" },
  ];

  const nutritionItems = [
    { label: "Calories", value: `${profile.targetCalories} kcal`, color: colors.primary },
    { label: "Protéines", value: `${profile.targetProtein}g`, color: "#9B7FD4" },
    { label: "Glucides", value: `${profile.targetCarbs}g`, color: "#6EC6A0" },
    { label: "Lipides", value: `${profile.targetFat}g`, color: "#F5A623" },
  ];

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.avatarText}>
              {profile.firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {profile.firstName}
            </Text>
            <View style={[styles.goalBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.goalBadgeText}>
                {GOAL_LABELS[profile.goal] ?? profile.goal}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.surface }]}
            onPress={handleEditProfile}
          >
            <IconSymbol name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Mes statistiques
          </Text>
          <View style={styles.statsGrid}>
            {statItems.map((s) => (
              <View
                key={s.label}
                style={[styles.statItem, { backgroundColor: colors.primaryLight }]}
              >
                <Text style={styles.statEmoji}>{s.emoji}</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {s.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Metabolic Data */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Métabolisme
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.metaItem, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.metaValue, { color: colors.primary }]}>
                {Math.round(bmr)}
              </Text>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>
                BMR (kcal)
              </Text>
              <Text style={[styles.metaDesc, { color: colors.muted }]}>
                Métabolisme de base
              </Text>
            </View>
            <View style={[styles.metaItem, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.metaValue, { color: colors.primary }]}>
                {Math.round(tdee)}
              </Text>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>
                TDEE (kcal)
              </Text>
              <Text style={[styles.metaDesc, { color: colors.muted }]}>
                Dépense totale
              </Text>
            </View>
          </View>
          <View style={[styles.activityBadge, { backgroundColor: colors.primaryLight }]}>
            <IconSymbol name="figure.run" size={16} color={colors.primary} />
            <Text style={[styles.activityText, { color: colors.primary }]}>
              Activité : {TRAINING_FREQ_LABELS[profile.trainingFrequency] ?? `${profile.trainingFrequency}x/semaine`}
            </Text>
          </View>
        </View>

        {/* Nutrition Targets */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Objectifs nutritionnels
          </Text>
          <View style={styles.nutritionGrid}>
            {nutritionItems.map((n) => (
              <View
                key={n.label}
                style={[styles.nutritionItem, { borderColor: colors.border }]}
              >
                <Text style={[styles.nutritionValue, { color: n.color }]}>
                  {n.value}
                </Text>
                <Text style={[styles.nutritionLabel, { color: colors.muted }]}>
                  {n.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Text style={[styles.infoTitle, { color: colors.primary }]}>
            💡 Comment sont calculés tes objectifs ?
          </Text>
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            Tes objectifs sont calculés grâce aux formules scientifiques BMR (Mifflin-St Jeor) et TDEE, 
            ajustés selon ton niveau d'activité et ton objectif ({GOAL_LABELS[profile.goal]}).
          </Text>
        </View>

        {/* Danger Zone */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Zone danger
          </Text>
          <TouchableOpacity
            style={[styles.dangerBtn, { borderColor: colors.error }]}
            onPress={handleResetData}
          >
            <IconSymbol name="trash.fill" size={18} color={colors.error} />
            <Text style={[styles.dangerBtnText, { color: colors.error }]}>
              Réinitialiser toutes les données
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 20,
      gap: 14,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 28,
      fontWeight: "800",
      color: "#9B7FD4",
    },
    headerInfo: {
      flex: 1,
      gap: 6,
    },
    name: {
      fontSize: 24,
      fontWeight: "800",
    },
    goalBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    goalBadgeText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
    },
    editBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    card: {
      marginHorizontal: 20,
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      gap: 16,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: "700",
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    statItem: {
      width: "47%",
      alignItems: "center",
      padding: 16,
      borderRadius: 18,
      gap: 6,
    },
    statEmoji: {
      fontSize: 24,
    },
    statValue: {
      fontSize: 18,
      fontWeight: "700",
    },
    statLabel: {
      fontSize: 12,
    },
    metaRow: {
      flexDirection: "row",
      gap: 10,
    },
    metaItem: {
      flex: 1,
      alignItems: "center",
      padding: 16,
      borderRadius: 18,
      gap: 4,
    },
    metaValue: {
      fontSize: 28,
      fontWeight: "800",
    },
    metaLabel: {
      fontSize: 12,
      fontWeight: "600",
    },
    metaDesc: {
      fontSize: 11,
      textAlign: "center",
    },
    activityBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: 14,
    },
    activityText: {
      fontSize: 14,
      fontWeight: "600",
    },
    nutritionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    nutritionItem: {
      width: "47%",
      alignItems: "center",
      padding: 16,
      borderRadius: 18,
      borderWidth: 1,
      gap: 4,
    },
    nutritionValue: {
      fontSize: 22,
      fontWeight: "800",
    },
    nutritionLabel: {
      fontSize: 12,
    },
    infoCard: {
      marginHorizontal: 20,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      gap: 10,
      marginBottom: 16,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: "700",
    },
    infoText: {
      fontSize: 13,
      lineHeight: 20,
    },
    dangerBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1.5,
    },
    dangerBtnText: {
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
