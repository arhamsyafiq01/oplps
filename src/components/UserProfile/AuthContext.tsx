// src/context/AuthContext.tsx (create this file)
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

// Define the shape of the user object
interface User {
  user_id: string;
  fname: string;
  lname: string;
  role: string;
}

// Define the shape of the context data
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean; // To handle initial loading from storage
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void; // Add updateUser to the context type
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading initially

  // Load user from sessionStorage on initial mount
  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem("user");
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Failed to parse user from sessionStorage", error);
      sessionStorage.removeItem("user"); // Clear corrupted data
    } finally {
      setIsLoading(false); // Finished loading attempt
    }
  }, []);

  const login = useCallback((userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    sessionStorage.setItem("user", JSON.stringify(userData)); // Store user object
    setIsLoading(false); // Ensure loading is off after login
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem("user");
    setIsLoading(false); // Ensure loading is off after logout
    // Optional: Redirect to login page? navigate('/signin'); (would need useNavigate hook here)
  }, []);

  // Update user data in context and storage (e.g., after profile edit)
  const updateUser = useCallback((updatedUserData: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const newUser = { ...prevUser, ...updatedUserData };
      sessionStorage.setItem("user", JSON.stringify(newUser));
      return newUser;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, isLoading, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Create a custom hook for easy consumption
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
