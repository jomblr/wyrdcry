---
sidebar_position: 1
---

import HeroInjuryRoller from '@site/src/components/HeroInjuryRoller';
import HenchmanInjuryRoller from '@site/src/components/HenchmanInjuryRoller';

# Aftermath Sequence
At the end of each battle, all players must complete a series of steps referred to as the **aftermath sequence.** It is recommended for both players to do this immediately after the battle has finished.

## Step 1: Roll for injuries
---
Roll on the appropriate Injury table for each fighter that was taken out of action during the battle, and apply the result.

### Permanent Injuries

When `Heroes` are taken out of action, they risk suffering a **permanent injury** (symbolised as a ▼). Permanent injuries are all [Traits], with the following special rules: 

- A `Hero` can never have more than three permanent injuries. If they suffer a fourth one, treat that result as [11-12: Dead](#dead) instead.
- If a `Hero` suffers a permanent injury they already have, treat that result as [41-56: Flesh Found instead](#flesh-wound).

### Death of a leader

If your `Leader` dies or is removed from the warband for any other reason, you must select a `Hero` to gain the `Leader` keyword. If you do not have any fighters with the `Hero` keyword, you must disband the warband and create a new one.

### Henchman Injuries {#henchman-injuries}

<HenchmanInjuryRoller />

<div className="injury-tables">

|D6|Result|
|:---:|:---|
|1-2|<span id="hench-dead">**Dead**</span>: The warrior has been killed (or badly crippled) and must be removed from the warband roster. Roll a D6 for their equipment; on a 5+, it is recovered and added to your warband stash.|
|3-6|<span id="hench-full-recovery">**Full Recovery**</span>: The warrior suffers no lasting effects|

### Hero Injuries

<HeroInjuryRoller />

|D66|Result|
|:---:|:---|
|11-12|<span Id="dead">**Dead**</span>: The fighter is removed from your warband. Roll a D6 for their equipment; on a 5+, it is recovered and added to your warband stash.|
|13-14|<span id="bleeding-out">**Bleeding Out**</span>: The fighter dies unless you rush them to a surgeon. You may remove 20gc from the warband stash to roll a d6.<br/>On a 1-3, the fighter dies (but you retain their equipment!).<br/>On a 4+, treat this result as a Flesh Wound.|
|15-16|<span id="deep-wound">**Deep wound**</span>: The fighter is recovering but will miss the next battle|
|21|<span id="wyrdlung-rot">**▼ [Trait] Wyrdlung Rot**</span>: This fighter can only make one Move action per battle round.|
|22|<span id="crippled-leg">**▼ [Trait] Crippled leg**</span>: Decrease the fighter’s Move characteristic by 2|
|23|<span id="fractured-arm">**▼ [Trait] Fractured arm**</span>: Decrease the fighter’s Fight and Shoot characteristics by 1|
|24|<span id="devastated-eye">**▼ [Trait] Devastated eye**</span>: Reduce the range of any weapons equipped by this fighter by half (to a minimum of 1”)|
|25|<span id="festering-wound">**▼ [Trait] Festering wound**</span>: decrease the fighter’s Health characteristic by 4|
|26|<span id="nervous-tick">**▼ [Trait] Nervous tick**</span>: decrease the fighter’s Bravery characteristic by 1|
|31|<span id="stupidity">**▼ [Trait] Stupidity**</span>: Unless activated within 3" of a visible friendly Hero or enemy fighter, roll a die. On a 1-4, this fighter makes a Wait action. On a 5+, this fighter may activate as normal|
|32|<span id="hallucinations">**▼ [Trait] Hallucinations**</span>: This warrior must pass a Bravery test whenever they are activated within 1” of an enemy warrior, or become panicked|
|33|<span id="claustrophobic">**▼ [Trait] Claustrophobic**</span>: Whenever this fighter ends a move action (or is activated within) an enclosed terrain piece, it must pass a Bravery tes or become panicked|
|34|<span id="amnesia">**▼ [Trait] Alcoholic**</span>: This fighter cannot use reactions|
|35|<span id="kleptomania">**▼ [Trait] Kleptomania**</span>: Reduce all income by 10gc|
|36|<span id="paranoid">**▼ [Trait] Paranoid**</span>: This fighter counts as panicked while within 1” of friendly fighters|
|41-56|<span id="flesh-wound">**Flesh wound**</span>: The fighter suffers no lasting effects|
|61|<span id="robbed">**Robbed**</span>: All equipment carried by this fighter are lost|
|62|<span id="captured">**Captured**</span>: The fighter is captured by your opponent's warband. You must offer your opponent half of the fighter's recruitment cost, or concede 1 favour to get them back.|
|64|<span id="hardened">**Hardened**</span>: Increase the Bravery characteristic of this fighter by 1|
|63|<span id="rival">**Hatred**</span>: This fighter **hates** the enemy fighter that took them out of action, and may turn a hit into a critical hit when making attack actions against that enemy fighter|
|65|<span id="terrible-scars">**[Trait] Terrible scars**</span>: This fighter gains the `Terrifying` keyword|
|66|<span id="against-all-odds">**Against all odds**</span>: This warrior gains 1 level of Renown|

</div>

## Step 2: Earn experience
---

Each fighter in your warband earn 1 **experience point** for:

- Participating in the battle
- Not being taken out of action during the battle
- Taking an enemy fighter out of action during the battle.

In addition, each player must select 1 fighter to earn one additional experience point. When a fighter accumulates 4 experience points, they gain renown ([see Renown](/docs/campaigns/renown)).

Finally, A fighter with the `Beast` keyword never earn experience.

## Step 3: Earn Favor
---
Each warband earns favour from their faction as described in the scenario. If your warband earns enough favour to rise in standing, they do so, immediately gaining the effects of any perk that comes with it.

## Step 4: Collect income
---
Collect income according to the table below and add it to your warband stash.

|Favor|Standing|Income|Benefits|
|:---:|:---:|:---:|:---|
|0-10|Disposable|100gc|**Bounty:** Increase income by 40gc when when earning 4 or more Favor from one battle.|
|11-20|Proven|160gc|
|21-30|Loyal|220gc|**Veterans:** All newly recruited `Henchmen` gain 1 level of renown, and can make a characteristics increase.|
|31-40|Trusted|260gc||
|41+|Favoured|300gc||

## Step 5: Manage warband
---
You may now add new fighters to your warband roster by spending gold coin, following the same restrictions as when you first built your warband.Your fighters can be bought new equipment from your faction entry, as well as from the Trading Post (see page 21), and their old equipment can be swapped around freely. 

Unused equipment can be sold at half price, or stored in the Warband Stash on your warband roster.

Fighters can be dismissed from your warband whenever you wish, and you can strip them of equipment when doing so. If you dismiss your `Leader`, you must elect a new `Leader` by following the steps for [Death of a leader](#death-of-a-leader)

## Step 6: Recalculate reputation
---
To recalculate Reputation, simply combine your warband’s favour with each point of renown from all fighters in the warband and update your warband roster.