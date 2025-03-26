variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region where resources will be created"
  type        = string
  default     = "eastus"
}

variable "storage_account_name" {
  description = "Name of the storage account"
  type        = string
}

variable "container_name" {
  description = "Name of the blob container"
  type        = string
  default     = "documents"
}

variable "openai_account_name" {
  description = "Name of the Azure OpenAI service account"
  type        = string
}

variable "search_service_name" {
  description = "Name of the Azure AI Search service"
  type        = string
} 