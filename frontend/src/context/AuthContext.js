import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

// URL dinámica basada en el hostname actual
const API_URL = `http://${window.location.hostname}:5000`;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessionError, setSessionError] = useState(null);

    // Función para limpiar sesión cuando es invalidada
    const handleSessionInvalidated = useCallback((message) => {
        setUser(null);
        setSessionError(message || 'Tu sesión fue cerrada desde otro dispositivo');
    }, []);

    // Limpiar mensaje de error después de mostrarlo
    const clearSessionError = useCallback(() => {
        setSessionError(null);
    }, []);

    useEffect(() => {
        checkUserLoggedIn();
    }, []);

    // Configurar interceptor de axios para manejar errores de sesión
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                // Detectar error de sesión cerrada desde otro dispositivo
                if (error.response?.status === 401) {
                    const errorMessage = error.response?.data?.error;
                    if (errorMessage?.includes('Sesión cerrada') ||
                        errorMessage?.includes('otro dispositivo')) {
                        handleSessionInvalidated(errorMessage);
                    }
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, [handleSessionInvalidated]);

    const checkUserLoggedIn = async () => {
        try {
            const res = await axios.get(`${API_URL}/auth/me`, { withCredentials: true });
            setUser(res.data);
            setSessionError(null);
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const res = await axios.post(`${API_URL}/auth/login`, { email, password }, { withCredentials: true });
        setUser(res.data);
        setSessionError(null);
    };

    const register = async (username, email, password) => {
        const res = await axios.post(`${API_URL}/auth/register`, { username, email, password }, { withCredentials: true });
        return res.data;
    };

    const logout = async () => {
        try {
            await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
        } catch (err) {
            // Ignorar errores al cerrar sesión
        }
        setUser(null);
        setSessionError(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            register,
            logout,
            loading,
            sessionError,
            clearSessionError
        }}>
            {children}
        </AuthContext.Provider>
    );
};
