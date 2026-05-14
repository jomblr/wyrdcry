---
sidebar_position: 1
---
import { FighterCard } from '@site/src/components/wiki/FactionFighters';

# General Principles

## The Basics

In Wyrdcry, you control a **warband** battling an **enemy warband** in the ruins of Mordheim. Battles are played according to a **scenario** that decides the **victory conditions** that must be met to win the battle.

## Warbands

To play a battle, you and your opponents must **start a warband** by filling in a **warband roster.** The rules for starting a warband are found [here](/docs/warbands/starting-warband).

## Fighters

Your warband is made up by models referred to as **fighters**, and their rules are contained in their **fighter profile.** You can find an example of a fighter profile below.

### Example Fighter Profile
<FighterCard fighterId="warrior" />

### Characteristics
Each fighter has a set of **Characteristics** that describe their physical abilities and are used when making tests and resolving actions
- **Move:** How fast the fighter can move (measured in inches)
- **Fight:** A fighter’s skill in close combat
- **Shoot:** A fighter’s accuracy
- **Defense:** A combination of a fighter's agility and equipped armour.
- **Health:** How much damage a fighter can endure before taken out of action.
- **Bravery:** A fighter’s courage and mental resolve.

### Keywords
Keywords describe distinctive features of the fighter, such as their race and faction, or what archetype the fighter  is. When referenced in a rule, keywords are always written in `UPPERCASE`. If a rule refers to a keyword in the plural (for example, `HEROES`), it is treated as a reference to the singular keyword (`Hero`).

### Talents
Most fighters have one or more **Talents** that shape how they act on the battlefield and set them apart from their peers:

- **Traits** represent passive talents, racial traits and old wounds and their effects are automatically applied whenever their conditions are met.
- **Abilities** represent tricks, spells and manoeuvres that a fighter can use during their activation by spending ability dice (marked as **[Double]**, **[Triple]** or **[Quad]**).
- **Reactions** allow a fighter to respond to the actions of their enemies, most commonly by spending an action.

### Friendly and enemy fighters

For rules purposes, a fighter considers all fighters in their warband to be **friendly fighters**, and all fighters in your opponent’s warband to be **enemy fighters.**

## The Battlefield

Battles are fought on a flat surface measuring 3 feet by 3 feet, referred to as the **battlefield floor.** This surface is bordered by **battlefield edges** and populated with all manner of ruined buildings, risers and scaffolding called [**terrain pieces**](/docs/rules/the-combat-phase/terrain). Together, these elements form the **battlefield**.

## Measuring

The game uses inches (") for measuring distances and you are allowed to measure whenever you want. You must always measure both the vertical and horizontal distance, unless a rule says otherwise.

- When measuring the distance between two fighters you always measure between the closest point of their bases.
- If a rule requires a fighter to be **within** a certain distance of something, the requirement is fulfilled if **any part** of a fighter’s base is within that distance.
- If a rule requires a fighter to be **wholly within** a certain distance of something, the requirement is fulfilled if the fighter’s **entire base** is within that distance.

## Dice
The game uses regular six-sided dice (D6) to determine the outcome of various rules. The most common occurrence is to beat a target number. For example, if a rule requires a dice roll of 3 or more (usually abbreviated to 3+), every result of 3 or more is a success.

### D3
If a rule requires you to roll a **D3**, roll a regular six-sided dice and halve the total, rounding up.

### D66
If a rule requires you to roll a **D66**. roll a six-sided dice twice. The first roll determines the ten, and the second roll determines the unit. For example, if you rolled a 3 followed by a 5, the D66 roll would be 35.

### Re-Roll
Some rules allows you to **re-roll** a dice roll, which means that you get to roll a specified amount of dice again. You can never re-roll a dice roll more than once, and you cannot select the original result even if the new one is worse.

### Roll-off
Sometimes a rule requires the players to **roll-off**. When this is the case, each player rolls a dice, and whoever rolls highest wins the roll-off. If there is a tie for the highest roll, roll-off again.

## Modifiers
Sometimes a rule will alter a fighter’s characteristics. These alterations are referred to as modifiers and are always cumulative. 

## Sequencing
In most cases, rules will be resolved one at a time. If rules appear to come into play at the same time, the player activating a fighter decides in what order the rules are resolved. In all other cases, the player with initiative decides.

## Visibility
Many rules require one fighter (usually the target of an attack action or ability) to be **visible** to another fighter (usually the fighter making the attack action or using the ability). A fighter is visible to another fighter if a straight line can be drawn between the two fighters without it passing through a terrain piece or another fighter.

If you are unsure whether a fighter is visible, stoop down and see if any part of the target fighter is visible from any part of the fighter making the attack action. Do not include the bases the fighters are mounted upon. Lastly, for rules purposes, fighters are not considered to be visible to themselves.

## Damage

There are many ways for a fighter to suffer damage, such as being the target of an attack or ability, or falling from a height. Whatever the source, damage is allocated one point at a time.

### Out of Action

When a fighter is allocated damage points equal to their Health characteristic, they are taken **out of action**: the fighter is removed from the battlefield, and any leftover damage points are discarded.

In a campaign game, a fighter that is taken out of action risk lasting injuries or being killed, as described in the aftermath sequence.