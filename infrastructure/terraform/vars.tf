variable "hcloud_token" {
  type = string
  sensitive = true
}

variable "ssh_public_key" {
  type = string
}

variable "location" {}

variable "server_type" {}

variable "os_type" {}
