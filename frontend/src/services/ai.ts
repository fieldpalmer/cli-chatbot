import { functions } from '../firebase';

interface ChatResponse {
     reply: string;
}

export const getAIResponse = async (message: string, sessionId: string): Promise<string> => {
     try {
          const response = await fetch('https://us-central1-clichatbot.cloudfunctions.net/chat', {
               method: 'POST',
               headers: {
                    'Content-Type': 'application/json'
               },
               body: JSON.stringify({ message, sessionId })
          });

          if (!response.ok) {
               throw new Error(`Server error: ${response.status}`);
          }

          const data = (await response.json()) as ChatResponse;
          if (!data.reply) {
               throw new Error('No reply received from AI service');
          }
          return data.reply;
     } catch (error: unknown) {
          console.error('Error getting AI response:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          throw new Error(`Failed to get AI response: ${errorMessage}`);
     }
};
