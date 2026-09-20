import { ZepClient } from "@getzep/zep-cloud";

const client = new ZepClient({ apiKey: "test" });

const threadMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(client.thread)).filter(p => !p.startsWith('__'));
const graphMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(client.graph)).filter(p => !p.startsWith('__'));
const contextMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(client.context)).filter(p => !p.startsWith('__'));

console.log("Métodos en client.thread:", threadMethods);
console.log("Métodos en client.graph:", graphMethods);
console.log("Métodos en client.context:", contextMethods);