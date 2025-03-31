import os
from azure.storage.blob import BlobServiceClient
from config import BLOB_CONNECTION_STRING, CONTAINER_NAME

def upload_pdf(file_path: str) -> str:
    """Uploads a PDF to Azure Blob Storage and returns the blob name."""
    blob_service_client = BlobServiceClient.from_connection_string(BLOB_CONNECTION_STRING)
    container_client = blob_service_client.get_container_client(CONTAINER_NAME)

    blob_name = os.path.basename(file_path)
    
    with open(file_path, "rb") as pdf_file:
        container_client.upload_blob(name=blob_name, data=pdf_file, overwrite=True)
    
    print(f"Uploaded {blob_name} to Azure Blob Storage.")
    return blob_name