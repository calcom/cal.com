import { RenderComponentWithSnippet } from "@/app/components/render";

import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";

export const ButtonGroupExample = () => {
  return (
    <RenderComponentWithSnippet className="flex flex-col space-y-6">
      {/* Basic Button Group */}
      <ButtonGroup>
        <Button variant="icon" StartIcon="ellipsis" color="secondary" />
        <Button variant="icon" StartIcon="ellipsis" color="secondary" />
        <Button variant="icon" StartIcon="ellipsis" color="secondary" />
      </ButtonGroup>

      {/* Combined Button Group */}
      <ButtonGroup combined>
        <Button variant="icon" StartIcon="ellipsis" color="secondary" />
        <Button variant="icon" StartIcon="ellipsis" color="secondary" />
        <Button variant="icon" StartIcon="ellipsis" color="secondary" />
      </ButtonGroup>

      {/* Button Group with different variants */}
      <ButtonGroup combined>
        <Button variant="icon" color="secondary" StartIcon="ellipsis" />
        <Button variant="icon" color="secondary" StartIcon="ellipsis" />
        <Button variant="icon" color="destructive" StartIcon="trash" />
      </ButtonGroup>
    </RenderComponentWithSnippet>
  );
};

export const ButtonGroupSizes = () => {
  const sizes = ["xs", "sm", "base", "lg"] as const;

  return (
    <RenderComponentWithSnippet className="flex flex-col space-y-6">
      {sizes.map((size) => (
        <ButtonGroup key={size}>
          <Button variant="icon" color="secondary" StartIcon="ellipsis" size={size} />
          <Button variant="icon" color="secondary" StartIcon="ellipsis" size={size} />
          <Button variant="icon" color="secondary" StartIcon="ellipsis" size={size} />
        </ButtonGroup>
      ))}
    </RenderComponentWithSnippet>
  );
};

export const ButtonGroupSizesCombined = () => {
  const sizes = ["xs", "sm", "base", "lg"] as const;

  return (
    <RenderComponentWithSnippet className="flex flex-col space-y-6">
      {sizes.map((size) => (
        <ButtonGroup key={size} combined>
          <Button variant="icon" color="secondary" StartIcon="ellipsis" size={size} />
          <Button variant="icon" color="secondary" StartIcon="ellipsis" size={size} />
          <Button variant="icon" color="secondary" StartIcon="ellipsis" size={size} />
        </ButtonGroup>
      ))}
    </RenderComponentWithSnippet>
  );
};
