import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { loadSupplementLog, saveSupplementLog } from "@/lib/storage";
import type { SupplementType, SupplementLog } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { getTodayDate } from "@/lib/nutrition";

// ─── Données compléments sportifs ──────────────────────────────────────────

interface SupplementInfo {
  type: SupplementType;
  name: string;
  emoji: string;
  priority: "essentiel" | "recommandé" | "optionnel";
  dose: string;
  timing: string;
  benefit: string;
  details: string;
  warning?: string;
}

const SUPPLEMENTS: SupplementInfo[] = [
  {
    type: "whey",
    name: "Whey Protéine",
    emoji: "🥛",
    priority: "recommandé",
    dose: "25–30g",
    timing: "Post-entraînement (dans les 30 min)",
    benefit: "Récupération musculaire & atteinte des objectifs protéiques",
    details:
      "La whey est une protéine de lactosérum à absorption rapide. Elle est particulièrement efficace après l'entraînement pour stimuler la synthèse protéique. Choisir une whey sans sucres ajoutés, avec au moins 20g de protéines pour 25g de poudre.",
    warning: "Pas nécessaire si les apports protéiques sont atteints via l'alimentation.",
  },
  {
    type: "omega3",
    name: "Oméga-3 (EPA/DHA)",
    emoji: "🐟",
    priority: "essentiel",
    dose: "2–3g EPA+DHA/jour",
    timing: "Au cours d'un repas contenant des graisses",
    benefit: "Anti-inflammatoire, santé cardiovasculaire, récupération",
    details:
      "Les oméga-3 sont des acides gras essentiels que le corps ne peut pas synthétiser. Ils réduisent l'inflammation chronique, améliorent la sensibilité à l'insuline et soutiennent la récupération après l'effort. Privilégier une huile de poisson certifiée IFOS avec un ratio EPA/DHA élevé.",
    warning: "Conserver au réfrigérateur après ouverture. Éviter si anticoagulants.",
  },
  {
    type: "vitamin_d",
    name: "Vitamine D3",
    emoji: "☀️",
    priority: "essentiel",
    dose: "2000–4000 UI/jour",
    timing: "Le matin avec un repas gras",
    benefit: "Immunité, hormones, performance musculaire, santé osseuse",
    details:
      "La vitamine D est une hormone stéroïdienne synthétisée par la peau sous l'effet du soleil. En France, la majorité de la population est déficiente, surtout en hiver. Elle joue un rôle crucial dans la fonction musculaire, la testostérone, l'immunité et l'humeur. Associer à la vitamine K2 (MK-7) pour une meilleure absorption.",
    warning: "Faire un bilan sanguin (25-OH vitamine D) avant de supplémenter à haute dose.",
  },
  {
    type: "creatine",
    name: "Créatine Monohydrate",
    emoji: "💪",
    priority: "recommandé",
    dose: "3–5g/jour",
    timing: "N'importe quand (consistance > timing)",
    benefit: "Force, puissance, récupération, gain musculaire",
    details:
      "La créatine monohydrate est le complément le plus étudié en nutrition sportive. Elle augmente les réserves de phosphocréatine musculaire, améliorant les performances en efforts courts et intenses (CrossFit, musculation). Elle favorise également la récupération et peut légèrement augmenter la masse musculaire.",
    warning: "Bien s'hydrater (2-3L d'eau/jour). Phase de charge non nécessaire.",
  },
  {
    type: "glycine",
    name: "Glycine",
    emoji: "😴",
    priority: "optionnel",
    dose: "3–5g",
    timing: "Le soir avant le coucher",
    benefit: "Qualité du sommeil, récupération, santé des articulations",
    details:
      "La glycine est un acide aminé non essentiel qui améliore la qualité du sommeil en abaissant la température corporelle. Elle est également un précurseur du collagène et joue un rôle dans la détoxification hépatique. Particulièrement utile pour les sportifs avec un sommeil perturbé.",
  },
  {
    type: "collagen",
    name: "Collagène Hydrolysé",
    emoji: "🦴",
    priority: "optionnel",
    dose: "10–15g",
    timing: "30 min avant l'entraînement avec vitamine C",
    benefit: "Santé des tendons, ligaments, cartilages et articulations",
    details:
      "Le collagène hydrolysé, pris avec de la vitamine C avant l'exercice, stimule la synthèse de collagène dans les tissus conjonctifs. Particulièrement recommandé en prévention des blessures pour les sports à fort impact comme le CrossFit. Choisir un collagène de type I et III.",
    warning: "Associer obligatoirement à 50mg de vitamine C pour l'absorption.",
  },
  {
    type: "ashwagandha",
    name: "Ashwagandha (KSM-66)",
    emoji: "🌿",
    priority: "optionnel",
    dose: "300–600mg",
    timing: "Le soir avec un repas",
    benefit: "Gestion du stress, cortisol, récupération, sommeil",
    details:
      "L'ashwagandha est une plante adaptogène qui aide à réguler le cortisol (hormone du stress). Elle améliore la récupération, réduit l'anxiété et peut légèrement améliorer les performances. Choisir un extrait standardisé KSM-66 ou Sensoril pour une efficacité optimale.",
    warning: "Déconseillé pendant la grossesse. Cycles de 8-12 semaines recommandés.",
  },
];

