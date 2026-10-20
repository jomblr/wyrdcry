/**
 * Custom MDX components. No keyword span wrapping — backtick terms render as normal <code>.
 */
import MDXComponents from '@theme-original/MDXComponents';
import FactionWeapons from '@site/src/components/FactionWeapons';
import WeaponLink from '@site/src/components/WeaponLink';
import HeroOnlyIcon from '@site/src/components/HeroOnlyIcon';
import CrowIcon from '@site/src/components/CrowIcon';
import { WeaponRule, WeaponProfiles } from '@site/src/components/wiki/WeaponsReference';
import TradingPostItems, { ItemCard } from '@site/src/components/wiki/TradingPostItems';

export default {
  ...MDXComponents,
  FactionWeapons,
  WeaponLink,
  HeroOnly: HeroOnlyIcon,
  IronCross: HeroOnlyIcon,
  CrowIcon,
  Crow: CrowIcon,
  // Inline weapon-rule link with tooltip: <WeaponRule id="parry" />
  WeaponRule,
  // Hand-picked weapon table: <WeaponProfiles ids={["sword", "dagger"]} />
  WeaponProfiles,
  // Trading Post item lists from items.json: <TradingPostItems type="single-use" />
  TradingPostItems,
  // A single item laid out like a Trading Post entry: <ItemCard itemId="prayer-beads" />
  ItemCard,
};
