import { useState, useEffect } from "react";
import { useAuthContext } from "./AuthContext";
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
  const { user, isLoading } = useAuthContext();
  const [isAdminSession, setIsAdminSession] = useState(false);

  useEffect(() => {
    setIsAdminSession(isAdminAuthenticated());
  }, []);

  const isClerkAdmin = user?.isAdmin === true;
  const isBanned = user?.isBanned === true;
  const isAdmin = isAdminSession || isClerkAdmin;
  const isUser = !!user && !isBanned;

  return {
    isLoaded: !isLoading || isAdminSession,
    isGuest: !user && !isAdmin,
    isUser,
    isAdmin,
    isAdminSession,
    isClerkAdmin,
    isBanned,
    profile: user,
  };
}
