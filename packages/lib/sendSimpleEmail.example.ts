import { sendEmail } from "./sendSimpleEmail";

export async function exampleUsage() {
  try {
    await sendEmail("hey there, its peer from cal.com", "user@example.com");
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
