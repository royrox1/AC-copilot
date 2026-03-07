import React, { useState, useEffect } from 'react';
import { X, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { JiraService } from '../services/JiraService';

const JiraConfigModal = ({ isOpen, onClose, onSave, savedConfig }) => {
    const [domain, setDomain] = useState('');
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [status, setStatus] = useState({ type: '', msg: '' });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (savedConfig) {
            setDomain(savedConfig.domain || '');
            setEmail(savedConfig.email || '');
            setToken(savedConfig.token || '');
        }
    }, [savedConfig]);

    if (!isOpen) return null;

    const handleTestAndSave = async () => {
        setIsLoading(true);
        setStatus({ type: '', msg: '' });

        try {
            await JiraService.validateCredentials(domain, email, token);
            setStatus({ type: 'success', msg: 'Connection successful!' });
            onSave({ domain, email, token });
            setTimeout(onClose, 1500);
        } catch (error) {
            setStatus({ type: 'error', msg: 'Connection failed. Check credentials.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-strong rounded-3xl w-full max-w-md shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Jira Configuration</h2>
                    <button onClick={onClose} className="text-white hover:text-gray-200">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-purple-200 mb-2">Jira Domain</label>
                        <input
                            type="text"
                            placeholder="company.atlassian.net"
                            className="w-full p-3 glass-input rounded-xl text-white outline-none focus:ring-2 focus:ring-purple-400"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-purple-200 mb-2">Email Address</label>
                        <input
                            type="email"
                            placeholder="user@example.com"
                            className="w-full p-3 glass-input rounded-xl text-white outline-none focus:ring-2 focus:ring-purple-400"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-purple-200 mb-2">API Token</label>
                        <input
                            type="password"
                            placeholder="Enter your API Token"
                            className="w-full p-3 glass-input rounded-xl text-white outline-none focus:ring-2 focus:ring-purple-400"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                        />
                        <p className="text-xs text-purple-300 mt-2">
                            Generate at: <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="underline hover:text-white">Atlassian Security</a>
                        </p>
                    </div>

                    {status.msg && (
                        <div className={`p-3 rounded-xl flex items-center gap-2 ${status.type === 'success' ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
                            {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                            {status.msg}
                        </div>
                    )}

                    <button
                        onClick={handleTestAndSave}
                        disabled={isLoading || !domain || !email || !token}
                        className={`w-full py-4 mt-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2
              ${isLoading ? 'bg-gray-600/50 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg hover:shadow-purple-500/30'}`}
                    >
                        {isLoading ? 'Testing Connection...' : <><Save size={20} /> Save Configuration</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JiraConfigModal;
