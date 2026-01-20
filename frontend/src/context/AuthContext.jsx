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

    // Escuchar evento de sesión invalidada desde api.js
    useEffect(() => {
        const handleSessionEvent = (event) => {
            const message = event.detail?.message || 'Sesión cerrada desde otro dispositivo';
            console.log('Session invalidation event received:', message);

            if (message.includes('Sesión cerrada') ||
                message.includes('otro dispositivo') ||
                message.includes('sesión expirada') ||
                message.includes('Token inválido')) {
                handleSessionInvalidated(message);
            } else if (user) {
                // Cualquier otro 401 con usuario logueado
                handleSessionInvalidated(message || 'Tu sesión ha expirado');
            }
        };

        window.addEventListener('session-invalidated', handleSessionEvent);
        return () => window.removeEventListener('session-invalidated', handleSessionEvent);
    }, [handleSessionInvalidated, user]);

    // Configurar interceptor de axios para manejar errores de sesión
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                // Detectar cualquier error 401 (no autorizado)
                if (error.response?.status === 401) {
                    const errorMessage = error.response?.data?.error || '';

                    // Si es error específico de sesión cerrada desde otro dispositivo
                    if (errorMessage.includes('Sesión cerrada') ||
                        errorMessage.includes('otro dispositivo') ||
                        errorMessage.includes('sesión fue cerrada')) {
                        handleSessionInvalidated(errorMessage);
                    } else if (errorMessage.includes('Sesión expirada') ||
                        errorMessage.includes('Token inválido') ||
                        errorMessage.includes('Token expirado')) {
                        // Token expirado o inválido - limpiar silenciosamente
                        setUser(null);
                    } else if (user) {
                        // Cualquier otro 401 cuando hay usuario logueado - limpiar sesión
                        console.log('Session invalidated:', errorMessage);
                        handleSessionInvalidated(errorMessage || 'Tu sesión ha expirado');
                    }
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, [handleSessionInvalidated, user]);

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
