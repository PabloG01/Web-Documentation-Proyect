import React, { useState, useEffect } from 'react';
import { githubAPI, bitbucketAPI } from '../services/api';
import '../styles/OAuthSetupCard.css';

function OAuthSetupCard({ provider, providerName, onSave }) {
    const [configured, setConfigured] = useState(false);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showSecret, setShowSecret] = useState(false);

    const [formData, setFormData] = useState({
        clientId: '',
        clientSecret: '',
        callbackUrl: window.location.origin + `/${provider}/auth/${provider}/callback`
    });

    useEffect(() => {
        loadSetup();
    }, [provider]);

    const loadSetup = async () => {
        setLoading(true);
        try {
            const response = provider === 'github'
                ? await githubAPI.getSetup()
                : await bitbucketAPI.getSetup();

            const data = response.data;
            setConfigured(data.configured);

            if (data.configured) {
                setFormData(prev => ({
                    ...prev,
                    clientId: data.clientId || '',
                    callbackUrl: data.callbackUrl || prev.callbackUrl
                }));
            }
        } catch (err) {
            console.error(`Error loading ${providerName} setup:`, err);
            setError('Error al cargar configuración');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validations
        if (!formData.clientId || formData.clientId.length < 10) {
            setError('Client ID debe tener al menos 10 caracteres');
            return;
        }

        if (!formData.clientSecret || formData.clientSecret.length < 20) {
            setError('Client Secret debe tener al menos 20 caracteres');
            return;
        }

        if (!formData.callbackUrl || !formData.callbackUrl.startsWith('http')) {
            setError('Callback URL debe ser una URL válida');
            return;
        }

        setSaving(true);

        try {
            const saveMethod = provider === 'github'
                ? githubAPI.saveSetup
                : bitbucketAPI.saveSetup;

            await saveMethod(formData.clientId, formData.clientSecret, formData.callbackUrl);

            setSuccess(`✅ Credenciales de ${providerName} guardadas correctamente`);
            setConfigured(true);
            setEditing(false);

            // Clear secret from form for security
            setFormData(prev => ({ ...prev, clientSecret: '' }));

            if (onSave) onSave();

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(`Error saving ${providerName} setup:`, err);
            setError(err.response?.data?.message || 'Error al guardar credenciales');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditing(false);
        setError('');
        setFormData(prev => ({ ...prev, clientSecret: '' }));
    };

    if (loading) {
        return (
            <div className="oauth-setup-card">
                <div className="oauth-header">
                    <h3>{providerName} OAuth</h3>
                </div>
                <div className="oauth-loading">
                    <div className="spinner"></div>
                    <p>Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`oauth-setup-card ${configured ? 'configured' : 'not-configured'}`}>
            <div className="oauth-header">
                <h3>{providerName} OAuth</h3>
                <span className={`status-badge ${configured ? 'success' : 'warning'}`}>
                    {configured ? '✅ Configurado' : '⚠️ No configurado'}
                </span>
            </div>

            {success && (
                <div className="alert alert-success">
                    {success}
                </div>
            )}

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            {!editing && !configured && (
                <div className="oauth-content">
                    <p className="oauth-description">
                        Configura tus credenciales OAuth para acceder a repositorios privados de {providerName}.
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={() => setEditing(true)}
                    >
                        Configurar {providerName}
                    </button>
                </div>
            )}

            {!editing && configured && (
                <div className="oauth-content">
                    <p className="oauth-info">
                        <strong>Client ID:</strong> {formData.clientId}
                    </p>
                    <p className="oauth-info">
                        <strong>Callback URL:</strong> {formData.callbackUrl}
                    </p>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setEditing(true)}
                    >
                        Actualizar Credenciales
                    </button>
                </div>
            )}

            {editing && (
                <form onSubmit={handleSave} className="oauth-form">
                    <div className="form-group">
                        <label htmlFor={`${provider}-client-id`}>
                            Client ID <span className="required">*</span>
                        </label>
                        <input
                            id={`${provider}-client-id`}
                            type="text"
                            value={formData.clientId}
                            onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                            placeholder="Ej: Iv1.a1b2c3d4e5f6g7h8"
                            required
                            minLength={10}
                        />
                        <small className="form-hint">
                            Obten esto de tu OAuth App en {providerName}
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor={`${provider}-client-secret`}>
                            Client Secret <span className="required">*</span>
                        </label>
                        <div className="input-with-toggle">
                            <input
                                id={`${provider}-client-secret`}
                                type={showSecret ? 'text' : 'password'}
                                value={formData.clientSecret}
                                onChange={(e) => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
                                placeholder="Ingresa tu client secret"
                                required
                                minLength={20}
                            />
                            <button
                                type="button"
                                className="toggle-visibility"
                                onClick={() => setShowSecret(!showSecret)}
                                title={showSecret ? 'Ocultar' : 'Mostrar'}
                            >
                                {showSecret ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        <small className="form-hint">
                            Se encriptará antes de guardarse
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor={`${provider}-callback-url`}>
                            Callback URL <span className="required">*</span>
                        </label>
                        <input
                            id={`${provider}-callback-url`}
                            type="url"
                            value={formData.callbackUrl}
                            onChange={(e) => setFormData(prev => ({ ...prev, callbackUrl: e.target.value }))}
                            placeholder="https://tu-dominio.com/auth/github/callback"
                            required
                        />
                        <small className="form-hint">
                            Debe coincidir con la URL configurada en tu OAuth App
                        </small>
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar Configuración'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleCancel}
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                    </div>

                    <div className="oauth-help">
                        <h4>📖 ¿Cómo crear una OAuth App?</h4>
                        <ul>
                            {provider === 'github' && (
                                <>
                                    <li>Ve a GitHub → Settings → Developer settings → OAuth Apps</li>
                                    <li>Click en "New OAuth App"</li>
                                    <li>Completa el formulario y usa el Callback URL de arriba</li>
                                    <li>Copia el Client ID y genera un Client Secret</li>
                                </>
                            )}
                            {provider === 'bitbucket' && (
                                <>
                                    <li>Ve a Bitbucket → Settings → OAuth consumers</li>
                                    <li>Click en "Add consumer"</li>
                                    <li>Completa el formulario y usa el Callback URL de arriba</li>
                                    <li>Copia el Key (Client ID) y Secret</li>
                                </>
                            )}
                        </ul>
                    </div>
                </form>
            )}
        </div>
    );
}

export default OAuthSetupCard;
