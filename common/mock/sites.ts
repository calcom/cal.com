const availableSites = [
  "pac-sumauma",
  "pac-via-norte",
  "pac-alvorada",
  "pac-sao-jose",
  "pac-galeria-dos-remedios",
  "pac-p10",
  "pac-educandos",
  "pac-compensa",
  "pac-leste",
] as const;

export type TSite = typeof availableSites[number];

export const sitesTranslation: Record<TSite, string> = {
  "pac-sumauma": "PAC Sumaúma",
  "pac-via-norte": "PAC Via Norte",
  "pac-alvorada": "PAC Alvorada",
  "pac-sao-jose": "PAC São José",
  "pac-galeria-dos-remedios": "PAC Galeria dos Remédios",
  "pac-p10": "PAC Parque 10",
  "pac-educandos": "PAC Educandos",
  "pac-compensa": "PAC Compensa",
  "pac-leste": "PAC Leste",
};
