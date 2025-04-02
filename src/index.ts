import 'dotenv/config';
import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import { SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { BufferMemory, ConversationSummaryMemory, CombinedMemory } from 'langchain/memory';

// CLI setup
const rl = readline.createInterface({
     input: process.stdin,
     output: process.stdout
});

// 🔁 Dual memory: short-term + summarized
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

const memory = new CombinedMemory({
     inputKey: 'input',
     memories: [buffer, summary]
});

// 🧠 Prompt with memory variables
const prompt = ChatPromptTemplate.fromMessages([
     new SystemMessage(
          'You are a helpful assistant. Use the context below to inform your response.\n\nChat history:\n{chat_history}\n\nSummary:\n{summary}'
     ),
     HumanMessagePromptTemplate.fromTemplate('{input}')
]);

// Model & output
let model = new ChatOpenAI();
const parser = new StringOutputParser();
const chain = prompt.pipe(model).pipe(parser);

// Helpers
const resetMemory = async () => {
     await buffer.clear();
     await summary.clear();
};

const printSummary = async () => {
     const memoryVars = await memory.loadMemoryVariables({});
     console.log(chalk.magentaBright(`\n🧠 Current Summary:\n${memoryVars.summary || '(No summary yet)'}\n`));
};

const typewriter = async (text: string, delay = 20) => {
     for (const char of text) {
          process.stdout.write(char);
          await new Promise((res) => setTimeout(res, delay));
     }
     process.stdout.write('\n');
};

// 🧠 Chat loop
const chat = () => {
     rl.question(chalk.cyanBright('\n💬 You: '), async (inputRaw) => {
          const input = inputRaw.trim();

          if (!input) {
               console.log(chalk.yellow('⚠️ Please enter a valid message.'));
               return chat();
          }

          if (input.toLowerCase() === 'exit') {
               console.log(chalk.greenBright('\n👋 Goodbye!'));
               rl.close();
               return;
          }

          if (input.toLowerCase() === '/reset') {
               await resetMemory();
               console.log(chalk.magentaBright('\n🔄 Memory reset.'));
               return chat();
          }

          if (input.toLowerCase() === '/summary') {
               await printSummary();
               return chat();
          }

          const start = Date.now();

          console.log(chalk.gray('\n⏳ Thinking...'));

          try {
               const memoryVars = await memory.loadMemoryVariables({});

               if (memoryVars.chat_history?.length > 2000) {
                    console.warn(chalk.yellow('⚠️ Chat history too large — trimming or resetting is recommended.'));
               }

               const result = await chain.invoke({
                    input,
                    ...memoryVars
               });

               await memory.saveContext({ input }, { output: result });
               const elapsed = ((Date.now() - start) / 1000).toFixed(1);
               console.log(chalk.gray(`✅ AI response ready in ${elapsed}s\n`));

               console.log(chalk.greenBright(`🤖 Bot:`));
               await typewriter(chalk.whiteBright(result), 13);
          } catch (err: unknown) {
               const errorMessage = err instanceof Error ? err.message : String(err);
               console.error(chalk.redBright('💥 Error during chat:'), errorMessage);
          }

          chat();
     });
};

// 👋 Startup
console.log(chalk.magentaBright('🤖 Welcome to the CLI Chatbot with Hybrid Memory!'));
console.log(
     chalk.gray('Type ') +
          chalk.yellowBright('/reset') +
          chalk.gray(' to clear memory, ') +
          chalk.yellowBright('/summary') +
          chalk.gray(' to see a recap, or ') +
          chalk.yellowBright('exit') +
          chalk.gray(' to quit.')
);
chat();
