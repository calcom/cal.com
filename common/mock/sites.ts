const availableSites = [
  "6_pac_sumauma",
  "5_pac_via_norte",
  "1_pac_alvorada",
  "2_pac_sao_jose",
  "3_pac_galeria_dos_remedios",
  "9_pac_p10",
  "7_pac_educandos",
  "8_pac_compensa",
  "4_pac_leste",
  "10_pac_iranduba",
  "12_pac_parintins",
  "13_pac_itacoatiara",
  "11_pac_manacapuru",
  "14_paac_posto_avancado_atendimento_cidadania",
] as const;

export type TSite = typeof availableSites[number];

export const sitesTranslation: Record<TSite, string> = {
  "6_pac_sumauma": "PAC Sumaúma",
  "5_pac_via_norte": "PAC Via Norte",
  "1_pac_alvorada": "PAC Alvorada",
  "2_pac_sao_jose": "PAC São José",
  "3_pac_galeria_dos_remedios": "PAC Galeria dos Remédios",
  "9_pac_p10": "PAC Parque 10",
  "7_pac_educandos": "PAC Educandos",
  "8_pac_compensa": "PAC Compensa",
  "4_pac_leste": "PAC Leste",
  "10_pac_iranduba": "PAC Iranduba",
  "12_pac_parintins": "PAC Parintins",
  "13_pac_itacoatiara": "PAC Itacoatiara",
  "11_pac_manacapuru": "PAC Manacapuru",
  "14_paac_posto_avancado_atendimento_cidadania": "PAAC Posto Avançado Atendimento Cidadania",
};
