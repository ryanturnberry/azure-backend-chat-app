from PyPDF2 import PdfReader
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex, SimpleField, SearchableField, SearchFieldDataType, VectorSearch
)
from config import AZURE_SEARCH_SERVICE, AZURE_SEARCH_SERVICE_KEY, AZURE_SEARCH_INDEX_NAME

def split_pdf(file_path, chunk_size=1000):
    """Splits PDF into smaller text chunks."""
    reader = PdfReader(file_path)
    chunks = []
    
    for page in reader.pages:
        text = page.extract_text()
        for i in range(0, len(text), chunk_size):
            chunks.append(text[i:i + chunk_size])
    
    return chunks

def create_index():
    """Creates or updates an index with searchable fields."""
    index_client = SearchIndexClient(
        endpoint=f"https://{AZURE_SEARCH_SERVICE}.search.windows.net",  # Ensure the endpoint is fully qualified
        credential=AzureKeyCredential(AZURE_SEARCH_SERVICE_KEY)
    )

    # Define the fields for your index with the 'content' field as searchable
    fields = [
        SimpleField(name="id", type=SearchFieldDataType.String, key=True),
        SearchableField(name="content", type=SearchFieldDataType.String)
    ]
    
    # Create or update the index
    index = SearchIndex(name=AZURE_SEARCH_INDEX_NAME, fields=fields)
    index_client.create_or_update_index(index)

def index_pdf(file_path):
    """Indexes PDF chunks into Azure AI Search."""
    chunks = split_pdf(file_path)
    
    search_client = SearchClient(
        endpoint=f"https://{AZURE_SEARCH_SERVICE}.search.windows.net",
        index_name=AZURE_SEARCH_INDEX_NAME,
        credential=AzureKeyCredential(AZURE_SEARCH_SERVICE_KEY)
    )

    documents = [{"id": str(i), "content": chunk} for i, chunk in enumerate(chunks)]
    
    search_client.upload_documents(documents)
    print(f"Indexed {len(documents)} chunks.")
