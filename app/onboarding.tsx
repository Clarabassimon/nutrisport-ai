import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  buildUserProfile,
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateMacros,
} from "@/lib/nutrition";
import { saveUserProfile, setOnboardingDone } from "@/lib/storage";
import type { Gender, Goal, Sport } from "@/lib/types";
import { GOAL_LABELS, SPORT_LABELS, SPORT_ICONS } from "@/lib/types";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOTAL_STEPS = 7;

const SPORTS: Sport[] = [
  "musculation",
  "running",
  "crossfit",
  "fitness",
  "sports_collectifs",
  "autres",
];

const GOALS: Goal[] = ["weight_loss", "maintenance", "muscle_gain", "recomposition"];

export default function OnboardingScreen() {
  const colors = useColors();
  const [step, setStep] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Form state
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState<Goal>("maintenance");
  const [sports, setSports] = useState<Sport[]>([]);
  const [trainingFrequency, setTrainingFrequency] = useState(3);

  // Results
  const [bmr, setBmr] = useState(0);
  const [tdee, setTdee] = useState(0);
  const [targetCalories, setTargetCalories] = useState(0);
  const [macros, setMacros] = useState({ protein: 0, carbs: 0, fat: 0 });

  const goToStep = (nextStep: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.timing(progressAnim, {
      toValue: nextStep / (TOTAL_STEPS - 1),
      duration: 300,
      useNativeDriver: false,
    }).start();
    setStep(nextStep);
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      if (step === 5) {
        // Calculate results before showing step 6
        const h = parseFloat(height);
        const w = parseFloat(weight);
        const a = parseInt(age);
        if (!isNaN(h) && !isNaN(w) && !isNaN(a)) {
          const calculatedBmr = calculateBMR(w, h, a, gender);
          const calculatedTdee = calculateTDEE(calculatedBmr, trainingFrequency);
          const calculatedTarget = calculateTargetCalories(calculatedTdee, goal);
          const calculatedMacros = calculateMacros(calculatedTarget, w, goal);
          setBmr(calculatedBmr);
          setTdee(calculatedTdee);
          setTargetCalories(calculatedTarget);
          setMacros(calculatedMacros);
        }
      }
      goToStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) goToStep(step - 1);
  };

  const handleFinish = async () => {
    const profile = buildUserProfile({
      firstName: firstName || "Sportif",
      age: parseInt(age) || 25,
      gender,
      height: parseFloat(height) || 170,
      weight: parseFloat(weight) || 70,
      goal,
      sports,
      trainingFrequency,
    });
    await saveUserProfile(profile);
    await setOnboardingDone();
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.replace("/(tabs)");
  };

  const toggleSport = (s: Sport) => {
    setSports((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const styles = createStyles(colors);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth }]}
          />
        </View>
        {step > 0 && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* STEP 0: Welcome */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <View style={styles.emojiContainer}>
              <Text style={styles.emoji}>🥗</Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Bienvenue sur{"\n"}NutriSport AI
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Ton coach nutritionnel personnel intelligent. Mange mieux, performe
              plus, vis sainement.
            </Text>
            <View style={styles.featureList}>
              {[
                { icon: "🔥", text: "Calcul de tes besoins caloriques" },
                { icon: "📷", text: "Analyse de repas par photo" },
                { icon: "🍽️", text: "Recettes personnalisées" },
                { icon: "🧠", text: "Coach IA nutritionnel" },
              ].map((f, i) => (
                <View key={i} style={[styles.featureItem, { backgroundColor: colors.primaryLight }]}>
                  <Text style={styles.featureEmoji}>{f.icon}</Text>
                  <Text style={[styles.featureText, { color: colors.foreground }]}>
                    {f.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* STEP 1: Name & Age */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              Faisons connaissance 👋
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Ces informations nous aident à personnaliser ton expérience.
            </Text>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Ton prénom</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
                placeholder="Ex: Alex"
                placeholderTextColor={colors.muted}
                value={firstName}
                onChangeText={setFirstName}
                returnKeyType="done"
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Ton âge</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
                placeholder="Ex: 28"
                placeholderTextColor={colors.muted}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Sexe</Text>
              <View style={styles.genderRow}>
                {(["male", "female"] as Gender[]).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderButton,
                      {
                        backgroundColor:
                          gender === g ? colors.primary : colors.surface,
                        borderColor:
                          gender === g ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={styles.genderEmoji}>
                      {g === "male" ? "👨" : "👩"}
                    </Text>
                    <Text
                      style={[
                        styles.genderLabel,
                        { color: gender === g ? "#fff" : colors.foreground },
                      ]}
                    >
                      {g === "male" ? "Homme" : "Femme"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: Height & Weight */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              Ta morphologie 📏
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Indispensable pour calculer ton métabolisme de base.
            </Text>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Taille (cm)
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
                placeholder="Ex: 175"
                placeholderTextColor={colors.muted}
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Poids (kg)
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
                placeholder="Ex: 72"
                placeholderTextColor={colors.muted}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          </View>
        )}

        {/* STEP 3: Goal */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              Ton objectif 🎯
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Cela détermine tes apports caloriques et la répartition de tes
              macros.
            </Text>
            <View style={styles.goalGrid}>
              {GOALS.map((g) => {
                const icons: Record<Goal, string> = {
                  weight_loss: "🔥",
                  maintenance: "⚖️",
                  muscle_gain: "💪",
                  recomposition: "✨",
                };
                const descs: Record<Goal, string> = {
                  weight_loss: "Réduire la masse grasse",
                  maintenance: "Garder son poids actuel",
                  muscle_gain: "Développer la masse musculaire",
                  recomposition: "Perdre du gras et gagner du muscle",
                };
                return (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.goalCard,
                      {
                        backgroundColor:
                          goal === g ? colors.primary : colors.surface,
                        borderColor:
                          goal === g ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setGoal(g);
                      if (Platform.OS !== "web") {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                  >
                    <Text style={styles.goalEmoji}>{icons[g]}</Text>
                    <Text
                      style={[
                        styles.goalLabel,
                        { color: goal === g ? "#fff" : colors.foreground },
                      ]}
                    >
                      {GOAL_LABELS[g]}
                    </Text>
                    <Text
                      style={[
                        styles.goalDesc,
                        { color: goal === g ? "rgba(255,255,255,0.8)" : colors.muted },
                      ]}
                    >
                      {descs[g]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 4: Sports */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              Tes sports 🏃
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Sélectionne tous les sports que tu pratiques.
            </Text>
            <View style={styles.sportsGrid}>
              {SPORTS.map((s) => {
                const sportEmojis: Record<Sport, string> = {
                  musculation: "🏋️",
                  running: "🏃",
                  crossfit: "⚡",
                  fitness: "💃",
                  sports_collectifs: "⚽",
                  autres: "🎯",
                };
                const selected = sports.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.sportCard,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => toggleSport(s)}
                  >
                    <Text style={styles.sportEmoji}>{sportEmojis[s]}</Text>
                    <Text
                      style={[
                        styles.sportLabel,
                        { color: selected ? "#fff" : colors.foreground },
                      ]}
                    >
                      {SPORT_LABELS[s]}
                    </Text>
                    {selected && (
                      <View style={styles.sportCheck}>
                        <IconSymbol name="checkmark" size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 5: Training Frequency */}
        {step === 5 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              Fréquence d'entraînement 📅
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Combien de fois t'entraînes-tu par semaine ?
            </Text>
            <View style={[styles.freqCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.freqNumber, { color: colors.primary }]}>
                {trainingFrequency}
              </Text>
              <Text style={[styles.freqLabel, { color: colors.muted }]}>
                {trainingFrequency <= 1 ? "séance" : "séances"} / semaine
              </Text>
            </View>
            <View style={styles.freqButtons}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.freqBtn,
                    {
                      backgroundColor:
                        trainingFrequency === n ? colors.primary : colors.surface,
                      borderColor:
                        trainingFrequency === n ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setTrainingFrequency(n);
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.freqBtnText,
                      { color: trainingFrequency === n ? "#fff" : colors.foreground },
                    ]}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.activityLevels}>
              {[
                { max: 1, label: "Sédentaire", emoji: "🛋️" },
                { max: 3, label: "Légèrement actif", emoji: "🚶" },
                { max: 5, label: "Modérément actif", emoji: "🏃" },
                { max: 6, label: "Très actif", emoji: "💪" },
                { max: 7, label: "Extrêmement actif", emoji: "🔥" },
              ].map((level, i) => {
                const isActive =
                  (i === 0 && trainingFrequency <= 1) ||
                  (i === 1 && trainingFrequency >= 2 && trainingFrequency <= 3) ||
                  (i === 2 && trainingFrequency >= 4 && trainingFrequency <= 5) ||
                  (i === 3 && trainingFrequency === 6) ||
                  (i === 4 && trainingFrequency === 7);
                return (
                  <View
                    key={i}
                    style={[
                      styles.activityLevel,
                      { backgroundColor: isActive ? colors.primaryLight : "transparent" },
                    ]}
                  >
                    <Text style={styles.activityEmoji}>{level.emoji}</Text>
                    <Text
                      style={[
                        styles.activityLabel,
                        { color: isActive ? colors.primary : colors.muted },
                      ]}
                    >
                      {level.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 6: Results */}
        {step === 6 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              Tes besoins nutritionnels 🎉
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Calculés sur mesure avec la formule Mifflin-St Jeor.
            </Text>
            <View style={[styles.resultCard, { backgroundColor: colors.primary }]}>
              <Text style={styles.resultMainLabel}>Calories journalières</Text>
              <Text style={styles.resultMainValue}>{targetCalories}</Text>
              <Text style={styles.resultMainUnit}>kcal / jour</Text>
            </View>
            <View style={styles.resultRow}>
              <View style={[styles.resultSmallCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.resultSmallLabel, { color: colors.muted }]}>BMR</Text>
                <Text style={[styles.resultSmallValue, { color: colors.foreground }]}>{bmr}</Text>
                <Text style={[styles.resultSmallUnit, { color: colors.muted }]}>kcal</Text>
              </View>
              <View style={[styles.resultSmallCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.resultSmallLabel, { color: colors.muted }]}>TDEE</Text>
                <Text style={[styles.resultSmallValue, { color: colors.foreground }]}>{tdee}</Text>
                <Text style={[styles.resultSmallUnit, { color: colors.muted }]}>kcal</Text>
              </View>
            </View>
            <Text style={[styles.macroTitle, { color: colors.foreground }]}>
              Répartition des macros
            </Text>
            <View style={styles.macroRow}>
              {[
                { label: "Protéines", value: macros.protein, color: "#9B7FD4", emoji: "🥩" },
                { label: "Glucides", value: macros.carbs, color: "#6EC6A0", emoji: "🍚" },
                { label: "Lipides", value: macros.fat, color: "#F5A623", emoji: "🥑" },
              ].map((m) => (
                <View
                  key={m.label}
                  style={[styles.macroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={styles.macroEmoji}>{m.emoji}</Text>
                  <Text style={[styles.macroValue, { color: m.color }]}>{m.value}g</Text>
                  <Text style={[styles.macroLabel, { color: colors.muted }]}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* CTA Button */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            onPress={step === TOTAL_STEPS - 1 ? handleFinish : handleNext}
          >
            <Text style={styles.ctaText}>
              {step === 0
                ? "Commencer"
                : step === TOTAL_STEPS - 1
                ? "Démarrer mon aventure 🚀"
                : "Suivant"}
            </Text>
            {step !== TOTAL_STEPS - 1 && (
              <IconSymbol name="arrow.right" size={20} color="#fff" />
            )}
          </TouchableOpacity>
          {step === 0 && (
            <Text style={[styles.skipText, { color: colors.muted }]}>
              Aucune inscription requise
            </Text>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    progressContainer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    progressTrack: {
      flex: 1,
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 3,
    },
    backButton: {
      padding: 4,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 32,
    },
    stepContainer: {
      flex: 1,
      paddingTop: 16,
    },
    emojiContainer: {
      alignItems: "center",
      marginBottom: 24,
    },
    emoji: {
      fontSize: 80,
    },
    title: {
      fontSize: 32,
      fontWeight: "800",
      textAlign: "center",
      marginBottom: 12,
      lineHeight: 40,
    },
    subtitle: {
      fontSize: 16,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 32,
    },
    featureList: {
      gap: 12,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 16,
      gap: 12,
    },
    featureEmoji: {
      fontSize: 24,
    },
    featureText: {
      fontSize: 15,
      fontWeight: "500",
      flex: 1,
    },
    stepTitle: {
      fontSize: 26,
      fontWeight: "700",
      marginBottom: 8,
      lineHeight: 34,
    },
    stepSubtitle: {
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 28,
    },
    fieldGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
    },
    input: {
      borderWidth: 1.5,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
    },
    genderRow: {
      flexDirection: "row",
      gap: 12,
    },
    genderButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    genderEmoji: {
      fontSize: 22,
    },
    genderLabel: {
      fontSize: 15,
      fontWeight: "600",
    },
    goalGrid: {
      gap: 12,
    },
    goalCard: {
      padding: 18,
      borderRadius: 16,
      borderWidth: 1.5,
    },
    goalEmoji: {
      fontSize: 28,
      marginBottom: 6,
    },
    goalLabel: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 4,
    },
    goalDesc: {
      fontSize: 13,
      lineHeight: 18,
    },
    sportsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    sportCard: {
      width: "47%",
      padding: 16,
      borderRadius: 16,
      borderWidth: 1.5,
      alignItems: "center",
      position: "relative",
    },
    sportEmoji: {
      fontSize: 32,
      marginBottom: 8,
    },
    sportLabel: {
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
    },
    sportCheck: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.3)",
      alignItems: "center",
      justifyContent: "center",
    },
    freqCard: {
      alignItems: "center",
      padding: 24,
      borderRadius: 20,
      borderWidth: 1.5,
      marginBottom: 24,
    },
    freqNumber: {
      fontSize: 56,
      fontWeight: "800",
    },
    freqLabel: {
      fontSize: 16,
    },
    freqButtons: {
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      marginBottom: 24,
    },
    freqBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    freqBtnText: {
      fontSize: 15,
      fontWeight: "700",
    },
    activityLevels: {
      gap: 8,
    },
    activityLevel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 12,
    },
    activityEmoji: {
      fontSize: 20,
    },
    activityLabel: {
      fontSize: 14,
      fontWeight: "500",
    },
    resultCard: {
      alignItems: "center",
      padding: 28,
      borderRadius: 24,
      marginBottom: 16,
    },
    resultMainLabel: {
      fontSize: 14,
      color: "rgba(255,255,255,0.8)",
      marginBottom: 4,
    },
    resultMainValue: {
      fontSize: 56,
      fontWeight: "800",
      color: "#fff",
    },
    resultMainUnit: {
      fontSize: 16,
      color: "rgba(255,255,255,0.8)",
    },
    resultRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 24,
    },
    resultSmallCard: {
      flex: 1,
      alignItems: "center",
      padding: 16,
      borderRadius: 16,
      borderWidth: 1.5,
    },
    resultSmallLabel: {
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 4,
    },
    resultSmallValue: {
      fontSize: 28,
      fontWeight: "700",
    },
    resultSmallUnit: {
      fontSize: 12,
    },
    macroTitle: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 12,
    },
    macroRow: {
      flexDirection: "row",
      gap: 10,
    },
    macroCard: {
      flex: 1,
      alignItems: "center",
      padding: 14,
      borderRadius: 16,
      borderWidth: 1.5,
    },
    macroEmoji: {
      fontSize: 22,
      marginBottom: 6,
    },
    macroValue: {
      fontSize: 20,
      fontWeight: "700",
    },
    macroLabel: {
      fontSize: 11,
      marginTop: 2,
    },
    ctaContainer: {
      paddingTop: 32,
      alignItems: "center",
      gap: 12,
    },
    ctaButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 18,
      paddingHorizontal: 40,
      borderRadius: 30,
      width: "100%",
    },
    ctaText: {
      color: "#fff",
      fontSize: 17,
      fontWeight: "700",
    },
    skipText: {
      fontSize: 13,
    },
  });
}
