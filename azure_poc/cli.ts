import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

// Azure Storage configuration
const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const storageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;

// Azure Search configuration
const searchServiceName = process.env.AZURE_SEARCH_SERVICE_NAME!;
const searchServiceKey = process.env.AZURE_SEARCH_SERVICE_KEY!;
const searchIndexName = "turnberry-documents";

// Initialize Azure Storage client
const sharedKeyCredential = new StorageSharedKeyCredential(
  storageAccountName,
  storageAccountKey
);
const blobServiceClient = new BlobServiceClient(
  `https://${storageAccountName}.blob.core.windows.net`,
  sharedKeyCredential
);

// Initialize Azure Search client
const searchClient = new SearchClient(
  `https://${searchServiceName}.search.windows.net`,
  searchIndexName,
  new AzureKeyCredential(searchServiceKey)
);

async function uploadToBlob(filePath: string): Promise<string> {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const fileName = path.basename(filePath);
  const blobClient = containerClient.getBlobClient(fileName);
  const blockBlobClient = blobClient.getBlockBlobClient();

  // Upload file to blob storage
  await blockBlobClient.uploadFile(filePath);
  console.log(`Uploaded ${fileName} to blob storage`);
  return fileName;
}

async function indexDocument(filePath: string) {
  try {
    // Upload to blob storage first
    const blobName = await uploadToBlob(filePath);

    // Read file content
    const content = fs.readFileSync(filePath, "utf-8");

    // Create a valid ID by replacing invalid characters
    const validId = blobName.replace(/[^a-zA-Z0-9_\-=]/g, "_");

    // Create document matching your index schema
    const document = {
      id: validId,
      content: content,
      title: path.basename(filePath, path.extname(filePath)), // filename without extension
      section: "default", // you might want to make this configurable
      page_number: 1, // you might want to make this configurable
      last_modified: new Date().toISOString(),
    };

    // Index the document
    await searchClient.mergeOrUploadDocuments([document]);
    console.log(`Indexed document: ${blobName}`);
  } catch (error) {
    console.error("Error processing document:", error);
    throw error;
  }
}

async function main() {
  // Get file path from command line arguments
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("Please provide a file path as an argument");
    console.error("Usage: ts-node cli.ts <file-path>");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    await indexDocument(filePath);
    console.log("Document processing completed successfully");
  } catch (error) {
    console.error("Failed to process document:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("An error occurred:", err);
  process.exit(1);
});
