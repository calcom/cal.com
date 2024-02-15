import { nodes, Tag } from '@markdoc/markdoc'

function generateID(children, attributes) {
  if (attributes.id && typeof attributes.id === 'string') {
    return attributes.id
  }
  return children
    .filter((child) => typeof child === 'string')
    .join(' ')
    .replace(/[?]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
}

const config = {
  tags: {
    borderedPanel: {
      render: 'BorderedPanel',
      children: ['paragraph'],
    },
    browser: {
      render: 'Browser',
      attributes: {
        baseUrl: { type: String },
        path: { type: String },
        shadow: { type: Boolean, default: false },
        bleed: { type: Boolean, default: true },
      },
    },
    button: {
      render: 'Button',
      children: ['paragraph'],
      attributes: {
        href: { type: String },
        size: {
          type: String,
          default: 'base',
          matches: ['sm', 'smb', 'base', 'lg'],
        },
        type: {
          type: String,
          default: 'default',
          matches: ['default', 'info', 'success', 'error', 'warning'],
        },
        variant: {
          type: String,
          default: 'default',
          matches: ['default', 'pill', 'secondary', 'ghost', 'link'],
        },
      },
    },
    code: {
      render: 'Code',
      attributes: {},
      transform(node, config) {
        const attributes = node.transformAttributes(config)
        const { content, language } = node.children[0].attributes
        return new Tag(this.render, { ...attributes, language }, [content])
      },
    },
    collapse: {
      render: 'Collapse',
      children: ['paragraph', 'tag', 'list'],
      attributes: {
        title: { type: String },
      },
    },
    cta: {
      render: 'CTA',
      attributes: {
        label: { type: String },
        href: { type: String },
      },
    },
    div: {
      render: 'Div',
      children: ['paragraph', 'tag', 'list'],
      attributes: {
        className: { type: String },
      },
    },
    ghbadge: {
      render: 'GitHubBadge',
      attributes: {
        priority: {
          type: String,
          default: 'low',
          matches: ['low', 'medium', 'high', 'urgent'],
        },
      },
    },
    httpapidoc: {
      render: 'HTTPAPIDoc',
      description: 'An HTTP API Doc card',
      attributes: {
        baseUrl: { type: String },
        path: { type: String },
        method: {
          type: String,
          default: 'GET',
          matches: [
            'GET',
            'HEAD',
            'POST',
            'PUT',
            'DELETE',
            'CONNECT',
            'OPTIONS',
            'TRACE',
            'PATCH',
          ],
        },
        description: { type: String },
        parameters: { type: Array },
        responses: { type: Object },
      },
    },
    iframe: {
      render: 'IFrame',
      attributes: {
        src: { type: String },
        className: { type: String },
      },
    },
    img: {
      render: 'Image',
      attributes: {
        src: { type: String },
        alt: { type: String },
        legend: { type: String },
        bleed: { type: Boolean, default: true },
        bordered: { type: Boolean, default: true },
        className: { type: String },
      },
    },
    keys: {
      render: 'Keys',
      attributes: {
        bleed: { type: Boolean },
        cmd: { type: Boolean },
        shift: { type: Boolean },
        alt: { type: Boolean },
        hatCtrl: { type: Boolean },
        plain: { type: Boolean },
        small: { type: Boolean },
        dark: { type: Boolean },
        chars: { type: String },
        char: { type: String },
        backslash: { type: Boolean },
      },
    },
    link: {
      render: 'Link',
      children: ['paragraph', 'tag', 'list'],
      attributes: {
        href: { type: String },
        target: { type: String },
        referrer: { type: String },
      },
    },
    loom: {
      render: 'Loom',
      attributes: {
        src: { type: String },
        legend: { type: String },
      },
    },
    note: {
      render: 'Note',
      children: ['paragraph', 'tag', 'list'],
      attributes: {
        type: {
          type: String,
          default: 'info',
          matches: ['info', 'warning'],
        },
      },
    },
    label: {
      render: 'Label',
      attributes: {
        type: {
          type: String,
          default: 'free',
          matches: ['free', 'free-cloud', 'paid'],
        },
      },
    },
    openapidoc: {
      render: 'OpenAPIDoc',
      description: 'An Open API Doc card',
      attributes: {
        url: { type: String },
        path: { type: String },
        method: {
          type: String,
          default: 'GET',
          matches: [
            'GET',
            'HEAD',
            'POST',
            'PUT',
            'DELETE',
            'CONNECT',
            'OPTIONS',
            'TRACE',
            'PATCH',
          ],
        },
      },
    },
    pageLink: {
      render: 'PageLink',
      children: ['paragraph', 'tag', 'list'],
      attributes: {
        href: { type: String },
        iconUrl: { type: String },
        heading: { type: String },
      },
    },
    samplefiletree: {
      render: 'SampleFileTree',
      attributes: {
        sample: {
          type: String,
          default: 'markdoc',
          matches: ['markdoc', 'project-structure', 'templates', 'local'],
        },
        wrapped: { type: Boolean, default: true },
        bleed: { type: Boolean, default: true },
      },
    },
    spacer: {
      render: 'Spacer',
      attributes: {
        size: {
          type: String,
          default: 'base',
          matches: ['xs', 'sm', 'base', 'md', 'lg', 'xl'],
        },
      },
    },
    tab: {
      render: 'Tab',
      children: ['paragraph', 'tag', 'list'],
      attributes: {
        title: { type: String },
        className: { type: String },
      },
    },
    tabs: {
      render: 'Tabs',
      children: ['paragraph', 'tag', 'list'],
    },
    threecolsstickyright: {
      render: 'ThreeColsStickyRight',
      children: ['paragraph', 'tag', 'list'],
    },
    twocols: {
      render: 'TwoOfThreeCols',
      children: ['paragraph', 'tag', 'list'],
    },
    video: {
      render: 'Video',
      attributes: {
        src: { type: String },
        title: { type: String },
        bleed: { type: Boolean },
      },
    },
    wrappedimg: {
      render: 'WrappedImage',
      attributes: {
        src: { type: String },
        alt: { type: String },
        legend: { type: String },
        bleed: { type: Boolean, default: true },
        bordered: { type: Boolean, default: true },
        className: { type: String },
        background: {
          type: String,
          default: 'neutral',
          matches: ['neutral', 'white', 'beige'],
        },
      },
    },
    youtube: {
      render: 'YouTube',
      attributes: { src: { type: String } },
    },
  },
  nodes: {
    fence: {
      render: 'Fence',
      attributes: nodes.fence.attributes,
    },
    heading: {
      children: ['inline'],
      attributes: {
        id: { type: String },
        level: { type: Number, required: true, default: 1 },
      },
      transform(node, config) {
        const attributes = node.transformAttributes(config)
        const children = node.transformChildren(config)
        const id = generateID(children, attributes)
        return new Tag(
          `h${node.attributes['level']}`,
          { ...attributes, id },
          children
        )
      },
    },
  },
  variables: {
    urls: {
      contactEmail: 'mailto:contact@cal.com',
    },
    loremIpsum:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
}

export default config
