import type { AccountInfo } from '@azure/msal-browser';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';

export const useAuth = () => {
    const { instance } = useMsal();
    const isAuthenticated = useIsAuthenticated();

    const login = () => {
        instance
            .loginPopup({
                scopes: ['User.Read'], // Basic profile information
            })
            .catch((error) => {
                console.error('Login failed:', error);
            });
    };

    const logout = () => {
        instance.logoutPopup().catch((error) => {
            console.error('Logout failed:', error);
        });
    };

    const getUser = (): AccountInfo | null => {
        return instance.getActiveAccount();
    };

    return {
        isAuthenticated,
        isLoading: false, // MSAL handles loading states internally
        login,
        logout,
        user: getUser(),
    };
};
