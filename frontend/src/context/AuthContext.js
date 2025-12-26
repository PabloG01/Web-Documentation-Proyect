import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUserLoggedIn();
    }, []);

    const checkUserLoggedIn = async () => {
        try {
            const res = await axios.get('http://localhost:5000/auth/me', { withCredentials: true });
            setUser(res.data);
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const res = await axios.post('http://localhost:5000/auth/login', { email, password }, { withCredentials: true });
        setUser(res.data);
    };

    const register = async (username, email, password) => {
        const res = await axios.post('http://localhost:5000/auth/register', { username, email, password });
        return res.data;
    };

    const logout = async () => {
        await axios.post('http://localhost:5000/auth/logout', {}, { withCredentials: true });
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
