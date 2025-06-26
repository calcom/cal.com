import { plainTextTemplate as plainTextEmailRatingTemplate } from "./emailRatingTemplate";
import { plainTextTemplate as plainTextEmailReminderTemplate } from "./emailReminderTemplate";
import { plainTextTemplate as plainTextSMSReminderTemplate } from "./smsReminderTemplate";
import { plainTextTemplate as plainTextWhatsappCanceledTemplate } from "./whatsapp/whatsappEventCancelledTemplate";
import { plainTextTemplate as plainTextWhatsappCompletedTemplate } from "./whatsapp/whatsappEventCompletedTemplate";
import { plainTextTemplate as plainTextWhatsappReminderTemplate } from "./whatsapp/whatsappEventReminderTemplate";
import { plainTextTemplate as plainTextWhatsappRescheduledTemplate } from "./whatsapp/whatsappEventRescheduledTemplate";

const plainTextTemplates = {
  email: {
    reminder: plainTextEmailReminderTemplate,
    rating: plainTextEmailRatingTemplate,
  },
  sms: {
    reminder: plainTextSMSReminderTemplate,
  },
  whatsapp: {
    reminder: plainTextWhatsappReminderTemplate,
    rescheduled: plainTextWhatsappRescheduledTemplate,
    completed: plainTextWhatsappCompletedTemplate,
    canceled: plainTextWhatsappCanceledTemplate,
  },
};

export default plainTextTemplates;
