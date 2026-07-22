import { buildNonDelegationCredentials } from "@calcom/lib/delegationCredential";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";  
import type { AppCategories } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

export class PrismaCredentialRepository {
    constructor(private readonly prismaClient: typeof prisma){}

    async findNonDelegationCredentialsByAppCategories({
        idToSearchObject,  
        appCategories,
    }: {
        idToSearchObject: Prisma.CredentialWhereInput;  
        appCategories: AppCategories[];  
    }){

        const credentials = await this.prismaClient.credential.findMany({
            where: {
                ...idToSearchObject,
                app: {
                    categories: {
                        hasSome: appCategories
                    }
                }
            },
            select: {
                ...credentialForCalendarServiceSelect,
                team: {
                    select: {
                        name: true
                    }
                }
            }
        })


        return buildNonDelegationCredentials(credentials)
    }
}