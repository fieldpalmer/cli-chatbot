import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const API_URL = 'http://localhost:3001/chat';
const SESSION_ID = 'web-session-1';

type Message = {
     role: 'user' | 'bot';
     content: string;
     timestamp: string;
};

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const App: React.FC = () => {
     const [input, setInput] = useState('');
     const [messages, setMessages] = useState<Message[]>([]);
     const [loading, setLoading] = useState(false);

     const sendMessage = async () => {
          if (!input.trim()) return;

          const userMessage: Message = {
               role: 'user' as const,
               content: input,
               timestamp: formatTime(new Date())
          };

          setMessages((prev) => [...prev, userMessage]);
          setLoading(true);

          try {
               const res = await axios.post(API_URL, {
                    message: input,
                    sessionId: SESSION_ID
               });

               const botMessage: Message = {
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
          <div className='min-h-screen bg-gray-100 p-6 flex flex-col items-center font-sans'>
               <div className='w-full max-w-2xl'>
                    <h1 className='text-2xl font-bold text-center mb-4'>🧠 LangChain Chatbot</h1>
                    <div className='bg-white rounded-lg shadow-md p-4 h-[70vh] overflow-y-auto space-y-4'>
                         {messages.map((msg, i) => (
                              <div key={i} className={`flex items-end ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                   {msg.role === 'bot' && (
                                        <div className='w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mr-2 text-sm'>
                                             🤖
                                        </div>
                                   )}
                                   <div
                                        className={`max-w-[75%] p-3 rounded-xl relative text-sm
                ${msg.role === 'user' ? 'bg-green-100 text-right' : 'bg-gray-200'}
              `}
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
     );
};

export default App;
