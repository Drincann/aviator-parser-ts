import { AviatorLexer, TokenType } from './src';

const code = "string.endsWith('hello', 'lo')";
console.log("=== Tokenizing:", code, "===");
const lexer = new AviatorLexer(code);
let token;
while ((token = lexer.next()).type !== TokenType.EOF) {
    console.log(token);
}
console.log("=== Done ===");

