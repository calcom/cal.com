<!-- PROJECT LOGO -->
<div align="right">
  <a href="https://github.com/calcom/cal.com">
    <img src="https://user-images.githubusercontent.com/8019099/133430653-24422d2a-3c8d-4052-9ad6-0580597151ee.png" alt="Logo">
  </a>
  <a href="https://cal.com">Website</a>
  ·
  <a href="https://github.com/calcom/docs/issues">Community Support</a>
</div>

# Cal.com Documentation

The official product, support and developer documentation, containing information and guides about using the product as well as support for self-hosted installations. This documentation site runs on [Nextra](https://nextra.vercel.app), so you may refer to their documentation should you need information on anything that isn't covered here.

## Prerequisites

- Git
- Node.js & npm
- Yarn

## Installation

Firstly, clone the repository using Git:

```console
git clone https://github.com/calcom/docs.git
```

Now, you can install the dependencies with yarn:

```console
yarn install
```

## Editing

To create, edit and delete documentation pages, you can simply create markdown (.mdx) files in the `pages/` folder. You can edit Markdown with any text editor, but VS Code and WebStorm have side-by-side previews so you can see your formatted content whilst writing markdown.

You will also need to add it as an entry to the `meta.json` file found in whichever directory that the .mdx file is in.

## Local Development

```console
yarn dev
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```console
yarn build
```

This command generates static content into the `build` directory and can be served using any static content hosting service.

## How to easily contribute

## Existing Page

1. From the documentation's GitHub repository, head to the folder called 'pages' and open it.
2. From here you can view all current pages on the documentation site. Select the page you would like to contribute to.
3. You should now be able to view the page you have selected. Located at the top right of the page will be a pencil icon. Pressing this will bring you up an editor to edit and make changes. You can add formatting using the buttons at the top, which will automatically insert the relevant markdown content needed to style the text.
4. From here make the changes you wish to make.
5. At the bottom of the screen will be a 'Propose Changes' box, fill in all the relevant details such as title and description then press the green 'Propose Changes' button.
6. Your changes have been saved, to submit them for review, located on your screen, press the green 'Create Pull Request' button.
7. Fill in all the relevant details such as title and description and after finalize the submission.

You have now successfully edited and submitted changes to our documentation site.

## Creating a New Page

1. From the documentation's GitHub repository, head to the folder called 'pages' and open it.
2. From here you can view all current pages on the documentation site. At the top of your screen press the 'New file' button.
3. You should now be able to view the page you have created. Remember when renaming the document to put .mdx at the end of the file name.
4. From here make the changes you wish to make. Such as creating a title, sub-title and body text.
5. At the bottom of the screen will be a 'Propose Changes' box, fill in all the relevant details such as title and description then press the green 'Propose Changes' button.
6. Your changes have been saved, to submit them for review, located on your screen, press the greem 'Create Pull Request' button.
7. Fill in all the relevant details such as title and description and after finalize the submission.

You have now successfully created and submitted changes to our documentation site.
