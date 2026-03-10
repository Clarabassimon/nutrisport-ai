import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM, type Message } from "./_core/llm";
import { storagePut } from "./storage";

// Helper: upload base64 image to S3 and return public URL
async function uploadBase64Image(base64: string, mimeType = "image/jpeg"): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  const key = `meal-scans/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const { url } = await storagePut(key, buffer, mimeType);
  return url;
}

export const nutritionRouter = router({
  // ── Analyze meal from photo ──────────────────────────────────────────────────
  analyzeMeal: publicProcedure
    .input(
      z.object({
        imageUri: z.string(),
        base64: z.string().nullable(),
        targetCalories: z.number().default(2000),
      })
    )
    .mutation(async ({ input }) => {
      let imageUrl = input.imageUri;

      // Upload base64 to S3 if provided (local file URIs won't work with LLM)
      if (input.base64) {
        try {
          imageUrl = await uploadBase64Image(input.base64);
        } catch (e) {
          console.warn("[analyzeMeal] S3 upload failed, using original URI");
        }
      }

      const messages: Message[] = [
          {
            role: "system",
            content: `Tu es un expert en nutrition sportive. Analyse l'image d'un repas et retourne un JSON structuré avec les informations nutritionnelles détaillées. Sois précis et réaliste dans tes estimations.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyse ce repas et retourne un JSON avec exactement cette structure:\n{\n  "foods": [{"name": "nom de l'aliment", "quantity": "quantité estimée", "calories": nombre}],\n  "totalMacros": {"calories": nombre, "protein": nombre, "carbs": nombre, "fat": nombre},\n  "nutritionScore": "A" ou "B" ou "C" ou "D",\n  "scoreReason": "explication courte du score",\n  "suggestions": ["conseil 1", "conseil 2"]\n}\n\nRègles pour le score: A=excellent équilibre nutritionnel, B=bon repas, C=acceptable, D=à améliorer.\nL'objectif calorique journalier est ${input.targetCalories} kcal.`,
              },
              {
                type: "image_url",
                image_url: { url: imageUrl, detail: "high" },
              },
            ],
          },
        ];
      const response = await invokeLLM({
        messages,
        response_format: { type: "json_object" },
      });

      const rawContent0 = response.choices[0]?.message?.content ?? "{}";
      const content = typeof rawContent0 === "string" ? rawContent0 : JSON.stringify(rawContent0);
      try {
        const parsed = JSON.parse(content);
        return {
          foods: parsed.foods ?? [],
          totalMacros: parsed.totalMacros ?? { calories: 0, protein: 0, carbs: 0, fat: 0 },
          nutritionScore: parsed.nutritionScore ?? "C",
          scoreReason: parsed.scoreReason ?? "Analyse complète",
          suggestions: parsed.suggestions ?? [],
        };
      } catch {
        return {
          foods: [],
          totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          nutritionScore: "C" as const,
          scoreReason: "Impossible d'analyser l'image",
          suggestions: ["Réessaie avec une photo plus nette et bien éclairée"],
        };
      }
    }),

  // ── Generate personalized recipes ───────────────────────────────────────────
  generateRecipes: publicProcedure
    .input(
      z.object({
        targetCalories: z.number(),
        targetProtein: z.number(),
        targetCarbs: z.number(),
        targetFat: z.number(),
        goal: z.string(),
        remainingCalories: z.number().optional(),
        remainingProtein: z.number().optional(),
        count: z.number().default(4),
      })
    )
    .mutation(async ({ input }) => {
      const remaining = input.remainingCalories ?? input.targetCalories;
      const remainingProtein = input.remainingProtein ?? input.targetProtein;

      const goalLabels: Record<string, string> = {
        weight_loss: "perte de poids",
        maintenance: "maintien",
        muscle_gain: "prise de masse musculaire",
        recomposition: "recomposition corporelle",
      };

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Tu es un chef nutritionniste expert en nutrition sportive. Tu crées des recettes healthy, rapides et délicieuses adaptées aux sportifs.`,
          },
          {
            role: "user",
            content: `Génère ${input.count} recettes adaptées pour un sportif avec ces paramètres:
- Objectif: ${goalLabels[input.goal] ?? input.goal}
- Calories restantes aujourd'hui: ${remaining} kcal
- Protéines restantes: ${remainingProtein}g
- Calories journalières totales: ${input.targetCalories} kcal

Retourne un JSON avec exactement cette structure:
{
  "recipes": [
    {
      "id": "unique_id",
      "name": "Nom de la recette",
      "description": "Description courte et appétissante",
      "prepTime": nombre_en_minutes,
      "servings": nombre_de_portions,
      "macros": {"calories": nombre, "protein": nombre, "carbs": nombre, "fat": nombre},
      "ingredients": [
        {"name": "ingrédient", "quantity": "quantité", "category": "proteins|vegetables|fruits|starches|grocery|fresh"}
      ],
      "steps": ["étape 1", "étape 2", "étape 3"],
      "tags": ["tag1", "tag2"],
      "goal": ["${input.goal}"]
    }
  ]
}

Les recettes doivent être: healthy, faciles (max 30 min), nutritives, variées. Inclure des recettes petit-déjeuner, déjeuner, dîner et collation.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const rawContent = response.choices[0]?.message?.content ?? "{}";
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      try {
        const parsed = JSON.parse(content);
        return { recipes: parsed.recipes ?? [] };
      } catch {
        return { recipes: [] };
      }
    }),

  // ── Get AI coach advice ──────────────────────────────────────────────────────
  getCoachAdvice: publicProcedure
    .input(
      z.object({
        profile: z.object({
          firstName: z.string(),
          goal: z.string(),
          targetCalories: z.number(),
          targetProtein: z.number(),
        }),
        todayLog: z.object({
          consumedCalories: z.number(),
          consumedProtein: z.number(),
          consumedCarbs: z.number(),
          consumedFat: z.number(),
          mealsCount: z.number(),
        }),
        journal: z
          .object({
            energyLevel: z.number(),
            fatigue: z.number(),
            sleepQuality: z.number(),
            sportPerformance: z.number(),
            hungerLevel: z.number(),
            workoutType: z.string().optional(),
            workoutDuration: z.number().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { profile, todayLog, journal } = input;
      const calorieBalance = profile.targetCalories - todayLog.consumedCalories;
      const proteinBalance = profile.targetProtein - todayLog.consumedProtein;

      const goalLabels: Record<string, string> = {
        weight_loss: "perte de poids",
        maintenance: "maintien",
        muscle_gain: "prise de masse musculaire",
        recomposition: "recomposition corporelle",
      };

      const journalInfo = journal
        ? `
Ressenti aujourd'hui:
- Niveau d'énergie: ${journal.energyLevel}/5
- Fatigue: ${journal.fatigue}/5
- Qualité du sommeil: ${journal.sleepQuality}/5
- Performance sportive: ${journal.sportPerformance}/5
- Niveau de faim: ${journal.hungerLevel}/5
${journal.workoutType ? `- Entraînement: ${journal.workoutType} (${journal.workoutDuration ?? 0} min)` : "- Pas d'entraînement renseigné"}`
        : "Pas de journal renseigné aujourd'hui.";

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Tu es un coach nutritionnel sportif bienveillant et motivant. Tu donnes des conseils personnalisés, pratiques et encourageants. Tu t'adresses directement à l'utilisateur avec son prénom. Tes réponses sont courtes (3-4 phrases max), positives et actionnables.`,
          },
          {
            role: "user",
            content: `Donne un conseil nutritionnel personnalisé pour ${profile.firstName}.

Profil:
- Objectif: ${goalLabels[profile.goal] ?? profile.goal}
- Objectif calorique: ${profile.targetCalories} kcal
- Objectif protéines: ${profile.targetProtein}g

Alimentation d'aujourd'hui:
- Calories consommées: ${todayLog.consumedCalories} kcal (${calorieBalance > 0 ? `${calorieBalance} kcal restantes` : `${Math.abs(calorieBalance)} kcal dépassées`})
- Protéines: ${todayLog.consumedProtein}g (${proteinBalance > 0 ? `${proteinBalance}g restants` : "objectif atteint"})
- Repas enregistrés: ${todayLog.mealsCount}

${journalInfo}

Retourne un JSON: {"advice": "ton conseil personnalisé", "priority": "calories|protein|hydration|recovery|sleep", "emoji": "emoji approprié"}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const rawContent2 = response.choices[0]?.message?.content ?? "{}";
      const content2 = typeof rawContent2 === "string" ? rawContent2 : JSON.stringify(rawContent2);
      try {
        const parsed = JSON.parse(content2);
        return {
          advice: parsed.advice ?? "Continue comme ça, tu es sur la bonne voie ! 💪",
          priority: parsed.priority ?? "calories",
          emoji: parsed.emoji ?? "🧠",
        };
      } catch {
        return {
          advice: "Continue comme ça, tu es sur la bonne voie ! 💪",
          priority: "calories",
          emoji: "🧠",
        };
      }
    }),

  // ── Generate shopping list from recipes ─────────────────────────────────────
  generateShoppingList: publicProcedure
    .input(
      z.object({
        recipes: z.array(
          z.object({
            name: z.string(),
            ingredients: z.array(
              z.object({
                name: z.string(),
                quantity: z.string(),
                category: z.string(),
              })
            ),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      // Aggregate ingredients from all recipes
      const allIngredients: Array<{
        name: string;
        quantity: string;
        category: string;
      }> = [];

      for (const recipe of input.recipes) {
        for (const ingredient of recipe.ingredients) {
          const existing = allIngredients.find(
            (i) => i.name.toLowerCase() === ingredient.name.toLowerCase()
          );
          if (!existing) {
            allIngredients.push({ ...ingredient });
          }
        }
      }

      return {
        items: allIngredients.map((ing, idx) => ({
          id: `item_${idx}_${Date.now()}`,
          name: ing.name,
          quantity: ing.quantity,
          category: ing.category as
            | "proteins"
            | "vegetables"
            | "fruits"
            | "starches"
            | "grocery"
            | "fresh",
          checked: false,
        })),
      };
    }),
});
