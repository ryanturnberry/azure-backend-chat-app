import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import pdf from "pdf-parse";

dotenv.config();

// Azure Storage configuration
const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const storageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;

// Azure Search configuration
const searchServiceName = process.env.AZURE_SEARCH_SERVICE_NAME!;
const searchServiceKey = process.env.AZURE_SEARCH_SERVICE_KEY!;
const searchIndexName = "turnberry-documents";

console.log({
  storageAccountName,
  storageAccountKey,
  containerName,
  searchServiceName,
  searchServiceKey,
  searchIndexName,
});

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
    if (path.extname(filePath).toLowerCase() === ".pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);

      // Split PDF into pages and process each page
      const pages = pdfData.text.split(/\f/); // Form feed character typically separates PDF pages

      for (let i = 0; i < pages.length; i++) {
        const pageContent = pages[i].trim();
        if (pageContent) {
          // Skip empty pages
          const validId = `${blobName}_page_${i + 1}`.replace(
            /[^a-zA-Z0-9_\-=]/g,
            "_"
          );

          const document = {
            id: validId,
            content: pageContent,
            title: path.basename(filePath, path.extname(filePath)),
            section: "benefits_guide",
            page_number: i + 1,
            last_modified: new Date().toISOString(),
          };

          await searchClient.mergeOrUploadDocuments([document]);
          console.log(`Indexed page ${i + 1} of document: ${blobName}`);
        }
      }
    } else {
      // Handle non-PDF files as before
      const content = fs.readFileSync(filePath, "utf-8");
      const validId = blobName.replace(/[^a-zA-Z0-9_\-=]/g, "_");

      const document = {
        id: validId,
        content: content,
        title: path.basename(filePath, path.extname(filePath)),
        section: "default",
        page_number: 1,
        last_modified: new Date().toISOString(),
      };

      await searchClient.mergeOrUploadDocuments([document]);
      console.log(`Indexed document: ${blobName}`);
    }
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
