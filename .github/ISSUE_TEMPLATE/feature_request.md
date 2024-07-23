name: Feature request
description: "Suggest an idea for this project \U0001F680"
title: ""
labels: ✨ feature
assignees: []
body:
  - type: textarea
    id: problem-description
    attributes:
      label: Is your feature request related to a problem? Please describe.
      description: A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]
    validations:
      required: true
  - type: textarea
    id: solution-description
    attributes:
      label: Describe the solution you'd like
      description: A clear and concise description of what you want to happen.
    validations:
      required: true
  - type: textarea
    id: alternate-solution-description
    attributes:
      label: Describe alternatives you've considered
      description: A clear and concise description of any alternative solutions or features you've considered.
    validations:
      required: false
  - type: textarea
    id: additional-context
    attributes:
      label: Additional context
      description: Add any other context or screenshots about the feature request here.
    validations:
      required: false
  - type: markdown
    id: cal-info
    attributes:
      value: |
        ### How we code at Cal.com

        - Follow Best Practices lined out in our [Contributor Docs](https://github.com/calcom/cal.com/blob/main/CONTRIBUTING.md)
