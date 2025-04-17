import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

type Message = {
     role: 'user' | 'bot';
     content: string;
     timestamp: string;
};

type Session = {
     id: string;
     name: string;
};

type ErrorState = {
     message: string;
     isError: boolean;
};

const App: React.FC = () => {
     const [darkMode, setDarkMode] = useState(true);
     const [input, setInput] = useState('');
     const [messages, setMessages] = useState<Message[]>([]);
     const [loading, setLoading] = useState(false);
     const [sessionId, setSessionId] = useState('default-session');
     const [sessions, setSessions] = useState<Session[]>([]);
     const [renamingId, setRenamingId] = useState<string | null>(null);
     const [renameValue, setRenameValue] = useState('');
     const [error, setError] = useState<ErrorState>({ message: '', isError: false });
     const [isMenuOpen, setIsMenuOpen] = useState(false);

     const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

     // Use local backend in development, Vercel in production
     const BASE_URL =
          import.meta.env.VITE_API_URL ||
          (import.meta.env.DEV ? 'http://localhost:3001' : 'https://chatbot-backend-blond-three.vercel.app');

     const API_URL = `${BASE_URL}/chat`;
     const HISTORY_URL = `${BASE_URL}/history`;

     const generateSessionId = () => `session-${Date.now()}`;

     const handleRenameSession = async (sessionId: string, newName: string) => {
          try {
               await axios.patch(`${HISTORY_URL}/${sessionId}`, {
                    name: newName
               });
               setSessions(sessions.map((s) => (s.id === sessionId ? { ...s, name: newName } : s)));
               setRenamingId(null);
          } catch (err) {
               console.error('Error renaming session:', err);
               setError({
                    message: 'Failed to rename chat session. Please try again.',
                    isError: true
               });
          }
     };

     const handleDeleteSession = async (sessionId: string) => {
          try {
               await axios.delete(`${HISTORY_URL}/${sessionId}`);
               setSessions(sessions.filter((s) => s.id !== sessionId));
               if (sessionId === sessionId) {
                    setSessionId(sessions[0]?.id || '');
                    setMessages([]);
               }
          } catch (err) {
               console.error('Error deleting session:', err);
               setError({
                    message: 'Failed to delete chat session. Please try again.',
                    isError: true
               });
          }
     };

     const createNewSession = async () => {
          try {
               const newId = generateSessionId();
               const chatNum = sessions.length + 1;
               const name = `Chat ${chatNum}`;

               const res = await axios.post(`${HISTORY_URL}`, { id: newId, name });

               if (res.status === 201) {
                    const newSession = { id: newId, name };
                    const updated = [newSession, ...sessions.filter((s) => s.id !== newId)];
                    setSessions(updated);
                    setSessionId(newId);
                    setMessages([]);
                    setError({ message: '', isError: false });
               }
          } catch (err) {
               console.error('Error creating session:', err);
               setError({
                    message: 'Failed to create new chat session. Please try again.',
                    isError: true
               });
          }
     };

     const fetchSessions = async (attempt = 1) => {
          try {
               console.log('Fetching sessions from:', `${HISTORY_URL}/sessions`);
               const res = await axios.get(`${HISTORY_URL}/sessions`);
               if (res.status === 200) {
                    const sessionArray = res.data.map((session: { id: string; name: string }) => ({
                         id: session.id,
                         name: session.name
                    }));
                    setSessions(sessionArray);
                    setError({ message: '', isError: false });
               }
          } catch (err) {
               console.error(`Attempt ${attempt} failed fetching sessions:`, err);
               if (attempt < 3) {
                    setTimeout(() => fetchSessions(attempt + 1), 2000 * attempt);
               } else {
                    setError({
                         message: `Failed to connect to the server. Please check if the backend is running at ${BASE_URL}`,
                         isError: true
                    });
               }
          }
     };

     const fetchHistory = async (session: string) => {
          try {
               const res = await axios.get(`${HISTORY_URL}/${session}`);
               if (res.status === 200) {
                    const formatted = res.data.map((msg: any) => ({
                         role: msg.role,
                         content: msg.content,
                         timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                         })
                    }));
                    setMessages(formatted);
                    setError({ message: '', isError: false });
               }
          } catch (err) {
               console.error('Error fetching history:', err);
               setError({
                    message: 'Failed to load chat history. Please try again.',
                    isError: true
               });
          }
     };

     useEffect(() => {
          const root = document.documentElement;
          darkMode ? root.classList.add('dark') : root.classList.remove('dark');
     }, [darkMode]);

     useEffect(() => {
          fetchSessions();
     }, []);

     useEffect(() => {
          if (sessionId) fetchHistory(sessionId);
     }, [sessionId]);

     const sendMessage = async () => {
          if (!input.trim()) return;

          const userMessage = {
               role: 'user' as const,
               content: input,
               timestamp: formatTime(new Date())
          };

          setMessages((prev) => [...prev, userMessage]);
          setLoading(true);
          setError({ message: '', isError: false });

          try {
               const res = await axios.post(API_URL, {
                    message: input,
                    sessionId
               });

               if (res.status === 200) {
                    const botMessage = {
                         role: 'bot' as const,
                         content: res.data.reply,
                         timestamp: formatTime(new Date())
                    };
                    setMessages((prev) => [...prev, botMessage]);
               }
          } catch (err) {
               console.error('Error sending message:', err);
               setMessages((prev) => [
                    ...prev,
                    {
                         role: 'bot',
                         content: '❌ Error: Failed to get response. Please try again.',
                         timestamp: formatTime(new Date())
                    }
               ]);
               setError({
                    message: 'Failed to send message. Please try again.',
                    isError: true
               });
          } finally {
               setInput('');
               setLoading(false);
          }
     };

     return (
          <div
               className={`flex flex-col md:flex-row min-h-screen font-sans ${
                    darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'
               }`}
          >
               <div className='absolute top-4 right-4 z-20'>
                    <button
                         onClick={() => setIsMenuOpen(!isMenuOpen)}
                         className={`md:hidden px-3 py-1 text-sm border ${
                              darkMode
                                   ? 'border-purple-500 bg-gray-900 hover:bg-gray-800 shadow-[0_0_5px_rgba(168,85,247,0.5)]'
                                   : 'border-pink-500 bg-white hover:bg-gray-50 shadow-[0_0_5px_rgba(236,72,153,0.5)]'
                         }`}
                    >
                         {isMenuOpen ? '✕' : '☰'}
                    </button>
               </div>

               {/* Mobile Menu Overlay */}
               {isMenuOpen && (
                    <div
                         className={`fixed inset-0 ${
                              darkMode ? 'bg-black bg-opacity-75' : 'bg-gray-900 bg-opacity-50'
                         } z-10 md:hidden`}
                         onClick={() => setIsMenuOpen(false)}
                    />
               )}

               {/* Sidebar */}
               <div
                    className={`fixed md:static inset-y-0 left-0 w-64 shadow-md p-4 transform transition-transform duration-200 ease-in-out z-20 ${
                         isMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    } md:translate-x-0 md:w-80 ${
                         darkMode
                              ? 'bg-gray-900 border-r border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                              : 'bg-white border-r border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.3)]'
                    }`}
               >
                    <div className='flex justify-between items-center mb-4'>
                         <h2 className={`text-lg font-bold ${darkMode ? 'text-purple-400' : 'text-pink-500'}`}>Sessions</h2>
                         <button
                              onClick={() => setDarkMode((prev) => !prev)}
                              className={`px-3 py-1 text-sm border ${
                                   darkMode
                                        ? 'border-purple-500 bg-gray-800 hover:bg-gray-700 shadow-[0_0_5px_rgba(168,85,247,0.5)]'
                                        : 'border-pink-500 bg-gray-50 hover:bg-white shadow-[0_0_5px_rgba(236,72,153,0.5)]'
                              }`}
                         >
                              {darkMode ? '☀️ Light' : '🌙 Dark'}
                         </button>
                    </div>

                    <button
                         onClick={createNewSession}
                         className={`w-full text-white font-semibold mb-4 p-2 border ${
                              darkMode
                                   ? 'bg-purple-600 hover:bg-purple-500 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                                   : 'bg-pink-600 hover:bg-pink-500 border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                         }`}
                    >
                         + New Chat
                    </button>

                    <ul className='space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto'>
                         {sessions.map((sesh) => (
                              <li key={sesh.id} className='flex items-center justify-between'>
                                   {renamingId === sesh.id ? (
                                        <input
                                             className={`border p-1 w-full mr-2 ${
                                                  darkMode
                                                       ? 'border-purple-500 bg-gray-800 text-gray-100 shadow-[0_0_5px_rgba(168,85,247,0.3)]'
                                                       : 'border-pink-500 bg-gray-50 text-gray-900 shadow-[0_0_5px_rgba(236,72,153,0.3)]'
                                             }`}
                                             value={renameValue}
                                             onChange={(e) => setRenameValue(e.target.value)}
                                             onKeyDown={async (e) => {
                                                  if (e.key === 'Enter') {
                                                       await handleRenameSession(sesh.id, renameValue);
                                                  }
                                             }}
                                             autoFocus
                                        />
                                   ) : (
                                        <button
                                             onClick={() => {
                                                  setSessionId(sesh.id);
                                                  setIsMenuOpen(false);
                                             }}
                                             className={`text-left w-full p-2 ${
                                                  sesh.id === sessionId
                                                       ? darkMode
                                                            ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                                                            : 'bg-pink-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                                                       : darkMode
                                                       ? 'hover:bg-gray-800'
                                                       : 'hover:bg-gray-50'
                                             }`}
                                        >
                                             {sesh.name}
                                        </button>
                                   )}

                                   <div className='flex space-x-1'>
                                        <button
                                             onClick={() => {
                                                  setRenamingId(sesh.id);
                                                  setRenameValue(sesh.name);
                                             }}
                                             className={`text-sm ${
                                                  darkMode
                                                       ? 'text-gray-400 hover:text-purple-400'
                                                       : 'text-gray-500 hover:text-pink-500'
                                             }`}
                                        >
                                             ✏️
                                        </button>
                                        <button
                                             onClick={async () => {
                                                  await handleDeleteSession(sesh.id);
                                             }}
                                             className={`text-sm ${
                                                  darkMode
                                                       ? 'text-gray-400 hover:text-purple-400'
                                                       : 'text-gray-500 hover:text-pink-500'
                                             }`}
                                        >
                                             🗑
                                        </button>
                                   </div>
                              </li>
                         ))}
                    </ul>
               </div>

               {/* Main Chat Area */}
               <div className='flex-1 p-4 md:p-6 flex flex-col items-center'>
                    <div className='w-full max-w-2xl'>
                         <h1
                              className={`text-xl md:text-2xl font-bold text-center mb-4 ${
                                   darkMode ? 'text-cyan-400' : 'text-pink-500'
                              }`}
                         >
                              CyberChat
                         </h1>

                         {error.isError && (
                              <div
                                   className={`px-4 py-3 relative mb-4 ${
                                        darkMode
                                             ? 'bg-red-900 border border-red-800 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                             : 'bg-red-100 border border-red-400 text-red-700 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                   }`}
                                   role='alert'
                              >
                                   <span className='block sm:inline'>{error.message}</span>
                              </div>
                         )}

                         <div
                              className={`shadow-md p-4 h-[calc(100vh-16rem)] md:h-[70vh] overflow-y-auto space-y-4 scrollbar-thin ${
                                   darkMode
                                        ? 'bg-gray-900 scrollbar-thumb-purple-500 scrollbar-track-gray-800'
                                        : 'bg-white scrollbar-thumb-pink-500 scrollbar-track-gray-100'
                              }`}
                         >
                              {messages.map((msg, i) => (
                                   <div
                                        key={i}
                                        className={`flex items-end ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                   >
                                        {msg.role === 'bot' && (
                                             <div
                                                  className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center mr-2 text-xs md:text-sm ${
                                                       darkMode
                                                            ? 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                                                            : 'bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                                                  }`}
                                             >
                                                  🤖
                                             </div>
                                        )}
                                        <div
                                             className={`max-w-[85%] md:max-w-[75%] p-3 relative text-sm ${
                                                  msg.role === 'user'
                                                       ? darkMode
                                                            ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                                                            : 'bg-pink-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                                                       : darkMode
                                                       ? 'bg-gray-800 text-gray-100'
                                                       : 'bg-gray-50 text-gray-900'
                                             }`}
                                        >
                                             <ReactMarkdown
                                                  components={{
                                                       p: ({ children }) => (
                                                            <p className='prose prose-sm whitespace-pre-wrap'>{children}</p>
                                                       )
                                                  }}
                                             >
                                                  {msg.content}
                                             </ReactMarkdown>
                                             <div
                                                  className={`text-xs mt-1 text-right ${
                                                       darkMode ? 'text-gray-400' : 'text-gray-500'
                                                  }`}
                                             >
                                                  {msg.timestamp}
                                             </div>
                                        </div>
                                        {msg.role === 'user' && (
                                             <div
                                                  className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center ml-2 text-xs md:text-sm ${
                                                       darkMode
                                                            ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                                                            : 'bg-pink-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                                                  }`}
                                             >
                                                  👤
                                             </div>
                                        )}
                                   </div>
                              ))}
                              {loading && (
                                   <div className='flex items-center space-x-2'>
                                        <div
                                             className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm ${
                                                  darkMode
                                                       ? 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                                                       : 'bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                                             }`}
                                        >
                                             🤖
                                        </div>
                                        <div
                                             className={`px-3 py-2 text-sm font-mono animate-pulse ${
                                                  darkMode ? 'bg-gray-800' : 'bg-gray-50'
                                             }`}
                                        >
                                             ...
                                        </div>
                                   </div>
                              )}
                         </div>

                         <div className='flex mt-4'>
                              <input
                                   value={input}
                                   onChange={(e) => setInput(e.target.value)}
                                   onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                   placeholder='Type a message...'
                                   className={`flex-grow px-4 py-2 border focus:outline-none ${
                                        darkMode
                                             ? 'border-purple-500 bg-gray-800 text-gray-100 focus:border-purple-400 shadow-[0_0_5px_rgba(168,85,247,0.3)]'
                                             : 'border-pink-500 bg-white text-gray-900 focus:border-pink-400 shadow-[0_0_5px_rgba(236,72,153,0.3)]'
                                   }`}
                                   disabled={loading}
                              />
                              <button
                                   onClick={sendMessage}
                                   disabled={loading}
                                   className={`px-4 py-2 text-white disabled:opacity-50 border ${
                                        darkMode
                                             ? 'bg-purple-600 hover:bg-purple-500 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                                             : 'bg-pink-600 hover:bg-pink-500 border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                                   }`}
                              >
                                   Send
                              </button>
                         </div>
                    </div>
               </div>
          </div>
     );
};

export default App;
