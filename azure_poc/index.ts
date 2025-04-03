import { AzureOpenAI } from "openai";
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from "@azure/identity";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/index";
import * as readline from "readline";
import * as dotenv from "dotenv";

dotenv.config();

const endpoint = process.env.AZURE_OPENAI_ENDPOINT!;
const apiVersion = process.env.OPENAI_API_VERSION || "2024-08-01-preview";
const deploymentName =
  process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-3.5-turbo";

const credential = new DefaultAzureCredential();
const scope = "https://cognitiveservices.azure.com/.default";
const azureADTokenProvider = getBearerTokenProvider(credential, scope);

// Initialize conversation history
const messages: ChatCompletionMessageParam[] = [
  { role: "system", content: "You are a helpful assistant." },
];

function getClient(): AzureOpenAI {
  return new AzureOpenAI({
    endpoint,
    azureADTokenProvider,
    apiVersion,
    deployment: deploymentName,
  });
}

function createMessages(): ChatCompletionCreateParamsNonStreaming {
  return {
    messages,
    model: "",
  };
}

async function printChoices(completion: ChatCompletion): Promise<void> {
  for (const choice of completion.choices) {
    messages.push(choice.message);
    console.log("\nAssistant:", choice.message.content);
  }
}

async function chatLoop() {
  const client = getClient();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\nChat started! Type 'exit' to end the conversation.\n");

  const askQuestion = () => {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      messages.push({ role: "user", content: input });

      try {
        const result = await client.chat.completions.create(createMessages());
        await printChoices(result);
        askQuestion();
      } catch (error) {
        console.error("Error:", error);
        askQuestion();
      }
    });
  };

  askQuestion();
}

export async function main() {
  try {
    await chatLoop();
  } catch (err) {
    console.error("An error occurred:", err);
  }
}

main().catch((err) => {
  console.error("UH OH!! An Error Occurred:", err);
});
