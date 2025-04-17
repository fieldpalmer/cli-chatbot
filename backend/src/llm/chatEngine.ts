import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import { SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { BufferMemory, ConversationSummaryMemory, CombinedMemory } from 'langchain/memory';
import { PrismaClient } from '@prisma/client';

// Create a singleton Prisma client instance
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
     globalForPrisma.prisma ||
     new PrismaClient({
          log: ['query', 'error', 'warn']
     });

if (process.env.NODE_ENV !== 'production') {
     globalForPrisma.prisma = prisma;
}

const sessionMemories = new Map<string, CombinedMemory>();

export const getResponse = async (input: string, sessionId: string, modelName = 'gpt-4'): Promise<string> => {
     // Ensure session exists
     const existingSession = await prisma.session.findUnique({ where: { id: sessionId } });
     if (!existingSession) {
          await prisma.session.create({
               data: {
                    id: sessionId,
                    name: sessionId.replace('session-', 'Chat ')
               }
          });
     }

     // Memory
     let memory = sessionMemories.get(sessionId);
     if (!memory) {
          const buffer = new BufferMemory({
               returnMessages: true,
               memoryKey: 'chat_history',
               inputKey: 'input'
          });

          const summary = new ConversationSummaryMemory({
               llm: new ChatOpenAI({ temperature: 0 }),
               memoryKey: 'summary',
               returnMessages: false,
               inputKey: 'input'
          });

          memory = new CombinedMemory({
               inputKey: 'input',
               memories: [buffer, summary]
          });

          sessionMemories.set(sessionId, memory);
     }

     // Prompt
     const prompt = ChatPromptTemplate.fromMessages([
          new SystemMessage(
               'You are a helpful assistant. Use the context below to inform your response.\n\nChat history:\n{chat_history}\n\nSummary:\n{summary}'
          ),
          HumanMessagePromptTemplate.fromTemplate('{input}')
     ]);

     const model = new ChatOpenAI({ modelName, temperature: 0.7 });
     const parser = new StringOutputParser();
     const chain = prompt.pipe(model).pipe(parser);

     const memoryVars = await memory.loadMemoryVariables({});
     const result = await chain.invoke({ input, ...memoryVars });
     await memory.saveContext({ input }, { output: result });

     // Save messages
     await prisma.message.create({
          data: {
               sessionId,
               role: 'user',
               content: input
          }
     });

     await prisma.message.create({
          data: {
               sessionId,
               role: 'bot',
               content: result
          }
     });

     return result;
};
