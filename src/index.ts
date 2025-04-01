import 'dotenv/config';
import readline from 'readline';

// console.log('Hello world!');
// console.log(process.env.OPENAI_API_KEY);

const rl = readline.createInterface({
     input: process.stdin,
     output: process.stdout
});

// const chat = () => {
//      rl.question('Enter a command (type "exit" to quit): ', (input) => {
//           if (input.toLowerCase() === 'exit') {
//                console.log('Goodbye!');
//                rl.close();
//           } else {
//                console.log(`You entered: ${input}`);
//                chat();
//           }
//      });
// };

// chat();

import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

const model = new ChatOpenAI();

const askModel = async (input: string) => {
     const prompt = ChatPromptTemplate.fromMessages([new SystemMessage("You're a helpful assistant"), new HumanMessage(input)]);

     const parser = new StringOutputParser();
     const chain = prompt.pipe(model).pipe(parser);

     return await chain.invoke(input);
};

const chat = () => {
     rl.question('Enter a command (type "exit" to quit): ', async (input) => {
          if (input.toLowerCase() === 'exit') {
               console.log('Goodbye!');
               rl.close();
          } else {
               const result = await askModel(input);

               console.log(result);

               chat();
          }
     });
};

console.log('Welcome to the CLI App!');

chat();
