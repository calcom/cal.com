/* eslint-disable playwright/missing-playwright-await */
import { render, screen } from "@testing-library/react";

import { Button } from "../button";
import { Trash, Navigation, Clipboard } from "../icon";
import { ButtonGroup } from "./ButtonGroup";

describe("Tests for Buttton Group", () => {
  test("Should render the ButttonGroup Component", () => {
    render(
      <ButtonGroup
        containerProps={{
          className: "bg-red-100",
        }}>
        <Button StartIcon={Trash} variant="icon" color="secondary" />
        <Button StartIcon={Navigation} variant="icon" color="secondary" />
        <Button StartIcon={Clipboard} variant="icon" color="secondary" />
      </ButtonGroup>
    );
    expect(screen.getByTestId("button-group")).toBeInTheDocument();
  });
});
