import { UserRepository, SecondaryEmailRepository, TravelScheduleRepository, ScheduleRepository } from "@/repositories";
import { getEventTypesPublic } from "@calcom/lib/event-types/getEventTypesPublic";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import type { PaginationQuery } from "@/types";
import { ConflictError, ValidationError, NotFoundError } from "@/utils/error";
import bcrypt from "bcryptjs";

import { PrismaClient } from "@calcom/prisma";
import type { User, Prisma, UserPermissionRole } from "@calcom/prisma/client";

import { BaseService } from "../base.service";
import z from "zod";
import zodToJsonSchema from 'zod-to-json-schema';
import { UserPaginationQuery, UserResponse } from "@/schema/user.schema";
import { UserResponse } from "@/schema/user.schema";
import { getDefaultScheduleId } from "@calcom/trpc/server/routers/viewer/availability/util";
import { uploadAvatar, uploadHeader } from "@calcom/lib/server/avatar";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import { validateBookerLayouts } from "@calcom/lib/validateBookerLayouts";
import { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries/teams";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { sendChangeOfEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billling-service";
import { getPremiumMonthlyPlanPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import slugify from "@calcom/lib/slugify";
import { checkUsername } from "@calcom/lib/server/checkUsername";

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
  role?: UserPermissionRole;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: UserPermissionRole;
  image?: string;
}



export class UserService extends BaseService {
  private userRepository: UserRepository;
  private secondaryEmailRepository: SecondaryEmailRepository;
  private travelScheduleRepository: TravelScheduleRepository;
  private scheduleRepository: ScheduleRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.userRepository = new UserRepository(prisma);
    this.secondaryEmailRepository = new SecondaryEmailRepository(prisma);
    this.travelScheduleRepository = new TravelScheduleRepository(prisma);
    this.scheduleRepository = new ScheduleRepository(prisma);
  }

  async createUser(input: CreateUserInput): Promise<UserResponse> {
    this.logOperation("createUser", { email: input.email, role: input.role });

    try {
      // Check if email already exists
      const emailExists = await this.userRepository.emailExists(input.email);
      if (emailExists) {
        throw new ConflictError("Email already exists");
      }

      // Validate password
      if (!input.password || input.password.length < 8) {
        throw new ValidationError("Password must be at least 8 characters long");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 12);

      const userData: Prisma.UserCreateInput = {
        email: input.email.toLowerCase().trim(),
        name: input.name?.trim(),
        role: input.role || "USER",
        // Note: password field is not included in the repository create method
        // This might need to be handled differently based on your User model schema
      };

      const user = await this.userRepository.create(userData);
      return this.mapUserToResponse(user);
    } catch (error) {
      this.logError("createUser", error);
      throw error;
    }
  }

  async getUserById(id: number): Promise<UserResponse> {
    this.logOperation("getUserById", { id });

    try {
      const user = await this.userRepository.findByIdOrThrow(id);
      return this.mapUserToResponse(user);
    } catch (error) {
      this.logError("getUserById", error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<UserResponse | null> {
    this.logOperation("getUserByEmail", { email });

    try {
      const user = await this.userRepository.findByEmail(email.toLowerCase());
      return user ? this.mapUserToResponse(user) : null;
    } catch (error) {
      this.logError("getUserByEmail", error);
      throw error;
    }
  }


  async getUserEventsByUsernameString(usernameString: string) {
    this.logOperation("getUsersByUsernameString", { usernameString });

    try {
      const usernameList = getUsernameList(usernameString);

      const usersInOrgContext = await this.getUsersInOrgContext(
        usernameList,
        null
      );
      return usersInOrgContext;
    } catch (error) {
      this.logError("getUsersByUsernameString", error);
      throw error;
    }
  }

  async getUsersInOrgContext(usernameList: string[], orgSlug: string | null) {
    const usersInOrgContext = await this.userRepository.findUsersByUsername({
      usernameList,
      orgSlug,
    });

    if (usersInOrgContext.length) {
      return usersInOrgContext;
    }

    // note(Lauris): platform members (people who run platform) are part of platform organization while
    // the platform organization does not have a domain. In this case there is no org domain but also platform member
    // "User.organization" is not null so "UserRepository.findUsersByUsername" returns empty array and we do this as a last resort
    // call to find platform member.
    return await this.userRepository.findPlatformMembersByUsernames({
      usernameList,
    });
  }




  async getUsers(filters: Prisma.UserWhereInput = {}, pagination: UserPaginationQuery = {}) {
    this.logOperation("getUsers", { filters, pagination });

    try {
      const result = await this.userRepository.findMany(filters, pagination);

      return {
        data: result.data.map((user: any) => this.mapUserToResponse(user)),
        pagination: result.pagination,
      };
    } catch (error) {
      this.logError("getUsers", error);
      throw error;
    }
  }

  async updateUser(id: number, input: UpdateUserInput): Promise<UserResponse> {
    this.logOperation("updateUser", { id, ...input });

    try {
      // Check if user exists
      await this.userRepository.findByIdOrThrow(id);

      // Check if email is being changed and if it's already taken
      if (input.email) {
        const emailExists = await this.userRepository.emailExists(input.email.toLowerCase(), id.toString());
        if (emailExists) {
          throw new ConflictError("Email already exists");
        }
      }

      const updateData: Prisma.UserUpdateInput = {
        ...input,
        email: input.email?.toLowerCase().trim(),
        name: input.name?.trim(),
      };

      const user = await this.userRepository.update(id, updateData);
      return this.mapUserToResponse(user);
    } catch (error) {
      this.logError("updateUser", error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    this.logOperation("deleteUser", { id });

    try {
      // Check if user exists
      await this.userRepository.findByIdOrThrow(id);

      await this.userRepository.delete(id);
    } catch (error) {
      this.logError("deleteUser", error);
      throw error;
    }
  }



  async userExists(id: number): Promise<boolean> {
    try {
      return await this.userRepository.exists(id);
    } catch (error) {
      this.logError("userExists", error);
      throw error;
    }
  }

  private mapUserToResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdDate,
    };
  }

  async updateProfile(userId: number, input: any) {
    // Fetch current user with minimal required fields
    const currentUser = await this.userRepository.findById(userId);
    // augment with teams when needed
    const teams = await this.prisma.team.findMany({ where: { members: { some: { id: userId } } }, select: { id: true } });
    const currentUserWithTeams: any = currentUser ? { ...currentUser, teams } : null;

    if (!currentUserWithTeams) {
      throw new NotFoundError("User");
    }

    // Username validation
    let isPremiumUsername = false;
    if (input.username && !(currentUserWithTeams.metadata as any)?.organizationId) {
      const username = slugify(input.username);
      if (username !== currentUserWithTeams.username) {
        const response = await checkUsername(username);
        isPremiumUsername = response.premium;
        if (!response.available) {
          throw new ValidationError("Username already taken");
        }
        input.username = username;
      }
    }

    // Premium username enforcement
    if (isPremiumUsername) {
      const stripeCustomerId = (currentUserWithTeams.metadata as any)?.stripeCustomerId;
      const isPremium = (currentUserWithTeams.metadata as any)?.isPremium;
      if (!isPremium || !stripeCustomerId) {
        throw new ValidationError("User is not premium");
      }

      const billingService = new StripeBillingService();
      const stripeSubscriptions = await billingService.getSubscriptions(stripeCustomerId);
      if (!stripeSubscriptions || !stripeSubscriptions.length) {
        throw new Error("No stripe subscription found");
      }

      const isPremiumUsernameSubscriptionActive = stripeSubscriptions.some(
        (subscription) =>
          subscription.items.data[0].price.id === getPremiumMonthlyPlanPriceId() &&
          subscription.status === "active"
      );
      if (!isPremiumUsernameSubscriptionActive) {
        throw new ValidationError("You need to pay for premium username");
      }
    }

    // Build update data
    const { travelSchedules, secondaryEmails, ...updateData } = input;
    const data: Prisma.UserUpdateInput = {
      ...updateData,
      metadata: input.metadata ? { ...(currentUserWithTeams.metadata as any), ...input.metadata } : currentUserWithTeams.metadata,
    };

    // Header upload
    if (input.metadata?.headerUrl &&
      (input.metadata.headerUrl.startsWith("data:image/png;base64,") ||
        input.metadata.headerUrl.startsWith("data:image/jpeg;base64,") ||
        input.metadata.headerUrl.startsWith("data:image/jpg;base64,"))) {
      const headerUrl = await resizeBase64Image(input.metadata.headerUrl, { maxSize: 1500 });
      data.metadata = {
        ...(data.metadata as any),
        headerUrl: await uploadHeader({ banner: headerUrl, userId }),
      } as any;
    } else if (input.metadata?.headerUrl === null) {
      data.metadata = {
        ...(data.metadata as any),
        headerUrl: null,
      } as any;
    }

    // Avatar upload
    if (
      input.avatarUrl &&
      (input.avatarUrl.startsWith("data:image/png;base64,") ||
        input.avatarUrl.startsWith("data:image/jpeg;base64,") ||
        input.avatarUrl.startsWith("data:image/jpg;base64,"))
    ) {
      data.avatarUrl = await uploadAvatar({ avatar: await resizeBase64Image(input.avatarUrl), userId });
    }

    // Booker layouts validation
    if (input.metadata?.defaultBookerLayouts) {
      const layoutError = validateBookerLayouts(input.metadata.defaultBookerLayouts);
      if (layoutError) {
        throw new ValidationError(layoutError);
      }
    }

    // Completed onboarding
    if (input.completedOnboarding && currentUserWithTeams.teams && currentUserWithTeams.teams.length > 0) {
      await Promise.all(
        currentUserWithTeams.teams.map(async (team: { id: number }) => {
          try {
            await updateNewTeamMemberEventTypes(userId, team.id);
          } catch (error) {
            // swallow team update failures
          }
        })
      );
    }

    // Travel schedules
    if (input.travelSchedules) {
      const existingSchedules = await this.travelScheduleRepository.findManyByUser(userId);
      const schedulesToDelete = existingSchedules.filter(
        (schedule) => !input.travelSchedules!.find((scheduleInput: any) => scheduleInput.id === schedule.id)
      );
      if (schedulesToDelete.length > 0) {
        await this.travelScheduleRepository.deleteManyByIdsForUser(schedulesToDelete.map((s) => s.id), userId);
      }
      const newSchedules = input.travelSchedules
        .filter((schedule: any) => !schedule.id)
        .map((schedule: any) => ({
          userId,
          startDate: new Date(schedule.startDate),
          endDate: schedule.endDate ? new Date(schedule.endDate) : null,
          timeZone: schedule.timeZone,
        }));
      await this.travelScheduleRepository.createMany(newSchedules as any);
    }

    // Email change handling
    const hasEmailBeenChanged = input.email && currentUserWithTeams.email !== input.email;
    let secondaryEmail: { id: number; emailVerified: Date | null } | null = null;
    let sendEmailVerification = false;

    if (hasEmailBeenChanged) {
      const featuresRepository = new FeaturesRepository();
      const emailVerification = await featuresRepository.checkIfFeatureIsEnabledGlobally("email-verification");
      if (emailVerification) {
        secondaryEmail = await this.secondaryEmailRepository.findUniqueByEmailAndUser(input.email, userId);
        if (secondaryEmail?.emailVerified) {
          (data as any).emailVerified = secondaryEmail.emailVerified;
          if (!input.secondaryEmails) input.secondaryEmails = [];
          input.secondaryEmails.push({ id: secondaryEmail.id, email: currentUserWithTeams.email, isDeleted: false });
        } else {
          data.metadata = {
            ...(data.metadata as any),
            emailChangeWaitingForVerification: input.email!.toLowerCase(),
          } as any;
          delete (data as any).email;
          sendEmailVerification = true;
        }
      } else {
        (data as any).emailVerified = null;
      }
    }

    // Secondary emails
    if (input.secondaryEmails) {
      const recordsToDelete = input.secondaryEmails
        .filter((secondaryEmail: any) => secondaryEmail.isDeleted)
        .map((secondaryEmail: any) => secondaryEmail.id);
      if (recordsToDelete.length > 0) {
        await this.secondaryEmailRepository.deleteManyByIdsForUser(recordsToDelete, userId);
      }
      const modifiedRecords = input.secondaryEmails.filter((secondaryEmail: any) => !secondaryEmail.isDeleted);
      if (modifiedRecords.length > 0) {
        const secondaryEmailsFromDB = await this.secondaryEmailRepository.findManyByIdsForUser(
          input.secondaryEmails.map((se: any) => se.id),
          userId
        );
        const recordsToModifyQueue = modifiedRecords.map((updated: any) => {
          const existingRecord = secondaryEmailsFromDB.find((se) => se.id === updated.id);
          let emailVerified = existingRecord?.emailVerified || null;
          if (secondaryEmail?.id === updated.id) {
            emailVerified = currentUserWithTeams.emailVerified;
          } else if (updated.email !== existingRecord?.email) {
            emailVerified = null;
          }
          return this.secondaryEmailRepository.update(updated.id, userId, { email: updated.email, emailVerified });
        });
        await (this.prisma as any).$transaction(recordsToModifyQueue);
      }
    }

    // Update user
    const updatedUser = await this.userRepository.update(userId, data);

    // Timezone change for schedules
    if (input.timeZone && input.timeZone !== currentUserWithTeams.timeZone) {
      const schedules = await this.scheduleRepository.findByUserId(userId);
      if (schedules && schedules.length > 0) {
        try {
          const defaultScheduleId = await getDefaultScheduleId(userId, this.prisma as any);
          if (!currentUserWithTeams.defaultScheduleId) {
            await this.userRepository.update(userId, { defaultScheduleId } as any);
          }
          await (this.prisma as any).schedule.updateMany({ where: { id: defaultScheduleId }, data: { timeZone: input.timeZone } });
        } catch (error) {
          // swallow schedule update errors
        }
      }
    }

    // Send email verification if needed
    if (hasEmailBeenChanged && sendEmailVerification) {
      try {
        await sendChangeOfEmailVerification({
          user: { username: currentUserWithTeams.username || "Nameless User", emailFrom: currentUserWithTeams.email, emailTo: input.email! },
        });
      } catch (error) {
        // swallow email errors
      }
    }

    // Stripe sync if needed
    if (updatedUser && updatedUser.metadata && hasKeyInMetadata(updatedUser as any, "stripeCustomerId")) {
      try {
        const stripeCustomerId = `${(updatedUser as any).metadata.stripeCustomerId}`;
        const billingService = new StripeBillingService();
        await billingService.updateCustomer({ customerId: stripeCustomerId, email: updatedUser.email, userId: updatedUser.id });
      } catch (error) {
        // swallow stripe errors
      }
    }

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      name: updatedUser.name,
      avatarUrl: updatedUser.avatarUrl,
      hasEmailBeenChanged: Boolean(hasEmailBeenChanged),
      sendEmailVerification: Boolean(sendEmailVerification),
    };
  }
}