import { render, screen } from "@testing-library/react";
import { SeparatorRowRenderer } from "./SeparatorRowRenderer";

describe("SeparatorRowRenderer", () => {
  it("renders separator content inside a table cell", () => {
    render(
      <table>
        <tbody>
          <tr>
            <SeparatorRowRenderer separator={{ type: "separator", label: "Today" }} />
          </tr>
        </tbody>
      </table>
    );

    const separatorCell = screen.getByText("Today").closest("td");

    expect(separatorCell).not.toBeNull();
    expect(separatorCell?.parentElement?.tagName).toBe("TR");
  });
});
