import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";

import { UrlValidationService } from "../lib/service/UrlValidationService";
import { moduleLoader as hostValidationServiceModuleLoader } from "./HostValidationService.module";
import { URL_VALIDATION_TOKENS } from "./tokens";

const thisModule = createModule();
const token = URL_VALIDATION_TOKENS.URL_VALIDATION_SERVICE;
const moduleToken = URL_VALIDATION_TOKENS.URL_VALIDATION_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
    module: thisModule,
    moduleToken,
    token,
    classs: UrlValidationService,
    depsMap: {
        hostValidator: hostValidationServiceModuleLoader,
    },
});

export const moduleLoader = {
    token,
    loadModule,
};

export type { UrlValidationService };

