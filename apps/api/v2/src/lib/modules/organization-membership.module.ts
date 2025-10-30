import { OrganizationMembershipService } from "@/lib/services/organization-membership.service";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

@Module({
    imports: [PrismaModule, StripeModule],
    providers: [OrganizationsRepository, OrganizationMembershipService],
    exports: [OrganizationMembershipService],
})
export class OrganizationMembershipModule { }
