import React, {useLayoutEffect} from 'react';
import type {Props} from '@theme/Root';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function Root({children}: Props) {
  const {pathname} = useLocation();
  const {siteConfig} = useDocusaurusContext();

  useLayoutEffect(() => {
    if (isHomePathname(pathname, siteConfig.baseUrl)) {
      document.documentElement.dataset.wyrdPage = 'home';
    } else {
      delete document.documentElement.dataset.wyrdPage;
    }
  }, [pathname, siteConfig.baseUrl]);

  return <>{children}</>;
}

/**
 * Keeps `html[data-wyrd-page="home"]` in sync on client-side navigation; the inline
 * script in `docusaurus.config.js` sets it before first paint.
 *
 * Same idea as Docusaurus normalizeLocation: strip trailing `/index.html` etc.
 */
function stripIndexHtml(path: string): string {
  return path.replace(/(?:\/index)?\.html$/, '') || '/';
}

function normalizePathNoTrailingSlash(path: string): string {
  if (!path || path === '/') {
    return '/';
  }
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

function isHomePathname(pathname: string, baseUrl: string): boolean {
  const path = normalizePathNoTrailingSlash(stripIndexHtml(pathname || '/'));
  let base = baseUrl || '/';
  if (base !== '/' && base.endsWith('/')) {
    base = base.slice(0, -1);
  }
  base = normalizePathNoTrailingSlash(stripIndexHtml(base));
  if (base === '/') {
    return path === '/' || path === '';
  }
  return path === base;
}
