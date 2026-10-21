---
sidebar_position: 1
---
import { FighterCard } from '@site/src/components/wiki/FactionFighters';

# General Principles

## The Basics

In Wyrdcry, you control a **warband** battling an **enemy warband** in the ruins of Mordheim. Battles are played according to a **scenario** that decides the **victory conditions** that must be met to win the battle.

## Warbands
---

To play a battle, you and your opponents must **start a warband** by filling in a **warband roster.** The rules for starting a warband are found [here](../warbands/starting-warband.md).

## Fighters
---

Your warband is made up by models referred to as **fighters**, and their rules are contained in their **fighter profile.** You can find an example of a fighter profile [below](#example-fighter-profile).

### Friendly and enemy fighters

For rules purposes, a fighter considers all fighters in their warband to be **friendly fighters**, and all fighters in your opponent’s warband to be **enemy fighters.**

## The Battlefield
---

Battles are fought on a flat surface measuring 3 feet by 3 feet, referred to as the **battlefield floor.** This surface is bordered by **battlefield edges** and populated with all manner of ruined buildings, risers and scaffolding called [**terrain pieces**](docs/rules/terrain.md). Together, these elements form the **battlefield**.

## Measuring
---

The game uses inches (") for measuring distances and you are allowed to measure whenever you want. You must always measure both the vertical and horizontal distance, unless a rule says otherwise.

- When measuring the distance between two fighters you always measure between the closest point of their bases.
- If a rule requires a fighter to be **within** a certain distance of something, the requirement is fulfilled if **any part** of a fighter’s base is within that distance.
- If a rule requires a fighter to be **wholly within** a certain distance of something, the requirement is fulfilled if the fighter’s **entire base** is within that distance.

## Dice
---
The game uses regular six-sided dice (D6) to determine the outcome of various rules. The most common occurrence is to beat a target number. For example, if a rule requires a dice roll of 3 or more (usually abbreviated to 3+), every result of 3 or more is a success.

:::inverse[]
**And to keep things simple: it is always better to roll a high result. A 1 is always bad, and a 6 is always good.**
:::

:::info[]
### D3
If a rule requires you to roll a **D3**, roll a regular six-sided dice and halve the total, rounding up.

### D66
If a rule requires you to roll a **D66**. roll a six-sided dice twice. The first roll determines the ten, and the second roll determines the unit. For example, if you rolled a 3 followed by a 5, the D66 roll would be 35.

### Re-Roll
Some rules requires you to **re-roll dice**, meaning you roll the specified number of dice again. A dice roll can never be re-rolled more than once, and you cannot choose the original result.

### Roll-off
Sometimes a rule requires the players to **roll-off**. When this is the case, each player rolls a dice, and whoever rolls highest wins the roll-off. If there is a tie for the highest roll, roll-off again.
:::

## Modifiers
---
Sometimes, a rule will call for the characteristic of a fighter or a weapon to be modified.  For example, a rule may add 1 to the Move characteristic of a fighter, or subtract 1 from the Attack characteristic of a weapon. These modifiers are always cumulative, but unless a rule says otherwise, they can never reduce a characteristic to less than 1 (or, in the case of Bravery, a 6+).

## Sequencing
---
In most cases, rules will be resolved one at a time. If rules appear to come into play at the same time, the player activating a fighter decides in what order the rules are resolved. In all other cases, the player with initiative decides.

## Visibility
---
Many rules require one fighter (usually the target of an attack action or ability) to be **visible** to another fighter (usually the fighter making the attack action or using the ability). A fighter is visible to another fighter if a straight line can be drawn between the two fighters without it passing through a terrain piece or another fighter.

If you are unsure whether a fighter is visible, stoop down and see if any part of the target fighter is visible from any part of the fighter making the attack action. Do not include the bases the fighters are mounted upon. Lastly, for rules purposes, fighters are not considered to be visible to themselves.

## Damage
---
There are many ways for a fighter to suffer damage in Wyrdcry, such as being the target of an attack or ability, or falling from a height. Whatever the source, damage is allocated one point at a time.

### Wounded
When a fighter has been allocated damage points equal to half their Health characteristic (rounding up), they are considered to be **wounded**. Being wounded does not directly affect a fighter's combat capabilities, but interacts with certain rules and items.

### Out of Action

When a fighter is allocated damage points equal to their Health characteristic, they are taken **out of action**: the fighter is removed from the battlefield, and any leftover damage points are discarded.

In a campaign game, a fighter that is taken out of action risk lasting injuries or being killed, as described in the [aftermath sequence](../campaigns/the-aftermath-sequence/injuries.md).

## Example: Fighter Profile
---
<FighterCard fighterId="warrior" />

### Characteristics
- **Move:** How fast the fighter can move (measured in inches)
- **Fight:** A fighter’s proficiency in attacking and defending themselves in melee combat.
- **Shoot:** A fighter’s proficiency in hitting a target in ranged combat.
- **Health:** How much damage a fighter can endure before taken out of action.
- **Bravery:** A fighter's courage and mental resolve when facing the horrors of the city.
- **Armour:** How much damage the fighter's armour can withstand

### Keywords
Each fighter profile includes a set of keywords that describes distinctive features of the fighter, such as their race and faction. When referenced in a rule, keywords are always written in `UPPERCASE`.

A rule that refers to a keyword applies to all fighters with that keyword. If a rule refers to a keyword in the plural (for example, `UPPERCASE`), it is treated as a reference to the singular keyword (`Hero`).

### Special Rules
Many fighters have one or more special rules that sets them apart from their peers:

- **Traits** represent skills or racial quirks whose effects are automatically applied whenever their conditions are met.
- **Abilities** represent tricks, spells and manoeuvres that a fighter can use during their activation by spending ability dice (marked as **[Double]**, **[Triple]** or **[Quad]**).
- **Reactions** are things a fighter can do during an enemy fighter's activation, most commonly by spending an action.
- **Injuries** are long-lasting wounds and mental afflictions that impair the fighter.
Many fighters have one or more special rules that sets them apart from their peers:

### Recruitment fee

Each fighter has a recruitment fee listed in gold coins (gc).

### Equipment, weapons and armour

Fighters may be equipped with all manner of weapons, armour and trinkets, the rules for which are found [here](../warbands/starting-warband.md).

## Example: Weapon Profiles
---
### Melee Weapons
<WeaponProfiles ids={["sword", "spear"]} />

### Ranged Weapons
<WeaponProfiles ids={["bow", "crossbow"]} />

### Weapon Type
All weapons come in two types, **melee weapons** and **ranged weapons.**

### Weapon Characteristics
- **Range**: How far the weapon can reach, measured in inches. Weapons with a minimum range (like the bow) cannot target fighters within that minimum range.
- **Attacks**: The amount of dice rolled when making attack actions with the weapon.
- **Damage**: The damage potential of the weapon. The first value represents **hit damage**, and the second value represents **critical damage.**

### Weapon Rules
Most weapons have one or more special rules that applies to the bearer of that weapon, and you can find a comprehensive list of weapon rules [here.](../warbands/Equipment/weapons#weapon-rules)
