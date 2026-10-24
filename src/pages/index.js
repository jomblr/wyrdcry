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

/** Full-viewport hero: logotype, Gothicus headline, two CTAs, Discord link. Shown at `/`. */
function HomepageHeader() {
  const bgUrl = useBaseUrl('img/background-variant.webp');
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
        <div className={styles.logoBlock}>
          <img
            src={useBaseUrl('img/logotype.svg')}
            alt="Wyrdcry"
            className={styles.logotype}
          />
        </div>
        {/* Logo stays at the top; headline, buttons and Discord centre in the space below. */}
        <div className={styles.heroMain}>
          <h1 className={styles.headline}>
            <span className={styles.headlineLine}>Fast and brutal skirmish battles</span>{' '}
            <span className={styles.headlineLine}>in the City of the Damned</span>
          </h1>
          <div className={styles.buttons}>
            <Link className={clsx('button button--lg', styles.heroButton)} to="/docs/downloads">
              Download Rules
            </Link>
            <Link className={clsx('button button--lg', styles.heroButton)} to="/docs/rules/general-principles">
              Play Now
            </Link>
          </div>
          <a
            className={styles.discordLink}
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IoLogoDiscord aria-hidden /> Join us on Discord
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
      description={siteConfig.tagline}>
      <HomepageHeader />
    </Layout>
  );
}
