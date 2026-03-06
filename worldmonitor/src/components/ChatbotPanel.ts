import { Panel } from './Panel';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// MCP calls go through Vite server proxy to avoid CORS
const TRINITY_MCP_URL = '/api/mcp/trinity';
const APIFY_MCP_URL = '/api/mcp/apify';

export class ChatbotPanel extends Panel {
  private messages: ChatMessage[] = [];
  private inputEl!: HTMLTextAreaElement;
  private messagesContainer!: HTMLElement;
  private sendBtn!: HTMLButtonElement;
  private isLoading = false;
  private mcpTools: Array<{ name: string; description: string; source: string }> = [];

  constructor() {
    super({
      id: 'chatbot',
      title: 'AI Assistant',
      className: 'chatbot-panel col-span-2 span-3',
      showCount: false,
      trackActivity: false,
    });

    this.buildChatUI();
    this.addWelcomeMessage();
    this.discoverMCPTools();
  }

  private buildChatUI(): void {
    this.content.innerHTML = '';
    this.content.style.cssText = 'display:flex;flex-direction:column;height:100%;padding:0;overflow:hidden;';

    // MCP status bar
    const statusBar = document.createElement('div');
    statusBar.className = 'chatbot-mcp-status';
    statusBar.innerHTML = `
      <div class="chatbot-mcp-badges">
        <span class="chatbot-mcp-badge trinity" id="trinityBadge">Trinity MCP</span>
        <span class="chatbot-mcp-badge apify" id="apifyBadge">Apify MCP</span>
      </div>
    `;

    // Messages area
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'chatbot-messages';

    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'chatbot-input-area';

    this.inputEl = document.createElement('textarea');
    this.inputEl.className = 'chatbot-input';
    this.inputEl.placeholder = 'Ask about world events, markets, conflicts...';
    this.inputEl.rows = 1;
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });
    this.inputEl.addEventListener('input', () => {
      this.inputEl.style.height = 'auto';
      this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 120) + 'px';
    });

    this.sendBtn = document.createElement('button');
    this.sendBtn.className = 'chatbot-send-btn';
    this.sendBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>`;
    this.sendBtn.addEventListener('click', () => this.handleSend());

    inputArea.appendChild(this.inputEl);
    inputArea.appendChild(this.sendBtn);

    this.content.appendChild(statusBar);
    this.content.appendChild(this.messagesContainer);
    this.content.appendChild(inputArea);

    // Inject styles
    if (!document.getElementById('chatbot-styles')) {
      const style = document.createElement('style');
      style.id = 'chatbot-styles';
      style.textContent = CHATBOT_CSS;
      document.head.appendChild(style);
    }
  }

  private addWelcomeMessage(): void {
    this.addMessage({
      role: 'assistant',
      content: `Welcome to World Monitor AI Assistant. I'm connected to **Trinity MCP** and **Apify MCP** servers to help you analyze global events, fetch real-time data, and provide intelligence insights.\n\nTry asking:\n- "What are the latest global conflicts?"\n- "Search for earthquake data"\n- "Find news about AI regulations"\n- "Analyze market trends"`,
      timestamp: new Date(),
    });
  }

  private async discoverMCPTools(): Promise<void> {
    // Discover Trinity MCP tools
    try {
      const trinityTools = await this.callMCP(TRINITY_MCP_URL, null, 'tools/list', {});
      if (trinityTools?.tools) {
        for (const tool of trinityTools.tools) {
          this.mcpTools.push({ name: tool.name, description: tool.description || '', source: 'trinity' });
        }
      }
      this.updateBadge('trinityBadge', true, this.mcpTools.filter(t => t.source === 'trinity').length);
    } catch (e) {
      console.warn('[Chatbot] Trinity MCP discovery failed:', e);
      this.updateBadge('trinityBadge', false);
    }

    // Discover Apify MCP tools
    try {
      const apifyTools = await this.callMCP(APIFY_MCP_URL, null, 'tools/list', {});
      if (apifyTools?.tools) {
        for (const tool of apifyTools.tools) {
          this.mcpTools.push({ name: tool.name, description: tool.description || '', source: 'apify' });
        }
      }
      this.updateBadge('apifyBadge', true, this.mcpTools.filter(t => t.source === 'apify').length);
    } catch (e) {
      console.warn('[Chatbot] Apify MCP discovery failed:', e);
      this.updateBadge('apifyBadge', false);
    }

    console.log(`[Chatbot] Discovered ${this.mcpTools.length} MCP tools:`, this.mcpTools.map(t => t.name));
  }

  private updateBadge(id: string, connected: boolean, toolCount?: number): void {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.classList.toggle('connected', connected);
    badge.classList.toggle('disconnected', !connected);
    if (connected && toolCount !== undefined) {
      badge.textContent += ` (${toolCount})`;
    }
  }

  private async callMCP(url: string, _token: string | null, method: string, params: unknown): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // Auth is handled server-side by the MCP proxy

    const body = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) throw new Error(`MCP ${method}: HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'MCP error');
    return json.result;
  }

  private async callTool(source: string, toolName: string, args: Record<string, unknown>): Promise<string> {
    const url = source === 'trinity' ? TRINITY_MCP_URL : APIFY_MCP_URL;
    const token = null; // Auth handled server-side

    try {
      const result = await this.callMCP(url, token, 'tools/call', { name: toolName, arguments: args });
      if (result?.content) {
        return result.content.map((c: any) => c.text || JSON.stringify(c)).join('\n');
      }
      return JSON.stringify(result, null, 2);
    } catch (e: any) {
      return `Error calling ${toolName}: ${e.message}`;
    }
  }

  private async handleSend(): Promise<void> {
    const text = this.inputEl.value.trim();
    if (!text || this.isLoading) return;

    this.inputEl.value = '';
    this.inputEl.style.height = 'auto';

    this.addMessage({ role: 'user', content: text, timestamp: new Date() });
    this.setLoading(true);

    try {
      const response = await this.processQuery(text);
      this.addMessage({ role: 'assistant', content: response, timestamp: new Date() });
    } catch (e: any) {
      this.addMessage({ role: 'assistant', content: `Error: ${e.message}`, timestamp: new Date() });
    } finally {
      this.setLoading(false);
    }
  }

  private async processQuery(query: string): Promise<string> {
    const lowerQuery = query.toLowerCase();

    // Route to appropriate MCP tool based on query intent
    const trinityTools = this.mcpTools.filter(t => t.source === 'trinity');
    const apifyTools = this.mcpTools.filter(t => t.source === 'apify');

    // Try Trinity MCP first for general queries
    if (trinityTools.length > 0) {
      // Find the best matching tool
      const matchedTool = this.findBestTool(lowerQuery, trinityTools);
      if (matchedTool) {
        const result = await this.callTool('trinity', matchedTool.name, { query, input: query });
        if (result && !result.startsWith('Error')) {
          return this.formatResponse(matchedTool.name, result);
        }
      }

      // Try a general-purpose tool if available
      const generalTool = trinityTools.find(t =>
        t.name.includes('chat') || t.name.includes('query') || t.name.includes('ask') || t.name.includes('search')
      );
      if (generalTool) {
        const result = await this.callTool('trinity', generalTool.name, { query, message: query, input: query });
        if (result && !result.startsWith('Error')) {
          return this.formatResponse(generalTool.name, result);
        }
      }
    }

    // Try Apify for search/scraping queries
    if (apifyTools.length > 0 && (
      lowerQuery.includes('search') || lowerQuery.includes('find') ||
      lowerQuery.includes('news') || lowerQuery.includes('data') ||
      lowerQuery.includes('scrape') || lowerQuery.includes('fetch')
    )) {
      const matchedTool = this.findBestTool(lowerQuery, apifyTools);
      if (matchedTool) {
        const result = await this.callTool('apify', matchedTool.name, { query, input: query });
        if (result && !result.startsWith('Error')) {
          return this.formatResponse(matchedTool.name, result);
        }
      }
    }

    // Fallback: list available tools
    if (lowerQuery.includes('help') || lowerQuery.includes('tools') || lowerQuery.includes('what can')) {
      return this.getHelpText();
    }

    // Try all tools with a generic call
    for (const tool of this.mcpTools) {
      try {
        const result = await this.callTool(tool.source, tool.name, { query, input: query, message: query });
        if (result && !result.startsWith('Error')) {
          return this.formatResponse(tool.name, result);
        }
      } catch {
        continue;
      }
    }

    return `I couldn't find a suitable tool to answer that query. Available MCP tools: ${this.mcpTools.map(t => `**${t.name}** (${t.source})`).join(', ') || 'none discovered yet'}.\n\nTry "help" to see what I can do.`;
  }

  private findBestTool(query: string, tools: typeof this.mcpTools): typeof this.mcpTools[0] | null {
    // Simple keyword matching against tool names and descriptions
    let bestMatch: typeof this.mcpTools[0] | null = null;
    let bestScore = 0;

    for (const tool of tools) {
      const searchText = `${tool.name} ${tool.description}`.toLowerCase();
      const queryWords = query.split(/\s+/);
      let score = 0;
      for (const word of queryWords) {
        if (word.length > 2 && searchText.includes(word)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = tool;
      }
    }

    return bestMatch;
  }

  private formatResponse(toolName: string, result: string): string {
    // Try to parse JSON and format nicely
    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        const items = parsed.slice(0, 10);
        const formatted = items.map((item: any, i: number) => {
          if (item.title && item.link) {
            return `${i + 1}. **${item.title}**\n   ${item.link}${item.description ? `\n   ${item.description}` : ''}`;
          }
          return `${i + 1}. ${JSON.stringify(item)}`;
        }).join('\n\n');
        return `**Results via ${toolName}** (${parsed.length} items):\n\n${formatted}`;
      }
      return `**${toolName}**:\n\`\`\`json\n${JSON.stringify(parsed, null, 2).slice(0, 2000)}\n\`\`\``;
    } catch {
      // Plain text response
      const truncated = result.length > 3000 ? result.slice(0, 3000) + '...' : result;
      return `**${toolName}**:\n\n${truncated}`;
    }
  }

  private getHelpText(): string {
    const trinityTools = this.mcpTools.filter(t => t.source === 'trinity');
    const apifyTools = this.mcpTools.filter(t => t.source === 'apify');

    let text = '## Available MCP Tools\n\n';

    if (trinityTools.length > 0) {
      text += '### Trinity MCP\n';
      for (const t of trinityTools) {
        text += `- **${t.name}**: ${t.description || 'No description'}\n`;
      }
      text += '\n';
    }

    if (apifyTools.length > 0) {
      text += '### Apify MCP\n';
      for (const t of apifyTools) {
        text += `- **${t.name}**: ${t.description || 'No description'}\n`;
      }
      text += '\n';
    }

    if (this.mcpTools.length === 0) {
      text += 'No tools discovered yet. MCP servers may still be connecting...\n';
    }

    return text;
  }

  private addMessage(msg: ChatMessage): void {
    this.messages.push(msg);

    const msgEl = document.createElement('div');
    msgEl.className = `chatbot-message chatbot-message-${msg.role}`;

    const avatar = document.createElement('div');
    avatar.className = 'chatbot-avatar';
    avatar.textContent = msg.role === 'user' ? 'U' : 'AI';

    const bubble = document.createElement('div');
    bubble.className = 'chatbot-bubble';
    bubble.innerHTML = this.renderMarkdown(msg.content);

    const time = document.createElement('div');
    time.className = 'chatbot-time';
    time.textContent = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    msgEl.appendChild(avatar);
    const wrapper = document.createElement('div');
    wrapper.className = 'chatbot-bubble-wrapper';
    wrapper.appendChild(bubble);
    wrapper.appendChild(time);
    msgEl.appendChild(wrapper);

    this.messagesContainer.appendChild(msgEl);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  private renderMarkdown(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.sendBtn.disabled = loading;
    this.inputEl.disabled = loading;

    // Remove existing loading indicator
    const existing = this.messagesContainer.querySelector('.chatbot-loading');
    if (existing) existing.remove();

    if (loading) {
      const loader = document.createElement('div');
      loader.className = 'chatbot-message chatbot-message-assistant chatbot-loading';
      loader.innerHTML = `
        <div class="chatbot-avatar">AI</div>
        <div class="chatbot-bubble-wrapper">
          <div class="chatbot-bubble">
            <div class="chatbot-typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      `;
      this.messagesContainer.appendChild(loader);
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }
}

const CHATBOT_CSS = `
.chatbot-panel {
  min-height: 500px !important;
}

.chatbot-mcp-status {
  padding: 6px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-hover, rgba(255,255,255,0.03));
}

.chatbot-mcp-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chatbot-mcp-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.chatbot-mcp-badge.connected {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.chatbot-mcp-badge.disconnected {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.chatbot-mcp-badge.trinity { order: 1; }
.chatbot-mcp-badge.apify { order: 2; }

.chatbot-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chatbot-message {
  display: flex;
  gap: 8px;
  max-width: 90%;
}

.chatbot-message-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.chatbot-message-assistant {
  align-self: flex-start;
}

.chatbot-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.chatbot-message-user .chatbot-avatar {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.chatbot-message-assistant .chatbot-avatar {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.chatbot-bubble-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chatbot-bubble {
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.chatbot-message-user .chatbot-bubble {
  background: rgba(59, 130, 246, 0.15);
  color: var(--text);
  border-bottom-right-radius: 4px;
}

.chatbot-message-assistant .chatbot-bubble {
  background: var(--surface-hover, rgba(255,255,255,0.05));
  color: var(--text);
  border-bottom-left-radius: 4px;
}

.chatbot-bubble code {
  background: rgba(0,0,0,0.3);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}

.chatbot-bubble pre {
  background: rgba(0,0,0,0.4);
  padding: 8px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 4px 0;
}

.chatbot-bubble pre code {
  background: none;
  padding: 0;
}

.chatbot-bubble h3, .chatbot-bubble h4 {
  margin: 8px 0 4px;
  font-size: 14px;
}

.chatbot-bubble ul {
  margin: 4px 0;
  padding-left: 16px;
}

.chatbot-bubble li {
  margin: 2px 0;
}

.chatbot-time {
  font-size: 10px;
  color: var(--text-muted, #666);
  padding: 0 4px;
}

.chatbot-message-user .chatbot-time {
  text-align: right;
}

.chatbot-input-area {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  background: var(--surface-hover, rgba(255,255,255,0.03));
  align-items: flex-end;
}

.chatbot-input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  resize: none;
  outline: none;
  min-height: 36px;
  max-height: 120px;
}

.chatbot-input:focus {
  border-color: rgba(59, 130, 246, 0.5);
}

.chatbot-input::placeholder {
  color: var(--text-muted, #666);
}

.chatbot-send-btn {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #60a5fa;
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}

.chatbot-send-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.35);
}

.chatbot-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.chatbot-typing {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.chatbot-typing span {
  width: 6px;
  height: 6px;
  background: var(--text-muted, #666);
  border-radius: 50%;
  animation: chatbot-bounce 1.2s infinite;
}

.chatbot-typing span:nth-child(2) { animation-delay: 0.2s; }
.chatbot-typing span:nth-child(3) { animation-delay: 0.4s; }

@keyframes chatbot-bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-8px); }
}
`;
