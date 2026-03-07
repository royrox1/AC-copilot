import React, { useState } from 'react';
import { X, Search, Download, Loader2 } from 'lucide-react';
import { JiraService } from '../services/JiraService';

const JiraImportModal = ({ isOpen, onClose, config, onImport }) => {
    const [jql, setJql] = useState('updatedDate >= -30d ORDER BY updatedDate DESC');
    const [issues, setIssues] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSearch = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await JiraService.searchIssues(config.domain, config.email, config.token, jql);
            if (data && data.issues) {
                setIssues(data.issues);
            } else {
                setIssues([]);
            }
        } catch (err) {
            setError('Failed to fetch issues. Check your JQL or connection.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = (issue) => {
        // Extract useful info
        const summary = issue.fields.summary;
        const description = issue.fields.description || '';
        // Description in Jira v3 is ADF, need parsing or raw string if v2.
        // For now assuming we might get some text or just using summary as prompt is a good start.
        // If description is object (ADF), simplified extraction:
        let descText = '';
        if (typeof description === 'string') {
            descText = description;
        } else if (description && description.content) {
            // Very basic ADF parser for demo
            descText = description.content.map(p =>
                p.content ? p.content.map(c => c.text).join('') : ''
            ).join('\n');
        }

        onImport({
            key: issue.key,
            summary,
            description: descText
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-strong rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Import from Jira</h2>
                    <button onClick={onClose} className="text-white hover:text-gray-200">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            placeholder="JQL Search (e.g. project = MVP)"
                            className="flex-1 p-3 glass-input rounded-xl text-white outline-none focus:ring-2 focus:ring-purple-400"
                            value={jql}
                            onChange={(e) => setJql(e.target.value)}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="p-3 bg-purple-600 rounded-xl text-white hover:bg-purple-500 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
                        </button>
                    </div>

                    {error && <p className="text-red-300 mb-4">{error}</p>}

                    <div className="overflow-y-auto max-h-[400px] space-y-2 pr-2">
                        {issues.length === 0 && !isLoading ? (
                            <div className="text-white/50 text-center py-8">No issues found</div>
                        ) : (
                            issues.map(issue => (
                                <div key={issue.id} className="p-4 glass rounded-xl hover:bg-white/5 transition border border-white/5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="bg-blue-500/20 text-blue-200 text-xs px-2 py-0.5 rounded">{issue.key}</span>
                                                <h3 className="font-semibold text-white">{issue.fields.summary}</h3>
                                            </div>
                                            <p className="text-sm text-white/60 line-clamp-2">
                                                {typeof issue.fields.description === 'string'
                                                    ? issue.fields.description
                                                    : 'Detailed description available'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleSelect(issue)}
                                            className="p-2 hover:bg-white/10 rounded-lg text-purple-300 transition"
                                            title="Import"
                                        >
                                            <Download size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JiraImportModal;
