import { type Container, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { SlackAbuseAlerter } from "../lib/alerts";
import { ABUSE_SCORING_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = ABUSE_SCORING_DI_TOKENS.ALERTER;
const moduleToken = ABUSE_SCORING_DI_TOKENS.ALERTER_MODULE;

thisModule.bind(token).toFactory(() => new SlackAbuseAlerter(process.env.SLACK_ABUSE_WEBHOOK_URL), "singleton");

const loadModule = (container: Container) => {
  container.load(moduleToken, thisModule);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
