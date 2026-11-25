import "server-only";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { getEnv } from "@/server/env";
import { logger, serializeError } from "@/server/logger";

export type EmailMessage = { to: string; subject: string; text: string; html: string };

let client: SESv2Client | null = null;
function ses() {
  // Credentials come from the default provider chain: the ECS task role in
  // AWS, or a local profile / env vars in development. Never from code.
  client ??= new SESv2Client({ region: getEnv().AWS_REGION });
  return client;
}

/** Test hook to inject a mocked client. */
export function __setSesClient(c: SESv2Client | null) {
  client = c;
}

/** Messages captured by the console transport (development/test inspection). */
export const consoleOutbox: EmailMessage[] = [];

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const env = getEnv();
  if (env.EMAIL_TRANSPORT === "console") {
    // Explicit development transport: nothing is sent, the message is printed
    // so links (verification, reset, invitations) can be opened locally.
    consoleOutbox.push(msg);
    if (consoleOutbox.length > 50) consoleOutbox.shift();
    if (env.NODE_ENV !== "test") {
      console.log(`\n[email:console] To: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n`);
    }
    return;
  }
  await ses().send(
    new SendEmailCommand({
      FromEmailAddress: env.SES_FROM_EMAIL,
      Destination: { ToAddresses: [msg.to] },
      ConfigurationSetName: env.SES_CONFIGURATION_SET,
      Content: {
        Simple: {
          Subject: { Data: msg.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: msg.text, Charset: "UTF-8" },
            Html: { Data: msg.html, Charset: "UTF-8" },
          },
        },
      },
    }),
  );
  logger.info("email.sent", { subject: msg.subject });
}

/** Fire-and-log variant for non-critical notifications. */
export async function sendEmailSafe(msg: EmailMessage) {
  try {
    await sendEmail(msg);
  } catch (err) {
    logger.error("email.send_failed", { subject: msg.subject, error: serializeError(err) });
  }
}
