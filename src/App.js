import React, { useState, useEffect } from 'react';
import { Zap, Settings, X, CheckCircle, AlertCircle, Database, Trash2, Edit2, Save, Copy, Download, BarChart, Cloud, Link } from 'lucide-react';
import { JiraService } from './services/JiraService';
import { FileService } from './services/FileService';
import { RagService } from './services/RagService';
import { useLearning } from './hooks/useLearning';
import JiraConfigModal from './components/JiraConfigModal';
import JiraImportModal from './components/JiraImportModal';

const App = () => {
  const [inputText, setInputText] = useState('');
  const [generatedACs, setGeneratedACs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [showRAG, setShowRAG] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [ragEnabled, setRagEnabled] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [editingAC, setEditingAC] = useState(null);
  const [editedAC, setEditedAC] = useState(null);
  const { learningData, recordEdit, toggleLikeAC, resetLearningData: resetLearning } = useLearning();
  const [showInsights, setShowInsights] = useState(false);
  const [originalAC, setOriginalAC] = useState(null);

  // Jira State
  const [jiraConfig, setJiraConfig] = useState(null);
  const [showJiraConfig, setShowJiraConfig] = useState(false);
  const [showJiraImport, setShowJiraImport] = useState(false);

  // Helper function for downloading files
  const downloadFile = (content, filename, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load state from localStorage on mount
  useEffect(() => {
    const loadState = (key, setter) => {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setter(JSON.parse(saved));
        } catch (e) {
          console.error(`Failed to load ${key}:`, e);
        }
      }
    };

    loadState('ac-knowledge-base', setKnowledgeBase);
    loadState('ac-generated-acs', setGeneratedACs);
    loadState('ac-jira-config', setJiraConfig);
  }, []);

  // Save state to localStorage whenever it changes

  useEffect(() => {
    localStorage.setItem('ac-knowledge-base', JSON.stringify(knowledgeBase));
  }, [knowledgeBase]);

  useEffect(() => {
    localStorage.setItem('ac-generated-acs', JSON.stringify(generatedACs));
  }, [generatedACs]);

  useEffect(() => {
    if (jiraConfig) {
      localStorage.setItem('ac-jira-config', JSON.stringify(jiraConfig));
    }
  }, [jiraConfig]);

  const handleResetLearning = () => {
    const confirmed = window.confirm('Are you sure you want to reset all learning data? This will remove all learned patterns and preferences.');
    if (confirmed) {
      resetLearning();
      setSuccessMsg('✅ Learning data reset successfully!');
      setShowInsights(false);
    }
  };

  const handleFileUpload = async (event) => {
    await FileService.handleFileUpload(
      event.target.files,
      setKnowledgeBase,
      setSuccessMsg,
      setErrorMsg
    );
    event.target.value = '';
  };



  const addWebLink = () => {
    const url = prompt('Enter web link (URL):');
    if (!url || !url.trim()) return;

    try {
      new URL(url); // Validate URL

      const newDoc = {
        id: Date.now(),
        title: `Web: ${url}`,
        content: `Web Link: ${url}\n\n⚠️ Please manually add key content from this webpage.\n\nSuggested content to add:\n- Main topic\n- Key points\n- Important terminology\n- Relevant sections`,
        type: 'web-link',
        url: url,
        uploadedAt: new Date().toISOString()
      };

      setKnowledgeBase(prev => [...prev, newDoc]);
      setSuccessMsg('✅ Web link added. Please add manual content.');
    } catch (err) {
      setErrorMsg('Invalid URL format');
    }
  };

  const addDocument = () => {
    if (!newDocTitle.trim() || newDocTitle.trim().length < 3) {
      setErrorMsg('Title must be at least 3 characters');
      return;
    }
    if (!newDocContent.trim() || newDocContent.trim().length < 20) {
      setErrorMsg('Content must be at least 20 characters');
      return;
    }

    const newDoc = {
      id: Date.now(),
      title: newDocTitle,
      content: newDocContent
    };

    setKnowledgeBase([...knowledgeBase, newDoc]);
    setNewDocTitle('');
    setNewDocContent('');
    setSuccessMsg(`✅ Added "${newDocTitle}"`);
  };

  const deleteDocument = (docId) => {
    setKnowledgeBase(knowledgeBase.filter(doc => doc.id !== docId));
    setSuccessMsg('✅ Document removed');
  };

  const generateMockACs = (request) => {
    return [
      {
        id: 1,
        featureArea: 'Core Functionality',
        userStory: `As a user, I want to ${request.substring(0, 40)}`,
        criteria: [
          'Given user action, when triggered, then system responds',
          'When data is valid, the system accepts the input',
          'The system displays a confirmation message'
        ],
        priority: 'High'
      },
      {
        id: 2,
        featureArea: 'Error Handling',
        userStory: `Error handling for ${request.substring(0, 30)}`,
        criteria: [
          'When invalid data is provided, show error message',
          'When network fails, show retry option',
          'All errors are logged'
        ],
        priority: 'High'
      }
    ];
  };



  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setErrorMsg('Please enter a request');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let ragContext = '';

      // RAG: Find relevant documents
      if (ragEnabled && knowledgeBase.length > 0) {
        const topDocs = RagService.findRelevantDocs(inputText, knowledgeBase);

        if (topDocs.length > 0) {
          ragContext = topDocs
            .map(doc => `[Source: ${doc.title}]\n${doc.content.substring(0, 2000)}`)
            .join('\n\n---\n\n');
        }
      } else {
        // Mock generation if needed or just empty context
      }

      const generateMockACs = (request) => {
        return [
          {
            id: 1,
            featureArea: 'Core Functionality',
            userStory: `As a user, I want to ${request.substring(0, 40)}`,
            criteria: [
              'Given user action, when triggered, then system responds',
              'When data is valid, the system accepts the input',
              'The system displays a confirmation message'
            ],
            priority: 'High'
          },
          {
            id: 2,
            featureArea: 'Error Handling',
            userStory: `Error handling for ${request.substring(0, 30)}`,
            criteria: [
              'When invalid data is provided, show error message',
              'When network fails, show retry option',
              'All errors are logged'
            ],
            priority: 'High'
          }
        ];
      };

      if (useAI && apiKey) {
        let prompt = `Request: "${inputText}"\n\n`;

        // Chain-of-Thought & Quality Instructions
        prompt += `Instructions:
1. Analyze the request and any provided context step-by-step.
2. Generate professional Acceptance Criteria (AC) for the requested feature.
3. Use Gherkin syntax (Given/When/Then) for the criteria.
4. Include positive scenarios, negative scenarios (error handling), and edge cases.
5. Ensure the output is a valid JSON array of objects with keys: id, featureArea, userStory, criteria (array of strings), priority.
`;

        // Add learning patterns
        if (learningData.edits.length > 0) {
          prompt += `\n\n--- User Writing Style Preferences ---`;
          prompt += `\nPreferred Feature Area length: ~${learningData.patterns.avgLength.featureArea} chars`;
          prompt += `\nPreferred User Story length: ~${learningData.patterns.avgLength.userStory} chars`;
          prompt += `\nPreferred Criteria length: ~${learningData.patterns.avgLength.criteria} chars`;

          const topTerms = Object.entries(learningData.patterns.preferredTerms)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([term]) => term);

          if (topTerms.length > 0) {
            prompt += `\nPreferred terminology: ${topTerms.join(', ')}`;
          }
        }

        // Add Few-Shot Examples (Golden Samples)
        if (learningData.examples && learningData.examples.length > 0) {
          const randomExamples = learningData.examples
            .sort(() => 0.5 - Math.random())
            .slice(0, 2);

          prompt += `\n\n--- Examples of Good ACs (Golden Samples) ---`;
          prompt += `\nUse these as a reference for style and quality:\n`;
          prompt += JSON.stringify(randomExamples, null, 2);
        }

        // Add RAG context
        if (ragContext) {
          prompt += `\n\n--- Reference Context from Knowledge Base ---\n${ragContext}`;
          prompt += `\n\nAnalyze the above context to understand the product architecture, constraints, and competitor features. Use this to inform the acceptance criteria.`;
        }

        let response;
        if (selectedProvider === 'openai') {
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: modelName || 'gpt-4-turbo',
              messages: [
                { role: 'system', content: 'You are a Business Analyst expert. Think step-by-step. Return only valid JSON array of acceptance criteria objects.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 2000
            })
          });
        } else {
          response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: modelName || 'claude-3-5-sonnet-20241022',
              max_tokens: 2048,
              system: 'You are a Business Analyst expert. Think step-by-step. Return only valid JSON array of acceptance criteria objects.',
              messages: [{ role: 'user', content: prompt }]
            })
          });
        }

        if (!response.ok) throw new Error('API call failed');

        const data = await response.json();
        let content = selectedProvider === 'openai'
          ? data.choices?.[0]?.message?.content || ''
          : data.content?.[0]?.text || '';

        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const acs = JSON.parse(jsonMatch[0]);
          setGeneratedACs(acs);
          const contextInfo = ragContext ? ` using ${knowledgeBase.length} knowledge base documents` : '';
          setSuccessMsg(`✅ Generated ACs successfully!${contextInfo}`);
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        const acs = generateMockACs(inputText);
        setGeneratedACs(acs);
        const contextInfo = ragContext ? ` (RAG context available but using mock mode)` : '';
        setSuccessMsg(`✅ Generated ACs (Mock mode)${contextInfo}`);
      }
    } catch (err) {
      setErrorMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startEditAC = (ac) => {
    setEditingAC(ac.id);
    setEditedAC({
      ...ac,
      criteria: ac.criteria.map((text, index) => ({
        id: Date.now() + index,
        text
      }))
    });
    setOriginalAC({ ...ac });
  };

  const cancelEditAC = () => {
    setEditingAC(null);
    setEditedAC(null);
    setOriginalAC(null);
  };

  const saveEditAC = () => {
    if (!editedAC || !originalAC) return;

    const finalAC = {
      ...editedAC,
      criteria: editedAC.criteria.map(c => c.text).filter(t => t.trim())
    };

    recordEdit(originalAC, finalAC);

    setGeneratedACs(generatedACs.map(ac =>
      ac.id === finalAC.id ? finalAC : ac
    ));

    setEditingAC(null);
    setEditedAC(null);
    setOriginalAC(null);
    setSuccessMsg('✅ AC updated & learning patterns captured!');
  };

  const deleteAC = (acId) => {
    setGeneratedACs(generatedACs.filter(ac => ac.id !== acId));
    setSuccessMsg('✅ AC deleted');
  };

  const duplicateAC = (ac) => {
    const newAC = { ...ac, id: Date.now(), featureArea: `${ac.featureArea} (Copy)` };
    setGeneratedACs([...generatedACs, newAC]);
    setSuccessMsg('✅ AC duplicated');
  };



  const exportACs = () => {
    const exportText = generatedACs.map(ac =>
      `Feature Area: ${ac.featureArea}\nPriority: ${ac.priority}\n\nUser Story:\n${ac.userStory}\n\nAcceptance Criteria:\n${ac.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n${'='.repeat(50)}\n\n`
    ).join('');
    downloadFile(exportText, `acceptance-criteria-${Date.now()}.txt`);
    setSuccessMsg('✅ ACs exported');
  };

  const handleJiraImport = (issueData) => {
    setInputText(`Story: ${issueData.summary}\n\nDescription: ${issueData.description}`);
    setSuccessMsg(`✅ Imported Jira Issue: ${issueData.key}`);
  };

  const handleJiraExport = async (ac) => {
    if (!jiraConfig) {
      setShowJiraConfig(true);
      return;
    }

    if (!window.confirm(`Create new Jira issue for "${ac.featureArea}"?`)) return;

    setLoading(true);
    try {
      // Ideally we would ask for Project Key, but for demo taking first part of existing key or defaulting
      const projectKey = prompt("Enter Project Key (e.g., TEAM):", "TEAM");
      if (!projectKey) return;

      const description = `User Story:\n${ac.userStory}\n\nAcceptance Criteria:\n${ac.criteria.map(c => `- ${c}`).join('\n')}`;
      const descriptionADF = JiraService.textToADF(description);

      const result = await JiraService.createIssue(
        jiraConfig.domain,
        jiraConfig.email,
        jiraConfig.token,
        projectKey,
        ac.featureArea, // Summary
        descriptionADF
      );

      setSuccessMsg(`✅ Jira Issue Created: ${result.key}`);
    } catch (err) {
      setErrorMsg(`Jira Export Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen glass-bg p-6 relative">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8 p-6 glass-strong rounded-3xl flex justify-between items-center shadow-2xl">
          <div>
            <h1 className="text-4xl font-bold text-white">🚀 AC Generator Pro</h1>
            <p className="text-purple-200 mt-2">AI-powered Acceptance Criteria Generator</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowInsights(!showInsights)}
              className="p-3 glass-button rounded-full text-white transition-all hover:text-purple-300 hover:rotate-12"
              title="Learning Insights"
            >
              <BarChart className="w-6 h-6" />
            </button>
            <button
              onClick={() => setShowRAG(!showRAG)}
              className="p-3 glass-button rounded-full text-white transition-all hover:text-blue-300 hover:-rotate-12"
              title="RAG"
            >
              <Database className="w-6 h-6" />
            </button>
            <button
              onClick={() => setShowApiConfig(!showApiConfig)}
              className="p-3 glass-button rounded-full text-white transition-all hover:text-orange-300 hover:rotate-45"
              title="API Config"
            >
              <Settings className="w-6 h-6" />
            </button>
            <button
              onClick={() => setShowJiraConfig(true)}
              className="p-3 glass-button rounded-full text-white transition-all hover:text-sky-300 hover:scale-110"
              title="Jira Config"
            >
              <Cloud className="w-6 h-6" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 glass border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 animate-fade-in text-red-100">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 glass border-l-4 border-green-500 rounded-r-xl flex items-center gap-3 animate-fade-in text-green-100">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {showInsights && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-strong rounded-3xl w-full max-w-2xl max-h-[70vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 glass-strong p-4 flex justify-between items-center rounded-t-3xl border-b border-white/10">
                <h2 className="text-lg font-bold text-white">📊 Learning Insights</h2>
                <button onClick={() => setShowInsights(false)} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {learningData.edits.length === 0 ? (
                  <div className="p-6 glass rounded-2xl text-center">
                    <p className="text-white/90 mb-2">📝 No Learning Data Yet</p>
                    <p className="text-white/60 text-sm">Start editing ACs to build your learning patterns!</p>
                    <div className="mt-4 p-3 glass-light rounded-xl text-left text-xs text-white/80">
                      <p className="font-semibold mb-2">💡 How it works:</p>
                      <ul className="space-y-1 ml-4 list-disc">
                        <li>Generate ACs and click "Edit" on any</li>
                        <li>Make changes to match your style</li>
                        <li>Click "Save" to record patterns</li>
                        <li>System learns your preferences automatically</li>
                        <li>Future generations will match your style</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 glass rounded-xl">
                        <p className="text-xs text-purple-300 mb-1">Total Edits</p>
                        <p className="text-xl font-bold text-white">{learningData.edits.length}</p>
                      </div>
                      <div className="p-3 glass rounded-xl">
                        <p className="text-xs text-green-300 mb-1">Avg Story</p>
                        <p className="text-xl font-bold text-white">{learningData.patterns.avgLength.userStory || 0}</p>
                      </div>
                      <div className="p-3 glass rounded-xl">
                        <p className="text-xs text-blue-300 mb-1">Avg Criteria</p>
                        <p className="text-xl font-bold text-white">{learningData.patterns.avgLength.criteria || 0}</p>
                      </div>
                    </div>

                    {Object.keys(learningData.patterns.preferredTerms).length > 0 && (
                      <div className="p-3 glass rounded-xl">
                        <h3 className="text-sm font-semibold text-white mb-2">🎯 Preferred Terms</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(learningData.patterns.preferredTerms)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([term, count]) => (
                              <span key={term} className="px-2 py-1 glass-light rounded-full text-xs text-purple-200">
                                {term} ({count})
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="p-3 glass rounded-xl">
                      <h3 className="text-sm font-semibold text-white mb-2">💡 Your Style</h3>
                      <div className="space-y-1 text-xs text-white/80">
                        <div className="flex justify-between">
                          <span className="text-white/60">Feature Area:</span>
                          <strong className="text-white">{learningData.patterns.avgLength.featureArea} chars</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">User Story:</span>
                          <strong className="text-white">{learningData.patterns.avgLength.userStory} chars</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Criteria:</span>
                          <strong className="text-white">{learningData.patterns.avgLength.criteria} chars</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResetLearning()}
                        className="flex-1 glass-button text-white py-2 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm hover:scale-105"
                      >
                        <Trash2 className="w-4 h-4" />
                        Reset Learning
                      </button>
                      <button
                        onClick={() => {
                          downloadFile(JSON.stringify(learningData, null, 2), `ac-learning-${Date.now()}.json`, 'application/json');
                        }}
                        className="flex-1 glass-button text-white py-2 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm hover:scale-105"
                      >
                        <Download className="w-4 h-4" />
                        Export
                      </button>
                      <button
                        onClick={() => setShowInsights(false)}
                        className="flex-1 glass-button text-white py-2 rounded-xl font-medium transition-all duration-300 text-sm hover:scale-105"
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {showRAG && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-strong rounded-3xl w-full max-w-md max-h-96 overflow-y-auto shadow-2xl">
              <div className="sticky top-0 glass-strong p-6 flex justify-between items-center rounded-t-3xl border-b border-white/10">
                <h2 className="text-xl font-bold text-white">🗄️ Knowledge Base</h2>
                <button onClick={() => setShowRAG(false)} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <label className="flex items-center gap-3 p-3 glass rounded-xl cursor-pointer hover:glass-button transition-all duration-300">
                  <input type="checkbox" checked={ragEnabled} onChange={(e) => setRagEnabled(e.target.checked)} className="w-4 h-4 accent-purple-500" />
                  <span className="text-white font-medium">Enable RAG</span>
                </label>

                {ragEnabled && (
                  <div className="space-y-3">
                    <div className="p-3 glass rounded-xl text-xs text-green-200">
                      <p className="font-semibold mb-1">✅ RAG Context Enabled</p>
                      <p>The AI will use relevant documents from your knowledge base to generate more accurate and context-aware acceptance criteria.</p>
                    </div>

                    {/* File Upload */}
                    <div className="p-3 glass rounded-xl">
                      <label className="block text-xs font-semibold text-white/90 mb-2">📁 Upload Files</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.m4a,.csv,.xls,.xlsx,.jpg,.jpeg,.png"
                        multiple
                        onChange={handleFileUpload}
                        className="w-full text-xs text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:glass-button file:text-white hover:file:scale-105 file:cursor-pointer file:transition-all file:duration-300"
                      />
                      <div className="mt-2 text-xs text-white/50">
                        Supports: PDF, Word, Video, Audio, Images, Spreadsheets, Text
                      </div>
                    </div>

                    {/* Web Link */}
                    <div className="p-3 glass rounded-xl">
                      <button
                        onClick={addWebLink}
                        className="w-full glass-button text-white py-2 rounded-xl font-medium transition-all duration-300 text-sm hover:scale-105"
                      >
                        🔗 Add Web Link
                      </button>
                    </div>

                    {/* Manual Text Entry */}
                    <div className="p-3 glass rounded-xl">
                      <label className="block text-xs font-semibold text-white/90 mb-2">✍️ Manual Entry</label>
                      <input
                        type="text"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        placeholder="Document title"
                        className="w-full px-3 py-2 glass-light text-white rounded-xl focus:border-green-400/50 focus:outline-none text-sm mb-2 transition-all duration-300 placeholder:text-white/30"
                      />
                      <textarea
                        value={newDocContent}
                        onChange={(e) => setNewDocContent(e.target.value)}
                        placeholder="Content..."
                        className="w-full px-3 py-2 glass-light text-white rounded-xl focus:border-green-400/50 focus:outline-none text-sm resize-none transition-all duration-300 placeholder:text-white/30"
                        rows="3"
                      />
                      <button
                        onClick={addDocument}
                        className="w-full mt-2 glass-button text-white py-2 rounded-xl font-medium transition-all duration-300 text-sm hover:scale-105"
                      >
                        Add Document
                      </button>
                    </div>

                    {knowledgeBase.length > 0 && (
                      <div className="border-t border-white/10 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-white/90">📚 Knowledge Base ({knowledgeBase.length})</p>
                          <span className="text-xs text-white/50">
                            {(knowledgeBase.reduce((sum, doc) => sum + (doc.fileSize || 0), 0) / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {knowledgeBase.map((doc) => (
                            <div key={doc.id} className="p-2 glass rounded-xl flex justify-between items-start hover:glass-button transition-all duration-300">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm">
                                    {doc.type?.includes('pdf') || doc.title?.endsWith('.pdf') ? '📄' :
                                      doc.type?.includes('word') || doc.type?.includes('document') ? '📝' :
                                        doc.type?.includes('video') || doc.title?.match(/\.(mp4|mov|avi|mkv|webm)$/i) ? '🎥' :
                                          doc.type?.includes('audio') || doc.title?.match(/\.(mp3|wav|m4a)$/i) ? '🎵' :
                                            doc.type?.includes('image') || doc.title?.match(/\.(jpg|jpeg|png|gif)$/i) ? '🖼️' :
                                              doc.type?.includes('csv') || doc.type?.includes('spreadsheet') || doc.title?.match(/\.(csv|xls|xlsx)$/i) ? '📊' :
                                                doc.type === 'web-link' ? '🔗' : '📃'}
                                  </span>
                                  <p className="text-xs font-medium text-white truncate flex-1">{doc.title}</p>
                                </div>
                                <p className="text-xs text-white/60 line-clamp-1">{doc.content.substring(0, 60)}...</p>
                                {doc.uploadedAt && (
                                  <p className="text-xs text-white/40 mt-1">
                                    {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => deleteDocument(doc.id)}
                                className="ml-2 p-1.5 text-red-300 hover:text-red-200 glass-button rounded-xl transition-all duration-300 hover:scale-110"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showApiConfig && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-strong rounded-3xl w-full max-w-md shadow-2xl">
              <div className="glass-strong p-6 flex justify-between items-center rounded-t-3xl border-b border-white/10">
                <h2 className="text-xl font-bold text-white">⚙️ API Config</h2>
                <button onClick={() => setShowApiConfig(false)} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <button
                  onClick={() => setUseAI(false)}
                  className={`w-full p-3 rounded-xl font-medium transition-all duration-300 ${!useAI ? 'glass-button text-white' : 'glass-light text-white/60 hover:text-white/80'}`}
                >
                  📊 Mock Mode
                </button>
                <button
                  onClick={() => setUseAI(true)}
                  className={`w-full p-3 rounded-xl font-medium transition-all duration-300 ${useAI ? 'glass-button text-white' : 'glass-light text-white/60 hover:text-white/80'}`}
                >
                  🤖 Use LLM
                </button>

                {useAI && (
                  <div className="space-y-3">
                    <select
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value)}
                      className="w-full px-3 py-2 glass-light text-white rounded-xl focus:border-orange-400/50 focus:outline-none transition-all duration-300"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                    </select>

                    <input
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="Model (optional)"
                      className="w-full px-3 py-2 glass-light text-white rounded-xl focus:border-orange-400/50 focus:outline-none text-sm transition-all duration-300 placeholder:text-white/30"
                    />

                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="API Key"
                      className="w-full px-3 py-2 glass-light text-white rounded-xl focus:border-orange-400/50 focus:outline-none text-sm font-mono transition-all duration-300 placeholder:text-white/30"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-strong rounded-3xl p-6 shadow-2xl">
            <label className="block text-sm font-semibold text-white/90 mb-3">📝 User Request</label>
            <textarea
              className="w-full px-4 py-3 glass-light text-white rounded-xl focus:border-purple-400/50 focus:outline-none resize-none transition-all duration-300 placeholder:text-white/30"
              rows="8"
              placeholder="Describe what you need..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              maxLength={1000}
            />
            <div className="mt-3 text-xs text-slate-400 text-right">{inputText.length}/1000</div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`w-full mt-6 py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2
                ${loading
                  ? 'bg-gray-600/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95'
                }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Sparking Creativity...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current" />
                  Generate Magic
                </>
              )}
            </button>
            <button
              onClick={() => {
                if (!jiraConfig) { setShowJiraConfig(true); return; }
                setShowJiraImport(true);
              }}
              className="w-full mt-2 glass-button text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30"
            >
              <Cloud className="w-5 h-5" />
              Import from Jira
            </button>

            <div className="mt-4 p-3 glass-light rounded-xl text-xs text-white/80 space-y-1">
              <p><strong>Mode:</strong> {useAI ? '🤖 LLM API' : '📊 Mock'}</p>
              {useAI && <p><strong>Provider:</strong> {selectedProvider === 'openai' ? 'OpenAI' : 'Anthropic'}</p>}
              <p><strong>Learning:</strong> {learningData.edits.length > 0 ? `✅ ${learningData.edits.length} edits tracked` : '❌ No patterns yet'}</p>
              <p><strong>RAG:</strong> {ragEnabled ? `✅ Enabled (${knowledgeBase.length} docs)` : '❌ Disabled'}</p>
              {ragEnabled && knowledgeBase.length > 0 && (
                <p className="text-green-400">💡 AI will use your knowledge base for context</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {generatedACs.length > 0 ? (
              <div className="glass-strong rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">✨ Generated ACs ({generatedACs.length})</h2>
                  <button onClick={exportACs} className="flex items-center gap-2 px-4 py-2 glass-button text-white rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                <div className="space-y-4">
                  {generatedACs.map((ac) => (
                    <div key={ac.id} className="glass rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
                      {editingAC === ac.id ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-purple-300">Editing AC</h3>
                            <div className="flex gap-2">
                              <button
                                onClick={saveEditAC}
                                className="flex items-center gap-1 px-3 py-1.5 glass-button text-white rounded-xl text-sm transition-all duration-300 hover:scale-105"
                              >
                                <Save className="w-4 h-4" />
                                Save
                              </button>
                              <button
                                onClick={cancelEditAC}
                                className="flex items-center gap-1 px-3 py-1.5 glass-button text-white rounded-xl text-sm transition-all duration-300 hover:scale-105"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Feature Area</label>
                            <input
                              type="text"
                              value={editedAC.featureArea}
                              onChange={(e) => setEditedAC({ ...editedAC, featureArea: e.target.value })}
                              className="w-full px-3 py-2 glass-light text-white rounded-xl focus:border-purple-400/50 focus:outline-none text-sm transition-all duration-300"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">User Story</label>
                            <textarea
                              value={editedAC.userStory}
                              onChange={(e) => setEditedAC({ ...editedAC, userStory: e.target.value })}
                              className="w-full px-3 py-2 glass-light text-white rounded-xl focus:border-purple-400/50 focus:outline-none text-sm resize-none transition-all duration-300"
                              rows="2"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                            <select
                              value={editedAC.priority}
                              onChange={(e) => setEditedAC({ ...editedAC, priority: e.target.value })}
                              className="w-full px-3 py-2 glass-light text-white rounded-xl focus:border-purple-400/50 focus:outline-none text-sm transition-all duration-300"
                            >
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-2">Acceptance Criteria</label>
                            {editedAC.criteria.map((criterion, idx) => (
                              <div key={criterion.id} className="flex gap-2 mb-2">
                                <input
                                  type="text"
                                  value={criterion.text}
                                  onChange={(e) => {
                                    const newCriteria = [...editedAC.criteria];
                                    newCriteria[idx] = { ...newCriteria[idx], text: e.target.value };
                                    setEditedAC({ ...editedAC, criteria: newCriteria });
                                  }}
                                  className="flex-1 px-3 py-2 glass-light text-white rounded-xl focus:border-purple-400/50 focus:outline-none text-sm transition-all duration-300"
                                />
                                <button
                                  onClick={() => {
                                    const newCriteria = editedAC.criteria.filter(c => c.id !== criterion.id);
                                    setEditedAC({ ...editedAC, criteria: newCriteria });
                                  }}
                                  className="px-2 py-2 glass-button text-red-300 rounded-xl transition-all duration-300 hover:scale-110 hover:text-red-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                setEditedAC({ ...editedAC, criteria: [...editedAC.criteria, { id: Date.now(), text: 'New criterion' }] });
                              }}
                              className="w-full px-3 py-2 glass-light hover:glass-button text-white/70 hover:text-white rounded-xl text-sm transition-all duration-300 border border-dashed border-white/20 hover:border-white/40"
                            >
                              + Add Criterion
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 mr-4">
                              <h3 className="text-lg font-semibold text-white mb-2">{ac.featureArea}</h3>
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium glass ${ac.priority === 'High' ? 'border-red-400/50 text-red-200' :
                                ac.priority === 'Medium' ? 'border-yellow-400/50 text-yellow-200' :
                                  'border-blue-400/50 text-blue-200'
                                }`}>
                                {ac.priority} Priority
                              </span>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => toggleLikeAC(ac, setSuccessMsg)}
                                className={`p-2 glass-button rounded-xl transition-all duration-300 hover:scale-110 ${learningData.examples?.some(ex => ex.id === ac.id) ? 'text-red-400 bg-red-400/10' : 'text-white/40 hover:text-red-400'
                                  }`}
                                title={learningData.examples?.some(ex => ex.id === ac.id) ? "Unlike" : "Like (Add to Examples)"}
                              >
                                <div className="relative">
                                  <span className={`absolute inset-0 animate-ping rounded-full bg-red-400 opacity-75 ${learningData.examples?.some(ex => ex.id === ac.id) ? 'block' : 'hidden'}`}></span>
                                  <span className="relative">❤️</span>
                                </div>
                              </button>
                              <button
                                onClick={() => startEditAC(ac)}
                                className="flex items-center gap-1 px-3 py-2 glass-button text-white rounded-xl transition-all duration-300 hover:scale-105 text-sm font-medium"
                                title="Edit AC"
                              >
                                <Edit2 className="w-4 h-4" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleJiraExport(ac)}
                                className="flex items-center gap-1 px-3 py-2 glass-button text-blue-200 rounded-xl transition-all duration-300 hover:scale-105 text-sm font-medium hover:bg-blue-500/20"
                                title="Export to Jira"
                              >
                                <Link className="w-4 h-4" />
                                <span>Export</span>
                              </button>
                              <button
                                onClick={() => duplicateAC(ac)}
                                className="p-2 glass-button text-white rounded-xl transition-all duration-300 hover:scale-110"
                                title="Duplicate"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteAC(ac.id)}
                                className="p-2 glass-button text-red-300 rounded-xl transition-all duration-300 hover:scale-110 hover:text-red-200"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-white/90 mb-3 glass-light p-3 rounded-xl">{ac.userStory}</p>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-white/60 mb-2">ACCEPTANCE CRITERIA:</p>
                            {ac.criteria.map((criterion, idx) => (
                              <div key={idx} className="text-sm text-white/90 flex gap-2 glass-light p-3 rounded-xl">
                                <span className="text-green-400 font-bold">{idx + 1}.</span>
                                <span>{criterion}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-strong rounded-3xl p-12 text-center h-full flex flex-col items-center justify-center shadow-2xl">
                <p className="text-white/90 text-lg">Ready to generate?</p>
                <p className="text-white/60 text-sm mt-2">Enter a request and click "Generate ACs"</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <JiraConfigModal
        isOpen={showJiraConfig}
        onClose={() => setShowJiraConfig(false)}
        onSave={setJiraConfig}
        savedConfig={jiraConfig}
      />

      <JiraImportModal
        isOpen={showJiraImport}
        onClose={() => setShowJiraImport(false)}
        config={jiraConfig}
        onImport={handleJiraImport}
      />
    </div>
  );
};

export default App;