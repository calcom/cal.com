export interface CanvasComponent {
  type: string;
  disabled?: boolean;
}

export interface InputComponent extends CanvasComponent {
  type: "input";
  id: string;
  label: string;
  placeholder: string;
  save_state: "unsaved" | "saved";
  action: {
    type: "submit";
  };
  aria_label: string;
}

interface ButtonComponent extends CanvasComponent {
  type: "button";
  id: string;
  label: string;
  style: "primary" | "secondary" | "link";
  action: {
    type: "submit" | "sheet" | "url";
    url?: string;
  };
}

export interface SpacerComponent extends CanvasComponent {
  type: "spacer";
  size: "s" | "m" | "l";
}

export interface TextComponent extends CanvasComponent {
  type: "text";
  text: string;
  style: "header" | "body" | "error" | "muted";
  align: "left" | "center" | "right";
}

export interface ListItem {
  id: string;
  type: "item";
  title: string;
  subtitle: string;
  rounded_image: boolean;
  disabled: boolean;
  action: {
    type: "submit";
  };
}

export interface ListComponent extends CanvasComponent {
  type: "list";
  items: ListItem[];
}

export interface CanvasContent {
  components: (InputComponent | SpacerComponent | TextComponent | ListComponent | ButtonComponent)[];
}

export interface NewCanvas {
  canvas: {
    content: CanvasContent;
  };
}
