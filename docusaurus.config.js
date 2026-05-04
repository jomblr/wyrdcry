// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** Must match `baseUrl` below (used in head script for `html.wyrd-homepage` before paint). */
const baseUrl = '/';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Wyrdcry',
  favicon: 'img/favicon.png',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://your-docusaurus-site.example.com',
  baseUrl,

  organizationName: 'wyrdcry',
  projectName: 'wyrdcry',

  onBrokenLinks: 'throw',
  // Wiki tables set ids via React; some MD links target those hashes.
  onBrokenAnchors: 'ignore',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  /**
   * Landing page: `html.wyrd-homepage` toggles transparent navbar (see `src/theme/Root.tsx` too).
   * Inline script runs before paint; must respect `baseUrl` (not only `/`).
   */
  headTags: [
    {
      tagName: 'script',
      attributes: {},
      innerHTML: `(function(){try{var b=${JSON.stringify(baseUrl)};function n(s){if(!s)return '/';s=s.replace(/(?:\\/index)?\\.html$/,'')||'/';return s.length>1&&s.endsWith('/')?s.slice(0,-1):s;}var p=n(window.location.pathname||'/'),bn=n(b);var home=(bn==='/'&&(p==='/'||p===''))||(bn!=='/'&&p===bn);var el=document.documentElement;if(home)el.dataset.wyrdPage='home';else delete el.dataset.wyrdPage;}catch(e){}})();`,
    },
  ],

  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        docsRouteBasePath: '/docs',
        indexBlog: false,
      },
    ],
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      /** Include h3 in the doc TOC (needed for merged fighter names + MDX ### sections). */
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 3,
      },
      navbar: {
        logo: {
          alt: 'Wyrdcry',
          src: 'img/home.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'rulesSidebar',
            position: 'left',
            label: 'Rules',
          },
          {
            type: 'docSidebar',
            sidebarId: 'warbandsSidebar',
            position: 'left',
            label: 'Warbands',
          },
          {
            type: 'docSidebar',
            sidebarId: 'campaignsSidebar',
            position: 'left',
            label: 'Campaigns',
          },
        ],
      },
      footer: undefined,
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
