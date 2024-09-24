import { RoutingForm } from "routing-forms/types/types";

export function getAttributes() {
    return [{
        label: "Company Size",
        id: '792ca2a2-df5c-4554-9fc4-c4abd06d4de9',
        slug: "company-size",
        type: 'SINGLE_SELECT',
        options: [
            {
                title: "Enterprise",
                value: "enterprise-1000-employees",
            },
            {
                title: "Large",
                value: "large-500-employeess",
            },
            {
                title: "Medium",
                value: "medium-200-employees",
            },
            {
                title: "Small",
                value: "small-200-employees",
            },
        ],
    }]
}

export function getAttributesMappedWithTeamMembers() {
    const teamMembers = [
        {
            userId: 17,
            attributes: {
                '792ca2a2-df5c-4554-9fc4-c4abd06d4de9': "enterprise-1000-employees"
            }
        },
        {
            userId: 18,
            attributes: {
                '792ca2a2-df5c-4554-9fc4-c4abd06d4de9': "large-500-employeess"
            }
        }
    ]

    return teamMembers;
}