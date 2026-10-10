// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';
import remarkHighlight from './src/remark/highlight.mjs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** Must match `baseUrl` below (used in the head script that sets `data-wyrd-page` before paint). */
const baseUrl = '/';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Wyrdcry',
  tagline: 'Fast-Paced Skirmish battles in the City of the Damned',
  favicon: 'img/favicon.png',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://wyrdcry.net',
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
   * Landing page: `html[data-wyrd-page="home"]` toggles the transparent navbar
   * (see `src/theme/Root.tsx` too).
   * Inline script runs before paint; must respect `baseUrl` (not only `/`).
   */
  headTags: [
    {
      tagName: 'script',
      attributes: {},
      innerHTML: `(function(){try{var b=${JSON.stringify(baseUrl)};function n(s){if(!s)return '/';s=s.replace(/(?:\\/index)?\\.html$/,'')||'/';return s.length>1&&s.endsWith('/')?s.slice(0,-1):s;}var p=n(window.location.pathname||'/'),bn=n(b);var home=(bn==='/'&&(p==='/'||p===''))||(bn!=='/'&&p===bn);var el=document.documentElement;if(home)el.dataset.wyrdPage='home';else delete el.dataset.wyrdPage;}catch(e){}})();`,
    },
  ],

  clientModules: [require.resolve('./src/clientModules/gtagFallback.js')],

  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        docsRouteBasePath: '/docs',
        indexBlog: false,
        docsPluginIdForPreferredVersion: 'default',
      },
    ],
    'docusaurus-plugin-image-zoom',
    './plugins/scenario-data.js',
    [
      '@docusaurus/plugin-google-gtag',
      {
        trackingID: 'G-M14YF24G0C',
        anonymizeIP: true,
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
          // Custom admonition keywords; appended to the defaults (note/tip/info/...).
          // Each needs a renderer in src/theme/Admonition/Types.tsx.
          admonitions: { keywords: ['encounter', 'inverse'] },
          // Obsidian-style ==highlight== -> <mark>.
          // Must run *before* the default plugins: the TOC extractor is one of them,
          // and it reads heading text via mdast-util-to-string. If this ran after
          // (plain `remarkPlugins`), a highlighted heading would show the literal
          // `==text==` in the right-hand nav.
          beforeDefaultRemarkPlugins: [remarkHighlight],
          // 0.9 is the current ruleset and the default at /docs/.
          // 0.5 is archived (still selectable in the version dropdown, e.g. for old warbands), at /docs/0.5/ (versioned_docs/version-0.5).
          // Old /docs/next/* links are redirected in static/_redirects.
          lastVersion: 'current',
          versions: {
            current: {
              label: '0.9',
              path: '',
            },
            '0.5': {
              label: '0.5 (archived)',
              path: '0.5',
              banner: 'unmaintained',
            },
          },
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
      image: 'img/wyrdcry-bg.png',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      /** Include h3 in the doc TOC (needed for merged fighter names + MDX ### sections). */
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 3,
      },
      zoom: {
        selector: '.markdown img:not(.faction-weapon-hero-icon)',
        background: {
          light: 'rgb(255, 255, 255)',
          dark: 'rgb(50, 50, 50)',
        },
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
          {
            type: 'dropdown',
            label: 'Tools',
            position: 'left',
            items: [
              { to: '/warband-builder', label: 'Warband Builder' },
              { to: '/scenario-generator', label: 'Scenario Generator' },
            ],
          },
          {
            type: 'docsVersionDropdown',
            position: 'right',
          },
          {
            to: '/blog',
            label: 'Updates',
            position: 'right',
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
