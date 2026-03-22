/**
 * Custom MDX components. No keyword span wrapping — backtick terms render as normal <code>.
 */
import MDXComponents from '@theme-original/MDXComponents';
import FactionWeapons from '@site/src/components/FactionWeapons';
import WeaponLink from '@site/src/components/WeaponLink';
import HeroOnlyIcon from '@site/src/components/HeroOnlyIcon';
import CrowIcon from '@site/src/components/CrowIcon';

export default {
  ...MDXComponents,
  FactionWeapons,
  WeaponLink,
  HeroOnly: HeroOnlyIcon,
  IronCross: HeroOnlyIcon,
  CrowIcon,
  Crow: CrowIcon,
};
