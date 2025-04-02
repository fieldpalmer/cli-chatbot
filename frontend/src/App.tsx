import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const API_URL = 'http://localhost:3001/chat';
const HISTORY_URL = 'http://localhost:3001/history';

type Message = {
     role: 'user' | 'bot';
     content: string;
     timestamp: string;
};

type Session = {
     id: string;
     name: string;
};

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const App: React.FC = () => {
     const [input, setInput] = useState('');
     const [messages, setMessages] = useState<Message[]>([]);
     const [loading, setLoading] = useState(false);
     const [sessionId, setSessionId] = useState('default-session');
     const [sessions, setSessions] = useState<Session[]>([]);
     const [renamingId, setRenamingId] = useState<string | null>(null);
     const [renameValue, setRenameValue] = useState('');

     const generateSessionId = () => `session-${Date.now()}`;

     const createNewSession = async () => {
          const newId = generateSessionId();
          const chatNum = sessions.length + 1;
          const name = `Chat ${chatNum}`;

          await axios.post('http://localhost:3001/history', {
               id: newId,
               name
          });

          setSessionId(newId);
          setMessages([]);
          setSessions([{ id: newId, name }, ...sessions]);
     };

     const fetchSessions = async () => {
          const res = await axios.get(`${HISTORY_URL}/sessions`);
          setSessions(res.data);
     };

     const fetchHistory = async (session: string) => {
          const res = await axios.get(`${HISTORY_URL}/${session}`);
          const formatted = res.data.map((msg: any) => ({
               role: msg.role,
               content: msg.content,
               timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          setMessages(formatted);
     };

     useEffect(() => {
          fetchSessions();
          fetchHistory(sessionId);
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

          try {
               const res = await axios.post(API_URL, {
                    message: input,
                    sessionId
               });

               const botMessage = {
                    role: 'bot' as const,
                    content: res.data.reply,
                    timestamp: formatTime(new Date())
               };

               setMessages((prev) => [...prev, botMessage]);
          } catch (err) {
               setMessages((prev) => [
                    ...prev,
                    {
                         role: 'bot',
                         content: '❌ Error: Failed to get response.',
                         timestamp: formatTime(new Date())
                    }
               ]);
          } finally {
               setInput('');
               setLoading(false);
          }
     };

     return (
          <div className='flex min-h-screen bg-gray-100 font-sans'>
               <div className='w-80 bg-white shadow-md p-4 border-r'>
                    <button
                         onClick={createNewSession}
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
                                             className='border p-1 rounded w-full mr-2'
                                             value={renameValue}
                                             onChange={(e) => setRenameValue(e.target.value)}
                                             onKeyDown={async (e) => {
                                                  if (e.key === 'Enter') {
                                                       await axios.patch(`http://localhost:3001/history/${sesh.id}`, {
                                                            name: renameValue
                                                       });
                                                       const updatedSessions = sessions.map((s) =>
                                                            s.id === sesh.id ? { ...s, name: renameValue } : s
                                                       );
                                                       setSessions(updatedSessions);
                                                       setRenamingId(null);
                                                  }
                                             }}
                                             autoFocus
                                        />
                                   ) : (
                                        <button
                                             onClick={() => setSessionId(sesh.id)}
                                             className={`text-left w-full p-2 rounded ${
                                                  sesh.id === sessionId ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'
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
                                        className='ml-2 text-sm text-gray-500 hover:text-black'
                                   >
                                        ✏️
                                   </button>
                                   <button
                                        onClick={async () => {
                                             await axios.delete(`http://localhost:3001/history/${sesh.id}`);
                                             setSessions(sessions.filter((s) => s.id !== sesh.id));
                                             if (sessionId === sesh.id) {
                                                  setSessionId(sessions[0]?.id || '');
                                                  setMessages([]);
                                             }
                                        }}
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

                         <div className='bg-white rounded-lg shadow-md p-4 h-[70vh] overflow-y-auto space-y-4'>
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
                                             className={`max-w-[75%] p-3 rounded-xl relative text-sm ${
                                                  msg.role === 'user' ? 'bg-green-100 text-right' : 'bg-gray-200'
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
                                             <div className='text-gray-500 text-xs mt-1 text-right'>{msg.timestamp}</div>
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
                                        <div className='bg-gray-200 rounded-xl px-3 py-2 text-sm font-mono animate-pulse'>...</div>
                                   </div>
                              )}
                         </div>

                         <div className='flex mt-4'>
                              <input
                                   value={input}
                                   onChange={(e) => setInput(e.target.value)}
                                   onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                   placeholder='Type a message...'
                                   className='flex-grow px-4 py-2 rounded-l-md border border-gray-300 focus:outline-none'
                                   disabled={loading}
                              />
                              <button
                                   onClick={sendMessage}
                                   disabled={loading}
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
