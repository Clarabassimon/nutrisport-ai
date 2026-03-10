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
import { saveDailyJournal, getDailyLog, getUserProfile } from "@/lib/storage";
import { getTodayDate, formatDate } from "@/lib/nutrition";
import type { DailyJournal } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { useFocusEffect } from "expo-router";

const SPORT_OPTIONS = [
  { value: "musculation", label: "Musculation", emoji: "🏋️" },
  { value: "running", label: "Running", emoji: "🏃" },
  { value: "crossfit", label: "CrossFit", emoji: "⚡" },
  { value: "fitness", label: "Fitness", emoji: "💃" },
  { value: "sports_collectifs", label: "Sports collectifs", emoji: "⚽" },
  { value: "autres", label: "Autres", emoji: "🎯" },
  { value: "repos", label: "Repos", emoji: "😴" },
];

const DURATION_OPTIONS = [30, 45, 60, 75, 90, 120];

interface SliderFieldProps {
  label: string;
  emoji: string;
  value: number;
  onChange: (v: number) => void;
  colors: ReturnType<typeof useColors>;
  lowLabel?: string;
  highLabel?: string;
}

function SliderField({
  label,
  emoji,
  value,
  onChange,
  colors,
  lowLabel = "Faible",
  highLabel = "Élevé",
}: SliderFieldProps) {
  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.header}>
        <Text style={sliderStyles.emoji}>{emoji}</Text>
        <Text style={[sliderStyles.label, { color: colors.foreground }]}>{label}</Text>
        <View
          style={[
            sliderStyles.badge,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text style={sliderStyles.badgeText}>{value}/5</Text>
        </View>
      </View>
      <View style={sliderStyles.dots}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            style={[
              sliderStyles.dot,
              {
                backgroundColor: n <= value ? colors.primary : colors.border,
                transform: [{ scale: n === value ? 1.3 : 1 }],
              },
            ]}
            onPress={() => {
              onChange(n);
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
          />
        ))}
      </View>
      <View style={sliderStyles.labels}>
        <Text style={[sliderStyles.lowLabel, { color: colors.muted }]}>{lowLabel}</Text>
        <Text style={[sliderStyles.highLabel, { color: colors.muted }]}>{highLabel}</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emoji: {
    fontSize: 20,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  dots: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 4,
  },
  dot: {
    flex: 1,
    height: 10,
    borderRadius: 5,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  lowLabel: {
    fontSize: 11,
  },
  highLabel: {
    fontSize: 11,
  },
});

