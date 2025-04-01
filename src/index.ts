import 'dotenv/config';
import readline from 'readline';

console.log('Hello world!');
console.log(process.env.OPENAI_API_KEY);

const rl = readline.createInterface({
     input: process.stdin,
     output: process.stdout
});

const chat = () => {
     rl.question('Enter a command (type "exit" to quit): ', (input) => {
          if (input.toLowerCase() === 'exit') {
               console.log('Goodbye!');
               rl.close();
          } else {
               console.log(`You entered: ${input}`);
               chat();
          }
     });
};

console.log('Welcome to the CLI App!');

chat();
