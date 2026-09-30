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

- An attack with a melee weapon is a **Melee Attack action**
- An attack with a ranged weapon is a **Ranged Attack action** 

Then, select a visible enemy fighter **within weapon range** to be the **target**. If there are any enemy fighters within 1” of the attacking fighter, the attacking fighter must select one of them to be the target of a melee attack action.

Ranged attack actions cannot target enemy fighters within 1” of a friendly fighter (the risk of hitting their ally is too great!). In addition, ranged attack actions must target the closest viable target, or you must increase the DR of the attack by 1 (see [2.2: Ranged Attack Actions](#22-ranged-attack-actions))

:::info[ ]
### Weapon Range
The range of an attack action is equal to the weapon’s **Range characteristic**. For example, if the weapon has a Range of 2”, an enemy fighter within 2” of the attacking fighter may be targeted by that attack action.

#### Long Range
When making a ranged attack action, if the target is more than 6" away, increase the DR of the attack by 1.
:::

## Step 2: Make hit rolls
---

Roll a number of dice equal to the weapon’s Attacks characteristic. These are referred to as **hit rolls.** Determining which hit rolls have **missed**, scored a **hit** or a **critical hit** depends on what kind of attack it is.

### 2.1 Melee Attack Actions
For melee attack actions, you must compare the Fight characteristics of the attacking fighter with that of the target (after applying any modifiers) and consult the [hit table](./attack-action#23-hit-table).

|Melee Modifiers|Attacker|Defender|
|:---|:---:|:---:|
|Attacker makes [Diving Charge](#diving-charge)|+1 Fight|-|
|Target is [flanked](#flanking)|+1 Fight|-|
|Target has a shield|-|+1 Fight|
|Target weapon has parry|-|+1 Fight|


#### Dual Wielding
A fighter that is dual wielding can make a melee attack action using both of their weapons. To do so, the controlling player must declare which weapon is the **main-hand weapon**, and which weapon is the **off-hand weapon**.

Then, fully resolve the hit rolls for the main-hand weapon, followed by a single hit roll from the off-hand weapon (disregarding its Attacks characteristic). Allocate damage points from each weapon separately.


#### Flanking
If the target of the melee attack action is **flanked**, the attacking fighter may increase its Fight characteristic by 1. To be flanked, at least one friendly fighter must be within 1” of the target, while not within 1” of other enemy fighters.

#### Diving Charge
When a fighter makes a melee attack action after making a move action where it fell more than 2” vertically, you may increase their Fight characteristic by 1.

### 2.2 Ranged Attack Actions
For ranged attack actions, you must compare the Shoot characteristic of the attacking fighter against the **difficulty rating (DR)** of the attack and consult the [hit table.](./attack-action#23-hit-table).

All ranged attack actions has a **base DR of 3** before applying modifiers.

|Ranged Modifiers|Difficulty Rating|
|:---|:---:|
|Attacker is on a platform (at least 2” above the target)|-1|
|Target is at [long range](./attack-action#long-range)|+1|
|Target is not the closest viable target|+1|
|Target is in [cover](#cover)|+1|
|Target has a shield|+1|


###  2.3 Hit Table
|Fight vs Fight Shoot vs DR|Miss|Hit|Critical Hit|
|:---|:---:|:---:|:---:|
|Twice (or greater)|1-2|3-4|5-6|
|Greater|1-2|3-5|6|
|Equal|1-3|4-5|6|
|Lesser|1-4|5|6|
|Half (or less)|1-4|5-6|-|

## Step 3: Allocate Damage
---
To determine how much damage the target suffers, follow these steps:

1. Total up the damage from the hit rolls
	- For each hit, add the first value of the weapon's Damage characteristic to the total.
	- For each critical hit, add the second value instead.
2. Reduce the total by the target's Armour characteristic.
3. Allocate the resulting damage (if any) to the target ([see Damage]()).

:::inverse
## Example Combat
Gerthrude Horrst, a stern sister of sigmar, strikes at a Darksoul warrior. Both fighters have a Fight characteristic of 4, so Gerthrude will score a hit on a 4+ and a critical hit on a 6.

As she is dual wielding a hammer and a dagger, she strikes first with her hammer and rolls a 5 and 6 – a hit and a critical hit! The hammer has a 2/3 damage characteristic, resulting in 5 damage points. The Darksoul is wearing heavy armour with an armour characteristic of 3, but the hammer has the piercing 2 special rule, so she reduces the Darksoul's armour to 1, and so allocates 4 damage points to the Darksoul (5 damage -1 for the armour).

She then makes another hit roll for her off-hand dagger, which also results in a critical hit. Since the weapon doesn't have the piering special rule, the critical hit is completely blocked by the armour (3 damage -3 for the armour)
:::


