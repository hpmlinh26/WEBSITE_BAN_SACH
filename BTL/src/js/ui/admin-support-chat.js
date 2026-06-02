function isAdminPage() {
  return location.pathname.toLowerCase().includes('/admin/');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}

function loadSocketClient() {
  if (window.io) return Promise.resolve(window.io);

  return new Promise((resolve, reject) => {
    const existed = document.querySelector('script[data-mot-socket-client]');
    if (existed) {
      existed.addEventListener('load', () => resolve(window.io), { once: true });
      existed.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.async = true;
    script.dataset.motSocketClient = '1';
    script.onload = () => (window.io ? resolve(window.io) : reject(new Error('Socket.IO client chưa sẵn sàng.')));
    script.onerror = () => reject(new Error('Không tải được Socket.IO client.'));
    document.head.appendChild(script);
  });
}

function compactTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function initAdminSupportChat() {
  if (!isAdminPage() || document.querySelector('.mot-admin-chat-button')) return;

  const sessions = new Map();
  const renderedMessages = new Set();
  let socket = null;
  let activeSessionId = null;
  let connected = false;

  const button = document.createElement('button');
  button.className = 'mot-admin-chat-button';
  button.type = 'button';
  button.innerHTML = '<span>Hỗ trợ</span><b hidden>0</b>';

  const panel = document.createElement('section');
  panel.className = 'mot-admin-chat-panel';
  panel.innerHTML = `
    <div class="mot-admin-chat-head">
      <div><strong>Live Support</strong><span class="mot-admin-chat-status">Đang kết nối...</span></div>
      <button type="button" class="mot-admin-chat-close" aria-label="Đóng">×</button>
    </div>
    <div class="mot-admin-chat-main">
      <aside class="mot-admin-chat-sessions"></aside>
      <div class="mot-admin-chat-room">
        <div class="mot-admin-chat-empty">Chọn một khách để bắt đầu trả lời.</div>
        <div class="mot-admin-chat-messages"></div>
        <form class="mot-admin-chat-form">
          <input class="mot-admin-chat-input" autocomplete="off" placeholder="Nhập phản hồi...">
          <button type="submit">Gửi</button>
        </form>
      </div>
    </div>`;

  document.body.appendChild(button);
  document.body.appendChild(panel);

  const badge = button.querySelector('b');
  const status = panel.querySelector('.mot-admin-chat-status');
  const list = panel.querySelector('.mot-admin-chat-sessions');
  const empty = panel.querySelector('.mot-admin-chat-empty');
  const messages = panel.querySelector('.mot-admin-chat-messages');
  const form = panel.querySelector('.mot-admin-chat-form');
  const input = panel.querySelector('.mot-admin-chat-input');

  const sortedSessions = () => [...sessions.values()].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  const totalUnread = () => sortedSessions().reduce((sum, session) => sum + Number(session.unreadAdmin || 0), 0);

  const updateBadge = () => {
    const unread = totalUnread();
    badge.hidden = unread === 0;
    badge.textContent = unread > 99 ? '99+' : String(unread);
  };

  const upsertSession = (session = {}) => {
    if (!session.id) return;
    const current = sessions.get(session.id) || { messages: [] };
    sessions.set(session.id, {
      ...current,
      ...session,
      messages: session.messages || current.messages || [],
    });
  };

  const renderSessions = () => {
    const rows = sortedSessions();
    updateBadge();
    if (!rows.length) {
      list.innerHTML = '<div class="mot-admin-chat-no-session">Chưa có khách nhắn.</div>';
      return;
    }

    list.innerHTML = rows
      .map((session) => {
        const last = session.lastMessage?.text || session.messages?.at(-1)?.text || 'Khách vừa mở hỗ trợ';
        return `
          <button type="button" class="mot-admin-chat-session ${session.id === activeSessionId ? 'active' : ''}" data-session-id="${esc(session.id)}">
            <span><strong>${esc(session.name || 'Khách hàng')}</strong><small>${esc(session.page || '/')}</small></span>
            <em>${esc(last)}</em>
            <i class="${session.online ? 'online' : ''}">${session.online ? 'online' : compactTime(session.updatedAt)}</i>
            ${session.unreadAdmin ? `<b>${Number(session.unreadAdmin)}</b>` : ''}
          </button>`;
      })
      .join('');
  };

  const renderMessages = () => {
    const session = sessions.get(activeSessionId);
    empty.style.display = session ? 'none' : 'flex';
    messages.style.display = session ? 'block' : 'none';
    form.style.display = session ? 'flex' : 'none';
    renderedMessages.clear();

    if (!session) {
      messages.innerHTML = '';
      return;
    }

    messages.innerHTML = (session.messages || [])
      .map((message) => {
        renderedMessages.add(message.id);
        return `
          <div class="mot-admin-chat-msg ${message.role === 'admin' ? 'admin' : 'visitor'}">
            <div>${esc(message.text)}</div>
            <small>${message.role === 'admin' ? 'Admin' : esc(session.name || 'Khách')} • ${compactTime(message.createdAt)}</small>
          </div>`;
      })
      .join('');
    messages.scrollTop = messages.scrollHeight;
  };

  const appendMessage = (message = {}) => {
    if (!message.id || renderedMessages.has(message.id)) return;
    const session = sessions.get(message.sessionId);
    if (!session || message.sessionId !== activeSessionId) return;
    renderedMessages.add(message.id);
    const row = document.createElement('div');
    row.className = `mot-admin-chat-msg ${message.role === 'admin' ? 'admin' : 'visitor'}`;
    row.innerHTML = `<div>${esc(message.text)}</div><small>${message.role === 'admin' ? 'Admin' : esc(session.name || 'Khách')} • ${compactTime(message.createdAt)}</small>`;
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  };

  const connect = async () => {
    if (socket) return;
    try {
      const io = await loadSocketClient();
      socket = io({ transports: ['websocket', 'polling'] });
      socket.on('connect', () => {
        connected = true;
        status.textContent = 'Online, đang nhận tin nhắn';
        socket.emit('support:admin_join');
      });
      socket.on('disconnect', () => {
        connected = false;
        status.textContent = 'Mất kết nối, đang thử lại...';
      });
      socket.on('connect_error', () => {
        connected = false;
        status.textContent = 'Chưa kết nối được socket';
      });
      socket.on('support:sessions', (payload = []) => {
        payload.forEach(upsertSession);
        if (!activeSessionId && payload[0]?.id) activeSessionId = payload[0].id;
        renderSessions();
        renderMessages();
      });
      socket.on('support:session_update', (session) => {
        upsertSession(session);
        renderSessions();
        if (session.id === activeSessionId && session.messages) renderMessages();
      });
      socket.on('support:message', (message) => {
        const session = sessions.get(message.sessionId) || { id: message.sessionId, name: 'Khách hàng', messages: [] };
        session.messages = [...(session.messages || []), message];
        session.lastMessage = { text: message.text, role: message.role, createdAt: message.createdAt };
        session.updatedAt = message.createdAt;
        if (message.role === 'visitor' && message.sessionId !== activeSessionId) session.unreadAdmin = Number(session.unreadAdmin || 0) + 1;
        sessions.set(message.sessionId, session);
        appendMessage(message);
        renderSessions();
      });
    } catch (error) {
      console.warn(error);
      status.textContent = 'Không tải được Socket.IO client';
    }
  };

  button.addEventListener('click', () => {
    panel.classList.toggle('open');
    connect();
  });
  panel.querySelector('.mot-admin-chat-close').addEventListener('click', () => panel.classList.remove('open'));
  list.addEventListener('click', (event) => {
    const target = event.target.closest('.mot-admin-chat-session');
    if (!target) return;
    activeSessionId = target.dataset.sessionId;
    const session = sessions.get(activeSessionId);
    if (session) session.unreadAdmin = 0;
    renderSessions();
    renderMessages();
    input.focus();
    if (connected) socket.emit('support:admin_open_session', { sessionId: activeSessionId });
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || !activeSessionId || !socket) return;
    socket.emit('support:admin_message', { sessionId: activeSessionId, text });
    input.value = '';
  });

  connect();
  renderSessions();
  renderMessages();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAdminSupportChat);
else initAdminSupportChat();
