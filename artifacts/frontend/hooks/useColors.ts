import { useColorScheme } from "react-native";
import { useAuth } from "@/context/AuthContext";

import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current color scheme and user role.
 */
export function useColors() {
  const scheme = useColorScheme();
  const { user } = useAuth();
  
  const role = user?.role;
  const isDark = scheme === "dark";

  let palette;
  if (role === "admin") {
    palette = isDark ? colors.adminDark : colors.adminLight;
  } else if (role === "teacher") {
    palette = isDark ? colors.teacherDark : colors.teacherLight;
  } else if (role === "parent") {
    palette = isDark ? colors.parentDark : colors.parentLight;
  } else {
    palette = isDark ? colors.defaultDark : colors.defaultLight;
  }

  return { ...palette, radius: colors.radius };
}
