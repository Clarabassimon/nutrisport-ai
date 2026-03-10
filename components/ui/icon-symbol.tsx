// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for NutriSport AI.
 */
const MAPPING = {
  // Navigation tabs
  "house.fill": "home",
  "camera.fill": "camera-alt",
  "book.fill": "menu-book",
  "fork.knife": "restaurant",
  "cart.fill": "shopping-cart",
  "person.fill": "person",
  // Actions
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  "arrow.right": "arrow-forward",
  "arrow.left": "arrow-back",
  // Content
  "flame.fill": "local-fire-department",
  "bolt.fill": "bolt",
  "heart.fill": "favorite",
  "star.fill": "star",
  "clock.fill": "schedule",
  "drop.fill": "water-drop",
  "leaf.fill": "eco",
  "figure.run": "directions-run",
  "dumbbell.fill": "fitness-center",
  "moon.fill": "nightlight",
  "sun.max.fill": "wb-sunny",
  "bed.double.fill": "bed",
  "chart.bar.fill": "bar-chart",
  "chart.pie.fill": "pie-chart",
  "list.bullet": "list",
  "checkmark": "check",
  "trash.fill": "delete",
  "pencil": "edit",
  "share": "share",
  "info.circle": "info",
  "gear": "settings",
  "photo.fill": "photo",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "sparkles": "auto-awesome",
  "brain.head.profile": "psychology",
  "trophy.fill": "emoji-events",
  "target": "gps-fixed",
  "scale.3d": "monitor-weight",
} as unknown as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
