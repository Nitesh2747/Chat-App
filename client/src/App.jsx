import { useEffect, useRef, useState } from 'react';
import './style/App.css';
import Auth from './components/Auth.jsx';
import { socket } from './data/socket.js';
import { canEdit } from './utils/helpers.js';
import NewChat from './components/NewChat.jsx';
import Sidebar from './components/Sidebar.jsx';
import ChatHeader from './components/ChatHeader.jsx';
import MessageList from './components/MessageList.jsx';
import MessageInput from './components/MessageInput.jsx';
import GroupMembersModal from './components/GroupMembersModal.jsx';
import FriendRequestsModal from './components/FriendRequestsModal.jsx';
import { deleteAccount, deleteChat, getConversations, getMessages, getFriendRequests } from './data/api.js';

function App() {
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const editingIdRef = useRef(null);
  const editInputRef = useRef(null);
  const activeConvoRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [editText, setEditText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [unreadMarker, setUnreadMarker] = useState(null);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [showFriendRequests, setShowFriendRequests] = useState(false);

  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('chat-auth');
    return saved ? JSON.parse(saved) : null;
  });
  const username = auth?.user.username;

  useEffect(() => {
    if (!auth) return;
    getFriendRequests().then((r) => setPendingRequestCount(r.length)).catch(() => { });
  }, [auth]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    activeConvoRef.current = activeConvo;
  }, [activeConvo]);

  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);

  useEffect(() => {
    if (!auth || !activeConvo) return;

    function markVisibleAsRead() {
      if (document.hidden) return;
      const unread = messages
        .filter((m) => !m.system && m.user !== username && !m.readBy?.includes(username))
        .map((m) => m._id);
      if (unread.length > 0) {
        socket.emit('messages read', { conversationId: activeConvo._id, ids: unread });
      }
    }

    markVisibleAsRead();
    document.addEventListener('visibilitychange', markVisibleAsRead);
    return () => document.removeEventListener('visibilitychange', markVisibleAsRead);
  }, [messages, auth, activeConvo, username]);

  useEffect(() => {
    if (!auth) return;
    getConversations().then(setConversations).catch((err) => console.error('Failed to load conversations:', err));
  }, [auth]);

  useEffect(() => {
    if (!activeConvo) return;

    setMessages([]);
    setTypingUsers([]);
    setUnreadMarker(null);

    if (window.innerWidth > 700) inputRef.current?.focus();

    getMessages(activeConvo._id)
      .then((msgs) => {
        setMessages(msgs);
        const unread = msgs.filter((m) => m.user !== username && !m.readBy?.includes(username));
        if (unread.length > 0) setUnreadMarker({ id: unread[0]._id, count: unread.length });
      })
      .catch((err) => console.error('Failed to load messages:', err));
  }, [activeConvo]);

  useEffect(() => {
    if (editingId) editInputRef.current?.select();
  }, [editingId]);

  useEffect(() => {
    if (!auth) return;

    function onConnectError(err) {
      if (err.message === 'Invalid token' || err.message === 'Authentication required') handleLogout();
    }

    socket.on('connect_error', onConnectError);
    socket.auth = { token: auth.token };
    socket.connect();

    return () => {
      socket.off('connect_error', onConnectError);
      socket.disconnect();
    };
  }, [auth]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      const el = editInputRef.current;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editText, editingId]);

  useEffect(() => {
    if (inputRef.current) {
      const el = inputRef.current;
      const maxHeight = 140;
      el.style.height = 'auto';
      if (el.scrollHeight > maxHeight) {
        el.style.height = `${maxHeight}px`;
        el.style.overflowY = 'auto';
      } else {
        el.style.height = `${el.scrollHeight}px`;
        el.style.overflowY = 'hidden';
      }
    }
  }, [input]);

  useEffect(() => {
    function onTyping({ conversationId, username: who }) {
      if (activeConvoRef.current?._id !== conversationId) return;
      setTypingUsers((prev) => (prev.includes(who) ? prev : [...prev, who]));
    }

    function onStopTyping({ conversationId, username: who }) {
      if (activeConvoRef.current?._id !== conversationId) return;
      setTypingUsers((prev) => prev.filter((u) => u !== who));
    }

    function onChatMessage(msg) {
      setMessages((prev) =>
        activeConvoRef.current?._id === msg.conversation ? [...prev, msg] : prev
      );
      if (msg.system) return;
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === msg.conversation);
        if (!exists) {
          getConversations().then(setConversations).catch(console.error);
          return prev;
        }
        return prev
          .map((c) =>
            c._id === msg.conversation
              ? {
                ...c,
                lastMessageAt: msg.timestamp,
                lastMessage: {
                  text: msg.text,
                  user: msg.user,
                  timestamp: msg.timestamp,
                  messageId: msg._id,
                  status: msg.deliveredTo?.length ? 'delivered' : 'sent',
                },
                unreadCount:
                  activeConvoRef.current?._id === msg.conversation ? 0 : (c.unreadCount || 0) + 1,
              }
              : c
          )
          .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
    }

    function onReadUpdate({ conversationId, ids, reader }) {
      setMessages((prev) =>
        activeConvoRef.current?._id !== conversationId
          ? prev
          : prev.map((m) =>
            ids.includes(m._id) && !m.readBy?.includes(reader)
              ? { ...m, readBy: [...(m.readBy || []), reader] }
              : m
          )
      );
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId && ids.includes(c.lastMessage?.messageId)
            ? { ...c, lastMessage: { ...c.lastMessage, status: 'read' } }
            : c
        )
      );
    }

    function onDeliveredUpdate({ conversationId, ids, deliveredTo }) {
      setMessages((prev) =>
        activeConvoRef.current?._id !== conversationId
          ? prev
          : prev.map((m) =>
            ids.includes(m._id) && !m.deliveredTo?.includes(deliveredTo)
              ? { ...m, deliveredTo: [...(m.deliveredTo || []), deliveredTo] }
              : m
          )
      );
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId && c.lastMessage?.status === 'sent' && ids.includes(c.lastMessage?.messageId)
            ? { ...c, lastMessage: { ...c.lastMessage, status: 'delivered' } }
            : c
        )
      );
    }

    function onMessageEdited({ conversationId, messageId, text }) {
      if (activeConvoRef.current?._id === conversationId) {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, text, edited: true } : m)));
      }
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId && c.lastMessage?.messageId === messageId
            ? { ...c, lastMessage: { ...c.lastMessage, text } }
            : c
        )
      );
    }

    function onMessageDeleted({ conversationId, messageId }) {
      if (activeConvoRef.current?._id !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, text: '', deleted: true } : m))
      );
    }

    function onEditError({ messageId, error }) {
      if (editingIdRef.current === messageId) {
        alert(error);
        cancelEdit();
      }
    }

    function onConversationAdded() {
      getConversations().then(setConversations).catch(console.error);
    }

    function onFriendRequestReceived() {
      setPendingRequestCount((c) => c + 1);
    }

    function onMemberAdded({ conversationId, member }) {
      setConversations((prev) =>
        prev.map((c) => (c._id === conversationId ? { ...c, members: [...c.members, member] } : c))
      );
      if (activeConvoRef.current?._id === conversationId) {
        setActiveConvo((c) => ({ ...c, members: [...c.members, member] }));
      }
    }

    function onMemberRemoved({ conversationId, userId }) {
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId ? { ...c, members: c.members.filter((m) => m._id !== userId) } : c
        )
      );
      if (activeConvoRef.current?._id === conversationId) {
        setActiveConvo((c) => ({ ...c, members: c.members.filter((m) => m._id !== userId) }));
      }
    }

    function onRemovedFromGroup({ conversationId }) {
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
      if (activeConvoRef.current?._id === conversationId) {
        setActiveConvo(null);
        alert('You were removed from this group');
      }
    }

    socket.on('typing', onTyping);
    socket.on('edit error', onEditError);
    socket.on('read update', onReadUpdate);
    socket.on('stop typing', onStopTyping);
    socket.on('chat message', onChatMessage);
    socket.on('member added', onMemberAdded);
    socket.on('member removed', onMemberRemoved);
    socket.on('message edited', onMessageEdited);
    socket.on('message deleted', onMessageDeleted);
    socket.on('delivered update', onDeliveredUpdate);
    socket.on('removed from group', onRemovedFromGroup);
    socket.on('conversation added', onConversationAdded);
    socket.on('friend request received', onFriendRequestReceived);

    return () => {
      socket.off('typing', onTyping);
      socket.off('edit error', onEditError);
      socket.off('read update', onReadUpdate);
      socket.off('stop typing', onStopTyping);
      socket.off('chat message', onChatMessage);
      socket.off('member added', onMemberAdded);
      socket.off('member removed', onMemberRemoved);
      socket.off('message edited', onMessageEdited);
      socket.off('message deleted', onMessageDeleted);
      socket.off('delivered update', onDeliveredUpdate);
      socket.off('removed from group', onRemovedFromGroup);
      socket.off('conversation added', onConversationAdded);
      socket.off('friend request received', onFriendRequestReceived);
    };
  }, []);

  function handleAuth(data) {
    localStorage.setItem('chat-auth', JSON.stringify(data));
    setAuth(data);
  }

  function handleLogout() {
    localStorage.removeItem('chat-auth');
    setMessages([]);
    setTypingUsers([]);
    setInput('');
    setAuth(null);
  }

  function handleConversationCreated(convo) {
    setConversations((prev) => {
      const exists = prev.some((c) => c._id === convo._id);
      return exists ? prev : [convo, ...prev];
    });
    setActiveConvo(convo);
    setShowNewChat(false);
    socket.emit('join conversation', convo._id);
  }

  function handleSelectConvo(c) {
    setActiveConvo(c);
    setSidebarOpen(false);
    setConversations((prev) => prev.map((x) => (x._id === c._id ? { ...x, unreadCount: 0 } : x)));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (input.trim() && activeConvo) {
      socket.emit('chat message', { conversationId: activeConvo._id, text: input });
      clearTimeout(typingTimeoutRef.current);
      socket.emit('stop typing', activeConvo._id);
      setInput('');
    }
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    if (!activeConvo) return;
    socket.emit('typing', activeConvo._id);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socket.emit('stop typing', activeConvo._id), 1000);
  }

  function startEdit(msg) {
    if (!canEdit(msg, username)) return;
    setEditingId(msg._id);
    setEditText(msg.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  function submitEdit(msg) {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== msg.text) {
      socket.emit('edit message', { conversationId: activeConvo._id, messageId: msg._id, text: trimmed });
    }
    cancelEdit();
  }

  function deleteMessage(msg) {
    if (!window.confirm('Delete this message for everyone?')) return;
    socket.emit('delete message', { conversationId: activeConvo._id, messageId: msg._id });
  }

  async function handleDeleteAccount() {
    try {
      await deleteAccount();
      handleLogout();
    } catch (err) {
      alert(err.message || 'Failed to delete account');
    }
  }

  async function handleDeleteChat(convoId) {
    if (!window.confirm('Delete this chat?')) return;
    try {
      await deleteChat(convoId);
      setConversations((prev) => prev.filter((c) => c._id !== convoId));
      if (activeConvoRef.current?._id === convoId) {
        setActiveConvo(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete chat');
    }
  }

  if (!auth) return <Auth onAuth={handleAuth} />;

  return (
    <div className="app">
      <Sidebar
        username={username}
        conversations={conversations}
        activeConvo={activeConvo}
        onSelect={handleSelectConvo}
        onNewChat={() => setShowNewChat(true)}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        onOpenRequests={() => setShowFriendRequests(true)}
        pendingRequestCount={pendingRequestCount}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
        onDeleteChat={handleDeleteChat}
      />

      <main className="chat">
        <ChatHeader
          activeConvo={activeConvo}
          username={username}
          typingUsers={typingUsers}
          onToggleSidebar={() => setSidebarOpen(true)}
          onShowMembers={() => setShowMembers(true)}
        />

        {activeConvo ? (
          <>
            <MessageList
              messages={messages}
              username={username}
              unreadMarker={unreadMarker}
              editingId={editingId}
              editText={editText}
              onEditTextChange={setEditText}
              editInputRef={editInputRef}
              bottomRef={bottomRef}
              onStartEdit={startEdit}
              onSubmitEdit={submitEdit}
              onCancelEdit={cancelEdit}
              onDelete={deleteMessage}
            />
            <MessageInput input={input} onChange={handleInputChange} onSubmit={handleSubmit} inputRef={inputRef} />
          </>
        ) : (
          <div className="no-chat"><p>Select a conversation to start chatting</p></div>
        )}
      </main>

      {showNewChat && (
        <NewChat onCreated={handleConversationCreated} onClose={() => setShowNewChat(false)} />
      )}

      {showMembers && activeConvo?.isGroup && (
        <GroupMembersModal
          convo={activeConvo}
          username={username}
          myId={auth.user.id}
          onClose={() => setShowMembers(false)}
          onMemberRemoved={(id) =>
            setActiveConvo((c) => ({ ...c, members: c.members.filter((m) => m._id !== id) }))
          }
        />
      )}

      {showFriendRequests && (
        <FriendRequestsModal
          onClose={() => setShowFriendRequests(false)}
          onRequestHandled={() => setPendingRequestCount((c) => Math.max(0, c - 1))}
          onChatStarted={(convo) => {
            handleConversationCreated(convo);
            setShowFriendRequests(false);
          }}
        />
      )}
    </div>
  );
}

export default App;