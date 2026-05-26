import { Platform } from "react-native";
import Constants from "expo-constants";

let domain = process.env.EXPO_PUBLIC_DOMAIN;

if (!domain) {
  // Try to dynamically detect the Metro host IP so physical devices on Wi-Fi can connect automatically
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri ? hostUri.split(":")[0] : null;
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    domain = `${host}:5000`;
  } else {
    domain = "localhost:5000";
  }
}

// Android emulator loopback fallback: 'localhost' refers to emulator itself, need 10.0.2.2 for host machine.
if (Platform.OS === "android" && (domain.startsWith("localhost") || domain.startsWith("127.0.0.1"))) {
  domain = domain.replace("localhost", "10.0.2.2").replace("127.0.0.1", "10.0.2.2");
}

const protocol =
  domain.startsWith("localhost") ||
  domain.startsWith("10.0.2.2") ||
  domain.startsWith("127.0.0.1") ||
  /^\d+\.\d+\.\d+\.\d+/.test(domain)
    ? "http"
    : "https";

export const API_URL = `${protocol}://${domain}`;
