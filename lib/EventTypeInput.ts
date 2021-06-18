
export enum EventTypeCustomInputType {
    Text = 'text',
    TextLong = 'textLong',
    Number = 'number',
}

export interface EventTypeCustomInput {
    id?: number;
    type: EventTypeCustomInputType;
    label: string;
    required: boolean;
}

