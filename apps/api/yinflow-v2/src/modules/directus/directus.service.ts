import { BadRequestException, Injectable } from "@nestjs/common";

const DIRECTUS_BASE_URL = "https://painel.yinflow.life/items";
const DIRECTUS_TOKEN = process.env.NEXT_PUBLIC_DIRECTUS_TOKEN || "";

@Injectable()
export class DirectusService {
  async getProProfessionals(calUserId: string): Promise<any> {
    try {
      const response = await fetch(
        `${DIRECTUS_BASE_URL}/pro_professionals?filter[cal_user_id][_eq]=${calUserId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${DIRECTUS_TOKEN}`,
          },
        }
      );

      return await response.json();
    } catch {
      throw new BadRequestException("Error fetching pro_professionals from Directus");
    }
  }

  async getProProfessionalsCompanies(proProfessionalId: string): Promise<any> {
    try {
      const response = await fetch(
        `${DIRECTUS_BASE_URL}/pro_professional_companies?filter[pro_professional_id][_eq]=${proProfessionalId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${DIRECTUS_TOKEN}`,
          },
        }
      );

      return await response.json();
    } catch {
      throw new BadRequestException("Error fetching pro_professional_companies from Directus");
    }
  }
}
