import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export function lightHaptic(reduced = false) {
  if (Platform.OS !== "web" && !reduced) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}