export default function JournalScreen() {
  const colors = useColors();
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  // Journal fields
  const [energyLevel, setEnergyLevel] = useState(3);
  const [fatigue, setFatigue] = useState(2);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [sportPerformance, setSportPerformance] = useState(3);
  const [hungerLevel, setHungerLevel] = useState(3);
  const [workoutType, setWorkoutType] = useState<string>("repos");
  const [workoutDuration, setWorkoutDuration] = useState<number>(60);

  const getCoachAdvice = trpc.nutrition.getCoachAdvice.useMutation();

  const loadJournal = useCallback(async () => {
    const log = await getDailyLog(selectedDate);
    if (log?.journal) {
      const j = log.journal;
      setEnergyLevel(j.energyLevel);
      setFatigue(j.fatigue);
      setSleepQuality(j.sleepQuality);
      setSportPerformance(j.sportPerformance);
      setHungerLevel(j.hungerLevel);
      setWorkoutType(j.workoutType ?? "repos");
      setWorkoutDuration(j.workoutDuration ?? 60);
      setAiAdvice(j.aiAdvice ?? null);
      setSaved(true);
    } else {
      // Reset to defaults
      setEnergyLevel(3);
      setFatigue(2);
      setSleepQuality(3);
      setSportPerformance(3);
      setHungerLevel(3);
      setWorkoutType("repos");
      setWorkoutDuration(60);
      setAiAdvice(null);
      setSaved(false);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadJournal();
    }, [loadJournal])
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const profile = await getUserProfile();
      const log = await getDailyLog(selectedDate);
      const totalMacros = log?.totalMacros ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };

      // Get AI advice
      let advice = "Continue comme ça, tu es sur la bonne voie ! 💪";
      try {
        const result = await getCoachAdvice.mutateAsync({
          profile: {
            firstName: profile?.firstName ?? "Sportif",
            goal: profile?.goal ?? "maintenance",
            targetCalories: profile?.targetCalories ?? 2000,
            targetProtein: profile?.targetProtein ?? 150,
          },
          todayLog: {
            consumedCalories: totalMacros.calories,
            consumedProtein: totalMacros.protein,
            consumedCarbs: totalMacros.carbs,
            consumedFat: totalMacros.fat,
            mealsCount: log?.meals.length ?? 0,
          },
          journal: {
            energyLevel,
            fatigue,
            sleepQuality,
            sportPerformance,
            hungerLevel,
            workoutType: workoutType !== "repos" ? workoutType : undefined,
            workoutDuration: workoutType !== "repos" ? workoutDuration : undefined,
          },
        });
        advice = `${result.emoji} ${result.advice}`;
      } catch (e) {
        console.warn("Coach advice failed:", e);
      }

      const journal: DailyJournal = {
        date: selectedDate,
        energyLevel,
        fatigue,
        sleepQuality,
        sportPerformance,
        hungerLevel,
        workoutType: workoutType !== "repos" ? workoutType : undefined,
        workoutDuration: workoutType !== "repos" ? workoutDuration : undefined,
        aiAdvice: advice,
      };

      await saveDailyJournal(journal);
      setAiAdvice(advice);
      setSaved(true);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de sauvegarder le journal.");
    } finally {
      setSaving(false);
    }
  };

  // Date navigation (last 7 days)
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const styles = createStyles(colors);

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Journal quotidien
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Comment tu te sens aujourd'hui ?
          </Text>
        </View>

        {/* Date Picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.datePicker}
        >
          {dates.map((date) => {
            const d = new Date(date);
            const isSelected = date === selectedDate;
            const isToday = date === today;
            const dayName = d.toLocaleDateString("fr-FR", { weekday: "short" });
            const dayNum = d.getDate();
            return (
              <TouchableOpacity
                key={date}
                style={[
                  styles.dateBtn,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text
                  style={[
                    styles.dateDayName,
                    { color: isSelected ? "rgba(255,255,255,0.8)" : colors.muted },
                  ]}
                >
                  {dayName}
                </Text>
                <Text
                  style={[
                    styles.dateDayNum,
                    { color: isSelected ? "#fff" : colors.foreground },
                  ]}
                >
                  {dayNum}
                </Text>
                {isToday && (
                  <View
                    style={[
                      styles.todayDot,
                      { backgroundColor: isSelected ? "#fff" : colors.primary },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Wellness Sliders */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Ressenti du jour
          </Text>
          <View style={styles.sliders}>
            <SliderField
              label="Niveau d'énergie"
              emoji="⚡"
              value={energyLevel}
              onChange={setEnergyLevel}
              colors={colors}
              lowLabel="Épuisé"
              highLabel="Plein d'énergie"
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SliderField
              label="Fatigue"
              emoji="😴"
              value={fatigue}
              onChange={setFatigue}
              colors={colors}
              lowLabel="Reposé"
              highLabel="Très fatigué"
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SliderField
              label="Qualité du sommeil"
              emoji="🌙"
              value={sleepQuality}
              onChange={setSleepQuality}
              colors={colors}
              lowLabel="Mauvais"
              highLabel="Excellent"
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SliderField
              label="Performance sportive"
              emoji="🏋️"
              value={sportPerformance}
              onChange={setSportPerformance}
              colors={colors}
              lowLabel="Nulle"
              highLabel="Au top"
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SliderField
              label="Niveau de faim"
              emoji="🍽️"
              value={hungerLevel}
              onChange={setHungerLevel}
              colors={colors}
              lowLabel="Rassasié"
              highLabel="Très faim"
            />
          </View>
        </View>

        {/* Workout Section */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Entraînement du jour
          </Text>
          <View style={styles.sportGrid}>
            {SPORT_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.sportBtn,
                  {
                    backgroundColor:
                      workoutType === s.value ? colors.primary : colors.primaryLight,
                    borderColor:
                      workoutType === s.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setWorkoutType(s.value);
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <Text style={styles.sportEmoji}>{s.emoji}</Text>
                <Text
                  style={[
                    styles.sportLabel,
                    { color: workoutType === s.value ? "#fff" : colors.primary },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {workoutType !== "repos" && (
            <View style={styles.durationSection}>
              <Text style={[styles.durationTitle, { color: colors.foreground }]}>
                Durée de l'entraînement
              </Text>
              <View style={styles.durationRow}>
                {DURATION_OPTIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.durationBtn,
                      {
                        backgroundColor:
                          workoutDuration === d ? colors.primary : colors.surface,
                        borderColor:
                          workoutDuration === d ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setWorkoutDuration(d)}
                  >
                    <Text
                      style={[
                        styles.durationBtnText,
                        { color: workoutDuration === d ? "#fff" : colors.foreground },
                      ]}
                    >
                      {d}min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* AI Advice (after save) */}
        {aiAdvice && (
          <View style={[styles.adviceCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Text style={[styles.adviceTitle, { color: colors.primary }]}>
              🧠 Conseil personnalisé de ton coach
            </Text>
            <Text style={[styles.adviceText, { color: colors.foreground }]}>
              {aiAdvice}
            </Text>
          </View>
        )}

        {/* Save Button */}
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              {
                backgroundColor: saved ? colors.secondary : colors.primary,
                opacity: saving ? 0.7 : 1,
              },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            <IconSymbol
              name={saved ? "checkmark.circle.fill" : "book.fill"}
              size={22}
              color="#fff"
            />
            <Text style={styles.saveBtnText}>
              {saving
                ? "Analyse en cours..."
                : saved
                ? "Journal mis à jour ✓"
                : "Sauvegarder et obtenir un conseil"}
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
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
    },
    datePicker: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      gap: 8,
    },
    dateBtn: {
      width: 52,
      alignItems: "center",
      paddingVertical: 10,
      borderRadius: 16,
      borderWidth: 1.5,
      gap: 4,
    },
    dateDayName: {
      fontSize: 11,
      fontWeight: "500",
      textTransform: "capitalize",
    },
    dateDayNum: {
      fontSize: 18,
      fontWeight: "700",
    },
    todayDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
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
    sliders: {
      gap: 16,
    },
    divider: {
      height: 1,
    },
    sportGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    sportBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    sportEmoji: {
      fontSize: 16,
    },
    sportLabel: {
      fontSize: 13,
      fontWeight: "600",
    },
    durationSection: {
      gap: 10,
    },
    durationTitle: {
      fontSize: 14,
      fontWeight: "600",
    },
    durationRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    durationBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
    },
    durationBtnText: {
      fontSize: 13,
      fontWeight: "600",
    },
    adviceCard: {
      marginHorizontal: 20,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      gap: 10,
      marginBottom: 16,
    },
    adviceTitle: {
      fontSize: 15,
      fontWeight: "700",
    },
    adviceText: {
      fontSize: 14,
      lineHeight: 22,
    },
    saveContainer: {
      paddingHorizontal: 20,
    },
    saveBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 18,
      borderRadius: 18,
    },
    saveBtnText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
