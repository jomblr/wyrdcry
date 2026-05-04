import clsx from 'clsx';
import { useEffect } from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import { IoLogoDiscord } from 'react-icons/io5';
import ParticlesBackground from '@site/src/components/homepage/ParticlesBackground.jsx';
import styles from './index.module.css';

const DISCORD_INVITE = 'https://discord.gg/U6mTMfx29E';

/** Full-viewport hero: logotype + "Start your warband" / etc. Shown at site root `/` (this file is `pages/index.js`). */
function HomepageHeader() {
  const bgUrl = useBaseUrl('img/background-variant.png');
  return (
    <header
      id="wyrd-landing"
      className={clsx('hero hero--primary', styles.heroBanner)}
      style={{ backgroundImage: bgUrl ? `url(${bgUrl})` : undefined }}
    >
      <div className={styles.particlesLayer} aria-hidden>
        <ParticlesBackground color="#5cdb9a" quantity={150} size={0.68} staticity={99999} />
      </div>
      <div className={clsx('container', styles.heroContent)}>
        <img
          src={useBaseUrl('img/logotype.svg')}
          alt="Wyrdcry"
          className={styles.logotype}
        />
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/rules/introduction"
          >
            What is Wyrdcry?
          </Link>
          <Link
            className="button button--primary button--lg"
            to="/docs/rules/general-principles"
          >
            Play the game
          </Link>
          <a
            className={clsx('button button--lg', styles.discordButton)}
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IoLogoDiscord aria-hidden /> Discord
          </a>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();

  useEffect(() => {
    document.documentElement.dataset.wyrdPage = 'home';
    return () => { delete document.documentElement.dataset.wyrdPage; };
  }, []);

  return (
    <Layout
      title={siteConfig.title}
      description="Description will go into a meta tag in <head />">
      <HomepageHeader />
    </Layout>
  );
}
