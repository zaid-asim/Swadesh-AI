import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

const GUEST_KEY = "swadesh_guest_mode";

export function enableGuestMode() {
  localStorage.setItem(GUEST_KEY, "true");
}

export function disableGuestMode() {
  localStorage.removeItem(GUEST_KEY);
}

export function isGuestMode() {
  return localStorage.getItem(GUEST_KEY) === "true";
}

export function useAuth() {
  const guestMode = isGuestMode();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    // Don't even fetch if we're in guest mode
    enabled: !guestMode,
  });

  // Guest user object — gives access to all AI tools via localStorage
  const guestUser = guestMode
    ? {
      id: "guest",
      firstName: "Guest",
      lastName: "User",
      email: null,
      profileImageUrl: null,
      setupCompleted: true,
      isGuest: true,
    }
    : null;

  return {
    user: guestUser ?? user,
    isLoading: guestMode ? false : isLoading,
    isAuthenticated: guestMode || !!user,
    isGuest: guestMode,
  };
}
