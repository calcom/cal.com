import { User } from "@prisma/client";

import services from "./services";

export const createConsoleUser = ({ name, email }: { name: string; email: string }) => {
  Promise.all(
    services.map((instance) => {
      if (instance.console.user.upsert) {
        instance.console.user.upsert({
          name,
          email,
          plan: "SELFHOSTED",
        });
      } else {
        instance.console.user.create({
          name,
          email,
          plan: "SELFHOSTED",
        });
      }
    })
  );
};

export const createWebUser = (user: User) => {
  Promise.all(
    services.map((instance) => {
      if (instance.web.user.upsert) {
        instance.web.user.upsert(user);
      } else {
        instance.web.user.create(user);
      }
    })
  );
};

export const updateWebUser = (user: User) => {
  Promise.all(
    services.map((instance) => {
      if (instance.web.user.upsert) {
        instance.web.user.upsert(user);
      } else {
        instance.web.user.update(user);
      }
    })
  );
};
