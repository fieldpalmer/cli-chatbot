import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { rtdb } from './firebase';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { getAIResponse } from './services/ai';

interface Message {
     role: 'user' | 'bot';
     content: string;
     timestamp: number;
}

interface Session {
     id: string;
     name: string;
     createdAt: number;
     messages?: Record<string, Message>;
}

const App: React.FC = () => {
     const [darkMode, setDarkMode] = useState(true);
     const [input, setInput] = useState('');
     const [messages, setMessages] = useState<Message[]>([]);
     const [loading, setLoading] = useState(false);
     const [sessionId, setSessionId] = useState('');
     const [sessions, setSessions] = useState<Session[]>([]);
     const [renamingId, setRenamingId] = useState<string | null>(null);
     const [renameValue, setRenameValue] = useState('');
     const [error, setError] = useState<{ message: string; isError: boolean }>({ message: '', isError: false });

     useEffect(() => {
          const root = document.documentElement;
          if (darkMode) {
               root.classList.add('dark');
          } else {
               root.classList.remove('dark');
          }
     }, [darkMode]);

     // Fetch sessions on mount
     useEffect(() => {
          const sessionsRef = ref(rtdb, 'sessions');
          onValue(sessionsRef, (snapshot) => {
               const data = snapshot.val();
               if (data) {
                    const sessionsList = Object.entries(data).map(([id, session]: [string, any]) => ({
                         id,
                         name: session.name,
                         createdAt: session.createdAt
                    }));
                    setSessions(sessionsList);
                    if (!sessionId && sessionsList.length > 0) {
                         setSessionId(sessionsList[0].id);
                    }
               }
          });
     }, []);

     // Fetch messages when session changes
     useEffect(() => {
          if (!sessionId) return;
          const messagesRef = ref(rtdb, `sessions/${sessionId}/messages`);
          onValue(messagesRef, (snapshot) => {
               const data = snapshot.val();
               if (data) {
                    const messagesList = Object.values(data).sort((a: any, b: any) => a.timestamp - b.timestamp);
                    setMessages(messagesList as Message[]);
               } else {
                    setMessages([]);
               }
          });
     }, [sessionId]);

     const handleCreateSession = async () => {
          try {
               const chatNum = sessions.length + 1;
               const sessionsRef = ref(rtdb, 'sessions');
               const newSessionRef = push(sessionsRef);
               await set(newSessionRef, {
                    name: `Chat ${chatNum}`,
                    createdAt: Date.now()
               });
               setSessionId(newSessionRef.key!);
               setMessages([]);
               setError({ message: '', isError: false });
          } catch (err) {
               console.error('Error creating session:', err);
               setError({
                    message: 'Failed to create new chat session. Please try again.',
                    isError: true
               });
          }
     };

     const handleDeleteSession = async (id: string) => {
          try {
               const sessionRef = ref(rtdb, `sessions/${id}`);
               await remove(sessionRef);
               if (sessionId === id) {
                    const remainingSessions = sessions.filter((s) => s.id !== id);
                    setSessionId(remainingSessions[0]?.id || '');
                    setMessages([]);
               }
          } catch (err) {
               console.error('Error deleting session:', err);
               setError({
                    message: 'Failed to delete session. Please try again.',
                    isError: true
               });
          }
     };

     const handleRenameSession = async (id: string, newName: string) => {
          try {
               const sessionRef = ref(rtdb, `sessions/${id}/name`);
               await set(sessionRef, newName);
               setRenamingId(null);
          } catch (err) {
               console.error('Error renaming session:', err);
               setError({
                    message: 'Failed to rename session. Please try again.',
                    isError: true
               });
          }
     };

     const sendMessage = async () => {
          if (!input.trim() || !sessionId) return;

          setLoading(true);
          setError({ message: '', isError: false });

          try {
               const response = await getAIResponse(input, sessionId);
               setInput('');
          } catch (err) {
               console.error('Error sending message:', err);
               setError({
                    message: 'Failed to send message. Please try again.',
                    isError: true
               });
          } finally {
               setLoading(false);
          }
     };

     return (
          <div className='flex min-h-screen font-sans bg-gray-100 dark:bg-gray-900 text-black dark:text-white'>
               <div className='absolute top-4 right-4'>
                    <button
                         onClick={() => setDarkMode(!darkMode)}
                         className='px-3 py-1 rounded text-sm border hover:bg-gray-200 dark:hover:bg-gray-700'
                    >
                         {darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
                    </button>
               </div>

               <div className='w-80 bg-white dark:bg-gray-800 shadow-md p-4 border-r border-gray-200 dark:border-gray-700'>
                    <button
                         onClick={handleCreateSession}
                         className='w-full bg-green-500 text-white font-semibold rounded mb-4 p-2 hover:bg-green-600'
                    >
                         + New Chat
                    </button>

                    <h2 className='text-lg font-bold mb-4'>Sessions</h2>
                    <ul className='space-y-2'>
                         {sessions.map((sesh) => (
                              <li key={sesh.id} className='flex items-center justify-between'>
                                   {renamingId === sesh.id ? (
                                        <input
                                             className='border p-1 rounded w-full mr-2 dark:bg-gray-700 dark:border-gray-600'
                                             value={renameValue}
                                             onChange={(e) => setRenameValue(e.target.value)}
                                             onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                       handleRenameSession(sesh.id, renameValue);
                                                  }
                                             }}
                                             autoFocus
                                        />
                                   ) : (
                                        <button
                                             onClick={() => setSessionId(sesh.id)}
                                             className={`text-left w-full p-2 rounded ${
                                                  sesh.id === sessionId
                                                       ? 'bg-blue-600 text-white'
                                                       : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                             }`}
                                        >
                                             {sesh.name}
                                        </button>
                                   )}

                                   <button
                                        onClick={() => {
                                             setRenamingId(sesh.id);
                                             setRenameValue(sesh.name);
                                        }}
                                        className='ml-2 text-sm text-gray-500 hover:text-black dark:hover:text-white'
                                   >
                                        ✏️
                                   </button>
                                   <button
                                        onClick={() => handleDeleteSession(sesh.id)}
                                        className='ml-1 text-sm text-gray-400 hover:text-red-500'
                                   >
                                        🗑
                                   </button>
                              </li>
                         ))}
                    </ul>
               </div>

               <div className='flex-1 p-6 flex flex-col items-center'>
                    <div className='w-full max-w-2xl'>
                         <h1 className='text-2xl font-bold text-center mb-4'>🧠 LangChain Chatbot</h1>

                         {error.isError && (
                              <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4'>
                                   <span className='block sm:inline'>{error.message}</span>
                              </div>
                         )}

                         <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 h-[70vh] overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-900'>
                              {messages.map((msg, i) => (
                                   <div
                                        key={i}
                                        className={`flex items-end ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                   >
                                        {msg.role === 'bot' && (
                                             <div className='w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mr-2 text-sm'>
                                                  🤖
                                             </div>
                                        )}
                                        <div
                                             className={`max-w-[75%] p-3 rounded-xl ${
                                                  msg.role === 'user'
                                                       ? 'bg-green-100 dark:bg-green-900'
                                                       : 'bg-gray-200 dark:bg-gray-700'
                                             }`}
                                        >
                                             <ReactMarkdown>{msg.content}</ReactMarkdown>
                                             <div className='text-gray-500 text-xs mt-1'>
                                                  {new Date(msg.timestamp).toLocaleTimeString([], {
                                                       hour: '2-digit',
                                                       minute: '2-digit'
                                                  })}
                                             </div>
                                        </div>
                                        {msg.role === 'user' && (
                                             <div className='w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center ml-2 text-sm'>
                                                  🧑
                                             </div>
                                        )}
                                   </div>
                              ))}
                              {loading && (
                                   <div className='flex items-center space-x-2'>
                                        <div className='w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm'>
                                             🤖
                                        </div>
                                        <div className='bg-gray-200 dark:bg-gray-700 rounded-xl px-3 py-2 text-sm font-mono animate-pulse'>
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
                                   className='flex-grow px-4 py-2 rounded-l-md border border-gray-300 focus:outline-none dark:bg-gray-800 dark:border-gray-600'
                                   disabled={loading || !sessionId}
                              />
                              <button
                                   onClick={sendMessage}
                                   disabled={loading || !sessionId}
                                   className='bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 disabled:opacity-50'
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
