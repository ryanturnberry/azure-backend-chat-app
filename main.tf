terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource Group
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

# Storage Account
resource "azurerm_storage_account" "storage" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# Blob Container
resource "azurerm_storage_container" "container" {
  name                  = var.container_name
  storage_account_name  = azurerm_storage_account.storage.name
  container_access_type = "private"
}

# Azure OpenAI Service
resource "azurerm_cognitive_account" "openai" {
  name                          = var.openai_account_name
  location                      = azurerm_resource_group.rg.location
  resource_group_name          = azurerm_resource_group.rg.name
  kind                         = "OpenAI"
  sku_name                     = "S0"
  custom_subdomain_name        = var.openai_account_name
  public_network_access_enabled = true

  identity {
    type = "SystemAssigned"
  }
}

# Azure OpenAI Deployment
resource "azurerm_cognitive_deployment" "gpt" {
  name                 = "gpt-3.5-turbo"
  cognitive_account_id = azurerm_cognitive_account.openai.id
  model {
    format  = "OpenAI"
    name    = "gpt-35-turbo"
    version = "0125"
  }

  scale {
    type = "Standard"
  }
}

# Azure AI Search Service
resource "azurerm_search_service" "search" {
  name                = var.search_service_name
  resource_group_name = azurerm_resource_group.rg.name
  location           = azurerm_resource_group.rg.location
  sku                = "standard"
  replica_count      = 1
  partition_count    = 1

  identity {
    type = "SystemAssigned"
  }
}

# Role assignments for Azure AI Search to access Blob Storage
resource "azurerm_role_assignment" "search_blob_contributor" {
  scope                = azurerm_storage_account.storage.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_search_service.search.identity[0].principal_id
}

# Role assignments for Azure OpenAI to access Azure AI Search
resource "azurerm_role_assignment" "openai_search_contributor" {
  scope                = azurerm_search_service.search.id
  role_definition_name = "Search Service Contributor"
  principal_id         = azurerm_cognitive_account.openai.identity[0].principal_id
}

# Add this role assignment for the OpenAI service
resource "azurerm_role_assignment" "openai_role" {
  scope                = azurerm_cognitive_account.openai.id
  role_definition_name = "Cognitive Services OpenAI User"  # or "Cognitive Services OpenAI Contributor" for more permissions
  principal_id         = azurerm_cognitive_account.openai.identity[0].principal_id
} 