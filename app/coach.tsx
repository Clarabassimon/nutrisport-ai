import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getUserProfile, getDailyLog } from "@/lib/storage";
import { getTodayDate } from "@/lib/nutrition";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  "Comment optimiser mes protéines ?",
  "Que manger avant l'entraînement ?",
  "Comment améliorer ma récupération ?",
  "Quels aliments pour la prise de masse ?",
];

export default function CoachScreen() {
  const colors = useColors();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Bonjour ! Je suis ton coach nutritionnel IA 🌿\n\nJe suis là pour t'aider à optimiser ta nutrition selon tes objectifs sportifs. Pose-moi n'importe quelle question sur l'alimentation, les macros, les recettes ou la récupération !",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const getAdvice = trpc.nutrition.getCoachAdvice.useMutation();

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText("");
      setLoading(true);

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      try {
        const profile = await getUserProfile();
        const log = await getDailyLog(getTodayDate());

        const result = await getAdvice.mutateAsync({
          profile: profile
            ? {
                firstName: profile.firstName,
                goal: profile.goal,
                targetCalories: profile.targetCalories,
                targetProtein: profile.targetProtein,
              }
            : {
                firstName: "Sportif",
                goal: "maintenance",
                targetCalories: 2000,
                targetProtein: 150,
              },
          todayLog: {
            consumedCalories: log?.totalMacros?.calories ?? 0,
            consumedProtein: log?.totalMacros?.protein ?? 0,
            consumedCarbs: log?.totalMacros?.carbs ?? 0,
            consumedFat: log?.totalMacros?.fat ?? 0,
            mealsCount: log?.meals?.length ?? 0,
          },
          journal: log?.journal
            ? {
                energyLevel: log.journal.energyLevel,
                fatigue: log.journal.fatigue,
                sleepQuality: log.journal.sleepQuality,
                sportPerformance: log.journal.sportPerformance,
                hungerLevel: log.journal.hungerLevel,
                workoutType: log.journal.workoutType,
                workoutDuration: log.journal.workoutDuration,
              }
            : undefined,
        });

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.advice,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Désolé, je n'ai pas pu répondre. Vérifie ta connexion et réessaie.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    },
    [loading, getAdvice]
  );

  const styles = createStyles(colors);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAssistant,
        ]}
      >
        {!isUser && (
          <View style={[styles.avatarSmall, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.avatarSmallText}>🌿</Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: colors.primary }]
              : [styles.bubbleAssistant, { backgroundColor: colors.surface, borderColor: colors.border }],
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              { color: isUser ? "#fff" : colors.foreground },
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.coachAvatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.coachAvatarText}>🌿</Text>
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Coach Nutritionnel IA
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.success }]}>
              En ligne
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListFooterComponent={
            loading ? (
              <View style={styles.typingIndicator}>
                <View
                  style={[
                    styles.avatarSmall,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Text style={styles.avatarSmallText}>🌿</Text>
                </View>
                <View
                  style={[
                    styles.bubble,
                    styles.bubbleAssistant,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              </View>
            ) : null
          }
        />

        {/* Quick Questions */}
        {messages.length <= 1 && (
          <View style={styles.quickQuestions}>
            <Text style={[styles.quickTitle, { color: colors.muted }]}>
              Questions rapides
            </Text>
            <View style={styles.quickGrid}>
              {QUICK_QUESTIONS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.quickBtn,
                    { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                  ]}
                  onPress={() => sendMessage(q)}
                >
                  <Text style={[styles.quickBtnText, { color: colors.primary }]}>
                    {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.background, borderTopColor: colors.border },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Pose ta question..."
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(inputText)}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  inputText.trim() && !loading ? colors.primary : colors.border,
              },
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || loading}
          >
            <IconSymbol name="paperplane.fill" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 12,
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
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    coachAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    coachAvatarText: {
      fontSize: 20,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
    },
    headerSubtitle: {
      fontSize: 12,
    },
    messagesList: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
      gap: 12,
    },
    messageRow: {
      flexDirection: "row",
      gap: 8,
      alignItems: "flex-end",
    },
    messageRowUser: {
      justifyContent: "flex-end",
    },
    messageRowAssistant: {
      justifyContent: "flex-start",
    },
    avatarSmall: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    avatarSmallText: {
      fontSize: 16,
    },
    bubble: {
      maxWidth: "78%",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
    },
    bubbleUser: {
      borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
      borderBottomLeftRadius: 4,
      borderWidth: 1,
    },
    bubbleText: {
      fontSize: 15,
      lineHeight: 22,
    },
    typingIndicator: {
      flexDirection: "row",
      gap: 8,
      alignItems: "flex-end",
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    quickQuestions: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 8,
    },
    quickTitle: {
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    quickGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    quickBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    quickBtnText: {
      fontSize: 13,
      fontWeight: "500",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: Platform.OS === "ios" ? 24 : 16,
      borderTopWidth: 0.5,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 22,
      borderWidth: 1,
      fontSize: 15,
      lineHeight: 22,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
