import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useGetMyProfile } from "@workspace/api-client-react";
import { isAdminAuthenticated } from "./adminAuth";

export interface RoleState {
  isLoaded: boolean;
  isGuest: boolean;
  isUser: boolean;
  isAdmin: boolean;
  isAdminSession: boolean;
  isClerkAdmin: boolean;
  isBanned: boolean;
  profile: any;
}

export function useRole(): RoleState {
  const { isSignedIn, isLoaded } = useAuth();
  const [isAdminSession, setIsAdminSession] = useState(false);

  useEffect(() => {
    setIsAdminSession(isAdminAuthenticated());
  }, []);

  const { data: profile } = useGetMyProfile({
    query: { enabled: isSignedIn === true },
  });

  const isClerkAdmin = (profile as any)?.isAdmin === true;
  const isBanned = (profile as any)?.isBanned === true;
  const isAdmin = isAdminSession || isClerkAdmin;
  const isUser = isSignedIn === true && !isBanned;

  return {
    isLoaded: isLoaded || isAdminSession,
    isGuest: !isSignedIn && !isAdmin,
    isUser,
    isAdmin,
    isAdminSession,
    isClerkAdmin,
    isBanned,
    profile,
  };
}
