import Joi from "@hapi/joi";

const eventTypeSchema: { [field: string]: Joi.ObjectSchema<any> } = {
  post: Joi.object({
    title: Joi.string().required(),
    slug: Joi.string().required(),
    price: Joi.number().optional(),
    customInputs: Joi.array().items(
      Joi.object({
        id: Joi.number().required(),
        eventTypeId: Joi.number().required(),
        label: Joi.string().required(),
        type: Joi.string().required(),
        required: Joi.boolean().required(),
        placeholder: Joi.string().required(),
      })
    ),
    minimumBookingNotice: Joi.number().optional(),
    length: Joi.number().optional(),
    team: Joi.number().optional(),
    description: Joi.string().optional().allow(""),
    hidden: Joi.boolean().optional(),
    requiresConfirmation: Joi.boolean().optional(),
    disableGuests: Joi.boolean().optional(),
    locations: Joi.array().optional().items(Joi.object().unknown()),
    eventName: Joi.string().optional().allow(""),
    periodType: Joi.string().optional(),
    periodDays: Joi.number().optional(),
    periodStartDate: Joi.string().optional(),
    periodEndDate: Joi.string().optional(),
    periodCountCalendarDays: Joi.boolean().optional(),
    currency: Joi.string().optional(),
    schedulingType: Joi.string().optional(),
    timeZone: Joi.string().optional(),
    availability: Joi.object()
      .optional()
      .keys({
        // TODO: What is this?? where used this??
        dateOverrides: Joi.array().optional().items(Joi.object().unknown()),
        openingHours: Joi.array()
          .required()
          .items(
            Joi.object().keys({
              id: Joi.number().optional(),
              label: Joi.string().optional().allow(null),
              userId: Joi.string().optional().allow(null),
              date: Joi.string().optional().allow(null),
              startDate: Joi.date().optional(),
              endDate: Joi.date().optional(),
              eventTypeId: Joi.number().optional(),
              days: Joi.array().required().items(Joi.number()),
              startTime: Joi.number().required(),
              endTime: Joi.number().required(),
            })
          ),
      }),
  }),
  patch: Joi.object({
    id: Joi.number().required(),
    title: Joi.string().optional(),
    slug: Joi.string().optional(),
    price: Joi.number().optional(),
    customInputs: Joi.array()
      .optional()
      .items(
        Joi.object({
          id: Joi.number().required(),
          eventTypeId: Joi.number().required(),
          label: Joi.string().required(),
          type: Joi.string().required(),
          required: Joi.boolean().required(),
          placeholder: Joi.string().allow(""),
        })
      ),
    minimumBookingNotice: Joi.number().optional(),
    length: Joi.number().optional(),
    team: Joi.number().optional(),
    description: Joi.string().optional().allow(""),
    hidden: Joi.boolean().optional(),
    requiresConfirmation: Joi.boolean().optional(),
    disableGuests: Joi.boolean().optional(),
    locations: Joi.array().optional().items(Joi.object().unknown()),
    eventName: Joi.string().optional().allow(""),
    periodType: Joi.string().optional(),
    periodDays: Joi.number().optional(),
    periodStartDate: Joi.string().optional(),
    periodEndDate: Joi.string().optional(),
    periodCountCalendarDays: Joi.boolean().optional(),
    currency: Joi.string().optional(),
    schedulingType: Joi.string().optional(),
    timeZone: Joi.string().optional(),

    availability: Joi.object()
      .optional()
      .keys({
        // TODO: What is this?? where used this??
        dateOverrides: Joi.array().optional().items(Joi.object().unknown()),
        openingHours: Joi.array()
          .required()
          .items(
            Joi.object().keys({
              id: Joi.number().optional(),
              label: Joi.string().optional().allow(null),
              userId: Joi.string().optional().allow(null),
              date: Joi.string().optional().allow(null),
              startDate: Joi.date().optional(),
              endDate: Joi.date().optional(),
              eventTypeId: Joi.number().optional(),
              days: Joi.array().required().items(Joi.number()),
              startTime: Joi.number().required(),
              endTime: Joi.number().required(),
            })
          ),
      }),
  }),

  delete: Joi.object({
    id: Joi.number().required(),
  }),
};

export default eventTypeSchema;