const PRIORITY_COLORS = {
  essentiel: "#6EC6A0",
  recommandé: "#9B7FD4",
  optionnel: "#F5A623",
};

const PRIORITY_LABELS = {
  essentiel: "Essentiel",
  recommandé: "Recommandé",
  optionnel: "Optionnel",
};

export default function SupplementsScreen() {
  const colors = useColors();
  const [todayLog, setTodayLog] = useState<SupplementLog>({
    date: getTodayDate(),
    taken: [],
  });
  const [expandedSupplement, setExpandedSupplement] = useState<SupplementType | null>(null);

  useEffect(() => {
    const today = getTodayDate();
    loadSupplementLog(today).then((log) => {
      if (log) setTodayLog(log);
      else setTodayLog({ date: today, taken: [] });
    });
  }, []);

  const toggleSupplement = async (type: SupplementType) => {
    const newTaken = todayLog.taken.includes(type)
      ? todayLog.taken.filter((t) => t !== type)
      : [...todayLog.taken, type];
    const newLog = { ...todayLog, taken: newTaken };
    setTodayLog(newLog);
    await saveSupplementLog(newLog);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(
        newTaken.includes(type)
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
    }
  };

  const takenCount = todayLog.taken.length;
  const essentialCount = SUPPLEMENTS.filter((s) => s.priority === "essentiel").length;
  const essentialTaken = todayLog.taken.filter((t) =>
    SUPPLEMENTS.find((s) => s.type === t && s.priority === "essentiel")
  ).length;

  const styles = createStyles(colors);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>💊 Compléments</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Source info */}
        <View style={[styles.sourceCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Text style={[styles.sourceTitle, { color: colors.primary }]}>
            📋 Compléments recommandés pour les sportifs
          </Text>
          <Text style={[styles.sourceText, { color: colors.foreground }]}>
            Sélection classée par priorité selon les preuves scientifiques et l'utilité pour les sportifs de CrossFit et sports de force.
          </Text>
        </View>

        {/* Today's progress */}
        <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.progressTitle, { color: colors.foreground }]}>Aujourd'hui</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <Text style={[styles.progressValue, { color: colors.primary }]}>{takenCount}/{SUPPLEMENTS.length}</Text>
              <Text style={[styles.progressLabel, { color: colors.muted }]}>Total pris</Text>
            </View>
            <View style={[styles.progressDivider, { backgroundColor: colors.border }]} />
            <View style={styles.progressItem}>
              <Text style={[styles.progressValue, { color: PRIORITY_COLORS.essentiel }]}>{essentialTaken}/{essentialCount}</Text>
              <Text style={[styles.progressLabel, { color: colors.muted }]}>Essentiels</Text>
            </View>
            <View style={[styles.progressDivider, { backgroundColor: colors.border }]} />
            <View style={styles.progressItem}>
              <Text style={[styles.progressValue, { color: colors.foreground }]}>
                {takenCount === 0 ? "🌅" : takenCount < 3 ? "👍" : "🔥"}
              </Text>
              <Text style={[styles.progressLabel, { color: colors.muted }]}>Statut</Text>
            </View>
          </View>
        </View>

        {/* Supplements list */}
        {SUPPLEMENTS.map((supp) => {
          const isTaken = todayLog.taken.includes(supp.type);
          const isExpanded = expandedSupplement === supp.type;

          return (
            <View
              key={supp.type}
              style={[
                styles.suppCard,
                {
                  backgroundColor: isTaken ? colors.primaryLight : colors.surface,
                  borderColor: isTaken ? colors.primary : colors.border,
                },
              ]}
            >
              {/* Main row */}
              <View style={styles.suppMain}>
                {/* Check button */}
                <TouchableOpacity
                  style={[
                    styles.checkBtn,
                    { backgroundColor: isTaken ? colors.primary : colors.background, borderColor: isTaken ? colors.primary : colors.border },
                  ]}
                  onPress={() => toggleSupplement(supp.type)}
                >
                  {isTaken && <IconSymbol name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>

                {/* Info */}
                <View style={styles.suppInfo}>
                  <View style={styles.suppTitleRow}>
                    <Text style={styles.suppEmoji}>{supp.emoji}</Text>
                    <Text style={[styles.suppName, { color: colors.foreground }]}>{supp.name}</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[supp.priority] + "22" }]}>
                      <Text style={[styles.priorityText, { color: PRIORITY_COLORS[supp.priority] }]}>
                        {PRIORITY_LABELS[supp.priority]}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.suppDose, { color: colors.primary }]}>
                    💊 {supp.dose} · ⏰ {supp.timing}
                  </Text>
                  <Text style={[styles.suppBenefit, { color: colors.muted }]}>{supp.benefit}</Text>
                </View>

                {/* Expand button */}
                <TouchableOpacity
                  onPress={() => setExpandedSupplement(isExpanded ? null : supp.type)}
                  style={styles.expandBtn}
                >
                  <IconSymbol
                    name={isExpanded ? "chevron.up" : "chevron.down"}
                    size={16}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              </View>

              {/* Expanded details */}
              {isExpanded && (
                <View style={[styles.suppDetails, { borderTopColor: colors.border }]}>
                  <Text style={[styles.suppDetailsText, { color: colors.foreground }]}>{supp.details}</Text>
                  {supp.warning && (
                    <View style={[styles.warningBox, { backgroundColor: colors.warning + "22", borderColor: colors.warning }]}>
                      <Text style={styles.warningEmoji}>⚠️</Text>
                      <Text style={[styles.warningText, { color: colors.foreground }]}>{supp.warning}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.disclaimerTitle, { color: colors.foreground }]}>ℹ️ Important</Text>
          <Text style={[styles.disclaimerText, { color: colors.muted }]}>
            Ces recommandations sont à titre informatif et basées sur les données scientifiques actuelles en nutrition sportive. Consulte un professionnel de santé avant de commencer tout protocole de supplémentation, notamment si tu as des pathologies ou prends des médicaments.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: "700", textAlign: "center" },
    content: { padding: 16, gap: 14, paddingBottom: 40 },
    sourceCard: { padding: 14, borderRadius: 14, borderWidth: 1.5, gap: 6 },
    sourceTitle: { fontSize: 14, fontWeight: "700" },
    sourceText: { fontSize: 13, lineHeight: 18 },
    progressCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
    progressTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
    progressRow: { flexDirection: "row", alignItems: "center" },
    progressItem: { flex: 1, alignItems: "center", gap: 4 },
    progressValue: { fontSize: 22, fontWeight: "800" },
    progressLabel: { fontSize: 11 },
    progressDivider: { width: 1, height: 40 },
    suppCard: { padding: 14, borderRadius: 16, borderWidth: 1.5, gap: 0 },
    suppMain: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    checkBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 2 },
    suppInfo: { flex: 1, gap: 4 },
    suppTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    suppEmoji: { fontSize: 18 },
    suppName: { fontSize: 15, fontWeight: "700" },
    priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    priorityText: { fontSize: 10, fontWeight: "700" },
    suppDose: { fontSize: 12, fontWeight: "600" },
    suppBenefit: { fontSize: 12, lineHeight: 17 },
    expandBtn: { padding: 4, marginTop: 2 },
    suppDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 10 },
    suppDetailsText: { fontSize: 13, lineHeight: 19 },
    warningBox: { flexDirection: "row", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "flex-start" },
    warningEmoji: { fontSize: 16 },
    warningText: { flex: 1, fontSize: 12, lineHeight: 17 },
    disclaimer: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 6 },
    disclaimerTitle: { fontSize: 14, fontWeight: "700" },
    disclaimerText: { fontSize: 12, lineHeight: 18 },
  });
}
