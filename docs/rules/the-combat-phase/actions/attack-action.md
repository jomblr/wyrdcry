---
sidebar_position: 2
title: Attack
---
# Attack
---
To attack an enemy fighter, you must resolve the following steps:

## Step 1: Select weapon and target
---

Select one of the fighter’s weapons to be used for the attack. The weapon determines what kind of attack it is:

- An attack with a melee weapon is a **melee attack action**
- An attack with a ranged weapon is a **ranged attack action** 

Then, select a visible enemy fighter **within range** to be the **target**. The range of an attack action is equal to the weapon’s Range characteristic.

If there are any enemy fighters within 1” of the attacking fighter, you must select one of them to be the target of a melee attack action.

Ranged attack actions cannot target enemy fighters within 1” of a friendly fighter.

## 2. Make hit rolls
Roll a number of dice equal to the weapon’s Attacks characteristic. These are referred to as **hit rolls**. Determining which hit rolls have scored a **hit** or a **critical hit** depends on what kind of attack it is.

:::info[]
### 2.1 Melee Attack Actions
For melee attack actions, you must compare the Fight characteristic of the attacking fighter (after applying modifiers) with that of the target and consult the table below.

#### Dual Wielding
A fighter that is dual wielding can make a melee attack action using both of their weapons. When selecting weapons, you must declare which weapon is the **main-hand weapon**, and which weapon is the **off-hand weapon.**

Then, make the hit rolls for the main-hand weapon, followed by a single hit roll from the off-hand weapon. Use differently colored dice to keep them apart and allocate damage from each weapon separately.

####  Melee Attack Hit Table
|Fight vs Fight|Miss|Hit|Critical Hit|
|:---|:---:|:---:|:---:|
|Twice (or greater)|1-2|3-4|5-6|
|Greater|1-2|3-5|6|
|Equal|1-3|4-5|6|
|Lesser|1-4|5|6|
|Half (or less)|1-4|5-6|-|

#### Melee Modifiers
|Modifiers|Attacker|
|:---|:---:|
|Attacker makes a  [diving charge](#diving-charge)|+1 Fight|
|Target is [flanked](#flanking)|+1 Fight|

#### Diving Charge
When a fighter makes a melee attack action after a move action where they fell more than 2” vertically, you may increase their Fight characteristic by 1.

#### Flanking
If the target of the melee attack action is **flanked**, the attacking fighter may increase its Fight characteristic by 1. To be flanked, at least one friendly fighter must be within 1” of the target, while not being within 1” of other enemy fighters.
:::
:::info[]
### 2.2 Ranged Attack Actions
For ranged attack actions, you must compare the Shoot characteristic of the attacking fighter (after applying modifiers) with the hit table below.

#### Ranged Attack Hit Table
|Attacker's Shoot characteristic|1|2|3|4|5+|
|:---|:---:|:---:|:---:|:---:|:---:|
|Hit|5+|5+|4+|3+|3+|
|Critical Hit|-|6|6|6|5+|

#### Ranged Attack Modifiers
|Modifier|Attacker|
|:---|:---:|
|Attacker is [on a platform (at least 2" above target)](./attack-action#high-ground)|**+1 Shoot**|
|Attacker is [threatened](./attack-action#threatened)|**-2 Shoot**|
|Attacker is panicked|**-1 Shoot**|
|Target is at [long range](./attack-action#long-range)|**-1 Shoot**|
|Target is in [cover](#cover)|**-1 Shoot**|

#### Cover
When making a ranged attack action, if the target is in **cover**, decrease the Shoot characteristic of the attacking fighter by 1. A fighter is in cover if any of the following are true:

- You cannot draw an imaginary line between the closest points on each fighter’s base without it passing through an obstacle. Do not count obstacles within ½” of the fighter making the Attack action (this represents fighters being able to aim around corners and through gaps in nearby terrain, and so on).
- The target is on a platform that is 2” or more above the fighter making the ranged attack action.

#### Attacking from a platform
When making a ranged attack action, if the attacking fighter is on a platform that is 2" or more above the target, increase the Shoot characteristic of the attacking fighter by 1.

#### Long Range
When making a ranged attack action, if the target is more than 12" away, decrease the Shoot characteristic of the attacking fighter by 1.

#### Threatened
When making a ranged attack action, if there are any visible enemy fighters within 6" of the attacking fighter, the attacking fighter is **threatened**. Unless one of those enemy fighters is selected as the target, decrease the Shoot characteristic of the attacking fighter by 2.
:::

## Step 3: Allocate Damage
---
To determine how much damage the target suffers, follow these steps:

- Total up the damage from the hit rolls. For each hit, add the weapon's **hit damage** to the total. For each critical hit, add the weapon's **critical hit damage** instead.
- Then, reduce the total by the target's Armour characteristic.
- Allocate the resulting damage points (if any) to the target (see Damage).


:::inverse
## Example Combat
Gerthrude Horrst, a stern sister of sigmar, strikes at a Darksoul warrior. Both fighters have a Fight characteristic of 4, so Gerthrude will score a hit on a 4+ and a critical hit on a 6.

As she is dual wielding a hammer and a dagger, she strikes first with her hammer and rolls a 5 and 6 – a hit and a critical hit! The hammer has a 2/3 damage characteristic, resulting in 5 damage points. The Darksoul is wearing heavy armour with an armour characteristic of 3, but the hammer has the piercing 2 special rule, so she reduces the Darksoul's armour to 1, and  allocates 4 damage points to the Darksoul (5 damage -1 for the armour).

She then makes a single hit roll for her off-hand dagger, which also results in a critical hit. Since the weapon doesn't have the piering special rule, the critical hit is completely blocked by the armour (3 damage -3 for the armour)
:::


