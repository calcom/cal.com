import type { PlatformOAuthClient } from "@calcom/prisma/client";
import {
  Button,
  Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
} from "@calcom/ui";

type OAuthClientsDropdownProps = {
  oauthClients: PlatformOAuthClient[];
  initialClientName: string;
  handleChange: (clientId: string, clientName: string) => void;
};

export const OAuthClientsDropdown = ({
  oauthClients,
  initialClientName,
  handleChange,
}: OAuthClientsDropdownProps) => {
  return (
    <div>
      {Array.isArray(oauthClients) && oauthClients.length > 0 ? (
        <Dropdown modal={false}>
          <DropdownMenuTrigger asChild>
            <Button color="secondary">{initialClientName}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {oauthClients.map((client) => {
              return (
                <div key={client.id}>
                  {initialClientName !== client.name ? (
                    <DropdownMenuItem className="outline-none">
                      <DropdownItem type="button" onClick={() => handleChange(client.id, client.name)}>
                        {client.name}
                      </DropdownItem>
                    </DropdownMenuItem>
                  ) : (
                    <></>
                  )}
                </div>
              );
            })}
          </DropdownMenuContent>
        </Dropdown>
      ) : null}
    </div>
  );
};
