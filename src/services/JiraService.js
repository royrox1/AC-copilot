export const JiraService = {
    getHeaders: (email, token) => {
        return {
            'Authorization': `Basic ${btoa(`${email}:${token}`)}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    },

    validateCredentials: async (domain, email, token) => {
        const baseUrl = `https://${domain}/rest/api/3`;
        try {
            const response = await fetch(`${baseUrl}/myself`, {
                headers: JiraService.getHeaders(email, token)
            });
            if (!response.ok) throw new Error('Invalid credentials');
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    searchIssues: async (domain, email, token, jql) => {
        const baseUrl = `https://${domain}/rest/api/3`;
        try {
            // Use a proxy or handling CORS might be needed if not running locally with setup
            // For localhost demo, we assume the user might need a CORS extension or proxy
            // BUT for this implementation we will try direct fetch and handle errors gracefully
            const response = await fetch(`${baseUrl}/search?jql=${encodeURIComponent(jql)}`, {
                headers: JiraService.getHeaders(email, token)
            });
            if (!response.ok) throw new Error('Failed to search issues');
            return await response.json();
        } catch (error) {
            console.error("Jira API Error:", error);
            throw error;
        }
    },

    createIssue: async (domain, email, token, projectKey, summary, description, type = 'Story') => {
        const baseUrl = `https://${domain}/rest/api/3`;
        const body = {
            fields: {
                project: { key: projectKey },
                summary: summary,
                description: description, // ADF format might be required for v3, simplification for now
                issuetype: { name: type }
            }
        };

        try {
            const response = await fetch(`${baseUrl}/issue`, {
                method: 'POST',
                headers: JiraService.getHeaders(email, token),
                body: JSON.stringify(body)
            });
            if (!response.ok) throw new Error('Failed to create issue');
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    // Helper to convert plain text to Atlassian Document Format (ADF) - simplified
    textToADF: (text) => {
        return {
            version: 1,
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [
                        {
                            type: "text",
                            text: text || " "
                        }
                    ]
                }
            ]
        };
    }
};
