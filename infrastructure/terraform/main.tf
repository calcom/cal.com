terraform {
  cloud {
    organization = "Starliner"
    workspaces {
      tags = ["csee"]
    }
  }

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.57"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

resource "hcloud_ssh_key" "default" {
  name       = "csee_hetzner_key"
  public_key = var.ssh_public_key
}

resource "hcloud_server" "csee_server" {
  name = "csee-server"
  image = var.os_type
  server_type = var.server_type
  location = var.location
  ssh_keys = [hcloud_ssh_key.default.id]
  keep_disk = true
  labels = {
    project = "csee"
  }
}

output "csee_server_ip" {
  value = hcloud_server.csee_server.ipv4_address
}
