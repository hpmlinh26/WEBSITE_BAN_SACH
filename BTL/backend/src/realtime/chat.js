const { Server } = require('socket.io');

const MAX_MESSAGES_PER_SESSION = 80;
const sessions = new Map();
let adminSockets = 0;

function now() {
  return new Date().toISOString();
}

function text(value, limit = 800) {
  return String(value || '').trim().slice(0, limit);
}

function sessionRoom(sessionId) {
  return `support:session:${sessionId}`;
}

function ensureSession(payload = {}) {
  const sessionId = text(payload.sessionId, 80);
  if (!sessionId) return null;

  const current = sessions.get(sessionId);
  const createdAt = current?.createdAt || now();
  const session = {
    id: sessionId,
    name: text(payload.name, 80) || current?.name || 'Khách hàng',
    page: text(payload.page, 180) || current?.page || '/',
    createdAt,
    updatedAt: now(),
    online: true,
    unreadAdmin: current?.unreadAdmin || 0,
    unreadVisitor: current?.unreadVisitor || 0,
    messages: current?.messages || [],
  };

  sessions.set(sessionId, session);
  return session;
}

function serializeSession(session, withMessages = false) {
  const last = session.messages[session.messages.length - 1];
  return {
    id: session.id,
    name: session.name,
    page: session.page,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    online: session.online,
    unreadAdmin: session.unreadAdmin,
    unreadVisitor: session.unreadVisitor,
    lastMessage: last ? { text: last.text, role: last.role, createdAt: last.createdAt } : null,
    messages: withMessages ? session.messages : undefined,
  };
}

function addMessage(session, role, rawText) {
  const messageText = text(rawText);
  if (!messageText) return null;

  const message = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sessionId: session.id,
    role,
    text: messageText,
    createdAt: now(),
  };

  session.messages.push(message);
  if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
    session.messages.splice(0, session.messages.length - MAX_MESSAGES_PER_SESSION);
  }
  session.updatedAt = message.createdAt;
  if (role === 'visitor') session.unreadAdmin += 1;
  if (role === 'admin') session.unreadVisitor += 1;
  sessions.set(session.id, session);
  return message;
}

function emitSessions(io) {
  io.to('support:admins').emit(
    'support:sessions',
    [...sessions.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((session) => serializeSession(session))
  );
}

function attachSupportChat(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('support:visitor_join', (payload = {}) => {
      const session = ensureSession(payload);
      if (!session) return;

      socket.data.supportSessionId = session.id;
      socket.join(sessionRoom(session.id));
      socket.emit('support:ready', {
        adminOnline: adminSockets > 0,
        session: serializeSession(session, true),
      });
      io.to('support:admins').emit('support:session_update', serializeSession(session));
      emitSessions(io);
    });

    socket.on('support:visitor_message', (payload = {}) => {
      const session = ensureSession({ ...payload, sessionId: payload.sessionId || socket.data.supportSessionId });
      if (!session) return;

      const message = addMessage(session, 'visitor', payload.text);
      if (!message) return;
      socket.join(sessionRoom(session.id));
      io.to('support:admins').emit('support:message', message);
      io.to('support:admins').emit('support:session_update', serializeSession(session));
      io.to(sessionRoom(session.id)).emit('support:session_update', serializeSession(session, true));
      emitSessions(io);
    });

    socket.on('support:admin_join', () => {
      adminSockets += 1;
      socket.data.isSupportAdmin = true;
      socket.join('support:admins');
      socket.emit(
        'support:sessions',
        [...sessions.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((session) => serializeSession(session, true))
      );
      io.emit('support:presence', { adminOnline: adminSockets > 0 });
    });

    socket.on('support:admin_open_session', (payload = {}) => {
      const session = sessions.get(text(payload.sessionId, 80));
      if (!session) return;
      session.unreadAdmin = 0;
      session.updatedAt = now();
      socket.emit('support:session_update', serializeSession(session, true));
      io.to('support:admins').emit('support:session_update', serializeSession(session));
    });

    socket.on('support:admin_message', (payload = {}) => {
      if (!socket.data.isSupportAdmin) return;
      const session = sessions.get(text(payload.sessionId, 80));
      if (!session) return;

      const message = addMessage(session, 'admin', payload.text);
      if (!message) return;
      io.to(sessionRoom(session.id)).emit('support:message', message);
      io.to('support:admins').emit('support:message', message);
      io.to(sessionRoom(session.id)).emit('support:session_update', serializeSession(session, true));
      io.to('support:admins').emit('support:session_update', serializeSession(session));
      emitSessions(io);
    });

    socket.on('support:visitor_read', (payload = {}) => {
      const session = sessions.get(text(payload.sessionId || socket.data.supportSessionId, 80));
      if (!session) return;
      session.unreadVisitor = 0;
      io.to('support:admins').emit('support:session_update', serializeSession(session));
    });

    socket.on('disconnect', () => {
      if (socket.data.isSupportAdmin) {
        adminSockets = Math.max(0, adminSockets - 1);
        io.emit('support:presence', { adminOnline: adminSockets > 0 });
      }

      const sessionId = socket.data.supportSessionId;
      if (!sessionId) return;
      const room = io.sockets.adapter.rooms.get(sessionRoom(sessionId));
      const session = sessions.get(sessionId);
      if (session && (!room || room.size === 0)) {
        session.online = false;
        session.updatedAt = now();
        io.to('support:admins').emit('support:session_update', serializeSession(session));
        emitSessions(io);
      }
    });
  });

  return io;
}

module.exports = { attachSupportChat };
