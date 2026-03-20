import { AttributesAtomsService } from "@/modules/atoms/services/attributes-atom.service";
import { ConferencingAtomsService } from "@/modules/atoms/services/conferencing-atom.service";
import { ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

import { AtomsController } from "./atoms.controller";

describe("AtomsController", () => {
  let controller: AtomsController;
  let attributesService: { findTeamMembersMatchingAttribute: jest.Mock };

  const teamId = 10;
  const orgId = 100;
  const user = { id: 1 } as any;
  const query = {
    attributesQueryValue: "some-query",
    isPreview: false,
    enablePerf: false,
    concurrency: 1,
  };

  beforeEach(async () => {
    attributesService = { findTeamMembersMatchingAttribute: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [AtomsController],
      providers: [
        { provide: AttributesAtomsService, useValue: attributesService },
        { provide: ConferencingAtomsService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AtomsController>(AtomsController);
    jest.clearAllMocks();
  });

  it("should pass user.id to the attributes service", async () => {
    attributesService.findTeamMembersMatchingAttribute.mockResolvedValue({ result: null });

    await controller.findTeamMembersMatchingAttributes(user, teamId, orgId, query);

    expect(attributesService.findTeamMembersMatchingAttribute).toHaveBeenCalledWith(teamId, orgId, user.id, {
      attributesQueryValue: query.attributesQueryValue,
      isPreview: query.isPreview,
      enablePerf: query.enablePerf,
      concurrency: query.concurrency,
    });
  });

  it("should return SUCCESS_STATUS with service result data", async () => {
    const serviceResult = {
      mainWarnings: null,
      fallbackWarnings: null,
      troubleshooter: null,
      result: [{ id: 2, name: "User Two", email: "user2@test.com" }],
    };
    attributesService.findTeamMembersMatchingAttribute.mockResolvedValue(serviceResult);

    const response = await controller.findTeamMembersMatchingAttributes(user, teamId, orgId, query);

    expect(response).toEqual({
      status: SUCCESS_STATUS,
      data: serviceResult,
    });
  });

  it("should propagate ForbiddenException from service when user is not in org", async () => {
    attributesService.findTeamMembersMatchingAttribute.mockRejectedValue(
      new ForbiddenException("User is not a member of this organization.")
    );

    await expect(controller.findTeamMembersMatchingAttributes(user, teamId, orgId, query)).rejects.toThrow(
      ForbiddenException
    );
    await expect(controller.findTeamMembersMatchingAttributes(user, teamId, orgId, query)).rejects.toThrow(
      "User is not a member of this organization."
    );
  });

  it("should propagate ForbiddenException from service when user is not in team", async () => {
    attributesService.findTeamMembersMatchingAttribute.mockRejectedValue(
      new ForbiddenException("User is not a member of this team.")
    );

    await expect(controller.findTeamMembersMatchingAttributes(user, teamId, orgId, query)).rejects.toThrow(
      ForbiddenException
    );
    await expect(controller.findTeamMembersMatchingAttributes(user, teamId, orgId, query)).rejects.toThrow(
      "User is not a member of this team."
    );
  });

  it("should return SUCCESS_STATUS with null result when no members match", async () => {
    const serviceResult = {
      mainWarnings: [],
      fallbackWarnings: null,
      troubleshooter: null,
      result: null,
    };
    attributesService.findTeamMembersMatchingAttribute.mockResolvedValue(serviceResult);

    const response = await controller.findTeamMembersMatchingAttributes(user, teamId, orgId, query);

    expect(response).toEqual({
      status: SUCCESS_STATUS,
      data: serviceResult,
    });
  });
});
