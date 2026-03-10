import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
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
  calculateCrossfitMacros,
  calculateClassicMacros,
  getCrossfitActivityLabel,
} from "@/lib/nutrition";
import { saveUserProfile, setOnboardingDone } from "@/lib/storage";
import type { Gender, Goal, Sport, MacroMethod } from "@/lib/types";
import { GOAL_LABELS, SPORT_LABELS } from "@/lib/types";
import * as Haptics from "expo-haptics";

const TOTAL_STEPS = 8; // +1 pour l'étape choix méthode

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
  const [gender, setGender] = useState<Gender>("female");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState<Goal>("maintenance");
  const [sports, setSports] = useState<Sport[]>([]);
  const [trainingFrequency, setTrainingFrequency] = useState(3);
  const [macroMethod, setMacroMethod] = useState<MacroMethod>("crossfit");

  // Results
  const [bmr, setBmr] = useState(0);
  const [tdee, setTdee] = useState(0);
  const [cfMacros, setCfMacros] = useState({ protein: 0, carbs: 0, fat: 0, calories: 0, na: 0.9, weightLbs: 0 });
  const [clMacros, setClMacros] = useState({ protein: 0, carbs: 0, fat: 0, calories: 0 });

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
      // Calcul avant l'étape résultats (step 6)
      if (step === 5) {
        const h = parseFloat(height);
        const w = parseFloat(weight);
        const a = parseInt(age);
        if (!isNaN(h) && !isNaN(w) && !isNaN(a)) {
          const calculatedBmr = calculateBMR(w, h, a, gender);
          const calculatedTdee = calculateTDEE(calculatedBmr, trainingFrequency);
          setBmr(calculatedBmr);
          setTdee(calculatedTdee);
          const cf = calculateCrossfitMacros(w, trainingFrequency);
          const cl = calculateClassicMacros(w, trainingFrequency);
          setCfMacros(cf);
          setClMacros(cl);
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
      macroMethod,
    });
    await saveUserProfile(profile);
    await setOnboardingDone();
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.replace("/(tabs)" as never);
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
  const selectedMacros = macroMethod === "crossfit" ? cfMacros : clMacros;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
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
              Ton coach nutritionnel CrossFit personnel. Mange mieux, performe plus, vis sainement.
            </Text>
            <View style={styles.featureList}>
              {[
                { icon: "🔥", text: "Calcul macros méthode CrossFit (Coach Julie)" },
                { icon: "📷", text: "Analyse de repas par photo IA" },
                { icon: "🍽️", text: "Créateur de menus avec grammes CRU/cuit" },
                { icon: "🧊", text: "Recettes selon tes ingrédients du frigo" },
                { icon: "🧠", text: "Coach IA nutritionnel CrossFit" },
              ].map((f, i) => (
                <View key={i} style={[styles.featureItem, { backgroundColor: colors.primaryLight }]}>
                  <Text style={styles.featureEmoji}>{f.icon}</Text>
                  <Text style={[styles.featureText, { color: colors.foreground }]}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* STEP 1: Name & Age & Gender */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Faisons connaissance 👋</Text>
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
                {(["female", "male"] as Gender[]).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderButton,
                      { backgroundColor: gender === g ? colors.primary : colors.surface, borderColor: gender === g ? colors.primary : colors.border },
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={styles.genderEmoji}>{g === "male" ? "👨" : "👩"}</Text>
                    <Text style={[styles.genderLabel, { color: gender === g ? "#fff" : colors.foreground }]}>
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
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Ta morphologie 📏</Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Indispensable pour calculer ton métabolisme de base (BMR).
            </Text>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Taille (cm)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
                placeholder="Ex: 165"
                placeholderTextColor={colors.muted}
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Poids (kg)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
                placeholder="Ex: 65"
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
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Ton objectif 🎯</Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Cela détermine tes apports caloriques et la répartition de tes macros.
            </Text>
            <View style={styles.goalGrid}>
              {GOALS.map((g) => {
                const icons: Record<Goal, string> = {
                  weight_loss: "🔥", maintenance: "⚖️", muscle_gain: "💪", recomposition: "✨",
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
                      { backgroundColor: goal === g ? colors.primary : colors.surface, borderColor: goal === g ? colors.primary : colors.border },
                    ]}
                    onPress={() => {
                      setGoal(g);
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={styles.goalEmoji}>{icons[g]}</Text>
                    <Text style={[styles.goalLabel, { color: goal === g ? "#fff" : colors.foreground }]}>{GOAL_LABELS[g]}</Text>
                    <Text style={[styles.goalDesc, { color: goal === g ? "rgba(255,255,255,0.8)" : colors.muted }]}>{descs[g]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 4: Sports */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Tes sports 🏃</Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Sélectionne tous les sports que tu pratiques.
            </Text>
            <View style={styles.sportsGrid}>
              {SPORTS.map((s) => {
                const sportEmojis: Record<Sport, string> = {
                  musculation: "🏋️", running: "🏃", crossfit: "⚡", fitness: "💃", sports_collectifs: "⚽", autres: "🎯",
                };
                const selected = sports.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.sportCard,
                      { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border },
                    ]}
                    onPress={() => toggleSport(s)}
                  >
                    <Text style={styles.sportEmoji}>{sportEmojis[s]}</Text>
                    <Text style={[styles.sportLabel, { color: selected ? "#fff" : colors.foreground }]}>{SPORT_LABELS[s]}</Text>
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
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Fréquence d'entraînement 📅</Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Combien de fois t'entraînes-tu par semaine ?
            </Text>
            <View style={[styles.freqCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.freqNumber, { color: colors.primary }]}>{trainingFrequency}</Text>
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
                    { backgroundColor: trainingFrequency === n ? colors.primary : colors.surface, borderColor: trainingFrequency === n ? colors.primary : colors.border },
                  ]}
                  onPress={() => {
                    setTrainingFrequency(n);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.freqBtnText, { color: trainingFrequency === n ? "#fff" : colors.foreground }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* CrossFit NA indicator */}
            <View style={[styles.naCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Text style={[styles.naTitle, { color: colors.primary }]}>Niveau d'activité CrossFit (NA)</Text>
              {[
                { range: "0 séance", na: "0.8", label: "Inactif / Sédentaire" },
                { range: "1-3 séances", na: "0.9", label: "Activité modérée" },
                { range: "4-5 séances", na: "1.0", label: "Actif" },
                { range: "6-7 séances", na: "1.2", label: "Très actif" },
              ].map((row, i) => {
                const isActive =
                  (i === 0 && trainingFrequency === 0) ||
                  (i === 1 && trainingFrequency >= 1 && trainingFrequency <= 3) ||
                  (i === 2 && trainingFrequency >= 4 && trainingFrequency <= 5) ||
                  (i === 3 && trainingFrequency >= 6);
                return (
                  <View key={i} style={[styles.naRow, isActive && { backgroundColor: colors.primary + "22" }]}>
                    <Text style={[styles.naRange, { color: isActive ? colors.primary : colors.muted }]}>{row.range}</Text>
                    <Text style={[styles.naValue, { color: isActive ? colors.primary : colors.foreground, fontWeight: isActive ? "700" : "400" }]}>NA = {row.na}</Text>
                    <Text style={[styles.naLabel, { color: isActive ? colors.primary : colors.muted }]}>{row.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 6: Comparaison méthodes */}
        {step === 6 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Tes besoins nutritionnels 📊</Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Voici les 2 méthodes de calcul. Choisis celle qui te correspond.
            </Text>

            {/* Méthode CrossFit */}
            <TouchableOpacity
              style={[
                styles.methodCard,
                {
                  borderColor: macroMethod === "crossfit" ? colors.primary : colors.border,
                  backgroundColor: macroMethod === "crossfit" ? colors.primaryLight : colors.surface,
                },
              ]}
              onPress={() => {
                setMacroMethod("crossfit");
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <View style={styles.methodHeader}>
                <View style={styles.methodTitleRow}>
                  <Text style={styles.methodEmoji}>⚡</Text>
                  <View>
                    <Text style={[styles.methodTitle, { color: colors.foreground }]}>Méthode CrossFit</Text>
                    <Text style={[styles.methodSubtitle, { color: colors.muted }]}>Coach Julie — Ratio 40/30/30</Text>
                  </View>
                </View>
                {macroMethod === "crossfit" && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.selectedBadgeText}>Sélectionnée</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.methodFormula, { color: colors.muted }]}>
                {cfMacros.weightLbs} lbs × NA {cfMacros.na} = {cfMacros.protein}g protéines
              </Text>
              <View style={styles.macroRow}>
                {[
                  { label: "Protéines", value: cfMacros.protein, color: "#9B7FD4", emoji: "🥩" },
                  { label: "Glucides", value: cfMacros.carbs, color: "#6EC6A0", emoji: "🍚" },
                  { label: "Lipides", value: cfMacros.fat, color: "#F5A623", emoji: "🥑" },
                ].map((m) => (
                  <View key={m.label} style={[styles.macroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={styles.macroEmoji}>{m.emoji}</Text>
                    <Text style={[styles.macroValue, { color: m.color }]}>{m.value}g</Text>
                    <Text style={[styles.macroLabel, { color: colors.muted }]}>{m.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.methodCalories, { color: colors.primary }]}>≈ {cfMacros.calories} kcal/jour</Text>
            </TouchableOpacity>

            {/* Méthode Classique */}
            <TouchableOpacity
              style={[
                styles.methodCard,
                {
                  borderColor: macroMethod === "classic" ? colors.primary : colors.border,
                  backgroundColor: macroMethod === "classic" ? colors.primaryLight : colors.surface,
                },
              ]}
              onPress={() => {
                setMacroMethod("classic");
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <View style={styles.methodHeader}>
                <View style={styles.methodTitleRow}>
                  <Text style={styles.methodEmoji}>📐</Text>
                  <View>
                    <Text style={[styles.methodTitle, { color: colors.foreground }]}>Méthode Classique</Text>
                    <Text style={[styles.methodSubtitle, { color: colors.muted }]}>Par kg de poids de corps</Text>
                  </View>
                </View>
                {macroMethod === "classic" && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.selectedBadgeText}>Sélectionnée</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.methodFormula, { color: colors.muted }]}>
                BMR: {bmr} kcal · TDEE: {tdee} kcal
              </Text>
              <View style={styles.macroRow}>
                {[
                  { label: "Protéines", value: clMacros.protein, color: "#9B7FD4", emoji: "🥩" },
                  { label: "Glucides", value: clMacros.carbs, color: "#6EC6A0", emoji: "🍚" },
                  { label: "Lipides", value: clMacros.fat, color: "#F5A623", emoji: "🥑" },
                ].map((m) => (
                  <View key={m.label} style={[styles.macroCard, { backgroundColor: macroMethod === "classic" ? colors.surface : colors.background, borderColor: colors.border }]}>
                    <Text style={styles.macroEmoji}>{m.emoji}</Text>
                    <Text style={[styles.macroValue, { color: m.color }]}>{m.value}g</Text>
                    <Text style={[styles.macroLabel, { color: colors.muted }]}>{m.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.methodCalories, { color: colors.primary }]}>≈ {clMacros.calories} kcal/jour</Text>
            </TouchableOpacity>

            <View style={[styles.infoBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Text style={[styles.infoText, { color: colors.primary }]}>
                💡 Tu pourras changer de méthode à tout moment dans ton profil.
              </Text>
            </View>
          </View>
        )}

        {/* STEP 7: Confirmation finale */}
        {step === 7 && (
          <View style={styles.stepContainer}>
            <View style={styles.emojiContainer}>
              <Text style={styles.emoji}>🚀</Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Tout est prêt, {firstName || "Sportif"} !
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Voici ton résumé nutritionnel basé sur la méthode {macroMethod === "crossfit" ? "CrossFit (Coach Julie)" : "Classique"}.
            </Text>
            <View style={[styles.resultCard, { backgroundColor: colors.primary }]}>
              <Text style={styles.resultMainLabel}>
                {macroMethod === "crossfit" ? "⚡ Méthode CrossFit" : "📐 Méthode Classique"}
              </Text>
              <Text style={styles.resultMainValue}>{selectedMacros.calories}</Text>
              <Text style={styles.resultMainUnit}>kcal / jour</Text>
            </View>
            <View style={styles.macroRow}>
              {[
                { label: "Protéines", value: selectedMacros.protein, color: "#9B7FD4", emoji: "🥩" },
                { label: "Glucides", value: selectedMacros.carbs, color: "#6EC6A0", emoji: "🍚" },
                { label: "Lipides", value: selectedMacros.fat, color: "#F5A623", emoji: "🥑" },
              ].map((m) => (
                <View key={m.label} style={[styles.macroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={styles.macroEmoji}>{m.emoji}</Text>
                  <Text style={[styles.macroValue, { color: m.color }]}>{m.value}g</Text>
                  <Text style={[styles.macroLabel, { color: colors.muted }]}>{m.label}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.infoBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Text style={[styles.infoText, { color: colors.primary }]}>
                ⚠️ Ces valeurs sont un point de départ. La seule façon de connaître tes calories de maintien est de suivre tes apports sur 1-2 semaines avec un poids stable.
              </Text>
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
              {step === 0 ? "Commencer" : step === TOTAL_STEPS - 1 ? "Démarrer mon aventure 🚀" : "Suivant"}
            </Text>
            {step !== TOTAL_STEPS - 1 && (
              <IconSymbol name="arrow.right" size={20} color="#fff" />
            )}
          </TouchableOpacity>
          {step === 0 && (
            <Text style={[styles.skipText, { color: colors.muted }]}>Aucune inscription requise</Text>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    progressContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 },
    progressTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
    backButton: { padding: 4 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
    stepContainer: { flex: 1, paddingTop: 20, gap: 16 },
    emojiContainer: { alignItems: "center", marginBottom: 8 },
    emoji: { fontSize: 64 },
    title: { fontSize: 28, fontWeight: "700", textAlign: "center", lineHeight: 36 },
    subtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
    featureList: { gap: 10, marginTop: 8 },
    featureItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12 },
    featureEmoji: { fontSize: 20 },
    featureText: { fontSize: 14, fontWeight: "500", flex: 1 },
    stepTitle: { fontSize: 24, fontWeight: "700", lineHeight: 30 },
    stepSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
    fieldGroup: { gap: 8 },
    label: { fontSize: 14, fontWeight: "600" },
    input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 16, height: 52 },
    genderRow: { flexDirection: "row", gap: 12 },
    genderButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5 },
    genderEmoji: { fontSize: 22 },
    genderLabel: { fontSize: 15, fontWeight: "600" },
    goalGrid: { gap: 10 },
    goalCard: { padding: 16, borderRadius: 14, borderWidth: 1.5, gap: 4 },
    goalEmoji: { fontSize: 24 },
    goalLabel: { fontSize: 16, fontWeight: "700" },
    goalDesc: { fontSize: 13, lineHeight: 18 },
    sportsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    sportCard: { width: "47%", padding: 16, borderRadius: 14, borderWidth: 1.5, alignItems: "center", gap: 8, position: "relative" },
    sportEmoji: { fontSize: 28 },
    sportLabel: { fontSize: 13, fontWeight: "600", textAlign: "center" },
    sportCheck: { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
    freqCard: { alignItems: "center", padding: 24, borderRadius: 16, borderWidth: 1.5 },
    freqNumber: { fontSize: 48, fontWeight: "800" },
    freqLabel: { fontSize: 16, marginTop: 4 },
    freqButtons: { flexDirection: "row", gap: 8, justifyContent: "center" },
    freqBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
    freqBtnText: { fontSize: 15, fontWeight: "700" },
    naCard: { padding: 16, borderRadius: 14, borderWidth: 1.5, gap: 8 },
    naTitle: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
    naRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 },
    naRange: { fontSize: 12, width: 90 },
    naValue: { fontSize: 13, width: 70 },
    naLabel: { fontSize: 12, flex: 1 },
    methodCard: { padding: 16, borderRadius: 16, borderWidth: 2, gap: 10 },
    methodHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    methodTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    methodEmoji: { fontSize: 28 },
    methodTitle: { fontSize: 16, fontWeight: "700" },
    methodSubtitle: { fontSize: 12, marginTop: 2 },
    selectedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    selectedBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    methodFormula: { fontSize: 12, fontStyle: "italic" },
    methodCalories: { fontSize: 14, fontWeight: "700", textAlign: "center", marginTop: 4 },
    macroRow: { flexDirection: "row", gap: 8 },
    macroCard: { flex: 1, alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1 },
    macroEmoji: { fontSize: 20 },
    macroValue: { fontSize: 18, fontWeight: "800", marginTop: 4 },
    macroLabel: { fontSize: 11, marginTop: 2 },
    resultCard: { padding: 24, borderRadius: 20, alignItems: "center", gap: 4 },
    resultMainLabel: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600" },
    resultMainValue: { color: "#fff", fontSize: 52, fontWeight: "800" },
    resultMainUnit: { color: "rgba(255,255,255,0.85)", fontSize: 16 },
    infoBox: { padding: 14, borderRadius: 12, borderWidth: 1 },
    infoText: { fontSize: 13, lineHeight: 19 },
    ctaContainer: { paddingTop: 24, gap: 12, alignItems: "center" },
    ctaButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, width: "100%" },
    ctaText: { color: "#fff", fontSize: 17, fontWeight: "700" },
    skipText: { fontSize: 13 },
    activityLevels: { gap: 8 },
    activityLevel: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10 },
    activityEmoji: { fontSize: 20 },
    activityLabel: { fontSize: 13, fontWeight: "500" },
  });
}
