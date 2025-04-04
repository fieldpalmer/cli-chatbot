import { rtdb } from '../firebase';
import { ref, push, set, onValue } from 'firebase/database';

export const getSessionMessages = (sessionId: string, callback: (messages: any[]) => void) => {
     const messagesRef = ref(rtdb, `sessions/${sessionId}/messages`);
     return onValue(messagesRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
               const messagesList = Object.values(data).sort((a: any, b: any) => a.timestamp - b.timestamp);
               callback(messagesList);
          } else {
               callback([]);
          }
     });
};

export const getAIResponse = async (message: string, sessionId: string): Promise<string> => {
     try {
          // Store user message
          const messagesRef = ref(rtdb, `sessions/${sessionId}/messages`);
          const newMessageRef = push(messagesRef);
          await set(newMessageRef, {
               role: 'user',
               content: message,
               timestamp: Date.now()
          });

          // For now, return a simple response
          // TODO: Integrate with actual AI service
          const response = 'This is a placeholder response. Replace with actual AI response.';

          // Store bot response
          const botMessageRef = push(messagesRef);
          await set(botMessageRef, {
               role: 'bot',
               content: response,
               timestamp: Date.now()
          });

          return response;
     } catch (error: unknown) {
          console.error('Error getting AI response:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          throw new Error(`Failed to get AI response: ${errorMessage}`);
     }
};
