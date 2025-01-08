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
  selectedClientName: PlatformOAuthClient["name"];
  handleChange: (value: PlatformOAuthClient) => void;
};

export const OAuthClientsDropdown = ({
  oauthClients,
  selectedClientName,
  handleChange,
}: OAuthClientsDropdownProps) => {
  return (
    <div>
      {Array.isArray(oauthClients) && oauthClients.length > 0 ? (
        <Dropdown modal={false}>
          <DropdownMenuTrigger asChild>
            <Button type="button" color="secondary" EndIcon="chevron-down">
              {selectedClientName}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {oauthClients.map((client) => {
              const isDisabled = selectedClientName === client.name;
              return (
                <DropdownMenuItem
                  key={client.id}
                  className={`outline-none ${isDisabled ? "cursor-not-allowed opacity-20" : ""}`}>
                  <DropdownItem type="button" onClick={() => !isDisabled && handleChange(client)}>
                    {client.name}
                  </DropdownItem>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </Dropdown>
      ) : null}
    </div>
  );
};
